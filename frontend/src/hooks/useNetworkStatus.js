import { useState, useEffect } from 'react';

/**
 * Returns the current online/offline state and fires callbacks on change.
 *
 * Usage:
 *   const { isOnline } = useNetworkStatus();
 *   const { isOnline, wasOffline } = useNetworkStatus({ onReconnect: () => syncAll() });
 */
export function useNetworkStatus({ onReconnect, onDisconnect } = {}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // If app starts offline, wasOffline begins true so the first reconnect fires onReconnect
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        onReconnect?.();
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      onDisconnect?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, onReconnect, onDisconnect]);

  return { isOnline, wasOffline };
}

export default useNetworkStatus;
