import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import DatePicker from 'react-datepicker';
import { format, startOfDay, getHours, getMinutes, getDay, addHours, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css'; // Import the CSS for the date picker
import "./App.css"

const defaultWeather = 'Rainy'; // Default weather

// Schedule object to determine default names based on day and time
const defaultSchedule = {
	'1': { // Monday
		'00:00': 'Marty',
		'08:00': 'Jason',
		'16:00': 'Colin',
	},
	'2': { // Tuesday
		'00:00': 'Terry',
		'08:00': 'Jason',
		'16:00': 'Colin',
	},
	'3': { // Wednesday
		'00:00': 'Terry',
		'08:00': 'Jason',
		'16:00': 'Matthew',
	},
	'4': { // Thursday
		'00:00': 'Terry',
		'08:00': 'Jason',
		'16:00': 'Matthew',
	},
	'5': { // Friday
		'00:00': 'Terry',
		'08:00': 'Jason',
		'16:00': 'Matthew',
	},
	'6': { // Saturday
		'00:00': 'Marty',
		'08:00': 'Manpreet',
		'16:00': 'Matthew',
	},
	'0': { // Sunday
		'00:00': 'Marty',
		'08:00': 'Manpreet',
		'16:00': 'Matthew',
	},
};

const ReportForm: React.FC<{ onReportSubmit: () => void }> = ({ onReportSubmit }) => {
	const [date, setDate] = useState<Date | null>(new Date()); // for testing replace with e.g.: new Date(`2024-10-27T08:30`)
	const [name, setName] = useState<string>(''); // Default name
	const [weather, setWeather] = useState<string>(defaultWeather); // Default weather
	const [timeIn, setTimeIn] = useState<string>('');
	const [timeOut, setTimeOut] = useState<string>('');
	const [details, setDetails] = useState<string>('');
	const [tasks, setTasks] = useState<Array<{ time: string; description: string }>>([{ time: '', description: '' }]);
	const [overtime, setOvertime] = useState<boolean>(false);
	const [overtimeHours, setOvertimeHours] = useState<number>(0);
	const [otherName, setOtherName] = useState<string>('');
	const [otherWeather, setOtherWeather] = useState<string>('');
	const [isUserChangingDate, setIsUserChangingDate] = useState<boolean>(false); // Track user-initiated date changes

	useEffect(() => {
		// Set the initial task time to the determined default timeIn value
		if (timeIn && tasks[0].time === '') {
			setTasks([{ time: timeIn, description: '' }]);
		}
	}, [timeIn]); // Run when timeIn changes

	const determineTimeAndName = (currentDate: Date, earlyNightStart?: Date) => {
		const hours = getHours(currentDate);
		const minutes = getMinutes(currentDate);
		const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

		// Determine timeIn
		const determineTimeIn = (currentTime: string) => {
			const currentDateTime = new Date(`1970-01-01T${currentTime}`); // Use currentTime for comparison
			// Define the time ranges
			const timeIn16 = parseISO('1970-01-01T16:00'); // 16:00
			const nightEnd = parseISO('1970-01-01T07:45'); // 07:45
			const morningStart = parseISO('1970-01-01T07:44'); // 07:44

			console.log(currentDateTime, isAfter(currentDateTime, earlyNightStart!));

			// Determine timeIn based on current time
			if (earlyNightStart !== undefined && isAfter(currentDateTime, earlyNightStart)) {
				return '00:00'; // Set timeIn to 00:00
			} else if (isBefore(currentDateTime, nightEnd)) {
				return '00:00'; // Set timeIn to 00:00
			} else if (isAfter(currentDateTime, morningStart) && isBefore(currentDateTime, timeIn16)) {
				return '08:00'; // Set timeIn to 08:00
			} else {
				return '16:00'; // Set timeIn to 16:00
			}
		};

		const selectedTimeIn = determineTimeIn(currentTime);
		setTimeIn(selectedTimeIn);

		// Determine the default name based on the schedule
		const dayOfWeek = getDay(currentDate).toString() as keyof typeof defaultSchedule; // Cast to the correct type
		const scheduleForDay = defaultSchedule[dayOfWeek];
		if (scheduleForDay && currentTime) {
			// Use currentTime to set the name directly
			setName(scheduleForDay[selectedTimeIn]);
		}

		// Set timeOut to 8 hours after timeIn
		const timeInDate = new Date(`1970-01-01T${selectedTimeIn}`);
		const timeOutDate = addHours(timeInDate, 8);
		const selectedTimeOut = timeOutDate.toTimeString().slice(0, 5);
		setTimeOut(selectedTimeOut);
	};

	useEffect(() => {
		// Initial setup for date
		if (date) {
			let currentDate = date;
			const hours = getHours(currentDate);
			const minutes = getMinutes(currentDate);
			const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
			const currentDateTime = new Date(`1970-01-01T${currentTime}`); // Use currentTime for comparison
			const earlyNightStart = parseISO('1970-01-01T23:30'); // 23:30
			if (isAfter(currentDateTime, earlyNightStart)) {
				currentDate = addDays(date, 1);
				determineTimeAndName(currentDate, earlyNightStart);
				setDate(currentDate); // Change the state of 'date' to tomorrow
				// Reset user change flag since this is a programmatic change
				setIsUserChangingDate(false);
			} else {
				determineTimeAndName(date, earlyNightStart);
			}
		}
	}, []); // Run only once on mount

	useEffect(() => {
		// This effect will run when 'date' changes
		if (isUserChangingDate && date) { // Check if the change was user-initiated
			determineTimeAndName(date);
		}
	}, [date]); // Run when 'date' changes

	const handleDateChange = (date: Date | null) => {
		if (date) {
			setDate(startOfDay(date)); // Set to start of the day
			setIsUserChangingDate(true); // Mark as user-initiated change
		}
	};

	const submitReport = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Validation
		if (!date || !name || !weather || !timeIn || !timeOut) {
			alert("Please fill in all required fields");
			return;
		}

		// Filter out tasks with blank descriptions
		const filteredTasks = tasks.filter(task => task.description.trim() !== '');

		// Calculate hours worked
		const hoursWorked = calculateHours(timeIn, timeOut);

		// Alert if overtime is unchecked but hours worked exceed 8
		if (!overtime && hoursWorked > 8) {
			alert("You have worked more than 8 hours. Please check the overtime box if applicable.");
			return;
		}

		// Convert date to Vancouver timezone
		const vancouverTimestamp = format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");

		const { data, error } = await supabase
			.from('reports')
			.insert([
				{
					date: vancouverTimestamp, // Store as timestamp with timezone
					name: name === 'Other' ? otherName : name,
					weather: weather === 'Other' ? otherWeather : weather,
					time_in: timeIn,
					time_out: timeOut,
					details,
					tasks: filteredTasks.length > 0 ? JSON.stringify(filteredTasks) : null, // Only include if there are tasks
					is_overtime: overtime,
					overtime_hours: overtime ? overtimeHours : 0,
					total_hours: hoursWorked
				}
			]);

		if (error) {
			console.error('Error inserting report:', error);
			alert('Failed to submit report. Please try again.');
		} else {
			alert('Report submitted successfully!');
			// Call the onReportSubmit callback
			onReportSubmit();
			// Reset form
			setDate(new Date());
			setName('');
			setWeather(defaultWeather); // Reset to default weather
			setTimeIn('');
			setTimeOut('');
			setDetails('');
			setTasks([{ time: '', description: '' }]); // Reset to initial state
			setOvertime(false);
			setOvertimeHours(0);
			setOtherName('');
			setOtherWeather('');
		}
	};

	const addTask = () => {
		const lastTask = tasks[tasks.length - 1];
		const [hours, minutes] = lastTask.time.split(':').map(Number);
		const nextHour = (hours + 1) % 24;
		const nextTime = `${String(nextHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
		setTasks([...tasks, { time: nextTime, description: '' }]);
	};

	const calculateHours = (timeIn: string, timeOut: string): number => {
		const [inHours, inMinutes] = timeIn.split(':').map(Number);
		const [outHours, outMinutes] = timeOut.split(':').map(Number);

		let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);

		if (totalMinutes < 0) {
			totalMinutes += 24 * 60;
		}

		return Number((totalMinutes / 60).toFixed(2));
	};

	useEffect(() => {
		const hours = calculateHours(timeIn, timeOut);
		if (overtime && hours > 8) {
			setOvertimeHours(hours - 8);
		}
	}, [timeIn, timeOut, overtime]);

	return (
		<div className="report-form">
			<h1>New Report</h1>
			<form onSubmit={submitReport}>
				<div className="form-group">
					<label htmlFor="date-input">Date</label>
					<DatePicker
						id="date-input"
						selected={date}
						onChange={handleDateChange}
						dateFormat="yyyy-MM-dd"
						placeholderText="Select a date"
					/>
				</div>

				<div className="form-group">
					<label htmlFor="name-input">Name</label>
					<select
						id="name-input"
						value={name}
						onChange={(e) => setName(e.target.value)}
					>
						<option value="">Select a name</option>
						{['Manpreet', 'Colin', 'Matthew', 'Jason', 'Terry', 'Marty', 'Other'].map((option) => (
							<option key={option} value={option}>{option}</option>
						))}
					</select>
					{name === 'Other' && (
						<input
							type="text"
							value={otherName}
							onChange={(e) => setOtherName(e.target.value)}
							placeholder="Enter name"
						/>
					)}
				</div>

				<div className="form-group">
					<label htmlFor="weather-input">Weather</label>
					<select
						id="weather-input"
						value={weather}
						onChange={(e) => setWeather(e.target.value)}
					>
						<option value="Rainy">Rainy</option>
						<option value="Sunny">Sunny</option>
						<option value="Cloudy">Cloudy</option>
						<option value="Snowy">Snowy</option>
						<option value="Windy">Windy</option>
						<option value="Other">Other</option>
					</select>
				</div>

				<div className="form-group">
					<label htmlFor="time-in-input">Time In</label>
					<input
						id="time-in-input"
						type="time"
						value={timeIn}
						onChange={(e) => setTimeIn(e.target.value)}
					/>
				</div>

				<div className="form-group">
					<label htmlFor="time-out-input">Time Out</label>
					<input
						id="time-out-input"
						type="time"
						value={timeOut}
						onChange={(e) => setTimeOut(e.target.value)}
					/>
				</div>

				<div className="form-group">
					<label htmlFor="details-input">Details</label>
					<textarea
						id="details-input"
						value={details}
						onChange={(e) => setDetails(e.target.value)}
						rows={4}
					/>
				</div>

				<div className="form-group" id="tasks-container">
					<h3>Tasks</h3>
					{tasks.map((task, index) => (
						<div key={index} className="task-input">
							<input
								type="time"
								value={task.time}
								onChange={(e) => {
									const newTasks = [...tasks];
									newTasks[index].time = e.target.value;
									setTasks(newTasks);
								}}
								placeholder="Time"
							/>
							<input
								type="text"
								value={task.description}
								onChange={(e) => {
									const newTasks = [...tasks];
									newTasks[index].description = e.target.value;
									setTasks(newTasks);
								}}
								placeholder="Description"
							/>
						</div>
					))}
					<button type="button" onClick={addTask} className="secondary-button">Add Task</button>
				</div>

				<div className="form-group checkbox-group">
					<label htmlFor="overtime-input">Overtime?</label>
					<input
						id="overtime-input"
						type="checkbox"
						checked={overtime}
						onChange={(e) => setOvertime(e.target.checked)}
					/>
					{overtime && (
						<div className="overtime-hours">
							<label htmlFor="overtime-hours-input">Hours:</label>
							<input
								id="overtime-hours-input"
								type="number"
								value={overtimeHours}
								onChange={(e) => setOvertimeHours(parseFloat(e.target.value))}
								min="0"
								step="1"
							/>
						</div>
					)}
				</div>

				<button type="submit">Submit</button>
			</form>
		</div>
	);
};

export default ReportForm;
