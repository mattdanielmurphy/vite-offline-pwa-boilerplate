import { FaChevronDown, FaSpinner, FaTrashAlt } from 'react-icons/fa';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import ConfirmationModal from './components/ConfirmationModal';
import { DEV_CONFIG } from '../config';
import { isValidEmail } from './utils/validation';
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

// Add cache constants
const CACHE_KEY = 'email_settings_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedData {
  data: EmailSetting[];
  timestamp: number;
}

// Separate AddEmailForm component
const AddEmailForm: React.FC<{
  onAdd: (email: string, frequency: string) => void;
  disabled: boolean;
}> = ({ onAdd, disabled }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [email, setEmail] = useState('Add Email');
  const [frequency, setFrequency] = useState('daily');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidEmail(email)) {
      onAdd(email, frequency);
      setEmail('Add Email');
      setTouched(false);
      setIsAdding(false);
    }
  };

  const handleFocus = () => {
    if (!isAdding) {
      setIsAdding(true);
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ 
      marginTop: '20px',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px',
        width: isAdding ? '100%' : 'auto'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px'
        }}>
          <input
            ref={inputRef}
            type={isAdding ? "email" : "text"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleFocus}
            onBlur={() => setTouched(true)}
            placeholder="email@example.com"
            className={isAdding ? undefined : 'secondary-button add-email-button'}
            style={{ 
              flex: isAdding ? 1 : 'initial',
              width: isAdding ? '100%' : 'auto',
              borderColor: touched && email && !isValidEmail(email) ? '#dc3545' : undefined,
              cursor: isAdding ? 'text' : 'pointer',
              backgroundColor: isAdding ? 'var(--bg-color)' : undefined,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              padding: '12px',
              textAlign: isAdding ? 'left' : 'center',
              transition: 'all 0.2s ease'
            }}
            required
            disabled={disabled}
          />
          {isAdding && (
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              disabled={disabled}
              style={{
                borderRadius: '10px',
                padding: '12px',
                fontSize: '16px',
                border: 'none',
                backgroundColor: 'var(--bg-color)'
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
        </div>
        
        {touched && email && !isValidEmail(email) && (
          <div style={{ color: '#dc3545', fontSize: '14px' }}>
            Please enter a valid email address
          </div>
        )}

        {isAdding && (
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            marginTop: '4px'
          }}>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEmail('Add Email');
                setTouched(false);
              }}
              className="secondary-button"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="secondary-button"
              disabled={disabled || !isValidEmail(email)}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </form>
  );
};

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

  // Add cache-related functions
  const saveToCache = useCallback((data: EmailSetting[]) => {
    if (DEV_CONFIG.DISABLE_CACHING) return;
    const cacheData: CachedData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  }, []);

  const getFromCache = useCallback((): EmailSetting[] | null => {
    if (DEV_CONFIG.DISABLE_CACHING) return null;
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp }: CachedData = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  }, []);

  // Modify the fetch function to use cache
  const fetchEmailSettings = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cachedData = getFromCache();
      if (cachedData) {
        console.log('Using cached email settings');
        setEmailSettings(cachedData);
        setFetching(false);
        return;
      }
    }

    setFetching(true);
    try {
      const { data: users, error: userError } = await supabase
        .from('report-email-recipients')
        .select('address, frequency, enabled, confirmed, pending_deletion');

      if (userError) {
        console.error('Error fetching email settings:', userError);
        return;
      }

      const processedData = users.map(user => ({
        ...user,
        pendingDeletion: user.pending_deletion,
      }));

      setEmailSettings(processedData);
      saveToCache(processedData);
    } catch (error) {
      console.error('Error fetching email settings:', error);
    } finally {
      setFetching(false);
    }
  }, [saveToCache, getFromCache]);

  // Modify the useEffect to use the new fetch function
  useEffect(() => {
    fetchEmailSettings();

    const subscription = supabase
      .channel('email_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report-email-recipients'
        },
        async (payload) => {
          console.log('Email settings changed:', payload);
          // Force refresh when changes occur
          await fetchEmailSettings(true);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchEmailSettings]);

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
          localStorage.removeItem(CACHE_KEY); // Clear cache after successful save
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

  const handleAddNewEmail = (email: string, frequency: string) => {
    const newEmail: EmailSetting = {
      address: email,
      frequency,
      enabled: true,
      isNew: true,
      modified: true
    };
    setEmailSettings([...emailSettings, newEmail]);
    setChangesMade(true);
  };

  return (
    <div style={{ width: '100%' }}>
      <h1>Settings</h1>
      {notification && <div style={{ color: 'orange' }}>{notification}</div>}
      
      <div style={{ maxWidth: '414px', margin: '0 auto' }}>
        <h3>Scheduled Email Reports</h3>
        
        {emailSettings.map((setting, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <div 
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {/* Main row with email and expand/collapse */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', textDecoration: setting.pendingDeletion ? 'line-through' : 'none' }}>{setting.address}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {setting.pendingDeletion ? 'pending deletion' : `${setting.frequency.toLowerCase()} reports ${setting.enabled ? 'enabled' : 'disabled'}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                type="button" 
                onClick={(e) => handleDeleteClick(index, e)} 
                className="delete-button"
                style={{ color: 'var(--text-color)', }}
                disabled={setting.pendingDeletion}
              >
                <FaTrashAlt size={18} />
              </button>
                  <FaChevronDown 
                    style={{ 
                      transform: expandedIndex === index ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease'
                    }} 
                  />
                </div>
              </div>

              {/* Expanded section with controls */}
              {expandedIndex === index && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    padding: '12px 12px 6px 12px',
                    borderLeft: '5px solid var(--input-bg-color)',
                    cursor: 'default'
                  }}
                >
                  {setting.pendingDeletion ? (
                    <div style={{ gap: '12px' }}>
                      <button 
                        type="button"
                        onClick={() => handleUndoDelete(index)}
                        className="secondary-button"
                      >
                        Undo Delete
                      </button>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px',
                      alignItems: 'center',
                      justifyContent:'space-evenly'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(index)}
                        className="secondary-button"
                        style={{ 
                          padding: '8px 12px',
                          width: 'auto'
                        }}
                      >
                        {setting.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                      }}>
                        <span>Frequency:</span>
                        <select
                          value={setting.frequency}
                          onChange={(e) => handleFrequencyChange(index, e.target.value)}
                          style={{ flex: 1 }}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirmation status and resend button */}
            {!setting.confirmed && (
              <div style={{ 
                fontSize: '14px', 
                color: '#dc3545',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>Not confirmed</span>
                <button
                  onClick={() => handleResendConfirmation(setting.address)}
                  disabled={confirmationLoading === setting.address}
                  className="secondary-button"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  {confirmationLoading === setting.address ? (
                    <>
                      <FaSpinner className="spinner" style={{ marginRight: '4px' }} />
                      Sending...
                    </>
                  ) : (
                    'Resend Confirmation'
                  )}
                </button>
              </div>
            )}
          </div>
        ))}

        <AddEmailForm onAdd={handleAddNewEmail} disabled={loading} />
        
        {changesMade && (
          <button 
            onClick={handleSaveChanges} 
            disabled={loading}
            className="primary-button"
            style={{ 
              marginTop: '20px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
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
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmation.show}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${deleteConfirmation.email}?`}
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
