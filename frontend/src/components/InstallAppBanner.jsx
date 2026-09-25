import React, { useState, useEffect } from 'react';
import { Download, WifiOff } from 'lucide-react';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Monitor online/offline state
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for mobile browser PWA install trigger
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      {/* Offline Alert Strip */}
      {isOffline && (
        <div
          style={{
            background: '#0f172a',
            color: '#f87171',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'sticky',
            top: 0,
            zIndex: 10000,
          }}
        >
          <WifiOff size={16} />
          You are currently offline. Running from cached storage with emergency helplines enabled.
        </div>
      )}

      {/* Install App Prompt */}
      {deferredPrompt && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fee2e2',
            padding: '10px 16px',
            borderRadius: '10px',
            margin: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
            Install VitalConnectAI on your phone for instant one-tap emergency access
          </span>
          <button
            onClick={handleInstallClick}
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Download size={14} /> Install App
          </button>
        </div>
      )}
    </>
  );
}