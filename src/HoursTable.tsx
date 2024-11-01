import React, { useCallback, useEffect, useState } from 'react';

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

	return (
		<div className="page-container">
			<button onClick={onRefresh} className="secondary-button">
				Refresh Data
			</button>
			<h1>Hours Worked</h1>
			{loading ? (
				<div className="loading-spinner">
					<FaSpinner className="spinner" />
				</div>
			) : (
				<div className="table-container">
					{Object.keys(dailyHours).map((month: string) => {
						const { totals: monthlyTotals, hasOvertime: monthlyOvertime } = calculateMonthlyTotals(month);
						return (
							<div key={month} className="month-section">
								<h2>{month}</h2>
								<table className="hours-table">
									<thead>
										<tr>
											<th className="header-cell">Date</th>
											{names.map(name => (
												<React.Fragment key={name}>
													<th className="header-cell" colSpan={monthlyOvertime[name] ? 2 : 1}>{name}</th>
												</React.Fragment>
											))}
										</tr>
										<tr>
											<th className="sub-header-cell"></th>
											{names.map(name => (
												<React.Fragment key={`subheader-${name}`}>
													<th className="sub-header-cell">Reg</th>
													{monthlyOvertime[name] && <th className="sub-header-cell">OT</th>}
												</React.Fragment>
											))}
										</tr>
									</thead>
									<tbody>
										{Object.keys(dailyHours[month]).map(date => (
											<tr key={date}>
												<td className="table-cell">{date}</td>
												{names.map(name => (
													<React.Fragment key={`${date}-${name}`}>
														<td className="table-cell">
															{(dailyHours[month][date]?.[name] as DailyHourEntry)?.regular || '-'}
														</td>
														{monthlyOvertime[name] && (
															<td className="table-cell">
																{(dailyHours[month][date]?.[name] as DailyHourEntry)?.overtime !== '0' ?
																	(dailyHours[month][date]?.[name] as DailyHourEntry)?.overtime : '-'}
															</td>
														)}
													</React.Fragment>
												))}
											</tr>
										))}
										<tr>
											<td className="total-cell">Monthly Total</td>
											{names.map(name => (
												<React.Fragment key={`monthly-total-${name}`}>
													<td className="total-cell">
														{formatHours(monthlyTotals[name]?.regular || 0)}
													</td>
													{monthlyOvertime[name] && (
														<td className="total-cell">
															{formatHours(monthlyTotals[name]?.overtime || 0)} OT
														</td>
													)}
												</React.Fragment>
												))}
										</tr>
									</tbody>
								</table>
							</div>
						);
					})}
				</div>
			)}
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
