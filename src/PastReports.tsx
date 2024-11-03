import { FaSpinner } from 'react-icons/fa';
import React from 'react';
import { Report } from './interfaces/Report';

const PastReports: React.FC<{ reports: Report[], loading: boolean, onRefresh: () => void }> = ({ reports, loading, onRefresh }) => {
	return (
		<div style={{ maxWidth: '400px', margin: '0 auto' }}>
			<button onClick={onRefresh} className="secondary-button" style={{ maxWidth: '300px' }}>
				Refresh Data
			</button>
			<h1>Past Reports</h1>
			{loading ? (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<FaSpinner className="spinner" />
				</div>
			) : (
				reports.map((report) => {
					const parsedTasks = report.tasks ? JSON.parse(report.tasks) : [];

					return (
						<div key={report.id} style={cardStyle} className="report-card">
							<table style={headerTableStyle}>
								<tbody>
									<tr>
										<td style={{ ...headerCellStyle, textAlign: 'left' }}>{formatDate(report.date)}</td>
										<td style={{ ...headerCellStyle, textAlign: 'left' }}>{report.name}</td>
									</tr>
								</tbody>
							</table>
							<div style={hoursStyle}>
								{formatTime(report.time_in)} - {formatTime(report.time_out)} ({calculateHours(report.time_in, report.time_out)})
							</div>
							<table style={tableStyle}>
								<tbody>
									<tr>
										<td style={labelStyle}>Weather:</td>
										<td style={cellStyle}>{report.weather}</td>
									</tr>
									<tr>
										<td style={labelStyle}>Overtime:</td>
										<td style={cellStyle}>
											{report.is_overtime
												? `Yes (${report.overtime_hours}h)`
												: 'No'}
										</td>
									</tr>
									{report.details && report.details.trim() !== '' && (
										<tr>
											<td style={labelStyle}>Details:</td>
											<td style={{ ...cellStyle, whiteSpace: 'pre-wrap' }}>{report.details}</td>
										</tr>
									)}
								</tbody>
							</table>
							<div style={tasksSectionStyle}>
								<h3 style={tasksHeaderStyle}>Tasks</h3>
								<div style={tasksTableWrapperStyle}>
									<table style={tasksTableStyle}>
										<tbody>
											{Array.isArray(parsedTasks) && parsedTasks.length > 0 ? (
												parsedTasks.map((task: { time: string; description: string }, index: number) => (
													task.description.trim() !== '' && (
														<tr key={index}>
															<td style={taskTimeStyle}>{formatTime(task.time)}</td>
															<td style={taskDescriptionStyle}>{task.description}</td>
														</tr>
													)
												))
											) : (
												<tr>
													<td colSpan={2} style={{ textAlign: 'center' }}>No tasks listed</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					);
				})
			)}
		</div>
	);
};

// The formatting functions and styles remain unchanged
const formatDate = (dateValue: string | Date) => {
	const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (timeString: string) => {
	if (!timeString) {
		console.error('Invalid time string:', timeString);
		return 'Invalid time'; // Return a fallback value for invalid input
	}

	const [hours, minutes] = timeString.split(':').map(Number);

	if (isNaN(hours) || isNaN(minutes)) {
		console.error('Invalid time format:', timeString);
		return 'Invalid time'; // Return a fallback value for invalid format
	}

	const ampm = hours >= 12 ? 'pm' : 'am';
	const formattedHours = hours % 12 || 12;
	return minutes === 0 ? `${formattedHours}${ampm}` : `${formattedHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
};

const calculateHours = (timeIn: string, timeOut: string) => {
	const [inHours, inMinutes] = timeIn.split(':').map(Number);
	const [outHours, outMinutes] = timeOut.split(':').map(Number);
	let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
	if (totalMinutes < 0) {
		totalMinutes += 24 * 60;
	}
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

const formatTasks = (tasksString: string) => {
	try {
		return JSON.parse(tasksString);
	} catch (error) {
		console.error('Error parsing tasks:', error);
		return [];
	}
};

const cardStyle: React.CSSProperties = {
	border: '1px solid var(--border-color)',
	borderRadius: '8px',
	padding: '20px',
	textAlign: 'center',
	marginBottom: '20px',
	backgroundColor: 'var(--report-bg-color)',
};

const headerTableStyle: React.CSSProperties = {
	// width: '100%',
	margin: '0 auto',
	borderCollapse: 'collapse',
	marginBottom: '15px',
};

const headerCellStyle: React.CSSProperties = {
	textAlign: 'left', // Default to left alignment
	fontWeight: 'bold',
	fontSize: '1.2em',
	padding: '5px',
};

const tableStyle: React.CSSProperties = {
	// width: '100%',
	margin: '0 auto',
	borderCollapse: 'collapse',
};

const labelStyle: React.CSSProperties = {
	fontWeight: 'bold',
	paddingRight: '10px',
	verticalAlign: 'top',
	width: '80px',
	textAlign: 'left',
};

const cellStyle: React.CSSProperties = {
	textAlign: 'left',
	paddingBottom: '5px',
};

const tasksSectionStyle: React.CSSProperties = {
	marginTop: '20px',
};

const tasksHeaderStyle: React.CSSProperties = {
	textAlign: 'center',
	marginBottom: '10px',
};

const tasksTableStyle: React.CSSProperties = {
	width: '100%',
	borderCollapse: 'collapse'
};

const tasksTableWrapperStyle: React.CSSProperties = {
	background: 'var(--bg-color)',
	borderRadius: '10px',
	padding: '5px 10px'
};

const taskTimeStyle: React.CSSProperties = {
	paddingRight: '10px',
	whiteSpace: 'nowrap',
	width: '20px',
	textAlign: 'left',
};

const taskDescriptionStyle: React.CSSProperties = {
	textAlign: 'left',
	paddingLeft: '10px',
};

const hoursStyle: React.CSSProperties = {
	textAlign: 'center',
	marginBottom: '15px',
	fontSize: '1.1em',
};

export default PastReports;
