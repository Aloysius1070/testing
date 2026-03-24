import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, CheckCircle, ChevronDown } from 'lucide-react';
import ClassicSignupModal from '../components/ClassicSignupModal';
import PrimeVipSignupModal from '../components/PrimeVipSignupModal';
import { API_URL } from '../config';
import '../styles/globals.css';
import '../styles/pricing-enterprise.css';

export default function Pricing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClassicSignup, setShowClassicSignup] = useState(false);
  const [showPrimeVipSignup, setShowPrimeVipSignup] = useState(false);
  const [signupPlanType, setSignupPlanType] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Billing toggle state
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  
  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewEmail, setRenewEmail] = useState('');
  const [renewPassword, setRenewPassword] = useState('');
  const [renewError, setRenewError] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);

  useEffect(() => {
    // Check if user is logged in via localStorage
    const checkAuthStatus = () => {
      const userEmail = localStorage.getItem('userEmail');
      setIsLoggedIn(!!userEmail);
    };

    checkAuthStatus();

    // Listen for auth-change events (logout, session deactivation, etc)
    const handleAuthChange = () => {
      checkAuthStatus();
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const handleRenewPlan = async (e) => {
    e.preventDefault();
    setRenewLoading(true);
    setRenewError('');

    try {
      // First, validate credentials and get account_id
      const validateResponse = await fetch(`${API_URL}/api/auth/validate-for-renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: renewEmail,
          password: renewPassword
        })
      });

      const validateData = await validateResponse.json();

      if (!validateResponse.ok) {
        throw new Error(validateData.detail || 'Account not found or invalid credentials');
      }

      const accountId = validateData.account_id;

      // Now renew the plan
      const renewResponse = await fetch(`${API_URL}/api/auth/renew-plan?account_id=${accountId}`, {
        method: 'POST'
      });

      const renewData = await renewResponse.json();

      if (!renewResponse.ok) {
        throw new Error(renewData.detail || 'Failed to renew plan');
      }

      // Success!
      alert('Plan renewed successfully! Your subscription has been extended.');
      setShowRenewModal(false);
      setRenewEmail('');
      setRenewPassword('');
    } catch (err) {
      setRenewError(err.message);
    } finally {
      setRenewLoading(false);
    }
  };

  const handlePlanSelect = (planName) => {
    if (planName === 'Classic') {
      setShowClassicSignup(true);
      return;
    }

    if (planName === 'Prime' || planName === 'VIP') {
      setSignupPlanType(planName);
      setShowPrimeVipSignup(true);
      return;
    }

    // Fallback (shouldn't reach here)
    setSelectedPlan(planName);
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // FAQ data
  const faqs = [
    {
      question: "How does billing work?",
      answer: "All plans are billed monthly. Your subscription automatically renews every 30 days. You can cancel anytime from your account settings, and you'll retain access until the end of your billing period."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, absolutely. There are no long-term contracts or cancellation fees. Simply cancel from your profile page, and your subscription will not renew at the end of the current billing period."
    },
    {
      question: "Do I need a credit card to start?",
      answer: "No credit card is required. After selecting your plan, you'll be guided through a simple signup process. Payment is only required to activate your subscription after signup."
    },
    {
      question: "What happens if I exceed my device limit?",
      answer: "You'll receive a notification if you reach your device limit. You can remove old devices from your account settings or upgrade to a plan with a higher device limit anytime."
    },
    {
      question: "Can I upgrade or downgrade my plan?",
      answer: "Yes, you can switch plans anytime. Upgrades take effect immediately with prorated billing. Downgrades will take effect at the start of your next billing cycle."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use bank-grade encryption for all data transmission and storage. Your financial data never leaves your device unencrypted, and we comply with all data protection regulations."
    }
  ];

  return (
    <div className="pricing-enterprise-page">
      <div className="pricing-enterprise-container">
        
        {/* HERO SECTION */}
        <section className="pricing-hero-section">
          <h1>Simple, Transparent <span className="gradient-text">Pricing</span></h1>
          <p className="subtitle">Choose the plan that fits your practice. All plans include full access to our CA automation tools.</p>
          
          {/* Trust Line */}
          <div className="pricing-trust-line">
            <div className="trust-item">
              <CheckCircle className="trust-icon" />
              <span>Cancel anytime</span>
            </div>
            <div className="trust-item">
              <CheckCircle className="trust-icon" />
              <span>No hidden fees</span>
            </div>
            <div className="trust-item">
              <CheckCircle className="trust-icon" />
              <span>Monthly billing</span>
            </div>
          </div>
        </section>

        {/* BILLING TOGGLE */}
        <div className="billing-toggle-container">
          <span className={`billing-label ${billingCycle === 'monthly' ? 'active' : ''}`}>Monthly</span>
          <div 
            className={`billing-toggle ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
          >
            <div className="billing-toggle-slider"></div>
          </div>
          <span className={`billing-label ${billingCycle === 'yearly' ? 'active' : ''}`}>
            Yearly
            <span className="billing-badge">Coming Soon</span>
          </span>
        </div>

        {/* PRICING CARDS */}
        <div className="pricing-cards-grid">
          
          {/* CLASSIC PLAN */}
          <div className="pricing-plan-card">
            <div className="plan-header">
              <h3 className="plan-name">Classic</h3>
              <p className="plan-description">Perfect for solo practitioners and individual CAs</p>
            </div>

            <div className="plan-pricing">
              <div className="price-row">
                <span className="currency">₹</span>
                <span className="amount">500</span>
                <span className="period">/ month</span>
              </div>
              <p className="billing-info">Billed monthly • Cancel anytime</p>
            </div>

            <div className="plan-capacity">
              <Users className="capacity-icon" />
              <span className="capacity-text">1 User • 1 Device</span>
            </div>

            <div className="plan-features">
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">GST Reconciliation Tool</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">TDS Computation Tool</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Invoice Extraction & Ledger</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Secure login system</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Email support</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Regular updates</span>
              </div>
            </div>

            <div className="plan-cta">
              <button 
                className="cta-button secondary"
                onClick={() => handlePlanSelect('Classic')}
                disabled={isProcessing}
              >
                {selectedPlan === 'Classic' ? '✓ Selected' : 'Get Started'}
              </button>
              <p className="cta-microcopy">Perfect for individual CAs</p>
            </div>
          </div>

          {/* PRIME PLAN */}
          <div className="pricing-plan-card popular">
            <div className="popular-badge">Most Popular</div>
            
            <div className="plan-header">
              <h3 className="plan-name">Prime</h3>
              <p className="plan-description">Ideal for growing CA teams and mid-size firms</p>
            </div>

            <div className="plan-pricing">
              <div className="price-row">
                <span className="currency">₹</span>
                <span className="amount">3,999</span>
                <span className="period">/ 4 months</span>
              </div>
              <p className="billing-info">Billed monthly • Cancel anytime</p>
            </div>

            <div className="plan-capacity prime">
              <Users className="capacity-icon" />
              <span className="capacity-text">10 Users • 10 Devices</span>
            </div>

            <div className="plan-features">
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text"><strong>Everything in Classic</strong>, plus:</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text"><strong>10 concurrent users</strong> across your team</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Team collaboration features</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text"><strong>Priority email support</strong></span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Higher processing limits</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Advanced reporting</span>
              </div>
            </div>

            <div className="plan-cta">
              <button 
                className="cta-button primary"
                onClick={() => handlePlanSelect('Prime')}
                disabled={isProcessing}
              >
                {selectedPlan === 'Prime' ? '✓ Selected' : 'Get Started'}
              </button>
              <p className="cta-microcopy">No credit card required • 30-day access</p>
            </div>
          </div>

          {/* VIP PLAN */}
          <div className="pricing-plan-card">
            <div className="plan-header">
              <h3 className="plan-name">VIP</h3>
              <p className="plan-description">Built for large CA firms and enterprises</p>
            </div>

            <div className="plan-pricing">
              <div className="price-row">
                <span className="currency">₹</span>
                <span className="amount">7,999</span>
                <span className="period">/ 6 months</span>
              </div>
              <p className="billing-info">Billed monthly • Cancel anytime</p>
            </div>

            <div className="plan-capacity vip">
              <Users className="capacity-icon" />
              <span className="capacity-text">25 Users • 25 Devices</span>
            </div>

            <div className="plan-features">
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text"><strong>Everything in Prime</strong>, plus:</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text"><strong>25 concurrent users</strong> for large teams</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text"><strong>Dedicated account manager</strong></span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Personalized support channel</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Priority processing queue</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Onboarding assistance</span>
              </div>
              <div className="feature-item">
                <CheckCircle className="feature-icon" />
                <span className="feature-text">Custom integration support</span>
              </div>
            </div>

            <div className="plan-cta">
              <button 
                className="cta-button vip"
                onClick={() => handlePlanSelect('VIP')}
                disabled={isProcessing}
              >
                {selectedPlan === 'VIP' ? '✓ Selected' : 'Get Started'}
              </button>
              <p className="cta-microcopy">Enterprise-grade support included</p>
            </div>
          </div>

        </div>

        {/* FAQ SECTION */}
        <section className="pricing-faq-section">
          <div className="faq-header">
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about our pricing</p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div key={index} className={`faq-item ${openFaqIndex === index ? 'open' : ''}`}>
                <button 
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown className="faq-toggle-icon" />
                </button>
                <div className="faq-answer">
                  <div className="faq-answer-content">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Classic Signup Modal */}
      <ClassicSignupModal 
        isOpen={showClassicSignup}
        onClose={() => setShowClassicSignup(false)}
      />

      {/* Prime/VIP Signup Modal */}
      <PrimeVipSignupModal 
        isOpen={showPrimeVipSignup}
        onClose={() => setShowPrimeVipSignup(false)}
        planType={signupPlanType}
      />

      {/* Renew Plan Modal */}
      {showRenewModal && (
        <div className="modal-overlay" onClick={() => { setShowRenewModal(false); setRenewEmail(''); setRenewPassword(''); setRenewError(''); }}>
          <div className="modal-content renew-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close-btn" onClick={() => { setShowRenewModal(false); setRenewEmail(''); setRenewPassword(''); setRenewError(''); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            
            <div className="renew-modal-header">
              <div className="renew-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
              </div>
              <h2>Renew Your Plan</h2>
              <p className="renew-subtitle">Enter your credentials to continue your subscription</p>
            </div>

            <form onSubmit={handleRenewPlan} className="modal-form renew-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={renewEmail}
                  onChange={(e) => setRenewEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={renewPassword}
                  onChange={(e) => setRenewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {renewError && <div className="error-message">{renewError}</div>}
              <div className="modal-actions renew-actions">
                <button type="button" onClick={() => { setShowRenewModal(false); setRenewEmail(''); setRenewPassword(''); setRenewError(''); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary renew-btn" disabled={renewLoading}>
                  {renewLoading ? (
                    <>
                      <svg className="spinner" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
                      </svg>
                      Renewing...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      Renew Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
