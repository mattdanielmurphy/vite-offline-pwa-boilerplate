import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Report } from './interfaces/Report';
import PullToRefresh from 'react-pull-to-refresh';
import { FaSpinner } from 'react-icons/fa';

interface DailyHours {
  [date: string]: {
    [name: string]: {
      regular: string;
      overtime: string;
    };
  };
}

interface TotalHours {
  [name: string]: {
    regular: number;
    overtime: number;
  };
}

const HoursTable: React.FC = () => {
  const [dailyHours, setDailyHours] = useState<DailyHours>({});
  const [totalHours, setTotalHours] = useState<TotalHours>({});
  const [dates, setDates] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [hasOvertime, setHasOvertime] = useState<{[name: string]: boolean}>({});
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const cachedData = localStorage.getItem('cachedHoursTable');
    const cachedTimestamp = localStorage.getItem('cachedHoursTableTimestamp');

    if (cachedData && cachedTimestamp) {
      const now = new Date().getTime();
      if (now - parseInt(cachedTimestamp) < 5 * 60 * 1000) { // 5 minutes cache
        const { dailyHours, totalHours, dates, names, hasOvertime } = JSON.parse(cachedData);
        setDailyHours(dailyHours);
        setTotalHours(totalHours);
        setDates(dates);
        setNames(names);
        setHasOvertime(hasOvertime);
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('reports')
      .select('date, name, time_in, time_out, is_overtime, overtime_hours')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else if (data) {
      processReports(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRefresh = useCallback(async () => {
    await fetchReports();
    return Promise.resolve();
  }, [fetchReports]);

  const calculateHours = (timeIn: string, timeOut: string): number => {
    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);
    
    let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    return totalMinutes / 60;
  };

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes === 0 ? `${wholeHours}` : `${wholeHours}.${minutes.toString().padStart(2, '0')}`;
  };

  const processReports = (reports: Report[]) => {
    const hours: DailyHours = {};
    const totals: TotalHours = {};
    const uniqueDates = new Set<string>();
    const uniqueNames = new Set<string>();
    const overtimeCheck: {[name: string]: boolean} = {};

    reports.forEach(report => {
      const { date, name, time_in, time_out, is_overtime, overtime_hours } = report;
      uniqueDates.add(date);
      uniqueNames.add(name);

      if (!hours[date]) {
        hours[date] = {};
      }

      const totalHours = calculateHours(time_in, time_out);
      const regularHours = Math.max(0, totalHours - (is_overtime ? overtime_hours : 0));
      
      hours[date][name] = {
        regular: formatHours(regularHours),
        overtime: is_overtime ? formatHours(overtime_hours) : '0'
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

    const processedDates = Array.from(uniqueDates).sort().reverse();
    const processedNames = Array.from(uniqueNames).sort();

    setDailyHours(hours);
    setTotalHours(totals);
    setDates(processedDates);
    setNames(processedNames);
    setHasOvertime(overtimeCheck);

    // Cache the processed data
    const cacheData = { dailyHours: hours, totalHours: totals, dates: processedDates, names: processedNames, hasOvertime: overtimeCheck };
    localStorage.setItem('cachedHoursTable', JSON.stringify(cacheData));
    localStorage.setItem('cachedHoursTableTimestamp', new Date().getTime().toString());

    console.log('Processed data:', cacheData);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <h1>Hours Worked</h1>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <FaSpinner className="spinner" />
          </div>
        ) : (
          <>
            {dates.length === 0 ? (
              <p>No data available.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>Date</th>
                    {names.map(name => (
                      <React.Fragment key={name}>
                        <th style={headerCellStyle} colSpan={hasOvertime[name] ? 2 : 1}>{name}</th>
                      </React.Fragment>
                    ))}
                  </tr>
                  <tr>
                    <th style={headerCellStyle}></th>
                    {names.map(name => (
                      <React.Fragment key={`subheader-${name}`}>
                        <th style={subHeaderCellStyle}>Reg</th>
                        {hasOvertime[name] && <th style={subHeaderCellStyle}>OT</th>}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dates.map(date => (
                    <tr key={date}>
                      <td style={cellStyle}>{date}</td>
                      {names.map(name => (
                        <React.Fragment key={`${date}-${name}`}>
                          <td style={cellStyle}>
                            {dailyHours[date]?.[name]?.regular || '-'}
                          </td>
                          {hasOvertime[name] && (
                            <td style={cellStyle}>
                              {dailyHours[date]?.[name]?.overtime !== '0' ? dailyHours[date]?.[name]?.overtime : '-'}
                            </td>
                          )}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td style={totalCellStyle}>Total Hours</td>
                    {names.map(name => (
                      <React.Fragment key={`total-${name}`}>
                        <td style={totalCellStyle}>
                          {formatHours(totalHours[name]?.regular || 0)}
                        </td>
                        {hasOvertime[name] && (
                          <td style={totalCellStyle}>
                            {formatHours(totalHours[name]?.overtime || 0)}
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  );
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '2px solid var(--border-color)',
};

const headerCellStyle: React.CSSProperties = {
  backgroundColor: 'var(--report-bg-color)',
  color: 'var(--text-color)',
  padding: '10px',
  textAlign: 'center',
  borderBottom: '2px solid var(--border-color)',
  borderRight: '1px solid var(--border-color)',
};

const subHeaderCellStyle: React.CSSProperties = {
  ...headerCellStyle,
  fontWeight: 'normal',
  fontSize: '0.9em',
};

const cellStyle: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid var(--border-color)',
  borderRight: '1px solid var(--border-color)',
  textAlign: 'center',
};

const totalCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 'bold',
  backgroundColor: 'var(--report-bg-color)',
};

export default HoursTable;
