import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import '../styles/planExpiredModal.css';

export default function PlanExpiredModal({ isVisible, message }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (isVisible) {
      // Hide navbar when modal is visible
      const navbar = document.querySelector('nav');
      if (navbar) {
        navbar.style.display = 'none';
      }
      
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore navbar when component unmounts
        if (navbar) {
          navbar.style.display = '';
        }
        document.body.style.overflow = '';
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleFullLogout = async () => {
    try {
      // Call backend logout endpoint to clear cookies
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      // Clear auth data but PRESERVE device_id
      const deviceId = localStorage.getItem('device_id');
      localStorage.clear();
      if (deviceId) {
        localStorage.setItem('device_id', deviceId);
      }

      // Dispatch auth-change event for NavBar
      window.dispatchEvent(new Event('auth-change'));

      // Redirect to home page
      window.location.hash = '#/';
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state and redirect
      localStorage.clear();
      window.dispatchEvent(new Event('auth-change'));
      window.location.hash = '#/';
      window.location.reload();
    }
  };

  return (
    <>
      {/* Blur Background - NON-CLICKABLE */}
      <div className="plan-expired-overlay" />
      
      {/* Locked Modal */}
      <div className="plan-expired-modal">
        <div className="modal-icon">🔒</div>
        <h2 className="modal-title">Plan Expired</h2>
        <p className="modal-message">
          {message || 'Your subscription has expired. Please renew your plan to continue.'}
        </p>
        <button 
          className="btn-full-logout"
          onClick={handleFullLogout}
        >
          Full Logout
        </button>
      </div>
    </>
  );
}
