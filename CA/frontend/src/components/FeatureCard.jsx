import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callSecureTest } from '../services/trialService';
import { handleSessionDeactivated, isSessionDeactivatedError } from '../utils/sessionHandler';
import AccessModal from './AccessModal';
import '../styles/spinner.css';

export default function FeatureCard({ title, description, icon, navigateTo }) {
  const navigate = useNavigate();
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Map tool title to backend tool name
  const getToolName = () => {
    if (title.includes('GST')) return 'gst';
    if (title.includes('TDS')) return 'tds';
    if (title.includes('Invoice')) return 'invoice';
    if (title.includes('Ledger')) return 'ledger';
    return 'gst';
  };

  const handleGetStarted = async () => {
    if (!navigateTo) return;

    setIsChecking(true);

    try {
      // Call secure-test endpoint
      const toolName = getToolName();
      const result = await callSecureTest(toolName);

      // Access granted - navigate to tool
      if (result.ok) {
        navigate(navigateTo);
      }
    } catch (error) {
      // Check if session was deactivated (force logout from another device)
      if (isSessionDeactivatedError(error.message)) {
        handleSessionDeactivated();
        return;
      }
      
      // Check for plan expiration (auto-logout)
      if (error.message && error.message.includes('Plan expired')) {
        // Clear auth data but PRESERVE device_id
        const deviceId = localStorage.getItem('device_id');
        localStorage.clear();
        if (deviceId) {
          localStorage.setItem('device_id', deviceId);
        }
        
        // Dispatch auth-change event
        window.dispatchEvent(new Event('auth-change'));
        
        // Redirect to home and refresh
        window.location.hash = '#/';
        window.location.reload();
        return;
      }
      
      // Check error type
      if (error.message && error.message.includes('Admin')) {
        // Admin role - show blocking message
        alert('Admins cannot access tools.');
      } else {
        // 401 - No auth - show access modal
        setShowAccessModal(true);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleAccessGranted = () => {
    // After trial activation, navigate to tool
    if (navigateTo) {
      navigate(navigateTo);
    }
  };

  // Define gradient colors based on title
  const getGradient = () => {
    if (title.includes('GST')) return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    if (title.includes('TDS')) return 'linear-gradient(135deg, #3b82f6, #2563eb)';
    if (title.includes('Invoice')) return 'linear-gradient(135deg, #06b6d4, #0891b2)';
    if (title.includes('Ledger')) return 'linear-gradient(135deg, #10b981, #059669)';
    return 'linear-gradient(135deg, #8b5cf6, #3b82f6)';
  };

  return (
    <>
      <div className="modern-card">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <button className="card-action-btn" onClick={handleGetStarted} disabled={isChecking}>
            {isChecking ? 'Checking Access...' : 'Get Started'}
            {!isChecking && (
              <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            )}
          </button>
          <button 
            className="card-action-btn" 
            style={{ background: '#6366f1' }}
            onClick={(e) => {
              e.stopPropagation();
              const howToUseRoutes = {
                'GST Reconciliation': '/how-to-use-gst',
                'TDS Calculation': '/how-to-use-tds',
                'Invoice Extraction': '/how-to-use-invoice',
                'Ledger Classification': '/how-to-use-ledger'
              };
              const route = howToUseRoutes[title];
              if (route) {
                window.location.hash = route;
              }
            }}
          >
            How to Use
            <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Access Modal */}
      <AccessModal 
        isOpen={showAccessModal} 
        onClose={() => setShowAccessModal(false)}
        onAccessGranted={handleAccessGranted}
      />
    </>
  );
}
