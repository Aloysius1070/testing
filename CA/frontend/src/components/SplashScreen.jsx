import React, { useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const t = setTimeout(onFinish, 2200);
    return () => clearTimeout(t);
  }, [onFinish]);
  return (
    <div className="splash" role="alert" aria-live="polite">
      <div className="splash-inner splash-animate">
        <div className="splash-logo">
          <svg viewBox="0 0 120 120" className="logo-svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
            
            {/* Stylized Letter F with Data Flow */}
            <path 
              d="M 35,30 L 75,30 L 75,38 L 45,38 L 45,50 L 70,50 L 70,58 L 45,58 L 45,90" 
              fill="none" 
              stroke="url(#logoGradient)" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="letter-f"
            />
            
            {/* Dynamic Flow Lines - Data Streaming */}
            <path 
              d="M 80,35 Q 90,40 95,50" 
              fill="none" 
              stroke="url(#pulseGradient)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              className="flow-1"
            />
            <path 
              d="M 75,54 Q 85,57 92,65" 
              fill="none" 
              stroke="url(#pulseGradient)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              className="flow-2"
            />
            <path 
              d="M 80,42 L 100,42" 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeLinecap="round"
              opacity="0.6"
              className="flow-3"
            />
            
            {/* Analysis Nodes - Connected Points */}
            <circle cx="95" cy="50" r="3.5" fill="#06b6d4" className="node-1"/>
            <circle cx="92" cy="65" r="3.5" fill="#3b82f6" className="node-2"/>
            <circle cx="100" cy="42" r="3" fill="#8b5cf6" className="node-3"/>
            
            {/* Speed Chevrons - Acceleration Symbol */}
            <path d="M 78,72 L 85,78 L 78,84" fill="none" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="chevron-1"/>
            <path d="M 87,72 L 94,78 L 87,84" fill="none" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" className="chevron-2"/>
            
            {/* Orbital Ring - Continuous Processing */}
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.2" strokeDasharray="8,6"/>
          </svg>
        </div>
        <div className="splash-title gradient-text" style={{ letterSpacing: '2px' }}>FISCLYTIC</div>
        <div className="splash-subtitle">Chartered Accountants</div>
        <div className="splash-tag fade-up">Financial Precision, Accelerated Intelligence</div>
        <div className="loading-bars" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
      </div>
    </div>
  );
}
