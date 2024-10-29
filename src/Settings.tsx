import React, { useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa'; // Import the trash icon

interface EmailSetting {
  address: string;
  frequency: string;
  enabled: boolean;
}

const Settings: React.FC = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSetting[]>([
    { address: 'email@example.com', frequency: 'daily', enabled: true },
  ]);

  const [notification, setNotification] = useState<string | null>(null); // Notification state
  const [changesMade, setChangesMade] = useState<boolean>(false); // Track if changes are made
  const [loading, setLoading] = useState<boolean>(false); // Loading state

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
    const modifiedEmails = emailSettings.filter(setting => setting.enabled);
    const confirmationEmails = modifiedEmails.map(({ address, frequency }) => {
      return {
        to: address,
        text: `Click the link below to confirm your subscription to Admiralty shift reports on a ${frequency} basis:`,
        subject: 'Confirm subscription to Admiralty shift reports',
        includeConfirmationLink: true,
        frequency
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
    <div>
      <h2>Settings</h2>
      {notification && <div style={{ color: 'orange' }}>{notification}</div>} {/* Display notification */}
      <form>
        <h3>Scheduled Email Reports</h3>
        {emailSettings.map((setting, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={setting.enabled}
              onChange={() => handleToggle(index)}
              style={{ width: '20px', height: '20px', marginRight: '10px' }}
            />
            <input
              type="email"
              value={setting.address}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Prevent form submission
                  handleSaveChanges(); // Call save changes function
                }
              }}
              placeholder="email@example.com" // Placeholder text
              style={{ marginRight: '10px'}}
              required
            />
            <select
              value={setting.frequency}
              onChange={(e) => handleFrequencyChange(index, e.target.value)}
              style={{ marginRight: '10px', width: '100px' }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button 
              type="button" 
              onClick={() => handleDeleteEmail(index)} 
              className="delete-button" // Use the new class
            >
              <FaTrashAlt size={18} /> {/* Increase icon size */}
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {changesMade && ( // Show Save Changes button only if changes are made
            <button type="button" onClick={handleSaveChanges} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'} {/* Show loading text */}
            </button>
          )}
          <button type="button" onClick={handleAddEmail} className="secondary-button" style={{ marginLeft: '10px' }}>Add Email</button> {/* Add button */}
        </div>
        {loading && <div>Loading...</div>} {/* Display loading animation/message */}
      </form>
    </div>
  );
};

export default Settings;
