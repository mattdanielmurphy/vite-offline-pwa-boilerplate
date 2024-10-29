import { Report } from '../src/interfaces/Report';
import { createClient } from '@supabase/supabase-js';
import { format, startOfDay, subDays, subWeeks, subMonths, isSameDay, isWithinInterval } from 'date-fns';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
	try {
		// Fetch users and their address preferences from Supabase
		const { data: users, error: userError } = await supabase
			.from('report-email-recipients')
			.select('address, frequency');

		if (userError) {
			throw userError;
		}

		// Get the current date
		const currentDate = startOfDay(new Date()); // Set to start of the day
		const previousDay = subDays(currentDate, 1); // For daily reports
		const previousWeekStart = subWeeks(currentDate, 1); // For weekly reports
		const previousMonthStart = subMonths(currentDate, 1); // For monthly reports

		// Fetch reports from the last month
		const { data: reports, error: reportError } = await supabase
			.from('reports') // Replace with your actual table name
			.select('*')
			.gte('date', previousMonthStart.toISOString()); // Use 'date' instead of 'created_at'

		if (reportError) {
			throw reportError;
		}

		// Sort reports in reverse chronological order
		reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		// Prepare emails to send
		const emailsToSend = [];

		for (const user of users) {
			const { address, frequency } = user;

			let subject = '';
			let text = '';

			if (frequency === 'daily') {
				const dailyReport = reports.find(report => {
					const reportDate = new Date(report.date);
					return isSameDay(reportDate, previousDay);
				});

				if (dailyReport) {
					const emailContent = formatEmailReports([dailyReport]);
					subject = 'Your Daily Report';
					text = `Here is your report from yesterday:\n\n${emailContent}`;
				}
			} else if (frequency === 'weekly') {
				const weeklyReports = reports.filter(report => {
					const reportDate = new Date(report.date);
					return isWithinInterval(reportDate, { start: previousWeekStart, end: currentDate });
				});

				if (weeklyReports.length > 0) {
					const emailContent = formatEmailReports(weeklyReports);
					subject = 'Your Weekly Report';
					text = `Here are your reports from the past week:\n\n${emailContent}`;
				}
			} else if (frequency === 'monthly') {
				const monthlyReports = reports.filter(report => {
					const reportDate = new Date(report.date);
					return reportDate.getMonth() === previousMonthStart.getMonth() && reportDate.getFullYear() === previousMonthStart.getFullYear();
				});

				if (monthlyReports.length > 0) {
					const emailContent = formatEmailReports(monthlyReports);
					subject = 'Your Monthly Report';
					text = `Here are your reports from the past month:\n\n${emailContent}`;
				}
			}

			if (subject && text) {
				emailsToSend.push({ address, subject, text });
			}
		}
		console.log('sending these emails:\n', emailsToSend);
		// return new Response() // skip emailing for now
		// Send emails using the existing /api/send-emails endpoint
		if (emailsToSend.length > 0) {
			const response = await fetch(`${process.env.VERCEL_URL!.includes('localhost') ? 'http://' : 'https://'}${process.env.VERCEL_URL}/api/send-emails`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(emailsToSend),
			});

			if (!response.ok) {
				throw new Error('Failed to send emails');
			}
		}

		return new Response(JSON.stringify({ message: 'Reports sent successfully' }), { status: 200 });
	} catch (error) {
		console.error(error);
		return new Response(JSON.stringify({ message: 'Failed to send reports' }), { status: 500 });
	}
}

const formatEmailReports = (reports: Report[]) => {
	return reports.map(report => {
		// Format the date directly
		const date = new Date(report.date);
		const formattedDate = format(date, 'EEEE, MMM dd yyyy'); // Format: "Monday, Oct 26 2024"

		// Format the time directly
		const formatTime = (timeString: string) => {
			const [hours, minutes] = timeString.split(':').map(Number);
			const ampm = hours >= 12 ? 'pm' : 'am';
			const formattedHours = hours % 12 || 12;
			return minutes === 0 ? `${formattedHours}${ampm}` : `${formattedHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
		};

		const formattedTimeIn = formatTime(report.time_in);
		const formattedTimeOut = formatTime(report.time_out);

		// Calculate hours worked
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

		const hoursWorked = calculateHours(report.time_in, report.time_out);
		const weather = report.weather || 'N/A';
		const overtime = report.is_overtime ? `Yes (${report.overtime_hours === 1 ? '1 hour' : `${report.overtime_hours} hours`})` : 'No';
		const details = report.details?.trim()

		// Format tasks
		const formatTasks = (tasksString: string) => {
			try {
				return JSON.parse(tasksString);
			} catch (error) {
				console.error('Error parsing tasks:', error);
				return [];
			}
		};

		// Define the Task interface
		interface Task {
			time: string;
			description: string;
		}

		const tasks = formatTasks(report.tasks).map((task: Task) => {
			return `\t- ${formatTime(task.time)}: ${task.description}`;
		}).join('\n');

		// Format the report string
		const reportParts = [
			`${formattedDate} - ${report.name} - ${formattedTimeIn} to ${formattedTimeOut} (${hoursWorked})`,
			`\tWeather: ${weather}`,
			`\tOvertime: ${overtime}`,
		];
		if (details) {
			reportParts.push(`\tDetails: ${details}`);
		}
		reportParts.push(`\tTasks:\n${tasks}`);

		return reportParts.join('\n'); // Join all parts and ensure proper formatting
	}).join('\n\n'); // Separate each report with a new line
};

