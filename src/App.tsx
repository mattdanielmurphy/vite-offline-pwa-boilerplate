import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from 'react-router-dom';
import ReportForm from './ReportForm';
import PastReports from './PastReports';
import HoursTable from './HoursTable';
import './App.css';
import { FaClipboardList, FaHistory, FaClock } from 'react-icons/fa';

const Navigation: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const location = useLocation();

  return (
    <>
      <nav className="desktop-nav" style={desktopNavStyle(isDarkMode)}>
        <Link to="/" style={desktopLinkStyle(location.pathname === '/', isDarkMode)}>
          <FaClipboardList size={16} style={{ marginRight: '5px' }} />
          New Report
        </Link>
        <Link to="/past-reports" style={desktopLinkStyle(location.pathname === '/past-reports', isDarkMode)}>
          <FaHistory size={16} style={{ marginRight: '5px' }} />
          Past Reports
        </Link>
        <Link to="/hours-table" style={desktopLinkStyle(location.pathname === '/hours-table', isDarkMode)}>
          <FaClock size={16} style={{ marginRight: '5px' }} />
          Hours Table
        </Link>
      </nav>
      <nav className="mobile-nav" style={mobileNavStyle(isDarkMode)}>
        <Link to="/" style={mobileLinkStyle(location.pathname === '/', isDarkMode)}>
          <FaClipboardList size={24} />
          <span>New Report</span>
        </Link>
        <Link to="/past-reports" style={mobileLinkStyle(location.pathname === '/past-reports', isDarkMode)}>
          <FaHistory size={24} />
          <span>Past Reports</span>
        </Link>
        <Link to="/hours-table" style={mobileLinkStyle(location.pathname === '/hours-table', isDarkMode)}>
          <FaClock size={24} />
          <span>Hours Table</span>
        </Link>
      </nav>
    </>
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
      <div style={{ maxWidth: '800px', margin: '0 auto' }} className={isDarkMode ? 'dark-mode' : ''}>
        <Navigation isDarkMode={isDarkMode} />
        <div style={{ paddingTop: '20px', paddingBottom: '90px' }}>
          <Routes>
            <Route path="/" element={<ReportForm />} />
            <Route path="/past-reports" element={<PastReports />} />
            <Route path="/hours-table" element={<HoursTable />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

const desktopNavStyle = (isDarkMode: boolean): React.CSSProperties => ({
  display: 'none',
  position: 'fixed',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '10px 20px',
  zIndex: 1000,
  backgroundColor: isDarkMode ? '#1C1C1E' : '#f8f8f8',
  width: '100%',
  maxWidth: '800px',
});

const desktopLinkStyle = (isActive: boolean, isDarkMode: boolean): React.CSSProperties => ({
  textDecoration: 'none',
  color: isActive 
    ? (isDarkMode ? '#0A84FF' : '#007AFF') 
    : (isDarkMode ? '#98989F' : '#8E8E93'),
  fontSize: '16px',
  fontWeight: isActive ? 'bold' : 'normal',
  display: 'flex',
  alignItems: 'center',
});

const mobileNavStyle = (isDarkMode: boolean): React.CSSProperties => ({
  display: 'flex',
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  justifyContent: 'space-around',
  alignItems: 'center',
  backgroundColor: isDarkMode ? '#1C1C1E' : '#f8f8f8',
  borderTop: `1px solid ${isDarkMode ? '#38383A' : '#e7e7e7'}`,
  height: '70px',
  zIndex: 1000,
});

const mobileLinkStyle = (isActive: boolean, isDarkMode: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textDecoration: 'none',
  color: isActive 
    ? (isDarkMode ? '#0A84FF' : '#007AFF') 
    : (isDarkMode ? '#98989F' : '#8E8E93'),
  fontSize: '12px',
});

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
