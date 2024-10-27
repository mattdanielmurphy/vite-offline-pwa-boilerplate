import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import "./App.css"

const ReportForm: React.FC = () => {
    const [date, setDate] = useState<string>(getTodayDateString());
    const [name, setName] = useState<string>('');
    const [weather, setWeather] = useState<string>('');
    const [overtime, setOvertime] = useState<boolean>(false);
    const [timeIn, setTimeIn] = useState<string>(getDefaultTimeIn());
    const [timeOut, setTimeOut] = useState<string>(getDefaultTimeOut(getDefaultTimeIn()));
    const [details, setDetails] = useState<string>('');
    const [tasks, setTasks] = useState<Array<{ time: string; description: string }>>([{ time: getDefaultTimeIn(), description: '' }]);
    const [isTodaySelected, setIsTodaySelected] = useState<boolean>(true);
    const [typing, setTyping] = useState<boolean>(false);
    const [overtimeHours, setOvertimeHours] = useState<number>(0);
    const [otherName, setOtherName] = useState<string>('');
    const [otherWeather, setOtherWeather] = useState<string>('');
    const [totalHours, setTotalHours] = useState<number>(0);
  
    function getTodayDateString(): string {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  
    function getDefaultTimeIn(): string {
      const now = new Date();
      const hours = now.getHours();
      if (hours < 8) return '00:00';
      if (hours < 16) return '08:00';
      return '16:00';
    }
  
    function getDefaultTimeOut(timeIn: string): string {
      const [hours] = timeIn.split(':').map(Number);
      const outHours = (hours + 8) % 24;
      return `${String(outHours).padStart(2, '0')}:00`;
    }
  
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
        setTotalHours(hours);
        if (overtime && hours > 8) {
            setOvertimeHours(hours - 8);
        }
    }, [timeIn, timeOut, overtime]);
  
    const submitReport = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
  
      // Validation
      if (!date || !name || !weather || !timeIn || !timeOut || tasks.length === 0) {
        alert("Please fill in all required fields");
        return;
      }
  
      const { data, error } = await supabase
        .from('reports')
        .insert([
          { 
            date, 
            name: name === 'Other' ? otherName : name, 
            weather: weather === 'Other' ? otherWeather : weather, 
            time_in: timeIn,
            time_out: timeOut,
            details,
            tasks: JSON.stringify(tasks),
            is_overtime: overtime,
            overtime_hours: overtime ? overtimeHours : 0
          }
        ]);
  
      if (error) {
        console.error('Error inserting report:', error);
        alert('Failed to submit report. Please try again.');
      } else {
        alert('Report submitted successfully!');
        // Reset form
        setDate(getTodayDateString());
        setName('');
        setWeather('');
        setTimeIn(getDefaultTimeIn());
        setTimeOut(getDefaultTimeOut(getDefaultTimeIn()));
        setDetails('');
        setTasks([{ time: getDefaultTimeIn(), description: '' }]);
        setOvertime(false);
        setOvertimeHours(0);
        setOtherName('');
        setOtherWeather('');
      }
    };
  
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDate(e.target.value);
      setIsTodaySelected(e.target.value === getTodayDateString());
    };
  
    const handleDateInput = () => {
      setTyping(true);
    };
  
    const handleDateBlur = () => {
      setTyping(false);
    };

    return (
        <div className="report-form">
            <h1>New Report</h1>
            <form onSubmit={submitReport}>
                <div className="form-group">
                    <label htmlFor="date-input">Date</label>
                    <div className="input-group">
                        <input
                            id="date-input"
                            type="date"
                            value={date}
                            onChange={handleDateChange}
                            onInput={handleDateInput}
                            onBlur={handleDateBlur}
                        />
                        {isTodaySelected && !typing && <span className="today-indicator">today</span>}
                    </div>
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
                        <option value="">Select weather</option>
                        {['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Windy', 'Other'].map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    {weather === 'Other' && (
                        <input
                            type="text"
                            value={otherWeather}
                            onChange={(e) => setOtherWeather(e.target.value)}
                            placeholder="Enter weather"
                        />
                    )}
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

                <div className="form-group">
                    <label htmlFor="total-hours-input">Total Hours</label>
                    <input
                        id="total-hours-input"
                        type="number"
                        value={totalHours.toFixed(2)}
                        readOnly
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