import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/globals.css';

export default function HowToUseInvoice() {
  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      <div className="section">
        <Link to="/dashboard" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px', padding: '10px 20px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600', transition: 'all 0.3s ease', boxShadow: '0 4px 6px rgba(6, 182, 212, 0.2)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Dashboard
        </Link>
        
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '32px' }}>
          <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: '40px', height: '40px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Invoice Extraction</h1>
            <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.6' }}>
              Extract invoice data from images and PDFs using advanced OCR technology—structured, validated, and ready for compliance
            </p>
          </div>
        </div>

        {/* Time Comparison Banner */}
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Manual: 1-2 hours</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <span style={{ fontWeight: '700', color: '#10b981', fontSize: '18px' }}>FISCLYTIC: 30-60 seconds</span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* Input Card */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" fill="#3b82f6" style={{ width: '24px', height: '24px' }}>
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Input</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: '#475569', lineHeight: '2' }}>
              <li>• PDF or image files (.pdf, .png, .jpg)</li>
              <li>• Scanned or digital invoices</li>
              <li>• Clear and readable format</li>
            </ul>
          </div>

          {/* Process Card */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" fill="#8b5cf6" style={{ width: '24px', height: '24px' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Process</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: '#475569', lineHeight: '2' }}>
              <li>• Perform OCR on document</li>
              <li>• Extract invoice details</li>
              <li>• Parse vendor & customer info</li>
              <li>• Validate GST & amounts</li>
            </ul>
          </div>

          {/* Output Card */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" fill="#10b981" style={{ width: '24px', height: '24px' }}>
                <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Output</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: '#475569', lineHeight: '2' }}>
              <li>• Structured invoice data</li>
              <li>• Editable fields</li>
              <li>• Excel export ready</li>
              <li>• Compliance format</li>
            </ul>
          </div>
        </div>

        {/* Video Reference Section */}
        <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '12px', padding: '32px', border: '2px solid #fbbf24', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg viewBox="0 0 24 24" fill="#f59e0b" style={{ width: '32px', height: '32px' }}>
              <circle cx="12" cy="12" r="10"/>
              <polygon points="10 8 16 12 10 16 10 8" fill="white"/>
            </svg>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#92400e' }}>Video Tutorial</h3>
          </div>
          <p style={{ fontSize: '14px', color: '#78350f', marginBottom: '16px', lineHeight: '1.6' }}>
            Watch our step-by-step video guide to learn how to use the Invoice Extraction tool effectively.
          </p>
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <div style={{ textAlign: 'center', color: '#92400e' }}>
              <svg viewBox="0 0 24 24" fill="#f59e0b" style={{ width: '48px', height: '48px', margin: '0 auto 12px' }}>
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8" fill="white"/>
              </svg>
              <p style={{ fontSize: '14px', fontWeight: '600' }}>Video tutorial coming soon</p>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '32px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <svg viewBox="0 0 24 24" fill="#ef4444" style={{ width: '24px', height: '24px' }}>
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
            </svg>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>CA Use Cases</h3>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ padding: '12px 24px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '500' }}>Expense Tracking</div>
            <div style={{ padding: '12px 24px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '500' }}>Invoice Processing</div>
            <div style={{ padding: '12px 24px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '500' }}>Books of Accounts</div>
            <div style={{ padding: '12px 24px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '500' }}>Vendor Management</div>
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link to="/invoice-tool" className="button gradient" style={{ padding: '14px 32px', fontSize: '16px' }}>
            Try Invoice Extraction Now
          </Link>
        </div>
      </div>
    </div>
  );
}
