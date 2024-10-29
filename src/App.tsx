import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from 'react-router-dom';
import ReportForm from './ReportForm';
import PastReports from './PastReports';
import HoursTable from './HoursTable';
import { supabase } from './supabaseClient';
import './App.css';
import { FaClipboardList, FaHistory, FaClock, FaCog } from 'react-icons/fa';
import Settings from './Settings';

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
				<Link to="/settings" style={desktopLinkStyle(location.pathname === '/settings', isDarkMode)}>
					<FaCog size={16} style={{ marginRight: '5px' }} />
					Settings
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
				<Link to="/settings" style={mobileLinkStyle(location.pathname === '/settings', isDarkMode)}>
					<FaCog size={24} />
					<span>Settings</span>
				</Link>
			</nav>
		</>
	);
};

const App: React.FC = () => {
	const [isDarkMode, setIsDarkMode] = useState(() => {
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	const [reports, setReports] = useState<any[]>([]); // Specify the type of reports as any[]
	const [loadingReports, setLoadingReports] = useState(true); // Loading state for reports

	const fetchReports = async () => {
		console.log('fetch reports');

		setLoadingReports(true);
		const { data, error } = await supabase
			.from('reports')
			.select('*')
			.order('date', { ascending: false });

		if (error) {
			console.error('Error fetching reports:', error);
		} else {
			setReports(data ? data : []);
		}
		setLoadingReports(false);
	};

	const refreshReports = () => {
		fetchReports(); // Call fetchReports to refresh data
	};

	useEffect(() => {
		fetchReports(); // Fetch reports on component mount
	}, []);

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

	const sortedReports = reports.sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);

		// First, compare by date
		if (dateB.getTime() !== dateA.getTime()) {
			return dateB.getTime() - dateA.getTime(); // Sort by date in descending order
		}

		// If dates are the same, compare by time
		const timeA = a.time_in; // Assuming time_in is in 'HH:mm' format
		const timeB = b.time_in;

		return timeB.localeCompare(timeA); // Sort by time in descending order
	});

	return (
		<Router>
			<div style={{ maxWidth: '1200px', margin: '0 auto' }} className={isDarkMode ? 'dark-mode' : ''}>
				<Navigation isDarkMode={isDarkMode} />
				<div id='content' style={{ paddingTop: '20px', paddingBottom: '90px' }}>
					<Routes>
						<Route path="/" element={<ReportForm onReportSubmit={refreshReports} />} />
						<Route path="/past-reports" element={<PastReports reports={sortedReports} loading={loadingReports} onRefresh={refreshReports} />} />
						<Route path="/hours-table" element={<HoursTable reports={reports} onRefresh={refreshReports} />} />
						<Route path="/settings" element={<Settings />} />
					</Routes>
				</div>
			</div>
		</Router>
	);
};

const desktopNavStyle = (isDarkMode: boolean): React.CSSProperties => ({
	display: 'none',
	padding: '10px 20px',
	zIndex: 1000,
	width: '100%',
	maxWidth: '800px',
});

const desktopLinkStyle = (isActive: boolean, isDarkMode: boolean): React.CSSProperties => ({
	textDecoration: 'none',
	color: isActive
		? (isDarkMode ? '#0A84FF' : '#007AFF')
		: (isDarkMode ? '#98989F' : '#555'),
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
	paddingBottom: '20px',
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

export default App;
