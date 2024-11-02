import React, { useCallback, useEffect, useRef, useState } from 'react';

import { FaSpinner } from 'react-icons/fa';
import { HoursTableReport } from './interfaces/Report';
import { supabase } from './supabaseClient';

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

const HoursTable: React.FC<{ reports: HoursTableReport[], onRefresh: () => void }> = ({ reports, onRefresh }) => {
	const [dailyHours, setDailyHours] = useState<DailyHours>({});
	const [totalHours, setTotalHours] = useState<TotalHours>({});
	const [dates, setDates] = useState<string[]>([]);
	const [names, setNames] = useState<string[]>([]);
	const [hasOvertime, setHasOvertime] = useState<{ [name: string]: boolean }>({});
	const [loading, setLoading] = useState(true);

	// Add ref for header and body
	const headerRef = useRef<HTMLTableElement>(null);
	const bodyWrapperRef = useRef<HTMLDivElement>(null);
	const tableRef = useRef<HTMLTableElement>(null);
	const spacerRef = useRef<HTMLDivElement>(null);

	// Function to sync column widths
	const syncColumnWidths = useCallback(() => {
		if (!headerRef.current || !bodyWrapperRef.current) return;
		
		const headerCells = Array.from(headerRef.current.querySelectorAll('tr:first-child th')) as HTMLElement[];
		const bodyCells = Array.from(bodyWrapperRef.current.querySelectorAll('tr:first-child td')) as HTMLElement[];
		
		headerCells.forEach((headerCell, index) => {
			const width = headerCell.offsetWidth;
			const bodyCell = bodyCells[index];
			if (bodyCell) bodyCell.style.width = `${width}px`;
		});
	}, []);

	// Function to sync horizontal scrolling
	const handleScroll = useCallback((e: Event) => {
		if (!headerRef.current || !bodyWrapperRef.current) return;
		
		if (e.target === bodyWrapperRef.current) {
			headerRef.current.style.transform = 
				`translateX(-${bodyWrapperRef.current.scrollLeft}px)`;
		}
	}, []);

	// Set up listeners
	useEffect(() => {
		const bodyWrapper = bodyWrapperRef.current;
		if (bodyWrapper) {
			bodyWrapper.addEventListener('scroll', handleScroll);
			// Initial sync
			syncColumnWidths();
			
			// Also sync on window resize
			window.addEventListener('resize', syncColumnWidths);
		}

		return () => {
			if (bodyWrapper) {
				bodyWrapper.removeEventListener('scroll', handleScroll);
				window.removeEventListener('resize', syncColumnWidths);
			}
		};
	}, [handleScroll, syncColumnWidths]);

	// Sync columns whenever data changes
	useEffect(() => {
		syncColumnWidths();
	}, [dailyHours, syncColumnWidths]);

	const processReports = (reports: HoursTableReport[]) => {
		const hours: DailyHours = {};
		const totals: TotalHours = {};
		const uniqueDates = new Set<string>();
		const uniqueNames = new Set<string>();
		const overtimeCheck: { [name: string]: boolean } = {};

		reports.forEach(report => {
			const { date, name, time_in, time_out, is_overtime, overtime_hours } = report;
			const formattedDate = new Date(date).toISOString().split('T')[0].slice(5);
			const month = new Date(date).toLocaleString('default', { month: 'long', year: 'numeric' });

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
				regular: formatHours(regularHours),
				overtime: is_overtime ? formatHours(overtime_hours) : '0'
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

		const processedDates = Array.from(uniqueDates).sort().reverse();
		const processedNames = Array.from(uniqueNames).sort();

		setDailyHours(hours);
		setTotalHours(totals);
		setDates(processedDates);
		setNames(processedNames);
		setHasOvertime(overtimeCheck);
		setLoading(false);
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

	return (
		<div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
			<div className="fixed-header">
				<div>
					<button onClick={onRefresh} className="secondary-button" style={{ maxWidth: '300px' }}>
						Refresh Data
					</button>
					<h1>Hours Worked</h1>
				</div>
			</div>
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
									<h2>{month}</h2>
									<div className="table-container">
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
																{formatHours(monthlyTotals[name]?.regular || 0)}
															</td>
															{monthlyOvertime[name] && (
																<td className="total-cell hours-column">
																	{formatHours(monthlyTotals[name]?.overtime || 0)}
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

const calculateHours = (timeIn: string, timeOut: string): number => {
	const [inHours, inMinutes] = timeIn.split(':').map(Number);
	const [outHours, outMinutes] = timeOut.split(':').map(Number);

	let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);

	if (totalMinutes < 0) {
		totalMinutes += 24 * 60;
	}

	return totalMinutes / 60;
};

const formatHours = (hours: number): string => {
	const wholeHours = Math.floor(hours);
	const minutes = Math.round((hours - wholeHours) * 60);
	return minutes === 0 ? `${wholeHours}` : `${wholeHours}.${minutes.toString().padStart(2, '0')}`;
};

export default HoursTable;
