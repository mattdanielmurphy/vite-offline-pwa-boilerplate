import React, { useCallback, useEffect, useRef, useState } from 'react';
import { calculateHours, formatHoursDisplay } from './utils/dateTime';

import { FaSpinner } from 'react-icons/fa';
import { HoursTableReport } from './interfaces/Report';

interface DailyHourEntry {
	regular: string;
	overtime: string;
}

interface DailyHours {
	[month: string]: {
		[date: string]: {
			[name: string]: DailyHourEntry;
		};
	};
}

interface TotalHours {
	[name: string]: {
		regular: number;
		overtime: number;
	};
}

const HoursTable: React.FC<{ reports: HoursTableReport[], loading: boolean }> = ({ reports, loading }) => {
	const [dailyHours, setDailyHours] = useState<DailyHours>({});
	const [names, setNames] = useState<string[]>([]);
	const [monthLabelWidth, setMonthLabelWidth] = useState(0);

	// Add ref for header and body
	const tableRef = useRef<HTMLTableElement>(null);
	const spacerRef = useRef<HTMLDivElement>(null);

	const processReports = (reports: HoursTableReport[]) => {
		const hours: DailyHours = {};
		const totals: TotalHours = {};
		const uniqueDates = new Set<string>();
		const uniqueNames = new Set<string>();
		const overtimeCheck: { [name: string]: boolean } = {};

		reports.forEach(report => {
			const { date, name, time_in, time_out, is_overtime, overtime_hours } = report;
			const parsedDate = new Date(date);
			const formattedDate = parsedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
			const month = parsedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

			if (!hours[month]) {
				hours[month] = {};
			}
			if (!hours[month][formattedDate]) {
				hours[month][formattedDate] = {};
			}

			uniqueDates.add(formattedDate);
			uniqueNames.add(name);

			const totalHours = calculateHours(time_in, time_out);
			const regularHours = Math.max(0, totalHours - (is_overtime ? overtime_hours : 0));

			hours[month][formattedDate][name] = {
				regular: formatHoursDisplay(regularHours),
				overtime: is_overtime ? formatHoursDisplay(overtime_hours) : '0'
			};

			if (!totals[name]) {
				totals[name] = { regular: 0, overtime: 0 };
			}
			totals[name].regular += regularHours;
			totals[name].overtime += is_overtime ? overtime_hours : 0;

			if (is_overtime) {
				overtimeCheck[name] = true;
			}
		});
		const processedNames = Array.from(uniqueNames).sort();

		setDailyHours(hours);
		setNames(processedNames);
	};

	useEffect(() => {
		if (reports.length > 0) {
			processReports(reports);
		}
	}, [reports]);

	const calculateMonthlyTotals = (month: string) => {
		const monthlyTotals: TotalHours = {};
		const monthlyOvertime: { [name: string]: boolean } = {};
		
		Object.keys(dailyHours[month]).forEach(date => {
			Object.keys(dailyHours[month][date]).forEach(name => {
				if (!monthlyTotals[name]) {
					monthlyTotals[name] = { regular: 0, overtime: 0 };
				}
				
				const hours = dailyHours[month][date][name];
				monthlyTotals[name].regular += parseFloat(hours.regular) || 0;
				const overtime = parseFloat(hours.overtime) || 0;
				monthlyTotals[name].overtime += overtime;
				
				if (overtime > 0) {
					monthlyOvertime[name] = true;
				}
			});
		});
		
		return { totals: monthlyTotals, hasOvertime: monthlyOvertime };
	};

	const getPeopleWithHoursForMonth = (month: string, names: string[]) => {
		return names.filter(name => {
			// Check if person has any hours in this month
			return Object.keys(dailyHours[month]).some(date => 
				dailyHours[month][date][name]?.regular !== undefined &&
				parseFloat(dailyHours[month][date][name]?.regular) > 0
			);
		});
	};

	// Update function to find widest table
	const updateSpacerWidth = useCallback(() => {
		const tables = document.querySelectorAll('.hours-table');
		if (tables.length === 0 || !spacerRef.current) return;

		// Find the widest table
		let maxWidth = 0;
		tables.forEach(table => {
			if (table instanceof HTMLElement) {
				maxWidth = Math.max(maxWidth, table.offsetWidth);
			}
		});

		// Set spacer width based on widest table
		spacerRef.current.style.width = `${maxWidth + 30}px`;
		spacerRef.current.style.height = '1px';
		spacerRef.current.style.display = 'block';
	}, []);

	// Update spacer width when table content changes
	useEffect(() => {
		updateSpacerWidth();
		window.addEventListener('resize', updateSpacerWidth);
		return () => window.removeEventListener('resize', updateSpacerWidth);
	}, [dailyHours, updateSpacerWidth]);

	// Add function to update month label width
	const updateMonthLabelWidth = useCallback(() => {
		const width = document.documentElement.clientWidth;
		setMonthLabelWidth(width);
	}, []);

	// Add effect to handle width updates
	useEffect(() => {
		updateMonthLabelWidth();
		window.addEventListener('resize', updateMonthLabelWidth);
		return () => window.removeEventListener('resize', updateMonthLabelWidth);
	}, [updateMonthLabelWidth]);

	return (
		<div className="page-container">
			<h1>Hours Worked</h1>
			<div className="table-content">
				{loading ? (
					<div className="loading-spinner">
						<FaSpinner className="spinner" />
					</div>
				) : (
					<div className="table-container">
						{Object.keys(dailyHours).map((month: string) => {
							const { totals: monthlyTotals, hasOvertime: monthlyOvertime } = calculateMonthlyTotals(month);
							const activeNames = getPeopleWithHoursForMonth(month, names);
							
							return (
								<div key={month} className="month-section">
									<div className="month-label" style={{ width: `${monthLabelWidth}px` }}>
										<h2>{month}</h2>
									</div>
									<div className="table-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
										<table ref={tableRef} className="hours-table">
											<thead>
												<tr>
													<th className="header-cell date-column" rowSpan={2}>Date</th>
													{activeNames.map(name => (
														<th key={name} 
															className="header-cell" 
															colSpan={monthlyOvertime[name] ? 2 : 1}
															rowSpan={monthlyOvertime[name] ? 1 : 2}>
															{name}
														</th>
													))}
												</tr>
												{Object.values(monthlyOvertime).some(hasOT => hasOT) && (
													<tr>
														{activeNames.map(name => (
															<React.Fragment key={`subheader-${name}`}>
																{monthlyOvertime[name] && (
																	<>
																		<th className="sub-header-cell hours-column">Reg</th>
																		<th className="sub-header-cell hours-column">OT</th>
																	</>
																)}
															</React.Fragment>
														))}
													</tr>
												)}
											</thead>
											<tbody>
												{Object.keys(dailyHours[month]).map(date => (
													<tr key={date}>
														<td className="table-cell date-column">{date}</td>
														{activeNames.map(name => (
															<React.Fragment key={`${date}-${name}`}>
																<td className="table-cell hours-column">
																	{(dailyHours[month][date]?.[name] as DailyHourEntry)?.regular || '-'}
																</td>
																{monthlyOvertime[name] && (
																	<td className="table-cell hours-column">
																		{(dailyHours[month][date]?.[name] as DailyHourEntry)?.overtime !== '0' 
																			? (dailyHours[month][date]?.[name] as DailyHourEntry)?.overtime 
																			: '-'}
																	</td>
																)}
															</React.Fragment>
														))}
													</tr>
												))}
												<tr>
													<td className="total-cell date-column">Total</td>
													{activeNames.map(name => (
														<React.Fragment key={`monthly-total-${name}`}>
															<td className="total-cell hours-column">
																{formatHoursDisplay(monthlyTotals[name]?.regular || 0)}
															</td>
															{monthlyOvertime[name] && (
																<td className="total-cell hours-column">
																	{formatHoursDisplay(monthlyTotals[name]?.overtime || 0)}
																</td>
															)}
														</React.Fragment>
													))}
												</tr>
											</tbody>
										</table>
										<div ref={spacerRef} className="table-spacer"></div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default HoursTable;
