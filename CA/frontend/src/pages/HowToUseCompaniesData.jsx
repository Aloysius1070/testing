import React from 'react';
import { Link } from 'react-router-dom';

export default function HowToUseCompaniesData() {
  return (
    <div className="container" style={{ maxWidth: 900, paddingTop: 40, paddingBottom: 60 }}>
      <Link
        to="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 28,
          padding: '10px 18px',
          borderRadius: 8,
          textDecoration: 'none',
          color: '#fff',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          fontWeight: 600,
        }}
      >
        Back to Dashboard
      </Link>

      <h1 style={{ fontSize: 34, marginBottom: 10 }}>
        How to Use <span className="gradient-text">Companies Data</span>
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        Process any company with standardized mappings.
      </p>

      <ol style={{ display: 'grid', gap: 16, lineHeight: 1.6 }}>
        <li>Enter the company name.</li>
        <li>Upload purchase DayBook Excel file.</li>
        <li>Upload sales DayBook Excel file.</li>
        <li>Click Process and Download.</li>
        <li>Download one workbook containing purchase_output and sale_output sheets.</li>
      </ol>
    </div>
  );
}
