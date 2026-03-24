import React, { useState, useEffect, useCallback, memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import SignInModal from './SignInModal';
import PrimeVipSignupModal from './PrimeVipSignupModal';
import { useTrialContext } from '../contexts/TrialContext';
import { API_URL } from '../config';

const NavBar = memo(() => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 900 : false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showPrimeSignupModal, setShowPrimeSignupModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userPlan, setUserPlan] = useState('');
  const { trialMode, trialRunsLeft, clearTrial } = useTrialContext();
  const location = useLocation();

  // Timeout ref for profile menu
  const profileMenuTimeout = React.useRef(null);

  useEffect(() => {
    // Check authentication from localStorage (fast, no API call)
    const checkAuthLocal = () => {
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const storedEmail = localStorage.getItem('userEmail');
      const storedRole = localStorage.getItem('userRole');
      
      if (loggedIn && storedEmail) {
        setIsLoggedIn(true);
        setUserRole(storedRole || '');
        // Fetch user plan info
        fetchUserPlan();
      } else {
        setIsLoggedIn(false);
        setUserRole('');
        setUserPlan('');
      }
    };
    
    checkAuthLocal();
    
    // Listen for custom auth-change event (fired after login/profile-login)
    const handleAuthChange = () => {
      checkAuthLocal();
    };
    
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []); // Only check localStorage, no API calls

  const fetchUserPlan = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserPlan(data.plan || '');
      }
    } catch (err) {
      console.error('Error fetching user plan:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local storage
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      setIsLoggedIn(false);
      setUserRole('');
      setUserPlan('');
      // Dispatch auth-change event
      window.dispatchEvent(new Event('auth-change'));
      // Redirect to home
      window.location.href = '/';
    }
  };

  const handleProfileMenuEnter = () => {
    if (!isMobile) {
      if (profileMenuTimeout.current) {
        clearTimeout(profileMenuTimeout.current);
      }
      setShowProfileMenu(true);
    }
  };

  const handleProfileMenuLeave = () => {
    if (!isMobile) {
      profileMenuTimeout.current = setTimeout(() => {
        setShowProfileMenu(false);
      }, 200);
    }
  };

  const handleCancelTrial = useCallback(() => {
    if (window.confirm('Are you sure you want to cancel your free trial? This will clear all trial data.')) {
      clearTrial();
      window.location.reload(); // Reload to reset state
    }
  }, [clearTrial]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const toggle = useCallback(() => setOpen(o => !o), []);
  const close = useCallback(() => setOpen(false), []);

  // Create dynamic links based on login state
  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/dashboard', label: 'Tools' },
    ...(!isLoggedIn ? [{ to: '/pricing', label: 'Pricing' }] : []),
    { to: '/contact', label: 'Contact' }
  ];

  const isPrimeOrVip = userRole === 'prime' || userRole === 'vip';

  return (
    <>
      <nav className="topnav" role="navigation" aria-label="Main navigation">
        <div className="topnav-inner">
          <NavLink to="/" className="brand" onClick={close}>
            <svg viewBox="0 0 120 120" className="brand-logo">
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
            <span className="brand-text">FISCLYTIC</span>
          </NavLink>
          <div className="topnav-actions">
            {isMobile && <ThemeToggle />}
            {isMobile && (
              <button
                className="nav-toggle icon-btn"
                aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={open}
                onClick={toggle}
              >
                {open ? (
                  <svg className="icon" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                ) : (
                  <svg className="icon" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></svg>
                )}
              </button>
            )}
            <div className={`nav-links-wrapper ${isMobile && open ? 'open' : ''}`}>
              <div className="nav-links" onClick={isMobile ? close : undefined}>
                {navLinks.map(l => (
                  <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    {l.label}
                  </NavLink>
                ))}
                
                {/* My Profile link for Prime/VIP users OR Logout button for Classic users */}
                {isLoggedIn && userPlan === 'CLASSIC' && (
                  <button 
                    className="signin-btn logout-btn-classic"
                    onClick={() => {
                      handleLogout();
                      close();
                    }}
                  >
                    Logout
                  </button>
                )}
                
                {isLoggedIn && userPlan !== 'CLASSIC' && (
                  <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    My Profile
                  </NavLink>
                )}
                
                {/* Sign In button when not logged in */}
                {!isLoggedIn && !trialMode && (
                  <button 
                    className="signin-btn"
                    onClick={() => {
                      setShowSignInModal(true);
                      close();
                    }}
                  >
                    Sign In
                  </button>
                )}
                
                {trialMode && (
                  <>
                    <div className="trial-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      Free Trial • {trialRunsLeft} runs left
                    </div>
                    <button 
                      className="cancel-trial-btn"
                      onClick={handleCancelTrial}
                      title="Cancel free trial"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      {!isMobile && <span>Cancel Trial</span>}
                    </button>
                  </>
                )}
                {!isMobile && <ThemeToggle />}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        redirectPath="/"
        onOpenSignup={() => setShowPrimeSignupModal(true)}
      />

      {/* Prime Signup Modal */}
      <PrimeVipSignupModal
        isOpen={showPrimeSignupModal}
        onClose={() => setShowPrimeSignupModal(false)}
        planType="PRIME"
      />
    </>
  );
});

NavBar.displayName = 'NavBar';

export default NavBar;