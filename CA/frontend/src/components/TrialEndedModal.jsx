import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrialContext } from '../contexts/TrialContext';
import './AccessModal.css';

export default function TrialEndedModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { clearTrial } = useTrialContext();

  if (!isOpen) return null;

  const handleBuyPlan = () => {
    clearTrial();
    onClose();
    navigate('/pricing');
  };

  const handleClose = () => {
    clearTrial();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="modal-screen">
          <div className="trial-ended-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <h2 className="modal-title">Free Trial Ended</h2>
          <p className="modal-subtitle">You have used all 5 free runs</p>

          <div className="modal-buttons">
            <button className="modal-btn modal-btn-primary" onClick={handleBuyPlan}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Buy Plan
            </button>

            <button className="modal-btn modal-btn-outline" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
