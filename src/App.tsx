import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from 'react-router-dom';
import ReportForm from './ReportForm';
import PastReports from './PastReports';
import HoursTable from './HoursTable';
import './App.css';

const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav style={{ marginTop: '20px' }}>
      {location.pathname === '/' ? (
        <>
          <Link to="/past-reports">
            <button style={buttonStyle}>View Past Reports</button>
          </Link>
          <Link to="/hours-table">
            <button style={buttonStyle}>View Hours Table</button>
          </Link>
        </>
      ) : location.pathname === '/past-reports' ? (
        <>
          <Link to="/">
            <button style={buttonStyle}>Submit New Report</button>
          </Link>
          <Link to="/hours-table">
            <button style={buttonStyle}>View Hours Table</button>
          </Link>
        </>
      ) : (
        <>
          <Link to="/">
            <button style={buttonStyle}>Submit New Report</button>
          </Link>
          <Link to="/past-reports">
            <button style={buttonStyle}>View Past Reports</button>
          </Link>
        </>
      )}
    </nav>
  );
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    
    darkModeMediaQuery.addListener(handleColorSchemeChange);

    return () => {
      darkModeMediaQuery.removeListener(handleColorSchemeChange);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  return (
    <Router>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }} className={isDarkMode ? 'dark-mode' : ''}>
        <Routes>
          <Route path="/" element={<ReportForm />} />
          <Route path="/past-reports" element={<PastReports />} />
          <Route path="/hours-table" element={<HoursTable />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 15px',
  fontSize: '16px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
};

export default App;
