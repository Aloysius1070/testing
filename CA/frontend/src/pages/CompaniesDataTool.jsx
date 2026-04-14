import React, { useState } from 'react';
import { useTrialContext } from '../contexts/TrialContext';
import TrialEndedModal from '../components/TrialEndedModal';
import LoadingOverlay from '../components/LoadingOverlay';
import { simulateCompaniesData } from '../features/companiesData/CompaniesDataProcessor';

export default function CompaniesDataTool() {
  const { trialMode, updateRunsLeft } = useTrialContext();

  const [companyName, setCompanyName] = useState('');
  const [purchaseFile, setPurchaseFile] = useState(null);
  const [salesFile, setSalesFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [status, setStatus] = useState('');
  const [showTrialEnded, setShowTrialEnded] = useState(false);

  const canProcess = companyName.trim() && purchaseFile && salesFile && !loading;

  const handleProcess = async () => {
    if (!canProcess) return;

    setLoading(true);
    setProgress(0);
    setProgressMessage('Starting...');
    setStatus('');

    try {
      const result = await simulateCompaniesData(
        companyName,
        purchaseFile,
        salesFile,
        (pct, msg) => {
          setProgress(typeof pct === 'number' ? pct : 0);
          setProgressMessage(msg || 'Processing...');
        }
      );

      if (trialMode) {
        const currentRuns = parseInt(localStorage.getItem('trial_runs_left') || '0', 10);
        if (currentRuns > 0) {
          const nextRuns = currentRuns - 1;
          updateRunsLeft(nextRuns);
          if (nextRuns === 0) {
            setTimeout(() => setShowTrialEnded(true), 1000);
          }
        }
      }

      setStatus(result);
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes('plan expired')) {
        const deviceId = localStorage.getItem('device_id');
        localStorage.clear();
        if (deviceId) {
          localStorage.setItem('device_id', deviceId);
        }
        window.dispatchEvent(new Event('auth-change'));
        window.location.hash = '#/';
        window.location.reload();
        return;
      }

      if (error.message !== 'SESSION_DEACTIVATED') {
        setStatus(error.message || 'Processing failed');
      }
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  return (
    <div className="container tool-page">
      <div className="tool-hero-header">
        <div className="hero-header-content">
          <div className="hero-header-left" style={{ width: '100%' }}>
            <h1 className="hero-header-title">
              Companies Data <span className="gradient-text">Standard Processor</span>
            </h1>
            <p className="hero-header-subtitle">
              Enter company name, upload purchase and sales DayBook files, and process both using mappings.
            </p>
          </div>
        </div>
      </div>

      <section className="preview-panel" style={{ marginTop: 24 }}>
        <div className="preview-header">
          <h2>Input Details</h2>
        </div>
        <div className="preview-body" style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Purchase DayBook (.xlsx/.xls)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setPurchaseFile(e.target.files?.[0] || null)}
            />
            {purchaseFile && <div style={{ marginTop: 8, fontSize: 14 }}>{purchaseFile.name}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Sales DayBook (.xlsx/.xls)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSalesFile(e.target.files?.[0] || null)}
            />
            {salesFile && <div style={{ marginTop: 8, fontSize: 14 }}>{salesFile.name}</div>}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              className="btn-process"
              onClick={handleProcess}
              disabled={!canProcess}
              style={{
                background: canProcess ? 'linear-gradient(135deg, #10b981, #059669)' : '#9ca3af',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: canProcess ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Processing...' : 'Process and Download'}
            </button>
          </div>

          {status && (
            <div
              style={{
                marginTop: 8,
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--panel)',
              }}
            >
              {status}
            </div>
          )}
        </div>
      </section>

      <section className="process-documentation" style={{ marginTop: 24 }}>
        <h2 className="process-title">How It Works</h2>
        <div className="process-steps">
          <div className="process-step">
            <div className="step-header"><span className="step-number">1</span><h3 className="step-title">Input</h3></div>
            <p className="step-description">User provides company name, purchase DayBook, and sales DayBook.</p>
          </div>
          <div className="process-step">
            <div className="step-header"><span className="step-number">2</span><h3 className="step-title">Mapping</h3></div>
            <p className="step-description">System applies the same purchase/sales mappings for all companies.</p>
          </div>
          <div className="process-step">
            <div className="step-header"><span className="step-number">3</span><h3 className="step-title">Output</h3></div>
            <p className="step-description">A downloadable Excel workbook is generated with purchase and sales output sheets.</p>
          </div>
        </div>
      </section>

      <LoadingOverlay visible={loading} progress={progress} message={progressMessage} />
      <TrialEndedModal isOpen={showTrialEnded} onClose={() => setShowTrialEnded(false)} />
    </div>
  );
}
