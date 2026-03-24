import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './AccessModal.css';

const SCREENS = {
  SIGNIN: 'SIGNIN',
  FORGOT_PASSWORD_OTP: 'FORGOT_PASSWORD_OTP',
  RESET_PASSWORD: 'RESET_PASSWORD'
};

export default function SignInModal({ isOpen, onClose, redirectPath = '/', onOpenSignup }) {
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState(SCREENS.SIGNIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot password states
  const [accountId, setAccountId] = useState(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Restore state from sessionStorage ONLY on mount (page reload recovery)
  useEffect(() => {
    const savedState = sessionStorage.getItem('signinFlow');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Only restore if modal is currently open (page reload scenario)
        if (isOpen) {
          setEmail(state.email || '');
          setAccountId(state.accountId || null);
          setCurrentScreen(state.currentScreen || SCREENS.SIGNIN);
          setCountdown(state.countdown || 0);
        }
      } catch (e) {
        sessionStorage.removeItem('signinFlow');
      }
    }
  }, []); // Only run on mount

  // Save state to sessionStorage for page reload recovery
  useEffect(() => {
    if (isOpen && currentScreen !== SCREENS.SIGNIN) {
      // Only save if in forgot password flow
      sessionStorage.setItem('signinFlow', JSON.stringify({
        email,
        accountId,
        currentScreen,
        countdown
      }));
    }
  }, [email, accountId, currentScreen, countdown, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset everything when modal closes
      setEmail('');
      setPassword('');
      setError('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentScreen(SCREENS.SIGNIN);
      setAccountId(null);
      setCountdown(0);
      // Clear sessionStorage when modal closes
      sessionStorage.removeItem('signinFlow');
    }
  }, [isOpen]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    
    const handlePopState = (e) => {
      if (isOpen && loading) {
        // Block back button during signin process
        window.history.pushState(null, '', window.location.href);
      }
    };
    
    const handleBeforeUnload = (e) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = 'Sign in is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    if (isOpen) {
      // Push state to enable back button blocking
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get device_id from localStorage (should already exist from App.jsx)
      let deviceId = localStorage.getItem('device_id');
      
      if (!deviceId) {
        // Fallback: generate new one if somehow missing
        deviceId = crypto.randomUUID();
        localStorage.setItem('device_id', deviceId);
        console.warn('⚠️ device_id was missing! Generated new one:', deviceId);
      } else {
        console.log('✅ Using existing device_id:', deviceId);
      }

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

      console.log('✅ Signin response:', data); // Debug log
      console.log('✅ Role:', data.role);
      console.log('✅ Plan:', data.plan);

      // Store auth state
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

      // Clear signin flow state on success
      sessionStorage.removeItem('signinFlow');

      // Close modal
      onClose();
      
      // Redirect based on role
      console.log('✅ Checking role for redirect:', data.role);
      if (data.role === 'admin') {
        // PRIME/VIP admin users - go to profile selection page
        console.log('✅ REDIRECTING TO PROFILE SELECTION');
        // Use hash routing for React Router (no reload needed)
        window.location.hash = '#/profile-selection';
      } else {
        // Classic users - go to requested page
        console.log('✅ Classic user - redirecting to:', redirectPath);
        window.location.hash = '#' + redirectPath;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
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
      setCurrentScreen(SCREENS.FORGOT_PASSWORD_OTP);
      
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

  const handleResendOTP = async () => {
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

  const handleVerifyOTP = async (e) => {
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

      setCurrentScreen(SCREENS.RESET_PASSWORD);
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
      setCurrentScreen(SCREENS.SIGNIN);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setAccountId(null);
      setCountdown(0);
      setError('');
      // Clear saved flow
      sessionStorage.removeItem('signinFlow');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSignInScreen = () => (
    <div className="modal-screen">
      <h2 className="modal-title">Sign In to Your Account</h2>
      <p className="modal-subtitle">Welcome back! Please sign in to continue</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            required
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
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

        <button
          type="submit"
          className="modal-btn modal-btn-primary"
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px', 
        fontSize: '14px',
        color: '#666'
      }}>
        Don't have an account?{' '}
        <span 
          style={{ 
            color: '#4F46E5', 
            textDecoration: 'none',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
          onClick={() => {
            if (!loading) {
              onClose();
              navigate('/pricing');
            }
          }}
        >
          Buy Plan
        </span>
      </div>
    </div>
  );

  const renderForgotPasswordOTPScreen = () => (
    <div className="modal-screen">
      <h2 className="modal-title">Verify OTP</h2>
      <p className="modal-subtitle">Enter the OTP sent to {email}</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleVerifyOTP}>
        <div className="form-group">
          <label htmlFor="otp">Enter OTP</label>
          <input
            id="otp"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter 6-digit OTP"
            required
            disabled={loading}
            maxLength={6}
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="modal-btn modal-btn-primary"
          disabled={loading}
        >
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
            onClick={handleResendOTP}
            disabled={loading}
          >
            Resend OTP
          </button>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button
          type="button"
          onClick={() => {
            setCurrentScreen(SCREENS.SIGNIN);
            setOtp('');
            setCountdown(0);
            setError('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#4F46E5',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '14px'
          }}
          disabled={loading}
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );

  const renderResetPasswordScreen = () => (
    <div className="modal-screen">
      <h2 className="modal-title">Set New Password</h2>
      <p className="modal-subtitle">Create a new password for your account</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleResetPassword}>
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
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
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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

        <button
          type="submit"
          className="modal-btn modal-btn-primary"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {currentScreen === SCREENS.SIGNIN && renderSignInScreen()}
        {currentScreen === SCREENS.FORGOT_PASSWORD_OTP && renderForgotPasswordOTPScreen()}
        {currentScreen === SCREENS.RESET_PASSWORD && renderResetPasswordScreen()}
      </div>
    </div>
  );
}
