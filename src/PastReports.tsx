import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Report } from './interfaces/Report';
import PullToRefresh from 'react-pull-to-refresh';
import { FaSpinner } from 'react-icons/fa';

const PastReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const cachedReports = localStorage.getItem('cachedReports');
    const cachedTimestamp = localStorage.getItem('cachedReportsTimestamp');

    if (cachedReports && cachedTimestamp) {
      const now = new Date().getTime();
      if (now - parseInt(cachedTimestamp) < 5 * 60 * 1000) { // 5 minutes cache
        setReports(JSON.parse(cachedReports));
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      setReports(data || []);
      localStorage.setItem('cachedReports', JSON.stringify(data));
      localStorage.setItem('cachedReportsTimestamp', new Date().getTime().toString());
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    return minutes === 0 ? `${formattedHours}${ampm}` : `${formattedHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
  };

  const formatOvertimeHours = (hours: number) => {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  };

  const calculateHours = (timeIn: string, timeOut: string) => {
    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);
    
    let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
        <h1>Past Reports</h1>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <FaSpinner className="spinner" />
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} style={cardStyle} className="report-card">
              <table style={headerTableStyle}>
                <tbody>
                  <tr>
                    <td style={headerCellStyle}>{formatDate(report.date)}</td>
                    <td style={headerCellStyle}>{report.name}</td>
                  </tr>
                </tbody>
              </table>
              <div style={hoursStyle}>
                {formatTime(report.time_in)} - {formatTime(report.time_out)} ({calculateHours(report.time_in, report.time_out)})
              </div>
              <table style={tableStyle}>
                <tbody>
                  <tr>
                    <td style={labelStyle}>Weather:</td>
                    <td style={cellStyle}>{report.weather}</td>
                  </tr>
                  <tr>
                    <td style={labelStyle}>Overtime:</td>
                    <td style={cellStyle}>
                      {report.is_overtime 
                        ? `Yes (${formatOvertimeHours(report.overtime_hours)})` 
                        : 'No'}
                    </td>
                  </tr>
                  {report.details && report.details.trim() !== '' && (
                    <tr>
                      <td style={labelStyle}>Details:</td>
                      <td style={{ ...cellStyle, whiteSpace: 'pre-wrap' }}>{report.details}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={tasksSectionStyle}>
                <h3 style={tasksHeaderStyle}>Tasks</h3>
                <div style={tasksTableWrapperStyle}>
                  <table style={tasksTableStyle}>
                    <tbody>
                      {formatTasks(report.tasks).map((task: { time: string; description: string }, index: number) => (
                        <tr key={index}>
                          <td style={taskTimeStyle}>{formatTime(task.time)}</td>
                          <td style={taskDescriptionStyle}>{task.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </PullToRefresh>
  );
};

const formatTasks = (tasksString: string) => {
  try {
    return JSON.parse(tasksString);
  } catch (error) {
    console.error('Error parsing tasks:', error);
    return [];
  }
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '20px',
  backgroundColor: 'var(--report-bg-color)',
};

const headerTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '15px',
};

const headerCellStyle: React.CSSProperties = {
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '1.2em',
  padding: '5px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 'bold',
  paddingRight: '10px',
  verticalAlign: 'top',
  width: '100px',
  textAlign: 'left',
};

const cellStyle: React.CSSProperties = {
  textAlign: 'left',
  paddingBottom: '5px',
};

const tasksSectionStyle: React.CSSProperties = {
  marginTop: '20px',
};

const tasksHeaderStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '10px',
};

const tasksTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse'
};

const tasksTableWrapperStyle: React.CSSProperties = {
  background: 'var(--bg-color)',
  borderRadius: '10px',
  padding: '5px 10px'
};
const taskTimeStyle: React.CSSProperties = {
  paddingRight: '10px',
  whiteSpace: 'nowrap',
  width:'20px',
  textAlign: 'left',
};

const taskDescriptionStyle: React.CSSProperties = {
  textAlign: 'left',
  paddingLeft: '10px',
};

const hoursStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '15px',
  fontSize: '1.1em',
};

export default PastReports;
