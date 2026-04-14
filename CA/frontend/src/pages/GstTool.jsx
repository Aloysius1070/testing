import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import UploadButton from '../components/UploadButton';
import LoadingOverlay from '../components/LoadingOverlay';
import TrialEndedModal from '../components/TrialEndedModal';
import { simulateGst } from '../features/gst/GstReconciliation';
import { useTrialContext } from '../contexts/TrialContext';

export default function GstTool() {
  const navigate = useNavigate();
  const { trialMode, updateRunsLeft } = useTrialContext();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showTrialEnded, setShowTrialEnded] = useState(false);

  const getColumnLetter = (index) => {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  };

  const handleFileUpload = (file) => {
    processFileUpload(file);
  };

  const processFileUpload = (file) => {
    const fileType = file.type;
    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          const totalRows = jsonData.length;
          const previewData = jsonData.slice(0, 20);
          const sheetNames = workbook.SheetNames;
          
          setPreview({
            fileName,
            fileSize: totalRows > 1000 ? `${fileSize} (${totalRows.toLocaleString()} rows)` : fileSize,
            fileType,
            status: 'uploaded',
            uploadTime: new Date().toLocaleString(),
            excelData: previewData,
            totalRows: totalRows,
            isPreviewLimited: totalRows > 20,
            sheetNames: sheetNames,
            activeSheet: firstSheetName,
            originalFile: file
          });
        } catch (error) {
          console.error('Error reading Excel file:', error);
          setPreview({
            fileName,
            fileSize,
            fileType,
            status: 'uploaded',
            uploadTime: new Date().toLocaleString(),
            error: 'Failed to read Excel file'
          });
        }
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      setPreview({
        fileName,
        fileSize,
        fileType,
        status: 'uploaded',
        uploadTime: new Date().toLocaleString()
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
        setProgress(typeof progressPercent === 'number' ? progressPercent : 0);
        setProgressMessage(message || 'Processing...');
      };
      
      const result = await simulateGst(preview.originalFile, onProgressCallback);
      
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
            }, 1000); // Show modal 1 second after processing completes
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
              GST <span className="gradient-text">Reconciliation</span>
            </h1>
            <p className="hero-header-subtitle">
              Secure, fast, and simple file processing with end-to-end automation. Upload your Excel file to get started.
            </p>
            <div className="hero-header-actions">
              <UploadButton 
                disabled={loading} 
                accept=".xlsx" 
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
                <linearGradient id="gstGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9f7aea"/>
                  <stop offset="100%" stopColor="#7c3aed"/>
                </linearGradient>
                <linearGradient id="gstGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981"/>
                  <stop offset="100%" stopColor="#059669"/>
                </linearGradient>
              </defs>
              
              {/* Light Background Shapes */}
              <circle cx="150" cy="100" r="80" fill="#e9d5ff" opacity="0.3"/>
              <circle cx="250" cy="200" r="60" fill="#d1fae5" opacity="0.3"/>
              <rect x="280" y="80" width="100" height="100" rx="20" fill="#ddd6fe" opacity="0.25" transform="rotate(15 330 130)"/>
              
              {/* Main Document */}
              <rect x="160" y="90" width="80" height="120" rx="8" fill="url(#gstGrad1)" opacity="0.8"/>
              <line x1="175" y1="115" x2="225" y2="115" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="175" y1="140" x2="215" y2="140" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="175" y1="165" x2="225" y2="165" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="175" y1="190" x2="205" y2="190" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              
              {/* Checkmark */}
              <circle cx="280" cy="120" r="25" fill="url(#gstGrad2)" opacity="0.9" className="float-check"/>
              <path d="M 272,120 L 277,126 L 288,112" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              
              {/* Small Floating Documents */}
              <g className="float-doc">
                <rect x="100" y="80" width="30" height="40" rx="3" fill="url(#gstGrad1)" opacity="0.6"/>
                <line x1="108" y1="92" x2="122" y2="92" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="108" y1="100" x2="118" y2="100" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </g>
              
              <g className="float-doc-2">
                <rect x="270" y="200" width="30" height="40" rx="3" fill="url(#gstGrad1)" opacity="0.6"/>
                <line x1="278" y1="212" x2="292" y2="212" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="278" y1="220" x2="288" y2="220" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </g>
              
              {/* Sparkles */}
              <g className="sparkle-1">
                <line x1="120" y1="180" x2="132" y2="180" stroke="url(#gstGrad1)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="126" y1="174" x2="126" y2="186" stroke="url(#gstGrad1)" strokeWidth="2" strokeLinecap="round"/>
              </g>
              <g className="sparkle-2">
                <line x1="310" y1="160" x2="322" y2="160" stroke="url(#gstGrad2)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="316" y1="154" x2="316" y2="166" stroke="url(#gstGrad2)" strokeWidth="2" strokeLinecap="round"/>
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
                <div className="preview-row">
                  <span className="preview-label">Status:</span>
                  <span className={`preview-badge ${preview.status}`}>
                    {preview.status === 'uploaded' ? 'Ready to Process' : 'Processing Complete'}
                  </span>
                </div>
              </div>
            </div>



            {preview.status === 'uploaded' && preview.excelData && (
              <div className="preview-section">
                <h3>Data Preview</h3>
                {preview.isPreviewLimited && (
                  <div className="preview-notice-enterprise">
                    Displaying first 20 rows of {preview.totalRows?.toLocaleString()} • Full dataset will be processed
                  </div>
                )}
                <div className="excel-view-enterprise">
                  <div className="excel-toolbar-enterprise">
                    <div className="toolbar-left">
                      {preview.sheetNames && preview.sheetNames.map((sheetName, index) => (
                        <div 
                          key={index} 
                          className={`sheet-tab-enterprise ${index === 0 ? 'active' : ''}`}
                        >
                          {sheetName}
                        </div>
                      ))}
                    </div>
                    <div className="toolbar-right">
                      <span className="row-count">{preview.excelData.length} rows</span>
                    </div>
                  </div>
                  <div className="excel-scroll-container">
                    <table className="excel-table-enterprise">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          {preview.excelData[0] && preview.excelData[0].map((_, colIndex) => (
                            <th key={colIndex}>
                              {getColumnLetter(colIndex)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.excelData.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            <td style={{ fontWeight: 600, color: '#6b7280' }}>{rowIndex + 1}</td>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex}>
                                {cell !== null && cell !== undefined ? String(cell) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="excel-footer" style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid var(--border)' }}>
                  <p className="preview-note" style={{ margin: 0 }}>
                     {preview.excelData.length} rows displayed
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

            {preview.status === 'uploaded' && !preview.excelData && !preview.error && (
              <div className="preview-section">
                <div className="preview-info">
                  📄 File uploaded successfully. Click "Process" button to continue.
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

      <div className="process-documentation">
        <h2 className="process-title">Process Workflow</h2>
        <div className="process-steps">
          <div className="process-step">
            <div className="step-header">
              <span className="step-number">1</span>
              <h3 className="step-title">Data Upload</h3>
            </div>
            <p className="step-description">
              Upload Excel files (.xlsx, .xls) containing sales and purchase transaction data. Files are processed securely without storage.
            </p>
            <div className="step-meta">Required format: Excel workbook • Max file size: 50MB</div>
          </div>

          <div className="process-step">
            <div className="step-header">
              <span className="step-number">2</span>
              <h3 className="step-title">Automated Reconciliation</h3>
            </div>
            <p className="step-description">
              System performs line-by-line matching of invoice numbers, amounts, and GST identification numbers between sales and purchase ledgers.
            </p>
            <div className="step-meta">Processing time: ~30 seconds per 1,000 entries</div>
          </div>

          <div className="process-step">
            <div className="step-header">
              <span className="step-number">3</span>
              <h3 className="step-title">Report Generation</h3>
            </div>
            <p className="step-description">
              Download comprehensive reconciliation report with matched entries, discrepancies, and summary statistics in Excel format.
            </p>
            <div className="step-meta">Output format: Excel workbook with multiple sheets</div>
          </div>
        </div>
      </div>

      {loading && <LoadingOverlay text={progressMessage || 'Processing...'} progress={progress} />}
      
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
