import './App.css';

import { FaClipboardList, FaClock, FaCog, FaHistory } from 'react-icons/fa';
import { Link, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';

import ConfirmationModal from './components/ConfirmationModal';
import ConnectionStatus from './components/ConnectionStatus';
import HoursTable from './HoursTable';
import PastReports from './PastReports';
import ReportForm from './ReportForm';
import Settings from './Settings';
import { supabase } from './supabaseClient';

const OFFLINE_QUEUE_KEY = 'offlineReportQueue';
const MAX_QUEUE_ATTEMPTS = 3;
const MAX_QUEUE_SIZE = 50;
const CACHE_KEY = 'reports_cache';
const CACHE_TIMESTAMP_KEY = 'reports_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface Report {
	id?: number;
	created_at: string;
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
	attempts?: number;
}

export const getOfflineQueue = (): Report[] => {
	const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
	return queue ? JSON.parse(queue) : [];
};

export const addToOfflineQueue = (report: Report) => {
	const queue = getOfflineQueue();
	
	if (queue.length >= MAX_QUEUE_SIZE) {
		throw new Error('Offline queue is full. Please try again later.');
	}

	// Sanitize the report data before storing
	const sanitizedReport = {
		...report,
		id: Date.now(),
		details: report.details?.toString() || '',
		tasks: report.tasks ? JSON.stringify(JSON.parse(report.tasks)) : null
	};

	queue.push(sanitizedReport);
	localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const removeFromOfflineQueue = (index: number) => {
	const queue = getOfflineQueue();
	queue.splice(index, 1);
	localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

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
	const [sortedReports, setSortedReports] = useState<any[]>([]); // Add this state
	const [isProcessingQueue, setIsProcessingQueue] = useState(false);
	const [successModal, setSuccessModal] = useState({
		isOpen: false,
		message: ''
	});

	const DEV_CONFIG = {
		DISABLE_CACHING: import.meta.env.VITE_DISABLE_CACHING === 'true'
	};

	const getCachedReports = () => {
		const cached = localStorage.getItem(CACHE_KEY);
		const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
		
		if (!cached || !timestamp) return null;
		
		// Check if cache is expired
		if (Date.now() - Number(timestamp) > CACHE_DURATION) {
			localStorage.removeItem(CACHE_KEY);
			localStorage.removeItem(CACHE_TIMESTAMP_KEY);
			return null;
		}
		
		return JSON.parse(cached);
	};

	const setCachedReports = (reports: any[]) => {
		localStorage.setItem(CACHE_KEY, JSON.stringify(reports));
		localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
	};

	const fetchReports = async () => {
		console.log('fetch reports');
		
		// First check cache
		const cachedData = getCachedReports();
		if (cachedData) {
			console.log('Using cached data');
			setReports(cachedData);
			setLoadingReports(false);
			return;
		}

		setLoadingReports(true);
		const { data, error } = await supabase
			.from('reports')
			.select('*')
			.order('date', { ascending: false });

		if (error) {
			console.error('Error fetching reports:', error);
		} else {
			const reportsData = data ? data : [];
			setReports(reportsData);
			setCachedReports(reportsData);
		}
		setLoadingReports(false);
	};

	// Move sorting logic to a function
	const sortReports = (reportsToSort: any[]) => {
		return [...reportsToSort].sort((a, b) => {
			const dateA = new Date(a.date);
			const dateB = new Date(b.date);

			// First, compare by date
			if (dateB.getTime() !== dateA.getTime()) {
				return dateB.getTime() - dateA.getTime();
			}

			// If dates are the same, compare by time
			const timeA = a.time_in;
			const timeB = b.time_in;

			return timeB.localeCompare(timeA);
		});
	};

	// Update sortedReports whenever reports changes
	useEffect(() => {
		setSortedReports(sortReports(reports));
	}, [reports]);

	useEffect(() => {
		console.log('Setting up Supabase subscription');
		fetchReports(); // Initial fetch

		const subscription = supabase
			.channel('reports_channel')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'reports'
				},
				(payload) => {
					console.log('New report added!', payload);
					setReports(currentReports => {
						const newReports = [...currentReports, payload.new];
						setCachedReports(newReports);
						return newReports;
					});
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'reports'
				},
				(payload) => {
					console.log('Report updated!', payload);
					setReports(currentReports => {
						const newReports = currentReports.map(report => 
							report.id === payload.new.id ? payload.new : report
						);
						setCachedReports(newReports);
						return newReports;
					});
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'reports'
				},
				(payload) => {
					console.log('Report deleted!', payload);
					setReports(currentReports => {
						const newReports = currentReports.filter(report => report.id !== payload.old.id);
						setCachedReports(newReports);
						return newReports;
					});
				}
			)
			.subscribe();

		return () => {
			subscription.unsubscribe();
		};
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

	const processOfflineQueue = async () => {
		if (isProcessingQueue) {
			if (import.meta.env.MODE === 'development') {
				console.log('Already processing queue, skipping');
			}
			return;
		}

		try {
			setIsProcessingQueue(true);
			let queue = getOfflineQueue();

			for (let i = 0; i < queue.length;) {
				const report = queue[i];
				
				try {
					// Check if we're online before attempting
					if (!navigator.onLine) {
						console.log('Network offline, stopping queue processing');
						return;
					}

					const { attempts, ...reportWithoutFields } = report;
					const { error } = await supabase.from('reports').insert([reportWithoutFields]);

					if (error) throw error;
					
					setSuccessModal({
						isOpen: true,
						message: `Report for ${report.date} has been uploaded to the database.`
					});
					
					removeFromOfflineQueue(0);
					queue = getOfflineQueue();
					
					await new Promise(resolve => setTimeout(resolve, 1000));
				} catch (error) {
					console.error('Failed to process report:', error);
					// Only increment if we've tried less than MAX_QUEUE_ATTEMPTS times
					if (!report.attempts || report.attempts >= MAX_QUEUE_ATTEMPTS) {
						removeFromOfflineQueue(0); // Remove if max attempts reached
						queue = getOfflineQueue();
					} else {
						// Increment attempts and move to next item
						queue[i].attempts = (queue[i].attempts || 0) + 1;
						localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
						i++;
					}
				}
			}
		} finally {
			setIsProcessingQueue(false);
		}
	};

	useEffect(() => {
		const handleOnline = () => {
			console.log('Connection restored, waiting for stable connection...');
			setTimeout(() => {
				if (navigator.onLine) {
					processOfflineQueue();
				}
			}, 5000);
		};

		window.addEventListener('online', handleOnline);

		// Initial check
		if (navigator.onLine) {
			setTimeout(() => {
				processOfflineQueue();
			}, 3000);
		}

		return () => {
			window.removeEventListener('online', handleOnline);
		};
	}, []);

	useEffect(() => {
		if (DEV_CONFIG.DISABLE_CACHING && 'serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then(function(registrations) {
				for(let registration of registrations) {
					registration.unregister();
				}
			});
		}
	}, []);

	return (
		<Router>
			<div style={{ maxWidth: '1200px', margin: '0 auto' }} className={isDarkMode ? 'dark-mode' : ''}>
				<ConnectionStatus />
				<Navigation isDarkMode={isDarkMode} />
				<div id='content' style={{ paddingTop: '20px', paddingBottom: '900px' }}>
					<Routes>
						<Route path="/" element={<ReportForm />} />
						<Route 
							path="/past-reports" 
							element={
								<PastReports 
									reports={sortedReports} 
									loading={loadingReports} 
								/>
							} 
						/>
						<Route 
							path="/hours-table" 
							element={
								<HoursTable 
									reports={reports} 
									loading={loadingReports} 
								/>
							} 
						/>
						<Route path="/settings" element={<Settings />} />
					</Routes>
				</div>
				<ConfirmationModal
					isOpen={successModal.isOpen}
					title="Report Submitted"
					message={successModal.message}
					confirmText="OK"
					onConfirm={() => setSuccessModal({ isOpen: false, message: '' })}
					isSuccess={true}
				/>
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
	zIndex: 9999,
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
