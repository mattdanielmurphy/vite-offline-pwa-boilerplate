import 'react-datepicker/dist/react-datepicker.css';
import "./App.css";

import React, { useEffect, useRef, useState } from 'react';
import { addDays, addHours, format, getDay, getHours, getMinutes, isAfter, isBefore, parseISO } from 'date-fns';
import { defaultSchedule, getDefaultWeather } from './utils/defaults';

import ConfirmationModal from './components/ConfirmationModal';
import DatePicker from 'react-datepicker';
import { addToOfflineQueue } from './App';
import { calculateHours } from './utils/dateTime';
import { shift } from "@floating-ui/dom"; // Add this import
import { supabase } from './supabaseClient';

interface Report {
	date: string;
	name: string;
	weather: string;
	time_in: string;
	time_out: string;
	details: string;
	tasks: string | null;
	is_overtime: boolean;
	overtime_hours: number;
	total_hours: number;
	id: number;
	created_at: string;
	attempts?: number;
}

const ReportForm: React.FC = () => {
	const formRef = useRef<HTMLFormElement>(null);
	const [date, setDate] = useState<Date | null>(new Date()); // for testing replace with e.g.: new Date(`2024-10-27T08:30`)
	const [name, setName] = useState<string>(''); // Default name
	const [weather, setWeather] = useState<string>(getDefaultWeather()); // Default weather
	const [timeIn, setTimeIn] = useState<string>('');
	const [timeOut, setTimeOut] = useState<string>('');
	const [details, setDetails] = useState<string>('');
	const [tasks, setTasks] = useState<Array<{ time: string; description: string }>>([{ time: '', description: '' }]);
	const [overtimeHours, setOvertimeHours] = useState<number>(0);
	const [otherName, setOtherName] = useState<string>('');
	const [otherWeather, setOtherWeather] = useState<string>('');
	const [isUserChangingDate, setIsUserChangingDate] = useState<boolean>(false); // Track user-initiated date changes
	const [nameSelectWidth, setNameSelectWidth] = useState('100%');
	const otherNameInputRef = useRef<HTMLInputElement>(null);
	const [showOvertimeModal, setShowOvertimeModal] = useState(false);
	const [isOvertimeHighlighted, setIsOvertimeHighlighted] = useState(false);

	// Track which fields have been manually set
	const [userModifiedFields, setUserModifiedFields] = useState({
		timeIn: false,
		timeOut: false,
		name: false
	});

	// Add new state to track if overtime was auto-set
	const [isOvertimeAutoSet, setIsOvertimeAutoSet] = useState(false);

	// Helper function to update a field and mark it as user-modified
	const handleFieldChange = (field: keyof typeof userModifiedFields, value: string) => {
		switch(field) {
			case 'timeIn':
				setTimeIn(value);
				break;
			case 'timeOut':
				setTimeOut(value);
				break;
			case 'name':
				setName(value);
				if (value === 'Other') {
					setNameSelectWidth('83px');
				} else {
					setNameSelectWidth('100%');
				}
				break;
		}
		setUserModifiedFields(prev => ({ ...prev, [field]: true }));
	};

	const initializeFormDefaults = () => {
		if (date) {
			let currentDate = new Date();
			const hours = getHours(currentDate);
			const minutes = getMinutes(currentDate);
			const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
			const currentDateTime = new Date(`1970-01-01T${currentTime}`);
			const earlyNightStart = parseISO('1970-01-01T23:30');
			
			if (isAfter(currentDateTime, earlyNightStart)) {
				currentDate = addDays(currentDate, 1);
				determineTimeAndName(currentDate, earlyNightStart);
				setDate(currentDate);
				setIsUserChangingDate(false);
			} else {
				determineTimeAndName(currentDate, earlyNightStart);
			}
		}
	};

	// Initial mount effect
	useEffect(() => {
		const hasCachedValues = localStorage.getItem('reportDate') && 
							   localStorage.getItem('reportTimeIn') && 
							   localStorage.getItem('reportTimeOut') && 
							   localStorage.getItem('reportName');
		
		if (hasCachedValues) {
			// Load cached values
			setDate(new Date(localStorage.getItem('reportDate')!));
			setTimeIn(localStorage.getItem('reportTimeIn')!);
			setTimeOut(localStorage.getItem('reportTimeOut')!);
			setName(localStorage.getItem('reportName')!);
			setWeather(localStorage.getItem('reportWeather') || getDefaultWeather());
			setDetails(localStorage.getItem('reportDetails') || '');
			setTasks(JSON.parse(localStorage.getItem('reportTasks') || '[]') || [{ time: '', description: '' }]);
			setOvertimeHours(Number(localStorage.getItem('reportOvertimeHours')) || 0);
			setOtherName(localStorage.getItem('reportOtherName') || '');
			setOtherWeather(localStorage.getItem('reportOtherWeather') || '');
		} else {
			initializeFormDefaults();
		}
	}, []);

	// Save all values when they change
	useEffect(() => {
		// Always save current values, even if empty
		if (date) localStorage.setItem('reportDate', date.toISOString());
		localStorage.setItem('reportTimeIn', timeIn);
		localStorage.setItem('reportTimeOut', timeOut);
		localStorage.setItem('reportName', name);
		localStorage.setItem('reportWeather', weather);
		localStorage.setItem('reportDetails', details);
		localStorage.setItem('reportTasks', JSON.stringify(tasks));
		localStorage.setItem('reportOvertimeHours', overtimeHours.toString());
		localStorage.setItem('reportOtherName', otherName);
		localStorage.setItem('reportOtherWeather', otherWeather);
	}, [date, timeIn, timeOut, name, weather, details, tasks, overtimeHours, otherName, otherWeather]);

	useEffect(() => {
		// Set the initial task time to the determined default timeIn value
		if (timeIn) {
			setTasks([{ time: timeIn, description: '' }]);
		}
	}, [timeIn]); // Run when timeIn changes

	useEffect(() => { // Focus to Other name input box if "Other" name selected
		nameSelectWidth !== "100%" && otherNameInputRef?.current?.focus()
	}, [nameSelectWidth])

	// Move determineTimeIn out to component scope
	const determineTimeIn = (currentTime: string) => {
		const currentDateTime = new Date(`1970-01-01T${currentTime}`);
		// Define the time ranges
		const timeIn16 = parseISO('1970-01-01T16:00');
		const nightEnd = parseISO('1970-01-01T07:45');
		const morningStart = parseISO('1970-01-01T07:44');
		const earlyNightStart = parseISO('1970-01-01T23:30');

		// Determine timeIn based on current time
		if (isAfter(currentDateTime, earlyNightStart)) {
			return '00:00';
		} else if (isBefore(currentDateTime, nightEnd)) {
			return '00:00';
		} else if (isAfter(currentDateTime, morningStart) && isBefore(currentDateTime, timeIn16)) {
			return '08:00';
		} else {
			return '16:00';
		}
	};

	const determineTimeAndName = (currentDate: Date, earlyNightStart?: Date) => {
		const hours = getHours(currentDate);
		const minutes = getMinutes(currentDate);
		const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

		const selectedTimeIn = determineTimeIn(currentTime);
		console.log('selectedTimeIn', selectedTimeIn);
		setTimeIn(selectedTimeIn);

		// Determine the default name based on the schedule
		const dayOfWeek = getDay(currentDate).toString() as keyof typeof defaultSchedule;
		const scheduleForDay = defaultSchedule[dayOfWeek];
		console.log('scheduleForDay', scheduleForDay);
		setName(scheduleForDay![selectedTimeIn!]);

		// Set timeOut to 8 hours after timeIn
		const timeInDate = new Date(`1970-01-01T${selectedTimeIn}`);
		const timeOutDate = addHours(timeInDate, 8);
		const selectedTimeOut = timeOutDate.toTimeString().slice(0, 5);
		setTimeOut(selectedTimeOut);
	};

	useEffect(() => {
		// This effect will run when 'date' changes
		if (isUserChangingDate && date) {
			const fieldsSetBeforeDateChange = { ...userModifiedFields };
			
			// Only update values that weren't manually set BEFORE the date change
			if (!fieldsSetBeforeDateChange.timeIn) {
				const hours = getHours(date);
				const minutes = getMinutes(date);
				const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
				const selectedTimeIn = determineTimeIn(currentTime);
				setTimeIn(selectedTimeIn);

				// Only set timeOut if it hasn't been modified
				if (!fieldsSetBeforeDateChange.timeOut) {
					const timeInDate = new Date(`1970-01-01T${selectedTimeIn}`);
					const timeOutDate = addHours(timeInDate, 8);
					setTimeOut(timeOutDate.toTimeString().slice(0, 5));
				}
			}

			// Only update name if it hasn't been modified
			if (!fieldsSetBeforeDateChange.name) {
				const dayOfWeek = getDay(date).toString() as keyof typeof defaultSchedule;
				const scheduleForDay = defaultSchedule[dayOfWeek];
				setName(scheduleForDay![timeIn as keyof typeof scheduleForDay]);
			}
		}
	}, [date]);  // Only depend on date changes, not userModifiedFields

	const handleDateChange = (newDate: Date | null) => {
		setIsUserChangingDate(true);
		setDate(newDate);
	};

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submissionEvent, setSubmissionEvent] = useState<React.FormEvent<HTMLFormElement> | null>(null);

	const submitReport = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (isSubmitting) return;

		const filteredTasks = tasks.filter(task => task.description.trim() !== '');
		const vancouverTimestamp = format(date!, "yyyy-MM-dd'T'HH:mm:ssXXX");

		const report: Report = {
			id: Date.now(),
			created_at: new Date().toISOString(),
			date: vancouverTimestamp,
			name: name === 'Other' ? otherName : name,
			weather: weather === 'Other' ? otherWeather : weather,
			time_in: timeIn,
			time_out: timeOut,
			details,
			tasks: filteredTasks.length > 0 ? JSON.stringify(filteredTasks) : null,
			is_overtime: overtimeHours > 0,
			overtime_hours: overtimeHours,
			total_hours: calculateHours(timeIn, timeOut),
			attempts: 0
		};

		try {
			setIsSubmitting(true);

			// Validation
			if (!date || !name || !weather || !timeIn || !timeOut) {
				alert("Please fill in all required fields");
				return;
			}

			// Calculate hours worked
			const hoursWorked = calculateHours(timeIn, timeOut);

			// Alert if overtime is unchecked but hours worked exceed 8
			if (!overtimeHours && hoursWorked > 8) {
				setSubmissionEvent(e);  // Store the event
				setShowOvertimeModal(true);
				return;
			}

			if (!navigator.onLine) {
				try {
					addToOfflineQueue(report);
					alert('You are offline. Report saved and will be submitted when back online.');
					resetForm();
				} catch (error) {
					alert(error instanceof Error ? error.message : 'Failed to save report offline');
				}
				return;
			}

			const { error } = await supabase.from('reports').insert([{
				date: report.date,
				name: report.name,
				weather: report.weather,
				time_in: report.time_in,
				time_out: report.time_out,
				details: report.details,
				tasks: report.tasks,
				is_overtime: report.is_overtime,
				overtime_hours: report.overtime_hours,
				total_hours: report.total_hours
			}]);
			
			if (error) throw error;
			
			resetForm();
			alert('Report submitted successfully!');

		} catch (error) {
			console.error('Error submitting report:', error);
			try {
				addToOfflineQueue(report);
				alert('Failed to submit report. Saved offline and will retry when connection is restored.');
			} catch (queueError) {
				alert(queueError instanceof Error ? queueError.message : 'Failed to save report offline');
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const addTask = () => {
		const lastTask = tasks[tasks.length - 1];
		const [hours, minutes] = lastTask.time.split(':').map(Number);
		const nextHour = (hours + 1) % 24;
		const nextTime = `${String(nextHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
		setTasks([...tasks, { time: nextTime, description: '' }]);
	};

	useEffect(() => {
		const hours = calculateHours(timeIn, timeOut);
		if (hours > 8) {
			// Round up to nearest 0.1 hours
			const overtimeAmount = Math.ceil((hours - 8) * 10) / 10;
			setOvertimeHours(overtimeAmount);
			setIsOvertimeHighlighted(true);
			setIsOvertimeAutoSet(true);
			// Clear highlight after 3 seconds
			setTimeout(() => setIsOvertimeHighlighted(false), 3000);
		} else {
			setOvertimeHours(0);
			setIsOvertimeHighlighted(false);
			setIsOvertimeAutoSet(false);
		}
	}, [timeIn, timeOut]);

	const resetForm = () => {
		// Clear cache
		localStorage.removeItem('reportDate');
		localStorage.removeItem('reportTimeIn');
		localStorage.removeItem('reportTimeOut');
		localStorage.removeItem('reportName');
		localStorage.removeItem('reportWeather');
		localStorage.removeItem('reportDetails');
		localStorage.removeItem('reportTasks');
		localStorage.removeItem('reportOvertimeHours');
		localStorage.removeItem('reportOtherName');
		localStorage.removeItem('reportOtherWeather');
		
		// Reset user modified fields
		setUserModifiedFields({
			timeIn: false,
			timeOut: false,
			name: false
		});
		
		// Reset form state values
		setWeather(getDefaultWeather());
		setDetails('');
		setTasks([{ time: '', description: '' }]);
		setOvertimeHours(0);
		setOtherName('');
		setOtherWeather('');
		
		// Reinitialize with defaults
		initializeFormDefaults();
	};

	return (
		<div className="report-form">
			<h1>New Report</h1>
			<form ref={formRef} onSubmit={submitReport}>
				<div className="form-group">
					<label htmlFor="date-input">Date</label>
					<DatePicker
						id="date-input"
						selected={date}
						onChange={handleDateChange}
						dateFormat="yyyy-MM-dd"
						placeholderText="Select a date"
						className="dark-mode-datepicker"
						popperModifiers={[
							shift({
								padding: 0,
								boundary: formRef.current || undefined,
							})
						]}
						calendarClassName="dark-mode-calendar"
					/>
				</div>

				<div className="form-group">
					<label htmlFor="name-input">Name</label>
					<select
						id="name-input"
						value={name}
						onChange={(e) => handleFieldChange('name', e.target.value)}
						style={{ width: nameSelectWidth }}
					>
						<option value="">Select a name</option>
						{['Manpreet Kaur', 'Colin Butcher', 'Matthew Murphy', 'Jason Earle', 'Terry MacLaine', 'Marty Wanless', 'Other'].map((option) => (
							<option key={option} value={option}>{option}</option>
						))}
					</select>
				</div>
				{name === 'Other' && (
					<div className="form-group">
						<label htmlFor="name-input">Name</label>
						<input
							type="text"
							value={otherName}
							ref={otherNameInputRef}
							onChange={(e) => setOtherName(e.target.value)}
							placeholder="Enter name"
						/>
					</ div>
				)}

				<div className="form-group">
					<label htmlFor="time-in-input">Time In</label>
					<input
						id="time-in-input"
						type="time"
						value={timeIn}
						onChange={(e) => handleFieldChange('timeIn', e.target.value)}
					/>
				</div>

				<div className="form-group">
					<label htmlFor="time-out-input">Time Out</label>
					<input
						id="time-out-input"
						type="time"
						value={timeOut}
						onChange={(e) => handleFieldChange('timeOut', e.target.value)}
					/>
				</div>

				<div className="form-group">
					<label htmlFor="weather-input">Weather</label>
					<select
						id="weather-input"
						value={weather}
						onChange={(e) => setWeather(e.target.value)}
					>
						<option value="Rainy">Rainy</option>
						<option value="Cloudy">Cloudy</option>
						<option value="Sunny">Sunny</option>
						<option value="Windy">Windy</option>
						<option value="Snowy">Snowy</option>
						<option value="Other">Other</option>
					</select>
				</div>

				<div className="form-group overtime-group">
					<label htmlFor="overtime-hours-input">Overtime Hours</label>
					<input
						id="overtime-hours-input"
						type="number"
						value={overtimeHours}
						onChange={(e) => {
							setOvertimeHours(parseFloat(e.target.value));
							setIsOvertimeHighlighted(false);
							setIsOvertimeAutoSet(false);  // Clear auto-set state on manual change
						}}
						min="0"
						step="0.25"
						style={{
							backgroundColor: isOvertimeHighlighted ? '#fff3cd' : 'var(--input-bg-color)',
							color: isOvertimeHighlighted ? '#000' : 'var(--text-color)',
							borderColor: isOvertimeAutoSet ? '#ffc107' : 'var(--border-color)',
							transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease'
						}}
					/>
				</div>

				<div className="form-group details-group">
					<label htmlFor="details-input">Details</label>
					<textarea
						id="details-input"
						value={details}
						onChange={(e) => setDetails(e.target.value)}
						rows={4}
					/>
				</div>

				<div className="form-group" id="tasks-container">
					<h2>Tasks</h2>
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
				<div style={{ width: '100%', margin: 20 }}>
					<button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Submitting...' : 'Submit'}
					</button>
				</div>
			</form>

			<ConfirmationModal
				isOpen={showOvertimeModal}
				title="Overtime Warning"
				message="You have worked more than 8 hours. Did you forget to add overtime hours?"
				confirmText="Proceed as is"
				cancelText="Go back and add overtime hours"
				onConfirm={async () => {
					setShowOvertimeModal(false);
					if (submissionEvent) submitReport(submissionEvent);
				}}
				onCancel={() => {
					setShowOvertimeModal(false);
				}}
			/>
		</div>
	);
};

export default ReportForm;
