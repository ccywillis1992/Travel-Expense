import { ReactNode, useState, useEffect } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-1.5 text-center shadow-xs flex items-center justify-center gap-1.5">
          <span>⚡ Offline Mode — app fully operational. All data saved locally.</span>
        </div>
      )}
      {children}
    </div>
  );
}
