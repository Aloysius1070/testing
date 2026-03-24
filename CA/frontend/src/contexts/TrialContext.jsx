import React, { createContext, useContext, useState, useEffect } from 'react';

const TrialContext = createContext();

export const useTrialContext = () => {
  const context = useContext(TrialContext);
  if (!context) {
    throw new Error('useTrialContext must be used within TrialProvider');
  }
  return context;
};

export const TrialProvider = ({ children }) => {
  const [trialMode, setTrialMode] = useState(false);
  const [trialToken, setTrialToken] = useState(null);
  const [trialRunsLeft, setTrialRunsLeft] = useState(0);

  // Initialize from localStorage
  useEffect(() => {
    const storedTrialMode = localStorage.getItem('trial_mode');
    const storedTrialToken = localStorage.getItem('trial_token');
    const storedTrialRuns = localStorage.getItem('trial_runs_left');

    if (storedTrialMode === 'true' && storedTrialToken) {
      setTrialMode(true);
      setTrialToken(storedTrialToken);
      setTrialRunsLeft(parseInt(storedTrialRuns || '0', 10));
    }
  }, []);

  // Activate trial after OTP verification
  const activateTrial = (token, runsLeft = 5) => {
    localStorage.setItem('trial_token', token);
    localStorage.setItem('trial_mode', 'true');
    localStorage.setItem('trial_runs_left', runsLeft.toString());
    
    setTrialToken(token);
    setTrialMode(true);
    setTrialRunsLeft(runsLeft);
  };

  // Update runs left after tool execution
  const updateRunsLeft = (newRunsLeft) => {
    if (newRunsLeft <= 0) {
      clearTrial();
    } else {
      localStorage.setItem('trial_runs_left', newRunsLeft.toString());
      setTrialRunsLeft(newRunsLeft);
    }
  };

  // Clear trial state when expired or ended
  const clearTrial = () => {
    localStorage.removeItem('trial_token');
    localStorage.removeItem('trial_mode');
    localStorage.removeItem('trial_runs_left');
    
    setTrialToken(null);
    setTrialMode(false);
    setTrialRunsLeft(0);
  };

  const value = {
    trialMode,
    trialToken,
    trialRunsLeft,
    activateTrial,
    updateRunsLeft,
    clearTrial
  };

  return (
    <TrialContext.Provider value={value}>
      {children}
    </TrialContext.Provider>
  );
};
