import { FaChevronDown, FaSpinner, FaTrashAlt } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';

import ConfirmationModal from './components/ConfirmationModal';
import { supabase } from './supabaseClient';

interface EmailSetting {
  address: string;
  frequency: string;
  enabled: boolean;
  modified?: boolean;
  confirmed?: boolean;
  isNew?: boolean;
  pendingDeletion?: boolean;
  touched?: boolean;
}

const Settings: React.FC = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSetting[]>([]);

  const [notification, setNotification] = useState<string | null>(null); // Notification state
  const [changesMade, setChangesMade] = useState<boolean>(false); // Track if changes are made
  const [loading, setLoading] = useState<boolean>(false); // Loading state
  const [fetching, setFetching] = useState<boolean>(false); // New loading state for fetching
  const [confirmationLoading, setConfirmationLoading] = useState<string | null>(null); // Track which email is sending confirmation

  // Add new state to track which email is expanded
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    index: number | null;
    email: string;
  }>({
    show: false,
    index: null,
    email: ''
  });

  useEffect(() => {
    const fetchEmailSettings = async () => {
      setFetching(true); // Set fetching to true when starting to fetch
      const { data: users, error: userError } = await supabase
        .from('report-email-recipients')
        .select('address, frequency, enabled, confirmed, pending_deletion');

      if (userError) {
        console.error('Error fetching email settings:', userError);
        setFetching(false); // Reset fetching state on error
        return; // Exit if there's an error
      }

      setEmailSettings(users.map(user => ({
        ...user,
        pendingDeletion: user.pending_deletion,
      }))); // Convert snake_case to camelCase when setting state
      setFetching(false); // Reset fetching state after successful fetch
    };

    fetchEmailSettings(); // Call the fetch function
  }, []); // Empty dependency array to run once on mount

  const handleToggle = (index: number) => {
    const updatedSettings = [...emailSettings];
    updatedSettings[index].enabled = !updatedSettings[index].enabled;
    updatedSettings[index].modified = true;
    setEmailSettings(updatedSettings);
    setChangesMade(true);
  };

  const handleFrequencyChange = (index: number, value: string) => {
    const updatedSettings = [...emailSettings];
    updatedSettings[index].frequency = value;
    updatedSettings[index].modified = true;
    setEmailSettings(updatedSettings);
    setChangesMade(true);
  };

  const handleEmailChange = (index: number, value: string) => {
    const updatedSettings = [...emailSettings];
    
    // Check for duplicate email (case insensitive)
    const isDuplicate = emailSettings.some((setting, i) => 
      i !== index && 
      setting.address.toLowerCase() === value.toLowerCase() &&
      !setting.pendingDeletion
    );
    
    if (isDuplicate) {
      setNotification('This email address already exists.');
      return;
    }
    
    updatedSettings[index].address = value;
    updatedSettings[index].modified = true;
    setEmailSettings(updatedSettings);
    setChangesMade(true);
  };

  const handleEmailBlur = (index: number) => {
    const updatedSettings = [...emailSettings];
    updatedSettings[index].touched = true;
    setEmailSettings(updatedSettings);
    
    // Only show validation message if email is invalid after blur
    if (!isValidEmail(updatedSettings[index].address)) {
      setNotification('Please enter a valid email address.');
    } else if (notification === 'Please enter a valid email address.') {
      setNotification(null);
    }
  };

  const handleAddEmail = () => {
    const newEmailSetting: EmailSetting = { 
      address: '', 
      frequency: 'weekly', 
      enabled: true,
      modified: true,
      isNew: true 
    };
    
    // Add the new email and expand it
    setEmailSettings([...emailSettings, newEmailSetting]);
    setChangesMade(true);
    
    // Expand the new email (it will be at the last index)
    const newIndex = emailSettings.length;
    setExpandedIndex(newIndex);
    
    // Focus the input after a short delay to ensure the DOM has updated
    setTimeout(() => {
      const emailInputs = document.querySelectorAll('input[type="email"]');
      const newInput = emailInputs[emailInputs.length - 1];
      if (newInput instanceof HTMLInputElement) {
        newInput.focus();
      }
    }, 50);
  };

  const handleSaveChanges = async () => {
    // Check for duplicate emails first
    const duplicateEmails = emailSettings
      .filter(setting => !setting.pendingDeletion)
      .map(setting => setting.address.toLowerCase());
    const hasDuplicates = duplicateEmails.length !== new Set(duplicateEmails).size;

    if (hasDuplicates) {
      setNotification('Please remove duplicate email addresses before saving.');
      return;
    }

    // Validate all emails
    const invalidEmails = emailSettings.filter(
      setting => !setting.pendingDeletion && !isValidEmail(setting.address)
    );

    if (invalidEmails.length > 0) {
      setNotification('Please fix invalid email addresses before saving.');
      const firstInvalidIndex = emailSettings.findIndex(
        setting => !setting.pendingDeletion && !isValidEmail(setting.address)
      );
      setExpandedIndex(firstInvalidIndex);
      return;
    }

    setLoading(true);
    try {
      // Get current email addresses to detect deletions
      const { data: currentEmails } = await supabase
        .from('report-email-recipients')
        .select('address, frequency, enabled');
      
      const currentAddresses = currentEmails?.map(e => e.address) || [];
      const updatedAddresses = emailSettings.map(e => e.address);
      
      // Find deleted emails and prepare confirmation emails for them
      const deletedEmails = currentEmails?.filter(email => 
        !updatedAddresses.includes(email.address)
      ) || [];

      // Handle new and modified emails
      const newEmails = emailSettings.filter(setting => 
        setting.modified && 
        !setting.confirmed && 
        !setting.pendingDeletion
      );
      if (newEmails.length > 0) {
        const { error: insertError } = await supabase
          .from('report-email-recipients')
          .upsert(
            newEmails.map(({ address, frequency, enabled }) => ({
              address,
              frequency,
              enabled,
              confirmed: false
            }))
          );

        if (insertError) {
          console.error('Error inserting new emails:', insertError);
          setNotification('Failed to save new email addresses.');
          setLoading(false);
          return;
        }
      }

      // Prepare all confirmation emails (including deletions)
      const confirmationEmails = [
        // Modified or new emails
        ...emailSettings
          .filter(setting => setting.modified)
          .map(({ address, frequency, enabled }) => ({
            address,
            text: `Click the link below to confirm that you'd like to ${enabled ? 'subscribe to' : 'unsubscribe from'} Admiralty shift reports on a ${frequency} basis:`,
            subject: enabled ? 'Confirm subscription to Admiralty shift reports' : 'Confirm unsubscription from Admiralty shift reports',
            includeConfirmationLink: true,
            frequency,
            enabled
          })),
        // Deleted emails
        ...deletedEmails.map(({ address, frequency }) => ({
          address,
          text: 'Click the link below to confirm that you\'d like to unsubscribe from Admiralty shift reports:',
          subject: 'Confirm unsubscription from Admiralty shift reports',
          includeConfirmationLink: true,
          frequency,
          enabled: false,
          delete: true
        }))
      ];

      if (confirmationEmails.length > 0) {
        const response = await fetch('/api/send-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(confirmationEmails),
        });

        if (response.ok) {
          setNotification('Changes saved and confirmation emails sent successfully!');
          // Reset modified flags and remove isNew flag after successful save
          setEmailSettings(prev => prev.map(setting => ({ 
            ...setting, 
            modified: false,
            isNew: false  // Remove isNew flag
          })));
        } else {
          setNotification('Failed to send confirmation emails.');
        }
      } else {
        setNotification('No changes to save.');
      }

      // After successful save
      setLoading(false);
      setChangesMade(false);
      setNotification('Changes saved successfully!');
      setExpandedIndex(null);  // Close all expanded emails
    } catch (error) {
      console.error('Error saving changes:', error);
      setNotification('Failed to save changes.');
      setLoading(false);
    }
  };

  const handleDeleteClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const email = emailSettings[index];
    
    if (email.confirmed && !email.isNew) {
      setDeleteConfirmation({
        show: true,
        index,
        email: email.address
      });
    } else {
      handleDeleteEmail(index);
    }
  };

  const handleDeleteEmail = async (index: number) => {
    const emailToDelete = emailSettings[index];
    
    // If email is new, just remove it from UI without any confirmation or DB updates
    if (emailToDelete.isNew) {
      setEmailSettings(emailSettings.filter((_, i) => i !== index));
      setDeleteConfirmation({ show: false, index: null, email: '' });
      // Reset changesMade if this was the only change
      const otherModifiedEmails = emailSettings.filter((email, i) => 
        i !== index && email.modified
      );
      if (otherModifiedEmails.length === 0) {
        setChangesMade(false);
      }
      return;
    }
    
    // Rest of the existing deletion logic for confirmed emails
    const updatedSettings = [...emailSettings];
    updatedSettings[index] = {
      ...emailToDelete,
      pendingDeletion: true
    };
    
    // Update database to mark as pending deletion
    const { error: updateError } = await supabase
      .from('report-email-recipients')
      .update({ pending_deletion: true })
      .eq('address', emailToDelete.address);

    if (updateError) {
      console.error('Error marking email as pending deletion:', updateError);
      setNotification('Failed to mark email for deletion.');
      return;
    }
    
    // Send confirmation email for deletion
    fetch('/api/send-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        address: emailToDelete.address,
        text: 'Click the link below to confirm that you\'d like to unsubscribe from Admiralty shift reports:',
        subject: 'Confirm unsubscription from Admiralty shift reports',
        includeConfirmationLink: true,
        delete: true
      }]),
    });

    setEmailSettings(updatedSettings);
    setDeleteConfirmation({ show: false, index: null, email: '' });
    setNotification('Deletion confirmation email sent.');
  };

  const handleResendConfirmation = async (email: string) => {
    setConfirmationLoading(email); // Set loading for this specific email
    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          address: email,
          text: `Click the link below to confirm your subscription to Admiralty shift reports:`,
          subject: 'Confirm subscription to Admiralty shift reports',
          includeConfirmationLink: true
        }]),
      });

      if (response.ok) {
        setNotification('Confirmation email sent successfully!');
      } else {
        setNotification('Failed to send confirmation email.');
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      setNotification('Error sending confirmation email.');
    }
    setConfirmationLoading(null); // Reset loading state
  };

  // Add the undo delete handler
  const handleUndoDelete = async (index: number) => {
    const updatedSettings = [...emailSettings];
    const emailToUndo = updatedSettings[index];
    
    // Update database to remove pending deletion
    const { error: updateError } = await supabase
      .from('report-email-recipients')
      .update({ pending_deletion: false })
      .eq('address', emailToUndo.address);

    if (updateError) {
      console.error('Error undoing deletion:', updateError);
      setNotification('Failed to undo deletion.');
      return;
    }

    // Update UI
    updatedSettings[index] = {
      ...emailToUndo,
      pendingDeletion: false
    };
    
    setEmailSettings(updatedSettings);
    setNotification('Deletion cancelled.');
  };

  // Add email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div style={{ width: '100%' }}>
      <h1>Settings</h1>
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
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: 'var(--input-bg-color)',
                borderRadius: '10px',
                cursor: 'pointer',
                border: '2px solid var(--bg-color)',
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-color)',
                textDecoration: setting.pendingDeletion ? 'line-through' : 'none'
              }}>
                <FaChevronDown
                  style={{
                    transform: expandedIndex === index ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
                <span>{setting.address}</span>
                {!setting.confirmed && !setting.isNew && (
                  <span style={{ 
                    color: 'orange',
                    fontStyle: 'italic',
                    fontSize: '14px'
                  }}>
                    (unconfirmed)
                  </span>
                )}
                {setting.pendingDeletion && (
                    <FaTrashAlt size={12} fill="#dc3545" />
                )}
              </div>
              <button 
                type="button" 
                onClick={(e) => handleDeleteClick(index, e)} 
                className="delete-button"
                style={{ color: 'var(--text-color)' }}
                disabled={setting.pendingDeletion}
              >
                <FaTrashAlt size={18} />
              </button>
            </div>

            {/* Expandable settings panel */}
            {expandedIndex === index && (
              <div style={{ 
                padding: '12px',
                backgroundColor: 'var(--input-bg-color)',
                borderBottomLeftRadius: '10px',
                borderBottomRightRadius: '10px',
              }}>
                {setting.pendingDeletion ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <span style={{ 
                      color: '#dc3545',
                      fontWeight: 'bold'
                    }}>
                      Pending deletion
                    </span>
                    <button 
                      type="button"
                      onClick={() => handleUndoDelete(index)}
                      className="secondary-button"
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      Undo Delete
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="email"
                      value={setting.address}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      onBlur={() => handleEmailBlur(index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveChanges();
                        }
                      }}
                      placeholder="email@example.com"
                      style={{ 
                        width: 'calc(100% - 24px)',
                        marginBottom: setting.touched && setting.address && !isValidEmail(setting.address) ? '4px' : '8px',
                        borderColor: setting.touched && setting.address && !isValidEmail(setting.address) ? '#dc3545' : undefined,
                      }}
                      required
                      disabled={setting.pendingDeletion}
                    />
                    {setting.touched && setting.address && !isValidEmail(setting.address) && (
                      <div style={{ 
                        color: '#dc3545', 
                        fontSize: '14px',
                        marginBottom: '8px'
                      }}>
                        Please enter a valid email address
                      </div>
                    )}
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
                  </>
                )}
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
              className="primary-button"
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
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

      <ConfirmationModal
        isOpen={deleteConfirmation.show}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${deleteConfirmation.email}? A confirmation email will be sent.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleteConfirmation.index !== null && handleDeleteEmail(deleteConfirmation.index)}
        onCancel={() => setDeleteConfirmation({ show: false, index: null, email: '' })}
        isDanger={true}
      />
    </div>
  );
};

export default Settings;
