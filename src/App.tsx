import React, { useState, useEffect } from "react";
import "
./App.css"

function App() {
  const [date, setDate] = useState<string>(getTodayDateString());
  const [name, setName] = useState<string>('');
  const [weather, setWeather] = useState<string>('');
  const [overtime, setOvertime] = useState<boolean>(false);
  const [timeIn, setTimeIn] = useState<string>('');
  const [timeOut, setTimeOut] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [tasks, setTasks] = useState<Array<{ time: string; description: string }>>([{ time: '', description: '' }]);
  const [isTodaySelected, setIsTodaySelected] = useState<boolean>(true);
  const [typing, setTyping] = useState<boolean>(false);

  function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const addTask = () => {
    setTasks([...tasks, { time: '', description: '' }]);
  };

  const submitReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log({ date, name, weather, overtime, timeIn, timeOut, details, tasks });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submitReport} style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
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
                style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: isTodaySelected ? '#e6f3ff' : 'white' }}
              />
              {isTodaySelected && <span style={{ marginLeft: '10px', fontStyle: 'italic', color: '#0066cc' }}>today</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <label htmlFor="name-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Name</label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <label htmlFor="weather-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Weather</label>
            <input
              id="weather-input"
              type="text"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <label htmlFor="time-in-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Time In</label>
            <input
              id="time-in-input"
              type="time"
              value={timeIn}
              onChange={(e) => setTimeIn(e.target.value)}
              style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <label htmlFor="time-out-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Time Out</label>
            <input
              id="time-out-input"
              type="time"
              value={timeOut}
              onChange={(e) => setTimeOut(e.target.value)}
              style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <label htmlFor="details-input" style={{ width: '80px', marginRight: '10px', textAlign: 'center' }}>Details</label>
            <textarea
              id="details-input"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', height: '80px' }}
            ></textarea>
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
                style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
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
                style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
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
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Submit</button>
      </form>
    </div>
  );
}

export default App;
