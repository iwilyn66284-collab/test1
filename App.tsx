
import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import Auth from './components/Auth';
import BidApp from './components/BidApp';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const savedPassword = localStorage.getItem('bid_app_password');
    if (!savedPassword) {
      setAppState(AppState.INITIAL_SETUP);
    } else {
      setAppState(AppState.LOGIN);
    }
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setAppState(AppState.AUTHENTICATED);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAppState(AppState.LOGIN);
  };

  if (appState === AppState.AUTHENTICATED && isAuthenticated) {
    return <BidApp onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Auth 
        state={appState} 
        onSuccess={handleAuthSuccess} 
        onStateChange={setAppState} 
      />
    </div>
  );
};

export default App;
