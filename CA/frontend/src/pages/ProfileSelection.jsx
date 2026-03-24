import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import '../styles/profiles.css';

export default function ProfileSelection() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [hoveredProfile, setHoveredProfile] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('');
  const hoverTimeout = React.useRef(null);

  useEffect(() => {
    // Prevent navigation away from this page
    const handlePopState = (e) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    // Push initial state
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    loadProfiles();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const loadProfiles = async () => {
    setError(''); // Clear previous errors
    try {
      const response = await fetch(`${API_URL}/api/auth/admin/list-profiles`, {
        credentials: 'include',
        signal: AbortSignal.timeout(45000) // 45 second timeout
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, redirect to home
          window.location.href = '/';
          return;
        }
        throw new Error('Failed to load profiles');
      }

      const data = await response.json();
      setProfiles(data.profiles || []);
      setCurrentPlan(data.plan || '');
    } catch (err) {
      console.error('Load profiles error:', err);
      if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(err.message);
      }
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleUpgradeToVip = async () => {
    if (!window.confirm('Upgrade from PRIME to VIP? This will allow up to 25 profiles.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/upgrade-to-vip`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to upgrade');
      }

      // Reload profiles to show new plan
      await loadProfiles();
      alert('Successfully upgraded to VIP!');
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (profile) => {
    setSelectedProfile(profile);
    setShowLoginModal(true);
    setError('');
    setLoginPassword('');
  };

  const handleMouseEnter = (profileId) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setHoveredProfile(profileId);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setHoveredProfile(null);
    }, 300);
  };

  const handleAddProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/admin/create-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: newUsername,
          password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Create profile error:', data.detail);
        throw new Error(data.detail || 'Failed to create profile');
      }

      setShowAddModal(false);
      setNewUsername('');
      setNewPassword('');
      loadProfiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profile, e) => {
    e.stopPropagation();
    
    if (!window.confirm(`Delete profile "${profile.username}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/admin/delete-profile`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile_id: profile.id
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete profile');
      }

      loadProfiles();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleProfileLogin = async (e) => {
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
        console.log('✅ Using existing device_id for profile login:', deviceId);
      }

      const response = await fetch(`${API_URL}/api/auth/profile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile_id: selectedProfile.id,
          password: loginPassword,
          device_id: deviceId
        }),
        signal: AbortSignal.timeout(45000) // 45 second timeout
      });

      const data = await response.json();

      // Check for error in response body (not HTTP status)
      if (!response.ok || data.ok === false) {
        const errorMsg = data.error || data.detail || 'Login failed';
        console.error('Profile login error:', errorMsg);
        throw new Error(errorMsg);
      }

      // Store profile state
      localStorage.setItem('currentProfile', selectedProfile.username);
      localStorage.setItem('isProfileActive', 'true');
      localStorage.setItem('userRole', 'profile');

      // Dispatch custom event to notify NavBar
      window.dispatchEvent(new Event('auth-change'));

      // Redirect to home
      window.location.href = '/#/';
      
    } catch (err) {
      console.error('Profile login error:', err);
      if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
        setError('Login timed out. Please check your connection and try again.');
      } else if (err.message.includes('503') || err.message.includes('temporarily unavailable')) {
        setError('Service temporarily unavailable. Please try again in a moment.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFullLogout = async () => {
    setLoading(true);
    
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear auth data but PRESERVE device_id
    const deviceId = localStorage.getItem('device_id');
    localStorage.clear();
    if (deviceId) {
      localStorage.setItem('device_id', deviceId);
      console.log('✅ Preserved device_id during logout:', deviceId);
    }
    
    // Redirect to home
    window.location.href = '/';
  };

  return (
    <div className="profile-selection-page">
      <div className="profile-selection-container">
        <div className="profile-selection-header">
          <div className="header-actions">
            {currentPlan === 'PRIME' && (
              <button onClick={handleUpgradeToVip} className="btn-upgrade-vip" disabled={loading}>
                Upgrade to VIP
              </button>
            )}
            <button onClick={handleFullLogout} className="btn-logout-corner" disabled={loading}>
              {loading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
          
          {/* <div className="brand-container">
            <svg viewBox="0 0 120 120" className="brand-logo-large">
              <defs>
                <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6"/>
                  <stop offset="50%" stopColor="#3b82f6"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
                <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0"/>
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M 35,30 L 75,30 L 75,38 L 45,38 L 45,50 L 70,50 L 70,58 L 45,58 L 45,90" fill="none" stroke="url(#brandGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M 80,35 Q 90,40 95,50" fill="none" stroke="url(#pulseGradient)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M 75,54 Q 85,57 92,65" fill="none" stroke="url(#pulseGradient)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M 80,42 L 100,42" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
              <circle cx="95" cy="50" r="3.5" fill="#06b6d4"/>
              <circle cx="92" cy="65" r="3.5" fill="#3b82f6"/>
              <circle cx="100" cy="42" r="3" fill="#8b5cf6"/>
              <path d="M 78,72 L 85,78 L 78,84" fill="none" stroke="url(#brandGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M 87,72 L 94,78 L 87,84" fill="none" stroke="url(#brandGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke="url(#brandGradient)" strokeWidth="1.5" opacity="0.2" strokeDasharray="8,6"/>
            </svg>
            <h1 className="brand-text-large">FISCLYTIC</h1>
          </div> */}
          <h2 className="selection-title">Select Profile to Continue</h2>
        </div>

        {error && (
          <div className="error-banner">
            {error}
            {error.includes('timed out') || error.includes('unavailable') ? (
              <button 
                onClick={loadProfiles} 
                style={{
                  marginLeft: '12px', 
                  padding: '6px 12px', 
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Retry
              </button>
            ) : null}
          </div>
        )}

        <div className="profiles-grid-center">
          {profiles.map((profile, index) => {
            // Color palette for different profiles
            const colorClasses = [
              'profile-color-purple',
              'profile-color-blue',
              'profile-color-cyan',
              'profile-color-pink',
              'profile-color-orange',
              'profile-color-green',
              'profile-color-red',
              'profile-color-yellow',
              'profile-color-teal',
              'profile-color-indigo'
            ];
            const colorClass = colorClasses[index % colorClasses.length];
            
            return (
              <div key={profile.id} className="profile-wrapper">
                <div
                  className={`profile-card-select ${colorClass}`}
                  onClick={() => handleProfileClick(profile)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="user-icon">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z"/>
                  </svg>
                </div>
                <p className="profile-name-below">{profile.username}</p>
              </div>
            );
          })}

          {/* Add Profile Card */}
          <div className="profile-wrapper">
            <div
              className="profile-card-select add-profile-card"
              onClick={() => setShowAddModal(true)}
            >
              +
            </div>
            <p className="profile-name-below">Add Profile</p>
          </div>
        </div>
      </div>

      {/* Profile Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => { setShowLoginModal(false); setLoginPassword(''); }}>
          <div className="modal-content profile-login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => { setShowLoginModal(false); setLoginPassword(''); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            
            <div className="profile-login-header">
              <div className="profile-avatar-modal">
                {selectedProfile?.username.charAt(0).toUpperCase()}
              </div>
              <h2>Welcome back, {selectedProfile?.username}</h2>
              <p className="profile-login-subtitle">Enter your password to continue</p>
            </div>

            <form onSubmit={handleProfileLogin} className="modal-form">
              <div className="form-group">
                {/* <label>Password</label> */}
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  className="password-input"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="submit" className="btn-modal-primary" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
                {selectedProfile?.username !== 'profile1' && (
                  <button 
                    type="button" 
                    onClick={(e) => {
                      setShowLoginModal(false);
                      handleDeleteProfile(selectedProfile, e);
                    }} 
                    className="btn-modal-delete"
                  >
                    Delete Profile
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setNewUsername(''); setNewPassword(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => { setShowAddModal(false); setNewUsername(''); setNewPassword(''); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2>Create New Profile</h2>
            <form onSubmit={handleAddProfile} className="modal-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowAddModal(false); setNewUsername(''); setNewPassword(''); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
