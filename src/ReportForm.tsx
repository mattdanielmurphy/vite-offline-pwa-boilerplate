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
  
      // Validate tasks
      if (tasks.some(task => !task.time || !task.description)) {
        alert("Please fill in all task fields");
        return;
      }
  
      // Calculate shift duration
      const [inHours, inMinutes] = timeIn.split(':').map(Number);
      const [outHours, outMinutes] = timeOut.split(':').map(Number);
      let shiftDuration = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
      if (shiftDuration < 0) shiftDuration += 24 * 60; // Handle overnight shifts
      const shiftHours = Math.ceil(shiftDuration / 60);

      // Confirm submission if fewer tasks than shift hours
      if (tasks.length < shiftHours) {
        const confirm = window.confirm(`You've entered ${tasks.length} tasks for a ${shiftHours}-hour shift. Are you sure you want to submit?`);
        if (!confirm) return;
      }
  
      // New validation for overtime
      if (totalHours > 8 && !overtime) {
        const confirm = window.confirm("You've worked more than 8 hours. Did you forget to check overtime?");
        if (!confirm) return;
      }
  
      // Prepare data for Supabase
      const reportData = {
        date,
        name: name === 'Other' ? otherName : name,
        weather: weather === 'Other' ? otherWeather : weather,
        time_in: timeIn,
        time_out: timeOut,
        details: details || null,
        tasks: JSON.stringify(tasks),
        is_overtime: overtime,
        overtime_hours: overtime ? overtimeHours : 0,
        total_hours: totalHours // This is now a number
      };
  
      try {
        const { data, error } = await supabase
          .from('reports')
          .insert([reportData]);
  
        if (error) throw error;
  
        alert("Report submitted successfully!");
        // Reset form fields here if needed
      } catch (error) {
        console.error('Error submitting report:', error);
        alert("An error occurred while submitting the report. Please try again.");
      }
    };
  
    const validateDate = (selectedDate: string) => {
      const todayDate = getTodayDateString();
      if (selectedDate > todayDate) {
        alert("Selected date is in the future. Reverting to today's date.");
        setDate(todayDate);
      } else {
        setDate(selectedDate);
        setIsTodaySelected(selectedDate === todayDate);
      }
    };
  
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!typing) {
        validateDate(e.target.value);
      }
    };
  
    const handleDateInput = () => {
      setTyping(true);
      const typingTimeout = setTimeout(() => {
        setTyping(false);
      }, 500);
  
      return () => clearTimeout(typingTimeout);
    };
  
    const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (typing) {
        validateDate(e.target.value);
      }
    };

    const handleTimeInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTimeIn = e.target.value;
      setTimeIn(newTimeIn);
      setTimeOut(getDefaultTimeOut(newTimeIn));
      setTasks(tasks => [{ ...tasks[0], time: newTimeIn }, ...tasks.slice(1)]);
    };

    useEffect(() => {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleColorSchemeChange = (e: MediaQueryListEvent) => {
        document.body.classList.toggle('dark-mode', e.matches);
      };
      
      darkModeMediaQuery.addListener(handleColorSchemeChange);
      document.body.classList.toggle('dark-mode', darkModeMediaQuery.matches);

      return () => {
        darkModeMediaQuery.removeListener(handleColorSchemeChange);
      };
    }, []);
  
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={submitReport} style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: 'var(--bg-color)' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label htmlFor="date-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Date</label>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <input
                  id="date-input"
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                  onInput={handleDateInput}
                  onBlur={handleDateBlur}
                  style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
                />
                {isTodaySelected && <span style={{ marginLeft: '10px', fontStyle: 'italic', color: '#0066cc' }}>today</span>}
              </div>
            </div>
  
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label htmlFor="name-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Name</label>
              <select
                id="name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
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
                  style={{ marginLeft: '10px', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
                />
              )}
            </div>
  
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label htmlFor="weather-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Weather</label>
              <select
                id="weather-input"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
              >
                <option value="">Select weather</option>
                {['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Windy', 'Foggy', 'Other'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {weather === 'Other' && (
                <input
                  type="text"
                  value={otherWeather}
                  onChange={(e) => setOtherWeather(e.target.value)}
                  placeholder="Enter weather"
                  style={{ marginLeft: '10px', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
                />
              )}
            </div>
  
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label htmlFor="time-in-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Time In</label>
              <input
                id="time-in-input"
                type="time"
                value={timeIn}
                onChange={handleTimeInChange}
                style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
              />
            </div>
  
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label htmlFor="time-out-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Time Out</label>
              <input
                id="time-out-input"
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
              />
            </div>
  
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label htmlFor="details-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Details</label>
              <textarea
                id="details-input"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', height: '80px', backgroundColor: 'var(--input-bg-color)' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label htmlFor="total-hours" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Total Hours</label>
              <input
                id="total-hours"
                type="text"
                value={totalHours.toFixed(2)}
                readOnly
                style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
              />
            </div>
          </div>
  
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Tasks</h3>
            {tasks.map((task, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="time"
                  value={task.time}
                  onChange={(e) => {
                    const newTasks = [...tasks];
                    newTasks[index].time = e.target.value;
                    setTasks(newTasks);
                  }}
                  style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
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
                  style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
                  placeholder="Description"
                />
              </div>
            ))}
            <button type="button" onClick={addTask} style={{ padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Task</button>
          </div>
  
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <label htmlFor="overtime-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Overtime?</label>
            <input
              id="overtime-input"
              type="checkbox"
              checked={overtime}
              onChange={(e) => setOvertime(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            {overtime && (
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: '20px' }}>
                <label htmlFor="overtime-hours-input" style={{ marginRight: '10px' }}>Hours:</label>
                <input
                  id="overtime-hours-input"
                  type="number"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(parseFloat(e.target.value))}
                  min="0"
                  step="1"
                  style={{ width: '60px', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'var(--input-bg-color)' }}
                />
              </div>
            )}
          </div>
  
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Submit</button>
        </form>
      </div>
    );
  };

export default ReportForm;
