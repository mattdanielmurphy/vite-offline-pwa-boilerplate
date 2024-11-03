import { FaExclamationTriangle, FaWifi } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';

const ConnectionStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null; // Don't show anything when online

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '8px',
            textAlign: 'center',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        }}>
            <FaExclamationTriangle />
            <span>You're offline. Some features may be unavailable.</span>
        </div>
    );
};

export default ConnectionStatus; 