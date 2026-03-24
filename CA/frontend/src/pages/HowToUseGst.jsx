import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Play, Search, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import '../styles/globals.css';

export default function HowToUseGst() {
  const steps = [
    {
      number: 1,
      icon: Upload,
      title: 'Upload Your Files',
      description: 'Upload two Excel files: your Purchase/Sales Register and GSTR-2B data',
      details: [
        'Click the "Upload Files" button',
        'Select your Purchase Register or Sales Register (Excel format)',
        'Select your GSTR-2B export file',
        'Files must contain: GSTIN, Invoice Number, Date, and Taxable Amount'
      ],
      tip: 'Accepted formats: .xlsx, .xls | Max file size: 10MB per file'
    },
    {
      number: 2,
      icon: Play,
      title: 'Start Reconciliation',
      description: 'Click one button to begin automatic matching',
      details: [
        'Review the file preview to ensure data is correct',
        'Click "Start Reconciliation" button',
        'Our AI matches invoices by GSTIN, Invoice Number & Amount',
        'Processing typically takes 30-90 seconds'
      ],
      tip: 'No configuration needed—the system auto-detects columns'
    },
    {
      number: 3,
      icon: Search,
      title: 'Review Mismatches',
      description: 'See matched vs. unmatched invoices with variance details',
      details: [
        'View match summary: Total invoices, Matched %, Unmatched count',
        'Review discrepancies with exact variance amounts',
        'Identify missing invoices or GSTIN mismatches',
        'Filter by match status for quick analysis'
      ],
      tip: 'Color-coded results: Green = Match, Red = Mismatch, Yellow = Partial'
    },
    {
      number: 4,
      icon: Download,
      title: 'Download Report',
      description: 'Get a detailed Excel report ready for client review',
      details: [
        'Click "Download Report" to get your reconciliation file',
        'Report includes: Match summary, full reconciliation table, discrepancy list',
        'Use filters to export specific sections only',
        'Share directly with clients or use for GST filing'
      ],
      tip: 'Report generated in standard Excel format—no special software needed'
    }
  ];

  return (
    <div className="container" style={{ maxWidth: '900px', paddingTop: '40px', paddingBottom: '60px' }}>
      <div className="section">
        {/* Back Button */}
        <Link 
          to="/dashboard" 
          className="back-link" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '40px', 
            padding: '10px 20px', 
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '8px', 
            fontWeight: '600', 
            transition: 'all 0.3s ease', 
            boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)' 
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Dashboard
        </Link>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px', lineHeight: '1.2' }}>
            How to Use <span className="gradient-text">GST Reconciliation</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--muted)', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto' }}>
            Match thousands of invoices in minutes. Follow these 4 simple steps to reconcile your GST data.
          </p>
          
          {/* Quick Stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginTop: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} color="#10b981" />
              <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '500' }}>2-3 minutes per file</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} color="#10b981" />
              <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '500' }}>No setup required</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} color="#10b981" />
              <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '500' }}>Excel in, Excel out</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '48px' }}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLastStep = index === steps.length - 1;
            
            return (
              <div key={step.number}>
                <div style={{ 
                  background: 'var(--card)', 
                  border: '2px solid var(--border)', 
                  borderRadius: '16px', 
                  padding: '32px',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}>
                  {/* Step Number Badge */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '-16px', 
                    left: '32px', 
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
                    color: 'white', 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: '700', 
                    fontSize: '18px',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}>
                    {step.number}
                  </div>

                  {/* Step Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={28} color="#3b82f6" strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>
                        {step.title}
                      </h3>
                      <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: '1.5', margin: 0 }}>
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Step Details */}
                  <div style={{ paddingLeft: '76px' }}>
                    <ul style={{ 
                      listStyle: 'none', 
                      padding: 0, 
                      margin: '0 0 16px 0', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px' 
                    }}>
                      {step.details.map((detail, idx) => (
                        <li key={idx} style={{ 
                          fontSize: '14px', 
                          color: 'var(--text)', 
                          lineHeight: '1.6',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}>
                          <span style={{ color: '#3b82f6', fontWeight: '700', fontSize: '16px', lineHeight: '1.4' }}>•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Tip Box */}
                    <div style={{ 
                      background: 'linear-gradient(135deg, #fef3c7, #fde68a)', 
                      border: '1px solid #fbbf24', 
                      borderRadius: '8px', 
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}>
                      <AlertCircle size={18} color="#f59e0b" strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>
                        <strong>Tip:</strong> {step.tip}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connector Line (except after last step) */}
                {!isLastStep && (
                  <div style={{ 
                    height: '24px', 
                    width: '3px', 
                    background: 'linear-gradient(180deg, var(--border), transparent)', 
                    margin: '0 auto',
                    opacity: 0.3
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Sample Files Section */}
        <div style={{ 
          background: 'var(--card)', 
          border: '2px solid var(--border)', 
          borderRadius: '16px', 
          padding: '32px',
          marginBottom: '48px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <FileText size={24} color="#8b5cf6" strokeWidth={2} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Sample File Format</h3>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px', lineHeight: '1.6' }}>
            Your Excel files should contain these columns (exact names may vary—our AI auto-detects):
          </p>
          <div style={{ 
            background: 'var(--bg)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '16px',
            fontFamily: 'monospace',
            fontSize: '13px',
            overflowX: 'auto'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', minWidth: '600px' }}>
              <div style={{ fontWeight: '700', color: '#8b5cf6' }}>GSTIN</div>
              <div style={{ fontWeight: '700', color: '#8b5cf6' }}>Invoice Number</div>
              <div style={{ fontWeight: '700', color: '#8b5cf6' }}>Invoice Date</div>
              <div style={{ fontWeight: '700', color: '#8b5cf6' }}>Taxable Amount</div>
              <div style={{ color: 'var(--muted)' }}>27AAAAA0000A1Z5</div>
              <div style={{ color: 'var(--muted)' }}>INV-2024-001</div>
              <div style={{ color: 'var(--muted)' }}>01/01/2024</div>
              <div style={{ color: 'var(--muted)' }}>50000.00</div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div style={{ 
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', 
          border: '2px solid #bbf7d0', 
          borderRadius: '16px', 
          padding: '32px',
          marginBottom: '48px'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: '#065f46' }}>
            Perfect For These CA Tasks
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {['Monthly GST Returns', 'ITC Reconciliation', 'Audit Documentation', 'Vendor Mismatch Analysis'].map((useCase) => (
              <div key={useCase} style={{ 
                background: 'white', 
                border: '1px solid #bbf7d0', 
                borderRadius: '8px', 
                padding: '14px 18px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#065f46',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={18} color="#10b981" />
                {useCase}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
          borderRadius: '16px', 
          padding: '40px 32px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>
            Ready to Save Hours on GST Filing?
          </h3>
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px', lineHeight: '1.5' }}>
            Start reconciling your GST data now—no training needed
          </p>
          <Link 
            to="/gst-tool" 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 32px', 
              background: 'white', 
              color: '#7c3aed',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '16px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          >
            Start GST Reconciliation
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
