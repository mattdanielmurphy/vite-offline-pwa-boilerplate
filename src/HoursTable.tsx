import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { HoursTableReport } from './interfaces/Report';
import { FaSpinner } from 'react-icons/fa';

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
			const formattedDate = new Date(date).toISOString().split('T')[0];
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

	return (
		<div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
			<button onClick={onRefresh} className="secondary-button">
				Refresh Data
			</button>
			<h1>Hours Worked</h1>
			{loading ? (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<FaSpinner className="spinner" />
				</div>
			) : (
				<>
					{Object.keys(dailyHours).map((month: string) => (
						<div key={month}>
							<h2>{month}</h2>
							<table style={{ width: '100%', borderCollapse: 'collapse' }}>
								<thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--report-bg-color)' }}>
									<tr>
										<th style={headerCellStyle}>Date</th>
										{names.map(name => (
											<React.Fragment key={name}>
												<th style={headerCellStyle} colSpan={hasOvertime[name] ? 2 : 1}>{name}</th>
											</React.Fragment>
										))}
									</tr>
									<tr>
										<th style={subHeaderCellStyle}></th>
										{names.map(name => (
											<React.Fragment key={`subheader-${name}`}>
												<th style={subHeaderCellStyle}>Reg</th>
												{hasOvertime[name] && <th style={subHeaderCellStyle}>OT</th>}
											</React.Fragment>
										))}
									</tr>
								</thead>
								<tbody>
									{Object.keys(dailyHours[month]).map(date => (
										<tr key={date}>
											<td style={cellStyle}>{date}</td>
											{names.map(name => (
												<React.Fragment key={`${date}-${name}`}>
													<td style={cellStyle}>
														{(dailyHours[month][date]?.[name] as DailyHourEntry)?.regular || '-'}
													</td>
													{hasOvertime[name] && (
														<td style={cellStyle}>
															{(dailyHours[month][date]?.[name] as DailyHourEntry)?.overtime !== '0' ?
																(dailyHours[month][date]?.[name] as DailyHourEntry)?.overtime : '-'}
														</td>
													)}
												</React.Fragment>
											))}
										</tr>
									))}
									<tr>
										<td style={totalCellStyle}>Total Hours</td>
										{names.map(name => (
											<React.Fragment key={`total-${name}`}>
												<td style={totalCellStyle}>
													{formatHours(totalHours[name]?.regular || 0)}
												</td>
												{hasOvertime[name] && (
													<td style={totalCellStyle}>
														{formatHours(totalHours[name]?.overtime || 0)} OT
													</td>
												)}
											</React.Fragment>
										))}
									</tr>
								</tbody>
							</table>
						</div>
					))}
				</>
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

const headerCellStyle: React.CSSProperties = {
	backgroundColor: 'var(--report-bg-color)',
	color: 'var(--text-color)',
	padding: '10px',
	textAlign: 'center',
	borderBottom: '2px solid var(--border-color)',
	borderRight: '1px solid var(--border-color)',
};

const subHeaderCellStyle: React.CSSProperties = {
	...headerCellStyle,
	fontWeight: 'normal',
	fontSize: '0.9em',
};

const cellStyle: React.CSSProperties = {
	padding: '10px',
	borderBottom: '1px solid var(--border-color)',
	borderRight: '1px solid var(--border-color)',
	textAlign: 'center',
};

const totalCellStyle: React.CSSProperties = {
	...cellStyle,
	fontWeight: 'bold',
	backgroundColor: 'var(--report-bg-color)',
};

export default HoursTable;
