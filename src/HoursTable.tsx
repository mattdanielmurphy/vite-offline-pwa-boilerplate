import React, { useCallback, useEffect, useRef, useState } from 'react';
import { calculateHours, formatHoursDisplay } from './utils/dateTime';

import { FaSpinner } from 'react-icons/fa';
import { HoursTableReport } from './interfaces/Report';

interface DailyHourEntry {
	regular: string;
	overtime: string;
}

interface DailyHours {
	[month: string]: {
		[date: string]: {
			[name: string]: DailyHourEntry;
		};
	};
}

interface TotalHours {
	[name: string]: {
		regular: number;
		overtime: number;
	};
}

const debounce = (func: Function, wait: number) => {
	let timeout: NodeJS.Timeout;
	return (...args: any[]) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
};

const clampScroll = (scrollX: number, tableWidth: number) => {
	const viewportWidth = window.innerWidth;
	const maxScroll = Math.max(0, tableWidth - viewportWidth + 72);
	return Math.min(Math.max(0, scrollX), maxScroll);
};

const HoursTable: React.FC<{ reports: HoursTableReport[], loading: boolean }> = ({ reports, loading }) => {
	const [dailyHours, setDailyHours] = useState<DailyHours>({});
	const [names, setNames] = useState<string[]>([]);
	const [currentMonth, setCurrentMonth] = useState<string | null>(null);
	const [scrollX, setScrollX] = useState(0);

	const spacerRef = useRef<HTMLDivElement>(null);

	// Add a ref map for tables
	const tableRefs = useRef<{ [month: string]: HTMLTableElement | null }>({});

	// Add ref for measuring text widths
	const monthTextRefs = useRef<{ [month: string]: HTMLHeadingElement | null }>({});

	const processReports = (reports: HoursTableReport[]) => {
		const hours: DailyHours = {};
		const totals: TotalHours = {};
		const uniqueDates = new Set<string>();
		const uniqueNames = new Set<string>();
		const overtimeCheck: { [name: string]: boolean } = {};

		reports.forEach(report => {
			const { date, name, time_in, time_out, is_overtime, overtime_hours } = report;
			const parsedDate = new Date(date);
			const formattedDate = parsedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
			const month = parsedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

			if (!hours[month]) {
				hours[month] = {};
			}
			if (!hours[month][formattedDate]) {
				hours[month][formattedDate] = {};
			}

			uniqueDates.add(formattedDate);
			uniqueNames.add(name);

			const totalHours = calculateHours(time_in, time_out);
			const regularHours = Math.max(0, totalHours - (is_overtime ? overtime_hours : 0));

			hours[month][formattedDate][name] = {
				regular: formatHoursDisplay(regularHours),
				overtime: is_overtime ? formatHoursDisplay(overtime_hours) : '0'
			};

			if (!totals[name]) {
				totals[name] = { regular: 0, overtime: 0 };
			}
			totals[name].regular += regularHours;
			totals[name].overtime += is_overtime ? overtime_hours : 0;

			if (is_overtime) {
				overtimeCheck[name] = true;
			}
		});
		const processedNames = Array.from(uniqueNames).sort();

		setDailyHours(hours);
		setNames(processedNames);
	};

	useEffect(() => {
		if (reports.length > 0) {
			processReports(reports);
		}
	}, [reports]);

	const calculateMonthlyTotals = (month: string) => {
		const monthlyTotals: TotalHours = {};
		const monthlyOvertime: { [name: string]: boolean } = {};
		
		Object.keys(dailyHours[month]).forEach(date => {
			Object.keys(dailyHours[month][date]).forEach(name => {
				if (!monthlyTotals[name]) {
					monthlyTotals[name] = { regular: 0, overtime: 0 };
				}
				
				const hours = dailyHours[month][date][name];
				monthlyTotals[name].regular += parseFloat(hours.regular) || 0;
				const overtime = parseFloat(hours.overtime) || 0;
				monthlyTotals[name].overtime += overtime;
				
				if (overtime > 0) {
					monthlyOvertime[name] = true;
				}
			});
		});
		
		return { totals: monthlyTotals, hasOvertime: monthlyOvertime };
	};

	const getPeopleWithHoursForMonth = (month: string, names: string[]) => {
		return names.filter(name => {
			// Check if person has any hours in this month
			return Object.keys(dailyHours[month]).some(date => 
				dailyHours[month][date][name]?.regular !== undefined &&
				parseFloat(dailyHours[month][date][name]?.regular) > 0
			);
		});
	};

	// Update function to find widest table
	const updateSpacerWidth = useCallback(() => {
		const tables = document.querySelectorAll('.hours-table');
		if (tables.length === 0 || !spacerRef.current) return;

		// Find the widest table
		let maxWidth = 0;
		tables.forEach(table => {
			if (table instanceof HTMLElement) {
				maxWidth = Math.max(maxWidth, table.offsetWidth);
			}
		});

		// Set spacer width based on widest table
		spacerRef.current.style.width = `${maxWidth + 20}px`;
		spacerRef.current.style.height = '1px';
		spacerRef.current.style.display = 'block';
	}, []);

	// Update spacer width when table content changes
	useEffect(() => {
		updateSpacerWidth();
		window.addEventListener('resize', updateSpacerWidth);
		return () => window.removeEventListener('resize', updateSpacerWidth);
	}, [dailyHours, updateSpacerWidth]);

	// Track scroll position and update current month
	useEffect(() => {
		let lastScrollY = window.scrollY;
		
		const handleScroll = () => {
			requestAnimationFrame(() => {
				const currentScrollY = window.scrollY;
				const scrollingDown = currentScrollY > lastScrollY;
				const monthHeaders = document.querySelectorAll('.month-section');
				
				
				let visibleHeader: Element | null = null;
				
				// Find the first header that's in the threshold zone
				for (const header of monthHeaders) {
					const rect = header.getBoundingClientRect();
					const month = header.getAttribute('data-month');
					
					if (scrollingDown) {
						if (rect.top <= 0 && rect.bottom > 30 && month) {
							visibleHeader = header;
							break;
						}
					} else {
						if (rect.top <= 0 && rect.bottom > 0 && month) {
							visibleHeader = header;
							break;
						}
					}
				}

				// If we found a visible header, show it
				if (visibleHeader) {
					setCurrentMonth(visibleHeader.getAttribute('data-month'));
				} else {
					// No headers near threshold, check if we're above all headers
					const firstHeader = monthHeaders[0];
					if (firstHeader) {
						const firstRect = firstHeader.getBoundingClientRect();
						if (firstRect.top > 0) {
							setCurrentMonth(null);
						}
					}
				}

				lastScrollY = currentScrollY;
				setScrollX(window.scrollX);
			});
		};

		const debouncedScroll = debounce(handleScroll, 5);
		
		window.addEventListener('scroll', debouncedScroll, { passive: true });
		
		return () => window.removeEventListener('scroll', debouncedScroll);
	}, []);

	useEffect(() => {
		let ticking = false;
		let lastKnownScrollX = window.scrollX;
		
		const updateTransform = () => {
			if (currentMonth && tableRefs.current[currentMonth]) {
				const table = tableRefs.current[currentMonth];
				const clampedScroll = clampScroll(lastKnownScrollX, table?.offsetWidth || 0);
			}
			ticking = false;
		};

		const onScroll = () => {
			lastKnownScrollX = window.scrollX;
			if (!ticking) {
				requestAnimationFrame(updateTransform);
				ticking = true;
			}
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [currentMonth]);

	// Update the table widths when content changes
	useEffect(() => {
		const updateTableWidths = () => {
			const newWidths: { [month: string]: number } = {};
			const tables = document.querySelectorAll('.month-section');
			
			tables.forEach(section => {
				const month = section.getAttribute('data-month');
				const table = section.querySelector('.hours-table');
				if (month && table instanceof HTMLElement) {
					newWidths[month] = table.offsetWidth;
				}
			});
		};

		updateTableWidths();
		window.addEventListener('resize', updateTableWidths);
		return () => window.removeEventListener('resize', updateTableWidths);
	}, [dailyHours, names]);

	// Add function to get widest table width
	const getWidestTableWidth = () => {
		let maxWidth = 0;
		Object.values(tableRefs.current).forEach(table => {
			if (table) {
				maxWidth = Math.max(maxWidth, table.offsetWidth);
			}
		});
		return maxWidth;
	};

	return (
		<div className="page-container">
			<h1 style={{
				transform: `translateX(${clampScroll(scrollX, getWidestTableWidth())}px)`,
				willChange: 'transform',
				textAlign: 'left',
			}}>
				Hours Worked
			</h1>
			{currentMonth && (
				<div style={{
					position: 'fixed',
					left: 0,
					top: 0,
					right: 0,
					background: 'var(--bg-color)',
					padding: '18px 0 0 28px',
					zIndex: 999,
					lineHeight: '.5',
					textAlign: 'left'
				}}>
					<h2 style={{ 
						display: 'inline-block', 
						width: 'auto',
						transform: currentMonth && tableRefs.current[currentMonth] && 
							scrollX >= (tableRefs.current[currentMonth]?.offsetWidth || 0) + 
										(window.innerWidth - (monthTextRefs.current[currentMonth]?.offsetWidth || 0) - 72) - 
										window.innerWidth + 72
							? `translateX(-${scrollX - ((tableRefs.current[currentMonth]?.offsetWidth || 0) + 
														(window.innerWidth - (monthTextRefs.current[currentMonth]?.offsetWidth || 0) - 72) - 
														window.innerWidth + 72)}px)`
							: 'none'
					}}>
						{currentMonth}
					</h2>
				</div>
			)}
			<div className="table-content">
				{loading ? (
					<div className="loading-spinner">
						<FaSpinner className="spinner" />
					</div>
				) : (
					<div className="table-container">
						{Object.keys(dailyHours).map((month: string) => {
							const { totals: monthlyTotals, hasOvertime: monthlyOvertime } = calculateMonthlyTotals(month);
							const activeNames = getPeopleWithHoursForMonth(month, names);
							
							const thisTableWidth = tableRefs.current[month]?.offsetWidth || 0;
							const monthTextWidth = monthTextRefs.current[month]?.offsetWidth || 0;
							
							const adjustedWidth = thisTableWidth + (window.innerWidth - monthTextWidth - 72);
							const thisMonthClamp = clampScroll(scrollX, adjustedWidth);

							// Calculate if this month's header should be hidden - using same logic as fixed header
							const shouldHideHeader = month === currentMonth
							
							return (
								<div key={month} className="month-section" data-month={month}>
									<div className="month-label" style={{ 
										width: '100%',
										position: 'relative',
										transform: `translateX(${thisMonthClamp}px)`,
										willChange: 'transform',
										textAlign: 'left',
										zIndex: month === currentMonth ? 999 : 1000,
										opacity: shouldHideHeader ? 0 : 1,
										// transition: 'opacity 0.1s'
									}}>
										<h2 
											ref={el => monthTextRefs.current[month] = el}
											style={{ display: 'inline-block', width: 'auto' }}
											>
											{month}
										</h2>
									</div>
									<div>
										<div className="table-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
											<table 
												ref={el => tableRefs.current[month] = el} 
												className="hours-table"
											>
												<thead>
													<tr>
														<th className="header-cell date-column" rowSpan={2}>Date</th>
														{activeNames.map(name => (
															<th key={name} 
																className="header-cell" 
																colSpan={monthlyOvertime[name] ? 2 : 1}
																rowSpan={monthlyOvertime[name] ? 1 : 2}>
																{name}
															</th>
														))}
													</tr>
													{Object.values(monthlyOvertime).some(hasOT => hasOT) && (
														<tr>
															{activeNames.map(name => (
																<React.Fragment key={`subheader-${name}`}>
																	{monthlyOvertime[name] && (
																		<>
																			<th className="sub-header-cell hours-column">Reg</th>
																			<th className="sub-header-cell hours-column">OT</th>
																		</>
																	)}
																</React.Fragment>
															))}
														</tr>
													)}
												</thead>
												<tbody>
													{Object.keys(dailyHours[month]).map(date => (
														<tr key={date}>
															<td className="table-cell date-column">{date}</td>
															{activeNames.map(name => (
																<React.Fragment key={`${date}-${name}`}>
																	<td className="table-cell hours-column">
																		{(dailyHours[month][date]?.[name] as DailyHourEntry)?.regular || '-'}
																	</td>
																	{monthlyOvertime[name] && (
																		<td className="table-cell hours-column">
																			{(dailyHours[month][date]?.[name] as DailyHourEntry)?.overtime !== '0' 
																				? (dailyHours[month][date]?.[name] as DailyHourEntry)?.overtime 
																				: '-'}
																		</td>
																	)}
																</React.Fragment>
															))}
														</tr>
													))}
													<tr>
														<td className="total-cell date-column">Total</td>
														{activeNames.map(name => (
															<React.Fragment key={`monthly-total-${name}`}>
																<td className="total-cell hours-column">
																	{formatHoursDisplay(monthlyTotals[name]?.regular || 0)}
																</td>
																{monthlyOvertime[name] && (
																	<td className="total-cell hours-column">
																		{formatHoursDisplay(monthlyTotals[name]?.overtime || 0)}
																	</td>
																)}
															</React.Fragment>
														))}
													</tr>
												</tbody>
											</table>
											<div ref={spacerRef} className="table-spacer"></div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default HoursTable;
