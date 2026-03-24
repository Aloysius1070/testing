import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User2, LogOut, Shield, Calendar, Clock, CheckCircle2, AlertCircle,
  FileText, Calculator, Receipt, BookOpen, Users, RefreshCw, Mail,
  Crown, Sparkles, Activity, TrendingUp, Zap, ArrowRight, Settings,
  Award, Target, BarChart3, Briefcase, Package, Star, ChevronRight,
  Bell, Heart, MessageSquare, Share2, Download, Upload, Eye, Phone,
  MapPin, Globe, BadgeCheck, Verified, ShieldCheck
} from 'lucide-react';
import { API_URL } from '../config';
import { isSessionDeactivatedError, handleSessionDeactivated } from '../utils/sessionHandler';
import '../styles/globals.css';

export default function Profile() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [processHistory, setProcessHistory] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProfileData();
    fetchProcessHistory();
    fetchProfiles();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          const data = await response.json().catch(() => ({}));
          const errorMsg = data.detail || data.error || '';
          
          if (errorMsg.toLowerCase().includes('plan expired')) {
            handleLogout();
            return;
          }
          
          if (isSessionDeactivatedError(errorMsg)) {
            handleSessionDeactivated();
            return;
          }
          
          navigate('/');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfileData(data);
      setLoading(false);
    } catch (err) {
      console.error('Profile fetch error:', err);
      
      if (err.message && err.message.toLowerCase().includes('plan expired')) {
        handleLogout();
        return;
      }
      
      if (isSessionDeactivatedError(err.message)) {
        handleSessionDeactivated();
        return;
      }
      
      setError(err.message);
      navigate('/');
      setLoading(false);
    }
  };

  const fetchProcessHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/process-history`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProcessHistory(data.activities || []);
      }
    } catch (err) {
      console.error('Process history fetch error:', err);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/profiles-list`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error('Profiles fetch error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      // Call profile-logout endpoint to return to admin session
      const response = await fetch(`${API_URL}/api/auth/profile-logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Logout successful, navigate to profile selection page
        navigate('/profile-selection');
      } else {
        console.error('Profile logout failed');
        // Fallback: navigate anyway
        navigate('/profile-selection');
      }
    } catch (error) {
      console.error('Profile logout error:', error);
      // Fallback: navigate anyway
      navigate('/profile-selection');
    }
  };

  const handleSwitchProfile = () => {
    navigate('/profile-selection');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getActivityIcon = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('gst')) return <FileText size={20} />;
    if (actionLower.includes('tds')) return <Calculator size={20} />;
    if (actionLower.includes('invoice')) return <Receipt size={20} />;
    if (actionLower.includes('ledger')) return <BookOpen size={20} />;
    return <Activity size={20} />;
  };

  const formatActionText = (action) => {
    return action
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (error || !profileData) {
    return null;
  }

  const { email, role, plan, profile_name, expires_at, full_name } = profileData;
  const userName = full_name || profile_name || email.split('@')[0];
  const isProfileRole = role === 'profile';
  
  let daysRemaining = null;
  let isExpired = false;
  if (expires_at) {
    daysRemaining = Math.ceil((new Date(expires_at) - new Date()) / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining < 0;
  }

  return (
    <div className="profile-page">
      {/* Header with Cover */}
      <div className="profile-cover">
        <div className="cover-gradient"></div>
        <div className="profile-header-content">
          <div className="profile-main-info">
            <div className="profile-avatar-large">
              <div className="avatar-circle">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="avatar-badge">
                {isExpired ? (
                  <AlertCircle size={20} />
                ) : (
                  <BadgeCheck size={20} />
                )}
              </div>
            </div>
            <div className="profile-info">
              <h1 className="profile-name">{userName}</h1>
              <div className="profile-meta">
                <div className="meta-item">
                  <Mail size={16} />
                  <span>{email}</span>
                </div>
                {/* <div className="meta-item">
                  <Shield size={16} />
                  <span className="role-badge">{role}</span>
                </div>
                {isProfileRole && profile_name && (
                  <div className="meta-item">
                    <Sparkles size={16} />
                    <span>{profile_name}</span>
                  </div>
                )} */}
              </div>
            </div>
          </div>
          
          <div className="profile-actions-header">
            <button onClick={handleLogout} className="btn-logout-header">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="profile-container">
        
        {/* Subscription Status Banner */}
        {(isExpired || (daysRemaining && daysRemaining <= 30)) && (
          <div className={`alert-banner ${isExpired ? 'alert-danger' : 'alert-warning'}`}>
            <div className="alert-content">
              <div className="alert-icon">
                <AlertCircle size={24} />
              </div>
              <div className="alert-text">
                <h3>{isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}</h3>
                <p>
                  {isExpired 
                    ? 'Your subscription has expired. Renew now to restore access to all tools.'
                    : `Your subscription expires in ${daysRemaining} days. Renew now to avoid interruption.`
                  }
                </p>
              </div>
            </div>
            <Link to="/pricing" className="btn-alert-action">
              <Zap size={18} />
              {isExpired ? 'Renew Now' : 'Extend Plan'}
              <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="profile-grid">
          
          {/* Left Sidebar */}
          <div className="profile-sidebar">
            
            {/* Subscription Card */}
            <div className={`subscription-card ${isExpired ? 'expired' : 'active'}`}>
              <div className="subscription-header">
                <div className="subscription-icon">
                  <Crown size={28} />
                </div>
                <div className="subscription-info">
                  <div className="subscription-label">Current Plan</div>
                  <div className="subscription-plan">{plan || 'CLASSIC'}</div>
                </div>
              </div>
              
              <div className="subscription-details">
                {expires_at ? (
                  <>
                    <div className="detail-row">
                      <div className="detail-label">
                        <Calendar size={16} />
                        <span>Status</span>
                      </div>
                      <div className={`detail-value ${isExpired ? 'expired-text' : 'active-text'}`}>
                        {isExpired ? 'Expired' : `${daysRemaining} days left`}
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-label">
                        <Clock size={16} />
                        <span>Expires</span>
                      </div>
                      <div className="detail-value">
                        {new Date(expires_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="lifetime-access">
                    <Sparkles size={18} />
                    <span>Lifetime Access</span>
                  </div>
                )}
              </div>

              <Link to="/pricing" className="upgrade-btn">
                <TrendingUp size={18} />
                {isExpired ? 'Renew Plan' : 'Upgrade Plan'}
              </Link>
            </div>

            {/* Stats Grid
            <div className="stats-mini-grid">
              <div className="stat-mini-card">
                <div className="stat-mini-icon blue">
                  <Activity size={20} />
                </div>
                <div className="stat-mini-info">
                  <div className="stat-mini-value">{processHistory.length}</div>
                  <div className="stat-mini-label">Total Actions</div>
                </div>
              </div>

              <div className="stat-mini-card">
                <div className="stat-mini-icon green">
                  <Target size={20} />
                </div>
                <div className="stat-mini-info">
                  <div className="stat-mini-value">{Math.min(50, processHistory.length)}</div>
                  <div className="stat-mini-label">Recent Tasks</div>
                </div>
              </div>

              <div className="stat-mini-card">
                <div className="stat-mini-icon purple">
                  <Award size={20} />
                </div>
                <div className="stat-mini-info">
                  <div className="stat-mini-value">{isProfileRole ? 'Profile' : 'Admin'}</div>
                  <div className="stat-mini-label">Access Level</div>
                </div>
              </div>
            </div> */}

            {/* Quick Actions */}
            <div className="quick-actions-card">
              <div className="card-header">
                <Zap size={20} />
                <h3>Quick Access</h3>
              </div>
              
              <div className="quick-actions-list">
                <Link to="/gst-tool" className="quick-action-item">
                  <div className="quick-action-icon purple">
                    <FileText size={18} />
                  </div>
                  <div className="quick-action-text">
                    <div className="quick-action-title">GST Reconciliation</div>
                    <div className="quick-action-desc">Process GST files</div>
                  </div>
                  <ChevronRight size={18} className="quick-action-arrow" />
                </Link>

                <Link to="/tds-tool" className="quick-action-item">
                  <div className="quick-action-icon orange">
                    <Calculator size={18} />
                  </div>
                  <div className="quick-action-text">
                    <div className="quick-action-title">TDS Calculation</div>
                    <div className="quick-action-desc">Calculate TDS amounts</div>
                  </div>
                  <ChevronRight size={18} className="quick-action-arrow" />
                </Link>

                <Link to="/invoice-tool" className="quick-action-item">
                  <div className="quick-action-icon green">
                    <Receipt size={18} />
                  </div>
                  <div className="quick-action-text">
                    <div className="quick-action-title">Invoice Extraction</div>
                    <div className="quick-action-desc">Extract invoice data</div>
                  </div>
                  <ChevronRight size={18} className="quick-action-arrow" />
                </Link>

                <Link to="/ledger-tool" className="quick-action-item">
                  <div className="quick-action-icon indigo">
                    <BookOpen size={18} />
                  </div>
                  <div className="quick-action-text">
                    <div className="quick-action-title">Ledger Classification</div>
                    <div className="quick-action-desc">Classify ledger entries</div>
                  </div>
                  <ChevronRight size={18} className="quick-action-arrow" />
                </Link>
              </div>

              <Link to="/dashboard" className="view-all-tools">
                <Settings size={18} />
                Go to Dashboard
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="profile-main">
            
            {/* Activity Section */}
            <div className="activity-card">
              <div className="activity-header">
                <div className="activity-title">
                  <Clock size={24} />
                  <h2>Recent Activity</h2>
                </div>
                <div className="activity-count">
                  {processHistory.length} total operations
                </div>
              </div>

              {processHistory.length === 0 ? (
                <div className="empty-activity">
                  <div className="empty-illustration">
                    <Activity size={64} />
                  </div>
                  <h3>No Activity Yet</h3>
                  <p>Your recent actions and tool usage will appear here</p>
                  <Link to="/dashboard" className="btn-get-started">
                    <Sparkles size={18} />
                    Get Started
                  </Link>
                </div>
              ) : (
                <div className="activity-timeline">
                  {processHistory.map((activity, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <div className="timeline-icon">
                            {getActivityIcon(activity.action)}
                          </div>
                          <div className="timeline-info">
                            <div className="timeline-title">
                              {formatActionText(activity.action)}
                            </div>
                            {activity.details && Object.keys(activity.details).length > 0 && (
                              <div className="timeline-desc">
                                {activity.details.filename || activity.details.tool || 'Processing completed'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="timeline-time">
                          <Clock size={14} />
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Info Grid */}
            <div className="info-grid">
              <div className="info-card">
                <div className="info-card-header">
                  <User2 size={20} />
                  <h3>Account Information</h3>
                </div>
                <div className="info-list">
                  <div className="info-item">
                    <div className="info-label">Full Name</div>
                    <div className="info-value">{userName}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Email Address</div>
                    <div className="info-value">{email}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Account Role</div>
                    <div className="info-value">
                      <span className="badge badge-blue">{role}</span>
                    </div>
                  </div>
                  {isProfileRole && profile_name && (
                    <div className="info-item">
                      <div className="info-label">Profile Name</div>
                      <div className="info-value">
                        <span className="badge badge-purple">{profile_name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <ShieldCheck size={20} />
                  <h3>Subscription Details</h3>
                </div>
                <div className="info-list">
                  <div className="info-item">
                    <div className="info-label">Plan Type</div>
                    <div className="info-value">
                      <span className={`badge ${isExpired ? 'badge-red' : 'badge-green'}`}>
                        {plan || 'CLASSIC'}
                      </span>
                    </div>
                  </div>
                  {expires_at && (
                    <>
                      <div className="info-item">
                        <div className="info-label">Status</div>
                        <div className="info-value">
                          <span className={`badge ${isExpired ? 'badge-red' : 'badge-green'}`}>
                            {isExpired ? 'Expired' : 'Active'}
                          </span>
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Expiration Date</div>
                        <div className="info-value">
                          {new Date(expires_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </>
                  )}
                  {!expires_at && (
                    <div className="info-item">
                      <div className="info-label">Access Type</div>
                      <div className="info-value">
                        <span className="badge badge-gold">
                          <Sparkles size={14} />
                          Lifetime
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: transparent;
          padding-bottom: 4rem;
        }

        /* Cover Section */
        .profile-cover {
          position: relative;
          height: 60px;
          background: transparent;
          margin-bottom: 60px;
        }

        .cover-gradient {
          position: absolute;
          inset: 0;
          background: transparent;
        }

        .profile-header-content {
          position: absolute;
          bottom: -70px;
          left: 0;
          right: 0;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          z-index: 10;
        }

        .profile-main-info {
          display: flex;
          gap: 2rem;
          align-items: flex-end;
        }

        .profile-avatar-large {
          position: relative;
        }

        .avatar-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 2.5rem;
          font-weight: 700;
          border: none;
          box-shadow: 0 0 0 4px #f1f5f9, 0 8px 32px rgba(0, 0, 0, 0.15);
        }

        .avatar-badge {
          position: absolute;
          bottom: 8px;
          right: 15px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .profile-info {
          padding-bottom: 1rem;
        }

        .profile-name {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.75rem 0;
          text-shadow: none;
        }

        .profile-meta {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
          font-size: 0.95rem;
          background: rgba(241, 245, 249, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .role-badge {
          text-transform: capitalize;
          font-weight: 600;
        }

        .profile-actions-header {
          display: flex;
          gap: 1rem;
          padding-bottom: 1rem;
        }

        .btn-icon-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          color: #475569;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .btn-icon-text:hover {
          background: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .btn-logout-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: #dc2626;
          border: 2px solid #dc2626;
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .btn-logout-header:hover {
          background: #b91c1c;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
        }

        /* Container */
        .profile-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          padding-top: 1rem;
        }

        /* Alert Banner */
        .alert-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .alert-warning {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 2px solid #fbbf24;
        }

        .alert-danger {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 2px solid #ef4444;
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .alert-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          flex-shrink: 0;
        }

        .alert-warning .alert-icon {
          color: #f59e0b;
        }

        .alert-danger .alert-icon {
          color: #ef4444;
        }

        .alert-text h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .alert-warning .alert-text h3 {
          color: #d97706;
        }

        .alert-danger .alert-text h3 {
          color: #dc2626;
        }

        .alert-text p {
          margin: 0;
          color: #64748b;
          font-size: 0.95rem;
        }

        .btn-alert-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.75rem;
          background: white;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 1rem;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          white-space: nowrap;
        }

        .alert-warning .btn-alert-action {
          color: #d97706;
        }

        .alert-danger .btn-alert-action {
          color: #dc2626;
        }

        .btn-alert-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        /* Main Grid */
        .profile-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 2rem;
        }

        /* Sidebar */
        .profile-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Subscription Card */
        .subscription-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 2px solid;
        }

        .subscription-card.active {
          border-color: #10b981;
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }

        .subscription-card.expired {
          border-color: #ef4444;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }

        .subscription-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid rgba(0, 0, 0, 0.05);
        }

        .subscription-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .subscription-card.active .subscription-icon {
          color: #10b981;
        }

        .subscription-card.expired .subscription-icon {
          color: #ef4444;
        }

        .subscription-info {
          flex: 1;
        }

        .subscription-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .subscription-plan {
          font-size: 1.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .subscription-card.active .subscription-plan {
          color: #059669;
        }

        .subscription-card.expired .subscription-plan {
          color: #dc2626;
        }

        .subscription-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.9rem;
        }

        .detail-value {
          font-weight: 600;
          color: #1e293b;
        }

        .active-text {
          color: #059669;
        }

        .expired-text {
          color: #dc2626;
        }

        .lifetime-access {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          color: #059669;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .upgrade-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border: 2px solid rgba(99, 102, 241, 0.3);
          border-radius: 12px;
          color: #6366f1;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }

        .upgrade-btn:hover {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border-color: transparent;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }

        /* Mini Stats Grid */
        .stats-mini-grid {
          display: grid;
          gap: 1rem;
        }

        .stat-mini-card {
          background: white;
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: all 0.2s;
        }

        .stat-mini-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .stat-mini-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .stat-mini-icon.blue {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .stat-mini-icon.green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .stat-mini-icon.purple {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .stat-mini-info {
          flex: 1;
        }

        .stat-mini-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .stat-mini-label {
          font-size: 0.85rem;
          color: #64748b;
        }

        /* Quick Actions Card */
        .quick-actions-card {
          background: white;
          border-radius: 20px;
          padding: 1.75rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          color: #6366f1;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
        }

        .quick-actions-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .quick-action-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
        }

        .quick-action-item:hover {
          background: white;
          border-color: #cbd5e1;
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .quick-action-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .quick-action-icon.purple {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        }

        .quick-action-icon.orange {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .quick-action-icon.green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .quick-action-icon.indigo {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .quick-action-text {
          flex: 1;
        }

        .quick-action-title {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.95rem;
          margin-bottom: 0.125rem;
        }

        .quick-action-desc {
          font-size: 0.8rem;
          color: #64748b;
        }

        .quick-action-arrow {
          color: #94a3b8;
          transition: all 0.2s;
        }

        .quick-action-item:hover .quick-action-arrow {
          color: #6366f1;
          transform: translateX(4px);
        }

        .view-all-tools {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          color: #475569;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          margin-top: 0.5rem;
        }

        .view-all-tools:hover {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border-color: transparent;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }

        /* Main Content */
        .profile-main {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* Activity Card */
        .activity-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #f1f5f9;
        }

        .activity-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .activity-title h2 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
        }

        .activity-count {
          padding: 0.5rem 1rem;
          background: #f1f5f9;
          border-radius: 20px;
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
        }

        .empty-activity {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-illustration {
          width: 100px;
          height: 100px;
          margin: 0 auto 1.5rem;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .empty-activity h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .empty-activity p {
          margin: 0 0 1.5rem 0;
          color: #64748b;
          font-size: 1rem;
        }

        .btn-get-started {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s;
        }

        .btn-get-started:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }

        /* Activity Timeline */
        .activity-timeline {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-height: 600px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .timeline-item {
          position: relative;
          padding-left: 3rem;
        }

        .timeline-dot {
          position: absolute;
          left: 0;
          top: 0.5rem;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .timeline-item::before {
          content: '';
          position: absolute;
          left: 5px;
          top: 1.5rem;
          width: 2px;
          height: calc(100% + 1rem);
          background: linear-gradient(to bottom, #e2e8f0 0%, transparent 100%);
        }

        .timeline-item:last-child::before {
          display: none;
        }

        .timeline-content {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .timeline-content:hover {
          background: white;
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateX(4px);
        }

        .timeline-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .timeline-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .timeline-info {
          flex: 1;
        }

        .timeline-title {
          font-weight: 700;
          color: #1e293b;
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .timeline-desc {
          font-size: 0.875rem;
          color: #64748b;
        }

        .timeline-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .info-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .info-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f1f5f9;
          color: #6366f1;
        }

        .info-card-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .info-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .info-value {
          font-weight: 600;
          color: #1e293b;
          text-align: right;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .badge-blue {
          background: #dbeafe;
          color: #1e40af;
        }

        .badge-purple {
          background: #ede9fe;
          color: #6d28d9;
        }

        .badge-green {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-red {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge-gold {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
        }

        /* Scrollbar */
        .activity-timeline::-webkit-scrollbar {
          width: 6px;
        }

        .activity-timeline::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        .activity-timeline::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 10px;
        }

        /* Dark Mode Styles */
        [data-theme='dark'] .profile-page {
          background: transparent;
        }

        [data-theme='dark'] .profile-cover {
          background: rgba(17, 24, 39, 0.5);
        }

        [data-theme='dark'] .avatar-circle {
          box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.9), 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .profile-name {
          color: #f1f5f9;
        }

        [data-theme='dark'] .meta-item {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.5);
          color: #cbd5e1;
        }

        [data-theme='dark'] .btn-icon-text {
          background: rgba(30, 41, 59, 0.8);
          border: 2px solid rgba(71, 85, 105, 0.5);
          color: #e2e8f0;
        }

        [data-theme='dark'] .btn-icon-text:hover {
          background: rgba(51, 65, 85, 0.9);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        [data-theme='dark'] .btn-logout-header {
          background: #dc2626;
          border: 2px solid #dc2626;
        }

        [data-theme='dark'] .btn-logout-header:hover {
          background: #b91c1c;
        }

        [data-theme='dark'] .alert-banner {
          background: rgba(17, 24, 39, 0.9);
          border-color: rgba(100, 116, 139, 0.3);
        }

        [data-theme='dark'] .alert-warning {
          background: rgba(69, 26, 3, 0.5);
          border-color: #f59e0b;
        }

        [data-theme='dark'] .alert-danger {
          background: rgba(69, 10, 10, 0.5);
          border-color: #ef4444;
        }

        [data-theme='dark'] .alert-icon {
          background: rgba(30, 41, 59, 0.8);
        }

        [data-theme='dark'] .alert-text h3 {
          color: #f1f5f9;
        }

        [data-theme='dark'] .alert-text p {
          color: #94a3b8;
        }

        [data-theme='dark'] .btn-alert-action {
          background: rgba(30, 41, 59, 0.9);
          border: 2px solid rgba(71, 85, 105, 0.5);
        }

        [data-theme='dark'] .subscription-card {
          background: rgba(17, 24, 39, 0.9);
          border-color: rgba(71, 85, 105, 0.5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .subscription-card.active {
          background: rgba(6, 78, 59, 0.3);
          border-color: #10b981;
        }

        [data-theme='dark'] .subscription-card.expired {
          background: rgba(69, 10, 10, 0.3);
          border-color: #ef4444;
        }

        [data-theme='dark'] .subscription-icon {
          background: rgba(30, 41, 59, 0.9);
        }

        [data-theme='dark'] .subscription-header {
          border-bottom-color: rgba(71, 85, 105, 0.3);
        }

        [data-theme='dark'] .subscription-label {
          color: #94a3b8;
        }

        [data-theme='dark'] .subscription-plan {
          color: #f1f5f9;
        }

        [data-theme='dark'] .subscription-card.active .subscription-plan {
          color: #34d399;
        }

        [data-theme='dark'] .subscription-card.expired .subscription-plan {
          color: #f87171;
        }

        [data-theme='dark'] .detail-label {
          color: #94a3b8;
        }

        [data-theme='dark'] .detail-value {
          color: #e2e8f0;
        }

        [data-theme='dark'] .active-text {
          color: #34d399;
        }

        [data-theme='dark'] .expired-text {
          color: #f87171;
        }

        [data-theme='dark'] .lifetime-access {
          background: rgba(6, 78, 59, 0.3);
        }

        [data-theme='dark'] .upgrade-btn {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(99, 102, 241, 0.5);
        }

        [data-theme='dark'] .upgrade-btn:hover {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        }

        [data-theme='dark'] .stat-mini-card {
          background: rgba(17, 24, 39, 0.9);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .stat-mini-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
        }

        [data-theme='dark'] .stat-mini-value {
          color: #f1f5f9;
        }

        [data-theme='dark'] .stat-mini-label {
          color: #94a3b8;
        }

        [data-theme='dark'] .tabs-nav {
          background: rgba(17, 24, 39, 0.9);
          border: 1px solid rgba(71, 85, 105, 0.5);
        }

        [data-theme='dark'] .tab-btn {
          color: #94a3b8;
        }

        [data-theme='dark'] .tab-btn.active {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
        }

        [data-theme='dark'] .tab-btn:hover {
          background: rgba(51, 65, 85, 0.5);
          color: #cbd5e1;
        }

        [data-theme='dark'] .content-panel {
          background: rgba(17, 24, 39, 0.9);
          border: 1px solid rgba(71, 85, 105, 0.5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .stats-overview-grid {
          background: transparent;
        }

        [data-theme='dark'] .stat-card {
          background: rgba(17, 24, 39, 0.9);
          border: 1px solid rgba(71, 85, 105, 0.5);
        }

        [data-theme='dark'] .stat-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        }

        [data-theme='dark'] .stat-value {
          color: #f1f5f9;
        }

        [data-theme='dark'] .stat-label {
          color: #94a3b8;
        }

        [data-theme='dark'] .info-card {
          background: rgba(17, 24, 39, 0.9);
          border: 1px solid rgba(71, 85, 105, 0.5);
        }

        [data-theme='dark'] .info-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        }

        [data-theme='dark'] .info-label {
          color: #94a3b8;
        }

        [data-theme='dark'] .info-value {
          color: #e2e8f0;
        }

        [data-theme='dark'] .badge {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.5);
        }

        [data-theme='dark'] .badge-gold {
          background: rgba(69, 26, 3, 0.5);
          color: #fbbf24;
          border-color: #f59e0b;
        }

        [data-theme='dark'] .badge-admin {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
          border-color: #6366f1;
        }

        [data-theme='dark'] .activity-item {
          background: rgba(17, 24, 39, 0.9);
          border: 1px solid rgba(71, 85, 105, 0.5);
        }

        [data-theme='dark'] .activity-item:hover {
          background: rgba(30, 41, 59, 0.9);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .activity-icon-wrapper {
          background: rgba(30, 41, 59, 0.9);
        }

        [data-theme='dark'] .activity-content h4 {
          color: #f1f5f9;
        }

        [data-theme='dark'] .activity-content p {
          color: #94a3b8;
        }

        [data-theme='dark'] .activity-time {
          color: #64748b;
        }

        [data-theme='dark'] .empty-state {
          color: #94a3b8;
        }

        [data-theme='dark'] .activity-timeline::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.5);
        }

        /* Dark mode for Quick Access */
        [data-theme='dark'] .quick-actions-card {
          background: rgba(17, 24, 39, 0.9);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .card-header h3 {
          color: #f1f5f9;
        }

        [data-theme='dark'] .quick-action-item {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(71, 85, 105, 0.5);
        }

        [data-theme='dark'] .quick-action-item:hover {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .quick-action-title {
          color: #f1f5f9;
        }

        [data-theme='dark'] .quick-action-desc {
          color: #94a3b8;
        }

        [data-theme='dark'] .quick-action-arrow {
          color: #64748b;
        }

        [data-theme='dark'] .quick-action-item:hover .quick-action-arrow {
          color: #a5b4fc;
        }

        [data-theme='dark'] .view-all-tools {
          background: rgba(30, 41, 59, 0.6);
          border: 2px solid rgba(71, 85, 105, 0.5);
          color: #e2e8f0;
        }

        [data-theme='dark'] .view-all-tools:hover {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(99, 102, 241, 0.5);
        }

        /* Dark mode for Recent Activity */
        [data-theme='dark'] .activity-card {
          background: rgba(17, 24, 39, 0.9);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .activity-header {
          border-bottom-color: rgba(71, 85, 105, 0.3);
        }

        [data-theme='dark'] .activity-title h2 {
          color: #f1f5f9;
        }

        [data-theme='dark'] .activity-count {
          background: rgba(30, 41, 59, 0.8);
          color: #94a3b8;
        }

        [data-theme='dark'] .empty-illustration {
          background: rgba(30, 41, 59, 0.6);
          color: #64748b;
        }

        [data-theme='dark'] .empty-activity h3 {
          color: #f1f5f9;
        }

        [data-theme='dark'] .empty-activity p {
          color: #94a3b8;
        }

        [data-theme='dark'] .timeline-content {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(71, 85, 105, 0.5);
        }

        [data-theme='dark'] .timeline-content:hover {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .timeline-title {
          color: #f1f5f9;
        }

        [data-theme='dark'] .timeline-desc {
          color: #94a3b8;
        }

        [data-theme='dark'] .timeline-time {
          color: #64748b;
        }

        [data-theme='dark'] .timeline-item::before {
          background: linear-gradient(to bottom, rgba(71, 85, 105, 0.5) 0%, transparent 100%);
        }


        /* Responsive */
        @media (max-width: 1200px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .profile-cover {
            height: 240px;
            margin-bottom: 100px;
          }

          .profile-header-content {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            bottom: -110px;
            padding: 0 1rem;
          }

          .profile-main-info {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .avatar-circle {
            width: 100px;
            height: 100px;
            font-size: 2.5rem;
          }

          .profile-name {
            font-size: 1.75rem;
          }

          .profile-meta {
            justify-content: center;
          }

          .profile-actions-header {
            width: 100%;
            flex-direction: column;
          }

          .btn-icon-text,
          .btn-logout-header {
            width: 100%;
            justify-content: center;
          }

          .profile-container {
            padding: 0 1rem;
            padding-top: 1rem;
          }

          .alert-banner {
            flex-direction: column;
            gap: 1.5rem;
          }

          .btn-alert-action {
            width: 100%;
            justify-content: center;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}