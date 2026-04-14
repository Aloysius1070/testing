import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import './styles/globals.css';
import SplashScreen from './components/SplashScreen';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import SiteFooter from './components/SiteFooter';
import { TrialProvider } from './contexts/TrialContext';
import SignInModal from './components/SignInModal';
import ClassicSignupModal from './components/ClassicSignupModal';
import PrimeVipSignupModal from './components/PrimeVipSignupModal';
import { API_URL } from './config';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfilesDashboard = lazy(() => import('./pages/ProfilesDashboard'));
const ProfileSelection = lazy(() => import('./pages/ProfileSelection'));
const GstTool = lazy(() => import('./pages/GstTool'));
const TdsTool = lazy(() => import('./pages/TdsTool'));
const InvoiceTool = lazy(() => import('./pages/InvoiceTool'));
const LedgerTool = lazy(() => import('./pages/LedgerTool'));
const CompaniesDataTool = lazy(() => import('./pages/CompaniesDataTool'));
const HowToUseGst = lazy(() => import('./pages/HowToUseGst'));
const HowToUseTds = lazy(() => import('./pages/HowToUseTds'));
const HowToUseInvoice = lazy(() => import('./pages/HowToUseInvoice'));
const HowToUseLedger = lazy(() => import('./pages/HowToUseLedger'));
const HowToUseCompaniesData = lazy(() => import('./pages/HowToUseCompaniesData'));
const ChatBot = lazy(() => import('./components/ChatBot'));

// Optimized Loading Spinner Component - Minimal and Fast
function LoadingSpinner() {
  return (
    <div className="loading-fallback">
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const isProfileSelection = location.pathname === '/profile-selection';

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="content" style={{ paddingTop: isProfileSelection ? 0 : 70 }} key={location.pathname}>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profiles" element={<ProfilesDashboard />} />
          <Route path="/profile-selection" element={<ProfileSelection />} />
          <Route path="/gst-tool" element={<GstTool />} />
          <Route path="/tds-tool" element={<TdsTool />} />
          <Route path="/invoice-tool" element={<InvoiceTool />} />
          <Route path="/ledger-tool" element={<LedgerTool />} />
          <Route path="/companies-data-tool" element={<CompaniesDataTool />} />
          <Route path="/how-to-use-gst" element={<HowToUseGst />} />
          <Route path="/how-to-use-tds" element={<HowToUseTds />} />
          <Route path="/how-to-use-invoice" element={<HowToUseInvoice />} />
          <Route path="/how-to-use-ledger" element={<HowToUseLedger />} />
          <Route path="/how-to-use-companies-data" element={<HowToUseCompaniesData />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function AppFixed() {
  const [showSplash, setShowSplash] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showClassicSignupModal, setShowClassicSignupModal] = useState(false);
  const [showPrimeVipSignupModal, setShowPrimeVipSignupModal] = useState(false);
  const [primeVipPlanType, setPrimeVipPlanType] = useState('');
  const [sessionRestored, setSessionRestored] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  // Initialize persistent device_id in localStorage
  useEffect(() => {
    if (!localStorage.getItem('device_id')) {
      // Generate UUID-like device_id that persists forever per browser
      const deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
      console.log('🆔 Generated new device_id:', deviceId);
    } else {
      console.log('🆔 Existing device_id:', localStorage.getItem('device_id'));
    }
  }, []);
  
  const onSplashFinish = useCallback(() => setShowSplash(false), []);

  // SESSION RESTORATION: Check for active session on page load
  useEffect(() => {
    const restoreSession = async () => {
      if (!showSplash && !sessionRestored) {
        setIsCheckingSession(true);
        try {
          const response = await fetch(`${API_URL}/api/auth/session/restore`, {
            method: 'GET',
            credentials: 'include'
          });

          const data = await response.json();

          console.log('🔍 Session restore response:', data);
          console.log('🔍 Session object:', data.session);
          console.log('🔍 Has session?', !!data.session);

          if (data.ok && data.session) {
            const session = data.session;
            
            console.log('🔄 Restoring session:', session.type, '| Redirect to:', session.redirect_to);
            console.log('📊 Session details:', JSON.stringify(session, null, 2));
            
            // Restore localStorage state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', session.email);
            localStorage.setItem('device_id', session.device_id);
            
            if (session.type === 'classic') {
              localStorage.setItem('userRole', 'classic');
              localStorage.setItem('selectedPlan', 'CLASSIC');
              console.log('✅ Session restored: Classic user');
            } 
            else if (session.type === 'admin') {
              localStorage.setItem('userRole', 'admin');
              localStorage.setItem('selectedPlan', session.plan);
              console.log('✅ Session restored: PRIME/VIP Admin → Redirecting to profile-selection');
            } 
            else if (session.type === 'profile') {
              localStorage.setItem('userRole', 'profile');
              localStorage.setItem('selectedPlan', session.plan);
              localStorage.setItem('currentProfile', session.profile_username);
              localStorage.setItem('isProfileActive', 'true');
              console.log('✅ Session restored: Profile -', session.profile_username);
            }

            // Notify NavBar of auth state
            window.dispatchEvent(new Event('auth-change'));

            // Redirect immediately (no setTimeout)
            console.log('🎯 Redirecting to:', session.redirect_to);
            window.location.hash = session.redirect_to;
            
            setSessionRestored(true);
            setIsCheckingSession(false);
            return; // Session restored, skip signup flow check
          } else {
            console.log('❌ No active session found');
            console.log('   - Cookies present?', document.cookie.includes('auth_token'));
            console.log('   - Response ok?', data.ok);
            console.log('   - Session null?', data.session === null);
            
            // CRITICAL: Clear localStorage auth data if session restore fails
            // This fixes the bug where localStorage says logged in but cookies are gone
            const wasLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (wasLoggedIn) {
              console.log('⚠️ localStorage says logged in but no session found - clearing stale data');
              
              // Preserve device_id (must persist)
              const deviceId = localStorage.getItem('device_id');
              
              // Clear auth-related items
              localStorage.removeItem('isLoggedIn');
              localStorage.removeItem('userEmail');
              localStorage.removeItem('userRole');
              localStorage.removeItem('selectedPlan');
              localStorage.removeItem('currentProfile');
              localStorage.removeItem('isProfileActive');
              
              // Restore device_id
              if (deviceId) {
                localStorage.setItem('device_id', deviceId);
              }
              
              // Notify navbar to update UI
              window.dispatchEvent(new Event('auth-change'));
              console.log('✅ Cleared stale localStorage, UI should show logged out state');
            }
          }
        } catch (error) {
          console.error('Session restoration failed:', error);
          
          // Also clear localStorage on error (e.g., network failure while cookies cleared)
          const wasLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
          if (wasLoggedIn) {
            console.log('⚠️ Session restore error + localStorage logged in - clearing stale data');
            
            const deviceId = localStorage.getItem('device_id');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userRole');
            localStorage.removeItem('selectedPlan');
            localStorage.removeItem('currentProfile');
            localStorage.removeItem('isProfileActive');
            if (deviceId) {
              localStorage.setItem('device_id', deviceId);
            }
            window.dispatchEvent(new Event('auth-change'));
          }
        }

        setSessionRestored(true);
        setIsCheckingSession(false);
      }
    };

    restoreSession();
  }, [showSplash, sessionRestored]);

  // INCOMPLETE SIGNUP RESTORATION: Check for incomplete auth flows
  useEffect(() => {
    if (!showSplash && sessionRestored) {
      const signinFlow = sessionStorage.getItem('signinFlow');
      const classicSignupFlow = sessionStorage.getItem('classicSignupFlow');
      const primeVipSignupFlow = sessionStorage.getItem('primeVipSignupFlow');

      if (signinFlow) {
        setShowSignInModal(true);
      } else if (classicSignupFlow) {
        setShowClassicSignupModal(true);
      } else if (primeVipSignupFlow) {
        try {
          const state = JSON.parse(primeVipSignupFlow);
          setPrimeVipPlanType(state.planType || 'PRIME');
          setShowPrimeVipSignupModal(true);
        } catch (e) {
          sessionStorage.removeItem('primeVipSignupFlow');
        }
      }
    }
  }, [showSplash, sessionRestored]);

  return (
    <TrialProvider>
      {showSplash && <SplashScreen onFinish={onSplashFinish} />}
      <Router>
        <NavBarWrapper />
        {/* Show minimal loading during session check to prevent flash */}
        {isCheckingSession && !showSplash ? (
          <div className="layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div className="loading-fallback">Restoring session...</div>
          </div>
        ) : (
          <div className="layout" aria-hidden={showSplash}>
            <AnimatedRoutesWithFooter />
          </div>
        )}
        {!showSplash && (
          <Suspense fallback={null}>
            <ChatBot />
          </Suspense>
        )}
        
        {/* Global modals for reload-safe authentication */}
        <SignInModal 
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
        />
        <ClassicSignupModal
          isOpen={showClassicSignupModal}
          onClose={() => setShowClassicSignupModal(false)}
        />
        <PrimeVipSignupModal
          isOpen={showPrimeVipSignupModal}
          onClose={() => setShowPrimeVipSignupModal(false)}
          planType={primeVipPlanType}
        />
      </Router>
    </TrialProvider>
  );
}

function NavBarWrapper() {
  const location = useLocation();
  const isProfileSelection = location.pathname === '/profile-selection';
  
  if (isProfileSelection) return null;
  return <NavBar />;
}

function AnimatedRoutesWithFooter() {
  const location = useLocation();
  const isProfileSelection = location.pathname === '/profile-selection';
  
  return (
    <>
      <AnimatedRoutes />
      {!isProfileSelection && <SiteFooter />}
    </>
  );
}

function NotFound() {
  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>404 - Page Not Found</h1>
          <div className="tagline">The page you’re looking for doesn’t exist.</div>
        </div>
      </header>
      <p><Link to="/">Go back home</Link></p>
    </div>
  );
}
