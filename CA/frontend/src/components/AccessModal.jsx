import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrialContext } from '../contexts/TrialContext';
import { startFreeTrial, verifyTrialOTP } from '../services/trialService';
import { API_URL } from '../config';
import './AccessModal.css';

const MODAL_STATES = {
  MENU: 'MENU',
  TRIAL_EMAIL: 'TRIAL_EMAIL',
  TRIAL_OTP: 'TRIAL_OTP',
  SIGNIN: 'SIGNIN',
  TRIAL_ENDED: 'TRIAL_ENDED',
  FORGOT_PASSWORD_OTP: 'FORGOT_PASSWORD_OTP',
  RESET_PASSWORD: 'RESET_PASSWORD'
};

export default function AccessModal({ isOpen, onClose, onAccessGranted }) {
  const navigate = useNavigate();
  const { activateTrial } = useTrialContext();
  
  const [modalState, setModalState] = useState(MODAL_STATES.MENU);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trialId, setTrialId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // Forgot password states
  const [accountId, setAccountId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Restore state from sessionStorage ONLY on mount (page reload recovery)
  useEffect(() => {
    const savedState = sessionStorage.getItem('accessModalFlow');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Only restore if modal is currently open (page reload scenario)
        if (isOpen) {
          setModalState(state.modalState || MODAL_STATES.MENU);
          setEmail(state.email || '');
          setTrialId(state.trialId || '');
          setAccountId(state.accountId || null);
          setCountdown(state.countdown || 0);
        }
        // Don't restore passwords or OTP for security
      } catch (e) {
        sessionStorage.removeItem('accessModalFlow');
      }
    }
  }, []); // Only run on mount

  // Save state to sessionStorage for page reload recovery
  useEffect(() => {
    if (isOpen && modalState !== MODAL_STATES.MENU && modalState !== MODAL_STATES.SIGNIN) {
      // Only save if in forgot password or trial flow
      sessionStorage.setItem('accessModalFlow', JSON.stringify({
        modalState,
        email,
        trialId,
        accountId,
        countdown
      }));
    }
  }, [modalState, email, trialId, accountId, countdown, isOpen]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Close on ESC key and block back button and reload during signin/trial
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    const handlePopState = (e) => {
      if (isOpen && loading) {
        // Block back button during signin/trial process
        window.history.pushState(null, '', window.location.href);
      }
    };
    
    const handleBeforeUnload = (e) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = 'Authentication is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    if (isOpen) {
      // Push state to enable back button blocking
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, loading]);

  const handleClose = () => {
    // Reset all state when closing
    setModalState(MODAL_STATES.MENU);
    setEmail('');
    setPassword('');
    setTrialId('');
    setOtp('');
    setAccountId(null);
    setCountdown(0);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    // Clear sessionStorage
    sessionStorage.removeItem('accessModalFlow');
    onClose();
  };

  const handleStartTrial = () => {
    setModalState(MODAL_STATES.TRIAL_EMAIL);
    setError('');
  };

  const handleBuyPlan = () => {
    handleClose();
    navigate('/pricing');
  };

  const handleSignIn = () => {
    setModalState(MODAL_STATES.SIGNIN);
    setError('');
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get or generate device ID (EXACTLY like SignInModal)
      const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);

      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          device_id: deviceId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.detail || 'Sign in failed';
        console.error('Sign in error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ AccessModal Signin response:', data);
      console.log('✅ AccessModal Role:', data.role);
      console.log('✅ AccessModal Plan:', data.plan);

      // Store auth state (EXACTLY like SignInModal)
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      
      // For PRIME/VIP users, store plan as role
      if (data.plan) {
        localStorage.setItem('userRole', data.plan.toLowerCase());
        localStorage.setItem('selectedPlan', data.plan.toUpperCase());
      } else {
        localStorage.setItem('userRole', data.role || 'classic');
      }

      // Dispatch auth-change event to notify NavBar
      window.dispatchEvent(new Event('auth-change'));

      // Clear access modal flow state on success
      sessionStorage.removeItem('accessModalFlow');

      // Close modal
      handleClose();

      // Redirect based on role
      console.log('✅ AccessModal Checking role for redirect:', data.role);
      if (data.role === 'admin') {
        // PRIME/VIP admin users - go to profile selection page
        console.log('✅ AccessModal REDIRECTING TO PROFILE SELECTION');
        // Use hash routing for React Router (no reload needed)
        window.location.hash = '#/profile-selection';
      } else {
        // Classic users - reload current page to access tool
        console.log('✅ AccessModal Classic user - reloading page');
        window.location.reload();
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter email');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send OTP');
      }

      setAccountId(data.account_id);
      setModalState(MODAL_STATES.FORGOT_PASSWORD_OTP);
      
      // If OTP already exists, use remaining cooldown time
      if (data.otp_exists && data.remaining_resend_cooldown_seconds !== undefined) {
        setCountdown(data.remaining_resend_cooldown_seconds);
      } else {
        setCountdown(900); // 15 minutes for new OTP
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendForgotPasswordOTP = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to resend OTP');
      }

      // Use remaining cooldown or reset to 15 minutes for new OTP
      if (data.otp_exists && data.remaining_resend_cooldown_seconds !== undefined) {
        setCountdown(data.remaining_resend_cooldown_seconds);
      } else {
        setCountdown(900);
      }
      setOtp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotPasswordOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          otp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid OTP');
      }

      setModalState(MODAL_STATES.RESET_PASSWORD);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to reset password');
      }

      // Success - reset to sign in screen
      setModalState(MODAL_STATES.SIGNIN);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setAccountId(null);
      setCountdown(0);
      setError('');
      // Clear saved flow
      sessionStorage.removeItem('accessModalFlow');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await startFreeTrial(email);
      setTrialId(response.trial_id);
      setModalState(MODAL_STATES.TRIAL_OTP);
      setCountdown(900); // Start 15 minute countdown
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await startFreeTrial(email);
      setTrialId(response.trial_id);
      setCountdown(900); // Reset countdown
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await verifyTrialOTP(trialId, otp);
      
      console.log('Trial verification response:', response);
      
      // Activate trial in context - this sets localStorage synchronously
      activateTrial(response.trial_jwt_token, response.remaining_runs || 5);
      
      // Wait a bit to ensure localStorage is written
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify token was stored
      const storedToken = localStorage.getItem('trial_token');
      console.log('Stored trial token:', storedToken ? 'Yes' : 'No');
      
      // Clear access modal flow state on successful trial activation
      sessionStorage.removeItem('accessModalFlow');
      
      // Close modal and reset state
      setModalState(MODAL_STATES.MENU);
      setEmail('');
      setTrialId('');
      setOtp('');
      setError('');
      setCountdown(0);
      onClose();
      
      // Navigate to home page with a delay
      setTimeout(() => {
        window.location.href = '/#/';  // Force full navigation
      }, 300);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToMenu = () => {
    setModalState(MODAL_STATES.MENU);
    setError('');
  };

  const handleBackToEmail = () => {
    setModalState(MODAL_STATES.TRIAL_EMAIL);
    setOtp('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* MENU SCREEN */}
        {modalState === MODAL_STATES.MENU && (
          <div className="modal-screen">
            <h2 className="modal-title">Access Required</h2>
            <p className="modal-subtitle">Choose how you'd like to proceed</p>

            <div className="modal-buttons">
              <button className="modal-btn modal-btn-primary" onClick={handleStartTrial}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Start Free Trial
              </button>

              <button className="modal-btn modal-btn-secondary" onClick={handleBuyPlan}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Buy Plan
              </button>

              <button className="modal-btn modal-btn-outline" onClick={handleSignIn}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* TRIAL EMAIL SCREEN */}
        {modalState === MODAL_STATES.TRIAL_EMAIL && (
          <div className="modal-screen">
            <button className="modal-back-btn" onClick={handleBackToMenu}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back
            </button>

            <h2 className="modal-title">Start Free Trial</h2>
            <p className="modal-subtitle">Get 5 free tool runs • No credit card required</p>

            <form onSubmit={handleSendOTP} className="modal-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          </div>
        )}

        {/* TRIAL OTP SCREEN */}
        {modalState === MODAL_STATES.TRIAL_OTP && (
          <div className="modal-screen">
            <button className="modal-back-btn" onClick={handleBackToEmail}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back
            </button>

            <h2 className="modal-title">Verify Email</h2>
            <p className="modal-subtitle">Enter the 6-digit code sent to {email}</p>

            <form onSubmit={handleVerifyOTP} className="modal-form">
              <div className="form-group">
                <label htmlFor="otp" className="form-label">OTP Code</label>
                <input
                  type="text"
                  id="otp"
                  className="form-input otp-input"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Activate Trial'}
              </button>

              <div className="resend-section">
                {countdown > 0 ? (
                  <p className="resend-timer">Resend OTP in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</p>
                ) : (
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleResendOTP}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* SIGN IN SCREEN */}
        {modalState === MODAL_STATES.SIGNIN && (
          <div className="modal-screen">
            <button className="modal-back-btn" onClick={handleBackToMenu}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back
            </button>

            <h2 className="modal-title">Sign In</h2>
            <p className="modal-subtitle">Access your account</p>

            <form onSubmit={handleSignInSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="signin-email" className="form-label">Email Address</label>
                <input
                  type="email"
                  id="signin-email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="signin-password" className="form-label">Password</label>
                <input
                  type="password"
                  id="signin-password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div style={{ 
                textAlign: 'right', 
                marginBottom: '12px',
                fontSize: '14px'
              }}>
                <span 
                  style={{ 
                    color: '#4F46E5',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline'
                  }}
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </span>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* FORGOT PASSWORD OTP SCREEN */}
        {modalState === MODAL_STATES.FORGOT_PASSWORD_OTP && (
          <div className="modal-screen">
            <button className="modal-back-btn" onClick={() => {
              setModalState(MODAL_STATES.SIGNIN);
              setOtp('');
              setCountdown(0);
              setError('');
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back
            </button>

            <h2 className="modal-title">Verify OTP</h2>
            <p className="modal-subtitle">Enter the OTP sent to {email}</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleVerifyForgotPasswordOTP} className="modal-form">
              <div className="form-group">
                <label htmlFor="forgot-otp" className="form-label">Enter OTP</label>
                <input
                  type="text"
                  id="forgot-otp"
                  className="form-input"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={6}
                  autoFocus
                />
              </div>

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>

            <div className="resend-section">
              {countdown > 0 ? (
                <p className="resend-timer">Resend OTP in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</p>
              ) : (
                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleResendForgotPasswordOTP}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {/* RESET PASSWORD SCREEN */}
        {modalState === MODAL_STATES.RESET_PASSWORD && (
          <div className="modal-screen">
            <h2 className="modal-title">Set New Password</h2>
            <p className="modal-subtitle">Create a new password for your account</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleResetPassword} className="modal-form">
              <div className="form-group">
                <label htmlFor="new-password" className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="new-password"
                    className="form-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '18px'
                    }}
                    disabled={loading}
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password" className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm-password"
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '18px'
                    }}
                    disabled={loading}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* TRIAL ENDED SCREEN */}
        {modalState === MODAL_STATES.TRIAL_ENDED && (
          <div className="modal-screen">
            <div className="trial-ended-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <h2 className="modal-title">Free Trial Ended</h2>
            <p className="modal-subtitle">You have used all 5 free runs</p>

            <div className="modal-buttons">
              <button className="modal-btn modal-btn-primary" onClick={handleBuyPlan}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Buy Plan
              </button>

              <button className="modal-btn modal-btn-outline" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export function to show trial ended modal externally
export function showTrialEndedModal(setModalState) {
  setModalState(MODAL_STATES.TRIAL_ENDED);
}
