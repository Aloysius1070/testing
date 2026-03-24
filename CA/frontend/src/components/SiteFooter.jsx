import React, { memo } from 'react';
import { Link } from 'react-router-dom';

const SiteFooter = memo(() => {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        {/* Brand Section */}
        <div className="footer-brand">
          <div className="footer-logo">
            <svg viewBox="0 0 120 120" style={{ width: '48px', height: '48px' }}>
              <defs>
                <linearGradient id="footerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6"/>
                  <stop offset="50%" stopColor="#3b82f6"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
                <linearGradient id="footerPulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0"/>
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M 35,30 L 75,30 L 75,38 L 45,38 L 45,50 L 70,50 L 70,58 L 45,58 L 45,90" fill="none" stroke="url(#footerLogoGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M 80,35 Q 90,40 95,50" fill="none" stroke="url(#footerPulseGradient)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M 75,54 Q 85,57 92,65" fill="none" stroke="url(#footerPulseGradient)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M 80,42 L 100,42" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
              <circle cx="95" cy="50" r="3.5" fill="#06b6d4"/>
              <circle cx="92" cy="65" r="3.5" fill="#3b82f6"/>
              <circle cx="100" cy="42" r="3" fill="#8b5cf6"/>
              <path d="M 78,72 L 85,78 L 78,84" fill="none" stroke="url(#footerLogoGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M 87,72 L 94,78 L 87,84" fill="none" stroke="url(#footerLogoGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke="url(#footerLogoGradient)" strokeWidth="1.5" opacity="0.2" strokeDasharray="8,6"/>
            </svg>
          </div>
          <div className="footer-title">FISCLYTIC</div>
          <p className="footer-tagline">Accounting automation System.<br/>Smart, accurate, and efficient.</p>
        </div>

        {/* Navigation Section */}
        <div>
          <div className="footer-section-title">NAVIGATION</div>
          <ul className="footer-list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/dashboard">Tools</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            {/* <li><Link to="/profile">My Profile</Link></li> */}
          </ul>
        </div>

        {/* Contact Section */}
        <div>
          <div className="footer-section-title">CONTACT US</div>
          <ul className="footer-list footer-contact">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <a href="mailto:fisclytic.ca@gmail.com">fisclytic.ca@gmail.com</a>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>India</span>
            </li>
          </ul>
        </div>

        {/* Connect Section */}
        <div>
          <div className="footer-section-title">CONNECT</div>
          <div className="footer-socials">
            <a href="#" aria-label="Twitter" title="Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
              </svg>
            </a>
            <a href="#" aria-label="Instagram" title="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="var(--bg)"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="var(--bg)" strokeWidth="2"/>
              </svg>
            </a>
            <a href="#" aria-label="Facebook" title="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
              </svg>
            </a>
            <a href="#" aria-label="Email" title="Email">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6" stroke="var(--bg)" strokeWidth="2" fill="none"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="container">
          © {new Date().getFullYear()} FISCLYTIC. All rights reserved.
        </div>
      </div>
    </footer>
  );
});

SiteFooter.displayName = 'SiteFooter';

export default SiteFooter;
