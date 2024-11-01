import { FaChevronDown, FaSpinner, FaTrashAlt } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';

import { supabase } from './supabaseClient';

interface EmailSetting {
  address: string;
  frequency: string;
  enabled: boolean;
}

const Settings: React.FC = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSetting[]>([]);

  const [notification, setNotification] = useState<string | null>(null); // Notification state
  const [changesMade, setChangesMade] = useState<boolean>(false); // Track if changes are made
  const [loading, setLoading] = useState<boolean>(false); // Loading state
  const [fetching, setFetching] = useState<boolean>(false); // New loading state for fetching

  // Add new state to track which email is expanded
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchEmailSettings = async () => {
      setFetching(true); // Set fetching to true when starting to fetch
      const { data: users, error: userError } = await supabase
        .from('report-email-recipients')
        .select('address, frequency, enabled');

      if (userError) {
        console.error('Error fetching email settings:', userError);
        setFetching(false); // Reset fetching state on error
        return; // Exit if there's an error
      }

      setEmailSettings(users); // Populate email settings with fetched data
      setFetching(false); // Reset fetching state after successful fetch
    };

    fetchEmailSettings(); // Call the fetch function
  }, []); // Empty dependency array to run once on mount

  const handleToggle = (index: number) => {
    const updatedSettings = [...emailSettings];
    updatedSettings[index].enabled = !updatedSettings[index].enabled;
    setEmailSettings(updatedSettings);
    setChangesMade(true); // Mark changes as made
  };

  const handleFrequencyChange = (index: number, value: string) => {
    const updatedSettings = [...emailSettings];
    updatedSettings[index].frequency = value;
    setEmailSettings(updatedSettings);
    setChangesMade(true); // Mark changes as made
  };

  const handleAddEmail = () => {
    const newEmailSetting: EmailSetting = { address: '', frequency: 'weekly', enabled: true }; // Default values
    setEmailSettings([...emailSettings, newEmailSetting]);
    setChangesMade(true); // Mark changes as made
  };

  const handleSaveChanges = async () => {
    setLoading(true); // Set loading to true when saving starts
    // Logic to save changes (e.g., API call)
    const confirmationEmails = emailSettings.map(({ address, frequency, enabled }) => {
      return {
        address,
        text: `Click the link below to confirm that you'd like to ${enabled ? 'subscribe to' : 'unsubscribe from'} Admiralty shift reports on a ${frequency} basis:`,
        subject: enabled ? 'Confirm subscription to Admiralty shift reports' : 'Confirm unsubscription from Admiralty shift reports',
        includeConfirmationLink: true,
        frequency,
        enabled
      };
    });

    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmationEmails),
      });

      if (response.ok) {
        setNotification('Confirmation emails sent successfully!'); // Set notification message
      } else {
        setNotification('Failed to send confirmation emails.'); // Handle error
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      setNotification('Error sending confirmation emails.'); // Handle error
    }

    setLoading(false); // Reset loading state
    setChangesMade(false); // Reset changes made flag
  };

  const handleEmailChange = (index: number, value: string) => {
    const updatedSettings = [...emailSettings];
    updatedSettings[index].address = value;
    setEmailSettings(updatedSettings);
    setChangesMade(true); // Mark changes as made
  };

  const handleDeleteEmail = (index: number) => {
    const updatedSettings = emailSettings.filter((_, i) => i !== index);
    setEmailSettings(updatedSettings);
    setChangesMade(true); // Mark changes as made
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Add overlay when loading */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          zIndex: 1000
        }} />
      )}
      
      <h2>Settings</h2>
      {fetching && <div>Loading email settings...</div>}
      {notification && <div style={{ color: 'orange' }}>{notification}</div>}
      <form style={{ 
        display: 'block',
        maxWidth: '414px',
        margin: '0 auto',
        position: 'relative', // For proper overlay stacking
        backgroundColor: 'var(--bg-color)' // Match the page background
      }}>
        <h3>Scheduled Email Reports</h3>
        {emailSettings.map((setting, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            {/* Main row: Email and delete button */}
            <div 
              style={{ 
                display: 'flex', 
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: '1px solid var(--input-bg-color)',
                minHeight: '40px',
                backgroundColor: 'var(--bg-color)' // Match the page background
              }}
            >
              <div 
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                style={{ 
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: 0,
                  minWidth: 0
                }}
              >
                <span style={{ 
                  flex: 1, 
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '300px'
                }}>
                  {setting.address || 'email@example.com'}
                </span>
                <FaChevronDown 
                  style={{ 
                    transform: expandedIndex === index ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0
                  }}
                />
              </div>
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEmail(index);
                }} 
                className="delete-button"
                style={{ color: 'var(--text-color)' }}
              >
                <FaTrashAlt size={18} />
              </button>
            </div>

            {/* Expandable settings panel */}
            {expandedIndex === index && (
              <div style={{ 
                padding: '12px',
                marginTop: '4px',
                backgroundColor: 'var(--bg-color)', // Match the page background
                borderRadius: '4px'
              }}>
                <input
                  type="email"
                  value={setting.address}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveChanges();
                    }
                  }}
                  placeholder="email@example.com"
                  style={{ 
                    width: 'calc(100% - 24px)', // Account for padding
                    marginBottom: '8px'
                  }}
                  required
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={setting.enabled}
                      onChange={() => handleToggle(index)}
                      style={{ width: '20px', height: '20px' }}
                    />
                    Enabled
                  </label>
                  <select
                    value={setting.frequency}
                    onChange={(e) => handleFrequencyChange(index, e.target.value)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px', 
          marginTop: '20px',
          width: '100%'
        }}>
          {changesMade && (
            <button 
              type="button" 
              onClick={handleSaveChanges} 
              disabled={loading}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                zIndex: 1001 // Ensure form stays above overlay
              }}
            >
              {loading ? (
                <>
                  <FaSpinner className="spinner" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          )}
          <button 
            type="button" 
            onClick={handleAddEmail} 
            className="secondary-button"
            disabled={loading}
          >
            Add Email
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
