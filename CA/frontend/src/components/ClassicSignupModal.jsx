import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import PaymentModal from './PaymentModal';
import './AccessModal.css';

const SCREENS = {
  EMAIL: 'EMAIL',
  OTP: 'OTP',
  PAYMENT: 'PAYMENT',
  SET_PASSWORD: 'SET_PASSWORD',
  SIGNIN: 'SIGNIN'
};

export default function ClassicSignupModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState(SCREENS.EMAIL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Payment data
  const [planId, setPlanId] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  
  // OTP timer
  const [otpTimer, setOtpTimer] = useState(900);
  const [canResend, setCanResend] = useState(false);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('classicSignupFlow');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setCurrentScreen(state.currentScreen || SCREENS.EMAIL);
        setEmail(state.email || '');
        setAccountId(state.accountId || '');
        setPlanId(state.planId || '');
        setPlanPrice(state.planPrice || 0);
        // Don't restore sensitive data like passwords
      } catch (e) {
        sessionStorage.removeItem('classicSignupFlow');
      }
    }
  }, []);

  // Save state to sessionStorage when key fields change
  useEffect(() => {
    if ((email || accountId) && isOpen) {
      sessionStorage.setItem('classicSignupFlow', JSON.stringify({
        currentScreen,
        email,
        accountId,
        planId,
        planPrice
      }));
    }
  }, [currentScreen, email, accountId, planId, planPrice, isOpen]);

  // Validate payment state - reset if invalid
  useEffect(() => {
    if (currentScreen === SCREENS.PAYMENT && (!accountId || !planId || !planPrice)) {
      console.warn('Invalid payment state detected, resetting to EMAIL screen');
      setCurrentScreen(SCREENS.EMAIL);
      sessionStorage.removeItem('classicSignupFlow');
    }
  }, [currentScreen, accountId, planId, planPrice]);

  useEffect(() => {
    if (currentScreen === SCREENS.OTP && otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpTimer === 0) {
      setCanResend(true);
    }
  }, [currentScreen, otpTimer]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setCurrentScreen(SCREENS.EMAIL);
      setEmail('');
      setAccountId('');
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setSignInPassword('');
      setError('');
      setOtpTimer(900);
      setCanResend(false);
      // Clear sessionStorage only if user manually closed (not on reload)
      if (!loading) {
        sessionStorage.removeItem('classicSignupFlow');
      }
    }
  }, [isOpen, loading]);

  // Block back button and reload during signup process
  useEffect(() => {
    const handlePopState = (e) => {
      if (isOpen && loading) {
        // Block back button during signup process
        window.history.pushState(null, '', window.location.href);
      }
    };
    
    const handleBeforeUnload = (e) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = 'Signup is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    if (isOpen) {
      // Push state to enable back button blocking
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, loading]);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/classic/signup-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to start signup');
      }

      setAccountId(data.account_id);
      
      // Resume payment if payment is pending
      if (data.resume_payment) {
        setPlanId(data.plan_id);
        setPlanPrice(data.plan_price);
        setCurrentScreen(SCREENS.PAYMENT);
        return;
      }

      // Skip to password if payment already done
      if (data.skip_to_password) {
        setCurrentScreen(SCREENS.SET_PASSWORD);
        return;
      }
      
      // Skip OTP if email already verified
      if (data.skip_otp) {
        // Fetch plan details and go to payment
        const planResponse = await fetch(`${API_URL}/api/auth/plans`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const planData = await planResponse.json();
        
        if (!planResponse.ok) {
          throw new Error('Failed to fetch plan details');
        }

        const classicPlan = planData.find(p => p.name === 'CLASSIC');
        
        if (!classicPlan) {
          throw new Error('Classic plan not found');
        }

        setPlanId(classicPlan.id);
        setPlanPrice(classicPlan.price);
        setCurrentScreen(SCREENS.PAYMENT);
        return;
      }

      // Normal flow: go to OTP
      setCurrentScreen(SCREENS.OTP);
      
      // If OTP already exists, continue timer from remaining time
      if (data.otp_exists && data.remaining_resend_cooldown_seconds !== undefined) {
        setOtpTimer(data.remaining_resend_cooldown_seconds);
      } else {
        setOtpTimer(900);
      }
      
      setCanResend(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/classic/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid OTP');
      }

      // Fetch Classic plan details for payment
      const planResponse = await fetch(`${API_URL}/api/auth/plans`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const planData = await planResponse.json();
      
      if (!planResponse.ok) {
        throw new Error('Failed to fetch plan details');
      }

      // Find Classic plan
      const classicPlan = planData.find(p => p.name === 'CLASSIC');
      
      if (!classicPlan) {
        throw new Error('Classic plan not found');
      }

      setPlanId(classicPlan.id);
      setPlanPrice(classicPlan.price);
      setCurrentScreen(SCREENS.PAYMENT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/classic/signup-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to resend OTP');
      }

      setAccountId(data.account_id);
      
      // If OTP already exists, continue timer from remaining time
      if (data.otp_exists && data.remaining_resend_cooldown_seconds !== undefined) {
        setOtpTimer(data.remaining_resend_cooldown_seconds);
      } else {
        setOtpTimer(900);
      }
      
      setCanResend(false);
      setOtp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Payment completed, now set password
    setCurrentScreen(SCREENS.SET_PASSWORD);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/classic/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to set password');
      }

      setSignInEmail(email); // Pre-fill email for convenience
      setCurrentScreen(SCREENS.SIGNIN);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
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
        console.log('✅ Using existing device_id for ClassicSignup signin:', deviceId);
      }

      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: signInEmail, 
          password: signInPassword,
          device_id: deviceId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Sign in failed');
      }

      // Store auth state
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'classic');
      localStorage.setItem('userEmail', signInEmail);
      
      // Dispatch auth-change event to notify NavBar
      window.dispatchEvent(new Event('auth-change'));
      
      // Clear signup flow state on success
      sessionStorage.removeItem('classicSignupFlow');
      
      // Close modal and redirect to home
      onClose();
      navigate('/');
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

        {/* EMAIL SCREEN */}
        {currentScreen === SCREENS.EMAIL && (
          <div className="modal-screen">
            <h2 className="modal-title">Create Classic Account</h2>
            <p className="modal-subtitle">Start your subscription journey</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleEmailSubmit}>
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
                />
              </div>

              <button 
                type="submit" 
                className="modal-btn modal-btn-primary"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Next →'}
              </button>
            </form>
          </div>
        )}

        {/* OTP SCREEN */}
        {currentScreen === SCREENS.OTP && (
          <div className="modal-screen">
            <button 
              className="back-btn"
              onClick={() => setCurrentScreen(SCREENS.EMAIL)}
              disabled={loading}
            >
              ← Back
            </button>

            <h2 className="modal-title">Verify OTP</h2>
            <p className="modal-subtitle">Enter the code sent to {email}</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleOtpVerify}>
              <div className="form-group">
                <label htmlFor="otp">OTP Code</label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  disabled={loading}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                />
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#666' }}>
                {otpTimer > 0 ? (
                  <span>Resend OTP in {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}</span>
                ) : (
                  <button 
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#3b82f6', 
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button 
                type="submit" 
                className="modal-btn modal-btn-primary"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          </div>
        )}

        {/* SET PASSWORD SCREEN */}
        {currentScreen === SCREENS.SET_PASSWORD && (
          <div className="modal-screen">
            <button 
              className="back-btn"
              onClick={() => setCurrentScreen(SCREENS.OTP)}
              disabled={loading}
            >
              ← Back
            </button>

            <h2 className="modal-title">Create Password</h2>
            <p className="modal-subtitle">Secure your account</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSetPassword}>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="modal-btn modal-btn-primary"
                disabled={loading}
              >
                {loading ? 'Setting Password...' : 'Set Password'}
              </button>
            </form>
          </div>
        )}

        {/* SIGNIN SCREEN */}
        {currentScreen === SCREENS.SIGNIN && (
          <div className="modal-screen">
            <h2 className="modal-title">Sign In to Your Account</h2>
            <p className="modal-subtitle">Welcome! Please sign in to continue</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label htmlFor="signInEmail">Email</label>
                <input
                  id="signInEmail"
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="signInPassword">Password</label>
                <input
                  id="signInPassword"
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="modal-btn modal-btn-primary"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* PAYMENT MODAL (Rendered outside main modal to overlay) */}
        {currentScreen === SCREENS.PAYMENT && (
          <PaymentModal
            isOpen={true}
            onClose={() => {}}  // Prevent closing during payment
            onSuccess={handlePaymentSuccess}
            accountId={accountId}
            planId={planId}
            planName="Classic Plan"
            planPrice={planPrice}
          />
        )}
      </div>
    </div>
  );
}
