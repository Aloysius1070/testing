import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import './AccessModal.css';

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  accountId,
  planId,
  planName,
  planPrice 
}) {
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validate props - close modal if invalid
  useEffect(() => {
    if (isOpen && (!accountId || !planId || !planName || !planPrice)) {
      console.error('PaymentModal opened with invalid props:', { accountId, planId, planName, planPrice });
      onClose();
    }
  }, [isOpen, accountId, planId, planName, planPrice, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCardName('');
      setCardNumber('');
      setExpiryMonth('');
      setExpiryYear('');
      setCvv('');
      setAddress('');
      setError('');
    }
  }, [isOpen]);

  // Block ESC key during payment
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    const handleBeforeUnload = (e) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = 'Payment is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('keydown', handleEsc);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, loading, onClose]);

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.substring(0, 16);
    return limited.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handleCvvChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    setCvv(cleaned.substring(0, 3));
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    const cleanedCard = cardNumber.replace(/\s/g, '');
    if (cleanedCard.length !== 16) {
      setError('Card number must be 16 digits');
      return;
    }

    if (cvv.length !== 3) {
      setError('CVV must be 3 digits');
      return;
    }

    if (!expiryMonth || !expiryYear) {
      setError('Please select expiry month and year');
      return;
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (parseInt(expiryYear) < currentYear || 
        (parseInt(expiryYear) === currentYear && parseInt(expiryMonth) < currentMonth)) {
      setError('Card has expired');
      return;
    }

    if (!cardName.trim()) {
      setError('Please enter card owner name');
      return;
    }

    setLoading(true);

    try {
      // Generate dummy payment IDs (will be replaced by Razorpay later)
      const paymentOrderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const paymentSignature = 'DUMMY_SIGNATURE';

      // Add timeout to fetch call (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_URL}/api/auth/payment/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          account_id: accountId,
          plan_id: planId,
          payment_order_id: paymentOrderId,
          payment_id: paymentId,
          payment_signature: paymentSignature,
          card_owner_name: cardName
        })
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Payment failed');
      }

      // Success
      onSuccess(data);

    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Payment request timed out. Please try again or contact support if issue persists.');
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const months = [
    { value: '01', label: '01 - January' },
    { value: '02', label: '02 - February' },
    { value: '03', label: '03 - March' },
    { value: '04', label: '04 - April' },
    { value: '05', label: '05 - May' },
    { value: '06', label: '06 - June' },
    { value: '07', label: '07 - July' },
    { value: '08', label: '08 - August' },
    { value: '09', label: '09 - September' },
    { value: '10', label: '10 - October' },
    { value: '11', label: '11 - November' },
    { value: '12', label: '12 - December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);

  return (
    <div className="modal-overlay" onClick={loading ? null : onClose}>
      <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
        {!loading && (
          <button 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <div className="payment-header">
          <h2 className="modal-title">Secure Payment</h2>
          <div className="payment-summary">
            <div className="payment-plan">{planName} Plan</div>
            <div className="payment-amount">₹{planPrice}</div>
          </div>
        </div>

        {loading && (
          <div className="payment-processing">
            <div className="spinner"></div>
            <p>Processing payment...</p>
            <p className="text-sm">Please do not close this window</p>
          </div>
        )}

        {!loading && (
          <form onSubmit={handlePayment} className="modal-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label className="form-label">Card Owner Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Card Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={handleCardNumberChange}
                required
                disabled={loading}
                maxLength={19}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Expiry Month</label>
                <select
                  className="form-input"
                  value={expiryMonth}
                  onChange={(e) => setExpiryMonth(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">Select</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Year</label>
                <select
                  className="form-input"
                  value={expiryYear}
                  onChange={(e) => setExpiryYear(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">Select</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">CVV</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="123"
                  value={cvv}
                  onChange={handleCvvChange}
                  required
                  disabled={loading}
                  maxLength={3}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Billing Address (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="123 Main St, City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="modal-btn modal-btn-primary"
              disabled={loading}
              style={{ marginTop: '1rem' }}
            >
              Pay ₹{planPrice}
            </button>

            <div className="payment-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Secured by SSL encryption</span>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .payment-modal {
          max-width: 480px;
          width: 100%;
        }

        .payment-header {
          margin-bottom: 1.5rem;
        }

        .payment-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 8px;
          margin-top: 1rem;
        }

        .payment-plan {
          font-weight: 600;
          color: var(--text-primary);
        }

        .payment-amount {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary-color, #4a90e2);
        }

        .payment-processing {
          text-align: center;
          padding: 3rem 1rem;
        }

        .payment-processing .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--bg-tertiary, #e0e0e0);
          border-top-color: var(--primary-color, #4a90e2);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr 100px;
          gap: 1rem;
        }

        .payment-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
          font-size: 0.875rem;
          color: var(--text-secondary, #666);
        }

        .payment-note svg {
          color: var(--success-color, #28a745);
        }

        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
