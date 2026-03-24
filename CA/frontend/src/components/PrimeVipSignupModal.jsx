import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import PaymentModal from './PaymentModal';
import './AccessModal.css';

const SIGNUP_STATES = {
  EMAIL: 'EMAIL',
  OTP: 'OTP',
  PAYMENT: 'PAYMENT',
  ONBOARDING: 'ONBOARDING'
};

export default function PrimeVipSignupModal({ isOpen, onClose, planType }) {
  const navigate = useNavigate();
  
  const [signupState, setSignupState] = useState(SIGNUP_STATES.EMAIL);
  const [accountId, setAccountId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // Payment data
  const [planId, setPlanId] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  
  // Onboarding fields
  const [adminPassword, setAdminPassword] = useState('');
  const [firmFrn, setFirmFrn] = useState('');
  const [proprietorName, setProprietorName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [caMembership, setCaMembership] = useState('');
  const [firstProfileUsername, setFirstProfileUsername] = useState('');
  const [firstProfilePassword, setFirstProfilePassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('primeVipSignupFlow');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setSignupState(state.signupState || SIGNUP_STATES.EMAIL);
        setEmail(state.email || '');
        setAccountId(state.accountId || '');
        setPlanId(state.planId || '');
        setPlanPrice(state.planPrice || 0);
        setFirmFrn(state.firmFrn || '');
        setProprietorName(state.proprietorName || '');
        setAddress(state.address || '');
        setContactNumber(state.contactNumber || '');
        setCaMembership(state.caMembership || '');
        setFirstProfileUsername(state.firstProfileUsername || '');
        // Don't restore passwords for security
      } catch (e) {
        sessionStorage.removeItem('primeVipSignupFlow');
      }
    }
  }, []);

  // Save state to sessionStorage when key fields change
  useEffect(() => {
    if ((email || accountId) && isOpen) {
      sessionStorage.setItem('primeVipSignupFlow', JSON.stringify({
        signupState,
        email,
        accountId,
        planId,
        planPrice,
        firmFrn,
        proprietorName,
        address,
        contactNumber,
        caMembership,
        firstProfileUsername,
        planType
      }));
    }
  }, [signupState, email, accountId, planId, planPrice, firmFrn, proprietorName, address, contactNumber, caMembership, firstProfileUsername, planType, isOpen]);

  // Validate payment state - reset if invalid
  useEffect(() => {
    if (signupState === SIGNUP_STATES.PAYMENT && (!accountId || !planId || !planPrice)) {
      console.warn('Invalid payment state detected, resetting to EMAIL state');
      setSignupState(SIGNUP_STATES.EMAIL);
      sessionStorage.removeItem('primeVipSignupFlow');
    }
  }, [signupState, accountId, planId, planPrice]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Close on ESC and block back button and reload during signup
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    
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
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, loading]);

  const handleClose = () => {
    if (!loading) {
      setSignupState(SIGNUP_STATES.EMAIL);
      setAccountId('');
      setEmail('');
      setOtp('');
      setError('');
      setCountdown(0);
      // Reset onboarding fields
      setAdminPassword('');
      setFirmFrn('');
      setProprietorName('');
      setAddress('');
      setContactNumber('');
      setCaMembership('');
      setFirstProfileUsername('');
      setFirstProfilePassword('');
      // Clear sessionStorage when user manually closes
      sessionStorage.removeItem('primeVipSignupFlow');
      onClose();
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/prime/signup-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Signup start error:', data.detail);
        throw new Error(data.detail || 'Failed to send OTP');
      }

      setAccountId(data.account_id);
      
      // Resume payment if payment is pending
      if (data.resume_payment) {
        setPlanId(data.plan_id);
        setPlanPrice(data.plan_price);
        setSignupState(SIGNUP_STATES.PAYMENT);
        return;
      }

      // Skip to onboarding if payment already done
      if (data.skip_to_onboarding) {
        setSignupState(SIGNUP_STATES.ONBOARDING);
        return;
      }
      
      // Skip OTP if email already verified - go to payment
      if (data.skip_otp) {
        // Fetch plan details for payment
        const planResponse = await fetch(`${API_URL}/api/auth/plans`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const planData = await planResponse.json();
        
        if (!planResponse.ok) {
          throw new Error('Failed to fetch plan details');
        }

        const selectedPlan = planData.find(p => p.name === planType.toUpperCase());
        
        if (!selectedPlan) {
          throw new Error(`${planType} plan not found`);
        }

        setPlanId(selectedPlan.id);
        setPlanPrice(selectedPlan.price);
        setSignupState(SIGNUP_STATES.PAYMENT);
        return;
      }

      // Normal flow: go to OTP
      setSignupState(SIGNUP_STATES.OTP);
      
      // If OTP already exists, continue timer from remaining time
      if (data.otp_exists && data.remaining_resend_cooldown_seconds !== undefined) {
        setCountdown(data.remaining_resend_cooldown_seconds);
      } else {
        setCountdown(900);
      }
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
      const response = await fetch(`${API_URL}/api/auth/prime/signup-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Resend OTP error:', data.detail);
        throw new Error(data.detail || 'Failed to resend OTP');
      }

      // If OTP already exists, continue timer from remaining time
      if (data.otp_exists && data.remaining_resend_cooldown_seconds !== undefined) {
        setCountdown(data.remaining_resend_cooldown_seconds);
      } else {
        setCountdown(900);
      }
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
      const response = await fetch(`${API_URL}/api/auth/prime/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('OTP verification error:', data.detail);
        throw new Error(data.detail || 'Invalid OTP');
      }

      // Fetch plan details for payment
      const planResponse = await fetch(`${API_URL}/api/auth/plans`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const planData = await planResponse.json();
      
      if (!planResponse.ok) {
        throw new Error('Failed to fetch plan details');
      }

      // Find selected plan (PRIME or VIP)
      const selectedPlan = planData.find(p => p.name === planType.toUpperCase());
      
      if (!selectedPlan) {
        throw new Error(`${planType} plan not found`);
      }

      setPlanId(selectedPlan.id);
      setPlanPrice(selectedPlan.price);
      setSignupState(SIGNUP_STATES.PAYMENT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Payment completed, now complete firm onboarding
    setSignupState(SIGNUP_STATES.ONBOARDING);
  };

  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get device_id from localStorage (should already exist from App.jsx)
      let deviceId = localStorage.getItem('device_id');
      
      if (!deviceId) {
        // Fallback: generate new one if somehow missing
        deviceId = crypto.randomUUID();
        localStorage.setItem('device_id', deviceId);
        console.warn('⚠️ device_id was missing! Generated new one:', deviceId);
      } else {
        console.log('✅ Using existing device_id for Prime onboarding:', deviceId);
      }

      const response = await fetch(`${API_URL}/api/auth/prime/onboard-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          account_id: parseInt(accountId),
          admin_password: adminPassword,
          frn: firmFrn,
          proprietor_name: proprietorName,
          address,
          contact_number: contactNumber,
          ca_membership_no: caMembership,
          profile_username: firstProfileUsername,
          profile_password: firstProfilePassword,
          device_id: deviceId,
          plan_name: planType.toUpperCase() // PRIME or VIP
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Onboarding error:', data.detail);
        throw new Error(data.detail || 'Onboarding failed');
      }

      // Store auth state - user is now logged in as profile1
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userRole', 'profile');
      localStorage.setItem('selectedPlan', planType.toUpperCase());
      localStorage.setItem('currentProfile', firstProfileUsername);
      localStorage.setItem('isProfileActive', 'true');

      // Dispatch auth-change event to notify NavBar
      window.dispatchEvent(new Event('auth-change'));

      // Clear signup flow state on success
      sessionStorage.removeItem('primeVipSignupFlow');

      handleClose();
      
      // Redirect to home page (user is already logged in as profile1)
      window.location.hash = '#/';
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

        {/* EMAIL SCREEN */}
        {signupState === SIGNUP_STATES.EMAIL && (
          <div className="modal-screen">
            <h2 className="modal-title">{planType} Plan Signup</h2>
            <p className="modal-subtitle">Enter your email to get started</p>

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
                  autoFocus
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          </div>
        )}

        {/* OTP VERIFICATION SCREEN */}
        {signupState === SIGNUP_STATES.OTP && (
          <div className="modal-screen">
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
                {loading ? 'Verifying...' : 'Verify OTP'}
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

        {/* ONBOARDING FORM SCREEN */}
        {signupState === SIGNUP_STATES.ONBOARDING && (
          <div className="modal-screen" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 className="modal-title">Complete Your Setup</h2>
            <p className="modal-subtitle">Firm details and first profile creation</p>

            <form onSubmit={handleCompleteOnboarding} className="modal-form">
              <div className="form-group">
                <label htmlFor="adminPassword" className="form-label">Admin Password</label>
                <input
                  type="password"
                  id="adminPassword"
                  className="form-input"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="firmFrn" className="form-label">Firm FRN</label>
                <input
                  type="text"
                  id="firmFrn"
                  className="form-input"
                  placeholder="FRN123456"
                  value={firmFrn}
                  onChange={(e) => setFirmFrn(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="proprietorName" className="form-label">Proprietor Name</label>
                <input
                  type="text"
                  id="proprietorName"
                  className="form-input"
                  placeholder="John Doe & Associates"
                  value={proprietorName}
                  onChange={(e) => setProprietorName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="address" className="form-label">Address</label>
                <textarea
                  id="address"
                  className="form-input"
                  placeholder="Street, City, State, PIN"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="contactNumber" className="form-label">Contact Number</label>
                <input
                  type="tel"
                  id="contactNumber"
                  className="form-input"
                  placeholder="+91 9876543210"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="caMembership" className="form-label">CA Membership Number</label>
                <input
                  type="text"
                  id="caMembership"
                  className="form-input"
                  placeholder="123456"
                  value={caMembership}
                  onChange={(e) => setCaMembership(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <hr style={{ margin: '20px 0', border: '1px solid var(--border)' }} />
              <p className="modal-subtitle">Create Your First Profile</p>

              <div className="form-group">
                <label htmlFor="firstProfileUsername" className="form-label">Profile Username</label>
                <input
                  type="text"
                  id="firstProfileUsername"
                  className="form-input"
                  placeholder="profile1"
                  value={firstProfileUsername}
                  onChange={(e) => setFirstProfileUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="firstProfilePassword" className="form-label">Profile Password</label>
                <input
                  type="password"
                  id="firstProfilePassword"
                  className="form-input"
                  placeholder="••••••••"
                  value={firstProfilePassword}
                  onChange={(e) => setFirstProfilePassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
                {loading ? 'Creating Account...' : 'Complete Setup'}
              </button>
            </form>
          </div>
        )}

        {/* PAYMENT MODAL (Rendered outside main modal to overlay) */}
        {signupState === SIGNUP_STATES.PAYMENT && (
          <PaymentModal
            isOpen={true}
            onClose={() => {}}  // Prevent closing during payment
            onSuccess={handlePaymentSuccess}
            accountId={accountId}
            planId={planId}
            planName={`${planType} Plan`}
            planPrice={planPrice}
          />
        )}
      </div>
    </div>
  );
}
