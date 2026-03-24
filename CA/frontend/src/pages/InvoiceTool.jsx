import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadButton from '../components/UploadButton';
import LoadingOverlay from '../components/LoadingOverlay';
import TrialEndedModal from '../components/TrialEndedModal';
import { simulateInvoice } from '../features/invoice/InvoiceExtraction';
import { useTrialContext } from '../contexts/TrialContext';

export default function InvoiceTool() {
  const navigate = useNavigate();
  const { trialMode, updateRunsLeft } = useTrialContext();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showTrialEnded, setShowTrialEnded] = useState(false);

  const handleFileUpload = (file) => {
    processFileUpload(file);
  };

  const processFileUpload = (file) => {
    const fileType = file.type;
    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
    
    // For PDF files, attempt to get page count
    if (file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // Try to count PDF pages using a simple method
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          const pdfText = new TextDecoder('utf-8').decode(uint8Array);
          
          // Count occurrences of "/Type /Page" which appears once per page in most PDFs
          const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
          const pageCount = pageMatches ? pageMatches.length : null;
          
          // Create a URL for the PDF file for preview
          const pdfUrl = URL.createObjectURL(file);
          
          setPreview({
            fileName,
            fileSize,
            fileType,
            status: 'uploaded',
            uploadTime: new Date().toLocaleString(),
            pageCount: pageCount,
            isPDF: true,
            originalFile: file,
            pdfUrl: pdfUrl
          });
        } catch (error) {
          console.error('Error reading PDF file:', error);
          setPreview({
            fileName,
            fileSize,
            fileType,
            status: 'uploaded',
            uploadTime: new Date().toLocaleString(),
            isPDF: true,
            originalFile: file
          });
        }
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      // For other file types (images, etc.)
      setPreview({
        fileName,
        fileSize,
        fileType,
        status: 'uploaded',
        uploadTime: new Date().toLocaleString(),
        originalFile: file
      });
    }
  };

  const handleProcess = async () => {
    if (!preview || !preview.originalFile) return;
    
    setLoading(true);
    setProgress(0);
    setProgressMessage('Starting...');
    
    try {
      const onProgressCallback = (progressPercent, message) => {
        setProgress(progressPercent);
        setProgressMessage(message || 'Processing...');
      };
      
      const result = await simulateInvoice(preview.originalFile, onProgressCallback);
      
      // Decrement trial runs if in trial mode
      if (trialMode) {
        const currentRuns = parseInt(localStorage.getItem('trial_runs_left') || '0');
        if (currentRuns > 0) {
          const newRuns = currentRuns - 1;
          updateRunsLeft(newRuns);
          
          // Show trial ended modal if this was the last run
          if (newRuns === 0) {
            setTimeout(() => {
              setShowTrialEnded(true);
            }, 1000);
          }
        }
      }
      
      setPreview(prev => ({
        ...prev,
        status: 'processed',
        result,
        processTime: new Date().toLocaleString()
      }));
    } catch (error) {
      // Check for plan expiration (auto-logout)
      if (error.message && error.message.toLowerCase().includes('plan expired')) {
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
      
      setPreview(prev => ({
        ...prev,
        error: error.message || 'Processing failed'
      }));
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  return (
    <div className="container tool-page">
      {/* Hero Header Section */}
      <div className="tool-hero-header">
        <div className="hero-header-content">
          <div className="hero-header-left">
            <h1 className="hero-header-title">
              Invoice <span className="gradient-text">Extraction</span>
            </h1>
            <p className="hero-header-subtitle">
              Secure, fast, and simple invoice data extraction with advanced OCR. Upload your PDF or image file to get started.
            </p>
            <div className="hero-header-actions">
              <UploadButton 
                disabled={loading} 
                accept=".pdf,.png,.jpg,.jpeg" 
                onFile={handleFileUpload}
              />
              <button 
                className="btn-process" 
                onClick={handleProcess}
                disabled={!preview || loading}
                style={{ 
                  background: preview && !loading ? 'linear-gradient(135deg, #10b981, #059669)' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: preview && !loading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    <svg className="icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      <path d="M21 12a9 9 0 00-9-9"/>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                      <path d="M5 12l5 5L20 7"/>
                    </svg>
                    Process
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="hero-header-illustration">
            <svg viewBox="0 0 400 300" className="hero-illustration-svg">
              <defs>
                <linearGradient id="invGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4"/>
                  <stop offset="100%" stopColor="#0891b2"/>
                </linearGradient>
                <linearGradient id="invGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#7c3aed"/>
                </linearGradient>
              </defs>
              
              {/* Light Background Shapes */}
              <circle cx="150" cy="100" r="80" fill="#cffafe" opacity="0.3"/>
              <circle cx="250" cy="200" r="60" fill="#e9d5ff" opacity="0.3"/>
              <rect x="280" y="80" width="100" height="100" rx="20" fill="#a5f3fc" opacity="0.25" transform="rotate(15 330 130)"/>
              
              {/* Main Invoice Document */}
              <rect x="160" y="90" width="80" height="120" rx="8" fill="url(#invGrad1)" opacity="0.8"/>
              <line x1="175" y1="115" x2="225" y2="115" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="175" y1="135" x2="215" y2="135" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="175" y1="155" x2="225" y2="155" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <rect x="175" y="175" width="50" height="20" rx="4" fill="white" opacity="0.3"/>
              
              {/* Scan Icon */}
              <circle cx="280" cy="120" r="25" fill="url(#invGrad2)" opacity="0.9" className="float-check"/>
              <rect x="270" y="112" width="20" height="16" rx="2" fill="none" stroke="white" strokeWidth="2"/>
              <line x1="274" y1="115" x2="274" y2="125" stroke="white" strokeWidth="1.5"/>
              <line x1="278" y1="115" x2="278" y2="125" stroke="white" strokeWidth="1.5"/>
              <line x1="282" y1="115" x2="282" y2="125" stroke="white" strokeWidth="1.5"/>
              <line x1="286" y1="115" x2="286" y2="125" stroke="white" strokeWidth="1.5"/>
              
              {/* Small Floating Documents */}
              <g className="float-doc">
                <rect x="100" y="80" width="30" height="40" rx="3" fill="url(#invGrad1)" opacity="0.6"/>
                <line x1="108" y1="92" x2="122" y2="92" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="108" y1="100" x2="118" y2="100" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </g>
              
              <g className="float-doc-2">
                <rect x="270" y="200" width="30" height="40" rx="3" fill="url(#invGrad1)" opacity="0.6"/>
                <line x1="278" y1="212" x2="292" y2="212" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="278" y1="220" x2="288" y2="220" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </g>
              
              {/* Sparkles */}
              <g className="sparkle-1">
                <line x1="120" y1="180" x2="132" y2="180" stroke="url(#invGrad1)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="126" y1="174" x2="126" y2="186" stroke="url(#invGrad1)" strokeWidth="2" strokeLinecap="round"/>
              </g>
              <g className="sparkle-2">
                <line x1="310" y1="160" x2="322" y2="160" stroke="url(#invGrad2)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="316" y1="154" x2="316" y2="166" stroke="url(#invGrad2)" strokeWidth="2" strokeLinecap="round"/>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {preview && (
        <section className="preview-panel">
          <div className="preview-header">
            <h2>
              <svg className="icon" style={{ marginRight: 8 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              File Preview
            </h2>
            <button className="preview-close" onClick={() => setPreview(null)}>
              <svg className="icon" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="preview-body">
            <div className="preview-section">
              <h3>File Information</h3>
              <div className="preview-table">
                <div className="preview-row">
                  <span className="preview-label">File Name:</span>
                  <span className="preview-value">{preview.fileName}</span>
                </div>
                {preview.pageCount && (
                  <div className="preview-row">
                    <span className="preview-label">Total Pages:</span>
                    <span className="preview-value">{preview.pageCount}</span>
                  </div>
                )}
                <div className="preview-row">
                  <span className="preview-label">Status:</span>
                  <span className={`preview-badge ${preview.status}`}>
                    {preview.status === 'uploaded' ? 'Ready to Process' : 'Processing Complete'}
                  </span>
                </div>
              </div>
            </div>

            {preview.status === 'uploaded' && preview.isPDF && preview.pdfUrl && (
              <div className="preview-section">
                <h3>Document Preview</h3>
                <div className="pdf-preview-container">
                  <iframe
                    src={`${preview.pdfUrl}#view=FitH`}
                    title="PDF Preview"
                    style={{
                      width: '100%',
                      height: '600px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px'
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
                    Showing preview of document • All pages will be processed
                  </p>
                </div>
              </div>
            )}

            {preview.status === 'uploaded' && preview.error && (
              <div className="preview-section">
                <div className="preview-error">
                  ⚠️ {preview.error}
                </div>
              </div>
            )}

            {preview.status === 'processed' && preview.result && (
              <div className="preview-section">
                <h3>Processing Results</h3>
                <div className="preview-result">
                  <pre>{typeof preview.result === 'string' ? preview.result : JSON.stringify(preview.result, null, 2)}</pre>
                </div>
                <div className="preview-row" style={{ marginTop: 16 }}>
                  <span className="preview-label">Process Time:</span>
                  <span className="preview-value">{preview.processTime}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {loading && <LoadingOverlay text={progressMessage || 'Processing...'} progress={progress} />}

      <div className="process-documentation">
        <h2 className="process-title">Process Workflow</h2>
        <div className="process-steps">
          <div className="process-step">
            <div className="step-header">
              <span className="step-number">1</span>
              <h3 className="step-title">Document Upload</h3>
            </div>
            <p className="step-description">
              Upload invoice documents in PDF or image format (JPG, PNG). System supports single or batch upload with automatic format detection.
            </p>
            <div className="step-meta">Supported formats: PDF, JPG, PNG • Max file size: 10MB per file</div>
          </div>

          <div className="process-step">
            <div className="step-header">
              <span className="step-number">2</span>
              <h3 className="step-title">OCR Data Extraction</h3>
            </div>
            <p className="step-description">
              Advanced OCR technology extracts key invoice fields including invoice number, date, vendor details, line items, amounts, and tax information.
            </p>
            <div className="step-meta">Processing time: ~15 seconds per document</div>
          </div>

          <div className="process-step">
            <div className="step-header">
              <span className="step-number">3</span>
              <h3 className="step-title">Data Export</h3>
            </div>
            <p className="step-description">
              Download structured invoice data in Excel format with all extracted fields organized in tabular format for easy integration with accounting systems.
            </p>
            <div className="step-meta">Output format: Excel workbook (.xlsx)</div>
          </div>
        </div>
      </div>

      <TrialEndedModal 
        isOpen={showTrialEnded} 
        onClose={() => {
          setShowTrialEnded(false);
          navigate('/');
        }}
      />
    </div>
  );
}
