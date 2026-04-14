import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { isSessionDeactivatedError, handleSessionDeactivated } from '../utils/sessionHandler';
import '../styles/profiles.css';

export default function ProfilesDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentProfile, setCurrentProfile] = useState('');

  useEffect(() => {
    loadProfiles();
    setCurrentProfile(localStorage.getItem('currentProfile') || '');
  }, []);

  const loadProfiles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/admin/list-profiles`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          const data = await response.json().catch(() => ({}));
          const errorMsg = data.detail || data.error || '';
          
          // Check for plan expiration (auto-logout)
          if (errorMsg.toLowerCase().includes('plan expired')) {
            const deviceId = localStorage.getItem('device_id');
            localStorage.clear();
            if (deviceId) {
              localStorage.setItem('device_id', deviceId);
            }
            window.dispatchEvent(new Event('auth-change'));
            window.location.hash = '#/';
            window.location.reload();
            return;
          }
          
          // Check for session deactivation
          if (isSessionDeactivatedError(errorMsg)) {
            handleSessionDeactivated();
            return;
          }
          
          navigate('/');
          return;
        }
        throw new Error('Failed to load profiles');
      }

      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error('Load profiles error:', err);
      
      // Check for plan expiration first
      if (err.message && err.message.toLowerCase().includes('plan expired')) {
        const deviceId = localStorage.getItem('device_id');
        localStorage.clear();
        if (deviceId) {
          localStorage.setItem('device_id', deviceId);
        }
        window.dispatchEvent(new Event('auth-change'));
        window.location.hash = '#/';
        window.location.reload();
        return;
      }
      
      // Check if error is session deactivation
      if (isSessionDeactivatedError(err.message)) {
        handleSessionDeactivated();
        return;
      }
      
      setError(err.message);
    }
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

  const handleProfileClick = (profile) => {
    // Check if a profile is already active
    const isProfileActive = localStorage.getItem('isProfileActive') === 'true';
    
    if (isProfileActive && currentProfile !== profile.username) {
      setError('Please logout from current profile first');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSelectedProfile(profile);
    setShowLoginModal(true);
    setError('');
  };

  const handleProfileLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/profile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile_id: selectedProfile.id,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Profile login error:', data.detail);
        throw new Error(data.detail || 'Login failed');
      }

      // Store profile state
      localStorage.setItem('currentProfile', selectedProfile.username);
      localStorage.setItem('isProfileActive', 'true');

      setShowLoginModal(false);
      setLoginPassword('');
      navigate('/');
      window.location.reload();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profile) => {
    if (profile.username === currentProfile) {
      setError('Cannot delete currently active profile');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!confirm(`Delete profile "${profile.username}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/admin/delete-profile`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profile_id: profile.id })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Delete profile error:', data.detail);
        throw new Error(data.detail || 'Failed to delete profile');
      }

      loadProfiles();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleFullLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('currentProfile');
      localStorage.removeItem('isProfileActive');

      navigate('/');
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="profiles-page">
      <div className="profiles-container">
        <div className="profiles-header">
          <button className="logout-btn" onClick={handleFullLogout}>
            Full Logout
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="profiles-grid">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className={`profile-card ${currentProfile === profile.username ? 'active' : ''}`}
              onClick={() => handleProfileClick(profile)}
            >
              <div className="profile-avatar">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <p className="profiles-card-name">{profile.username}</p>
              {currentProfile === profile.username && (
                <span className="active-badge">Active</span>
              )}
              {profile.username !== 'profile1' && (
                <button
                  className="delete-profile-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProfile(profile);
                  }}
                  title="Delete profile"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <div className="profile-card add-profile" onClick={() => {
            // Check if a profile is already logged in
            const isProfileActive = localStorage.getItem('isProfileActive') === 'true';
            if (isProfileActive) {
              setError('Please logout from current profile before creating a new one');
              setTimeout(() => setError(''), 3000);
              return;
            }
            setShowAddModal(true);
          }}>
            <div className="profile-avatar">+</div>
            <p className="profiles-card-name">Add Profile</p>
          </div>
        </div>
      </div>

      {/* Add Profile Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className="modal-title">Create New Profile</h2>
            <form onSubmit={handleAddProfile} className="modal-form">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Login Modal */}
      {showLoginModal && selectedProfile && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowLoginModal(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className="modal-title">Login as {selectedProfile.username}</h2>
            <form onSubmit={handleProfileLogin} className="modal-form">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
