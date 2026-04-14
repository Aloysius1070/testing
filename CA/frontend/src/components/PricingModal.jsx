import React from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import '../styles/globals.css';

export default function PricingModal({ isOpen, onClose, featureName, onPlanSelect }) {
  const [selectedPlan, setSelectedPlan] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedPlan(null);
      setIsProcessing(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose();
    }
  };

  const handlePlanSelect = (planName) => {
    setSelectedPlan(planName);
    setIsProcessing(true);
    
    // Store payment status in localStorage
    localStorage.setItem('hasPaid', 'true');
    localStorage.setItem('selectedPlan', planName);
    
    // Show success animation then close
    setTimeout(() => {
      onClose();
      if (onPlanSelect) {
        onPlanSelect();
      }
    }, 1200);
  };

  const modalContent = (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="pricing-modal">
        <button className="modal-close" onClick={onClose}>
          <svg className="icon" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div className="modal-header">
          <h2>{isProcessing ? `${selectedPlan} Plan Activated!` : `Upgrade to Access ${featureName}`}</h2>
          <p>{isProcessing ? 'Redirecting you to the feature...' : 'Choose a plan to unlock this feature and start automating your workflows'}</p>
        </div>

        <div className={`modal-pricing-cards ${isProcessing ? 'processing' : ''}`}>
          {/* Starter Plan */}
          <div className={`modal-price-card ${selectedPlan === 'Starter' ? 'selected' : ''}`}>
            <h3>Starter</h3>
            <p className="plan-subtitle">Perfect for small teams</p>
            <div className="price">
              <span className="currency">₹</span>
              <span className="amount">500</span>
              <span className="period">/month</span>
            </div>
            <ul className="features-list">
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Up to 10 Users
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                All Features Available
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                GST Reconciliation
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                TDS Computation
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Invoice Extraction
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Ledger Classification
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Excel Export Reports
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Email Support
              </li>
            </ul>
            <button 
              className="button light w-full text-center" 
              onClick={() => handlePlanSelect('Starter')}
              disabled={isProcessing}
            >
              {selectedPlan === 'Starter' ? '✓ Selected' : 'Get Started'}
            </button>
          </div>

          {/* Professional Plan */}
          <div className={`modal-price-card featured ${selectedPlan === 'Professional' ? 'selected' : ''}`}>
            <div className="popular-badge">Most Popular</div>
            <h3>Professional</h3>
            <p className="plan-subtitle">For growing teams</p>
            <div className="price">
              <span className="currency">₹</span>
              <span className="amount">1,000</span>
              <span className="period">/month</span>
            </div>
            <ul className="features-list">
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                25+ Users
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                All Features Available
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                GST Reconciliation
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                TDS Computation
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Invoice Extraction
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Ledger Classification
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Excel Export Reports
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Priority Support
              </li>
            </ul>
            <button 
              className="button gradient w-full text-center" 
              onClick={() => handlePlanSelect('Professional')}
              disabled={isProcessing}
            >
              {selectedPlan === 'Professional' ? '✓ Selected' : 'Get Started'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className={`modal-price-card ${selectedPlan === 'Enterprise' ? 'selected' : ''}`}>
            <h3>Enterprise</h3>
            <p className="plan-subtitle">Customized for CA Firms</p>
            <ul className="features-list">
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                All Features Available
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                GST Reconciliation
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                TDS Computation
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Invoice Extraction
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Ledger Classification
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Dedicated Account Manager
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                24/7 Priority Support
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Custom Integrations
              </li>
              <li>
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                White-label Options
              </li>
            </ul>
            <button 
              className="button light w-full text-center" 
              onClick={() => handlePlanSelect('Enterprise')}
              disabled={isProcessing}
            >
              {selectedPlan === 'Enterprise' ? '✓ Selected' : 'Contact Sales'}
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <p>💡 All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render modal at document root level
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
}
