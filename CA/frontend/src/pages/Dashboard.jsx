import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calculator, Receipt, BookOpen, ArrowRight, Clock, HelpCircle, Lock, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { callSecureTest } from '../services/trialService';
import { handleSessionDeactivated, isSessionDeactivatedError } from '../utils/sessionHandler';
import AccessModal from '../components/AccessModal';
import '../styles/dashboard-enterprise.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [checkingTool, setCheckingTool] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  const tools = [
    {
      id: 'gst',
      title: 'GST Reconciliation',
      description: 'Reconcile thousands of invoices in minutes. Detect mismatches, duplicate entries, and tax discrepancies automatically.',
      icon: FileText,
      navigateTo: '/gst-tool',
      howToUse: '/how-to-use-gst',
      badge: 'Most Used',
      className: 'gst',
      outcome: 'Save 8+ hours per month on GST filing'
    },
    {
      id: 'tds',
      title: 'TDS Calculation',
      description: 'Calculate TDS across multiple sections instantly. Generate accurate deduction reports with zero manual errors.',
      icon: Calculator,
      navigateTo: '/tds-tool',
      howToUse: '/how-to-use-tds',
      badge: null,
      className: 'tds',
      outcome: 'Eliminate calculation errors completely'
    },
    {
      id: 'invoice',
      title: 'Invoice Extraction',
      description: 'Extract data from scanned invoices and PDFs in seconds. Convert paper documents to structured Excel files.',
      icon: Receipt,
      navigateTo: '/invoice-tool',
      howToUse: '/how-to-use-invoice',
      badge: null,
      className: 'invoice',
      outcome: 'Process 100+ invoices in under 5 minutes'
    },
    {
      id: 'ledger',
      title: 'Ledger Classification',
      description: 'Auto-categorize ledger entries by expense type. Standardize chart of accounts across multiple clients.',
      icon: BookOpen,
      navigateTo: '/ledger-tool',
      howToUse: '/how-to-use-ledger',
      badge: null,
      className: 'ledger',
      outcome: 'Classify 500+ entries instantly'
    },
    {
      id: 'financial-report',
      title: 'Financial Report Analysis',
      description: 'Generate comprehensive financial reports with insights. Analyze profit & loss, balance sheets, and cash flow statements.',
      icon: TrendingUp,
      navigateTo: '/financial-report-tool',
      howToUse: '/how-to-use-financial-report',
      badge: 'New',
      className: 'financial-report',
      outcome: 'Create reports 10x faster'
    },
    {
      id: 'expense-audit',
      title: 'Expense Audit & Compliance',
      description: 'Audit expense claims and verify compliance. Detect policy violations, duplicate expenses, and fraudulent claims.',
      icon: FileSpreadsheet,
      navigateTo: '/expense-audit-tool',
      howToUse: '/how-to-use-expense-audit',
      badge: 'New',
      className: 'expense-audit',
      outcome: 'Audit 1000+ expenses in minutes'
    }
  ];

  const handleToolClick = async (tool) => {
    if (!tool.navigateTo) return;

    setCheckingTool(tool.id);
    setSelectedTool(tool);

    try {
      const result = await callSecureTest(tool.id);

      if (result.ok) {
        navigate(tool.navigateTo);
      }
    } catch (error) {
      // Check if session was deactivated
      if (isSessionDeactivatedError(error.message)) {
        handleSessionDeactivated();
        return;
      }
      
      // Check for plan expiration
      if (error.message && error.message.includes('Plan expired')) {
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
      
      // Check error type
      if (error.message && error.message.includes('Admin')) {
        alert('Admins cannot access tools.');
      } else {
        // Show access modal
        setShowAccessModal(true);
      }
    } finally {
      setCheckingTool(null);
    }
  };

  const handleAccessGranted = () => {
    if (selectedTool && selectedTool.navigateTo) {
      navigate(selectedTool.navigateTo);
    }
  };

  const handleHowToUse = (e, route) => {
    e.stopPropagation();
    if (route) {
      window.location.hash = route;
    }
  };

  return (
    <>
      <div className="dashboard-enterprise-container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Choose Your <span className="gradient-text">Tool</span></h1>
          <p className="dashboard-subtitle">
            Select an automation tool to start processing your files
          </p>
        </div>

        {/* Tools Grid */}
        <div className="dashboard-tools-grid">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isChecking = checkingTool === tool.id;

            return (
              <div
                key={tool.id}
                className={`tool-card ${tool.className}`}
                onClick={() => !isChecking && handleToolClick(tool)}
              >
                {/* Badge */}
                {tool.badge && (
                  <span className={`tool-card-badge ${tool.badge === 'Most Used' ? 'most-used' : tool.badge === 'New' ? 'new' : ''}`}>
                    {tool.badge}
                  </span>
                )}

                {/* Icon */}
                <div className="tool-card-icon">
                  <Icon size={24} />
                </div>

                {/* Content */}
                <div className="tool-card-content">
                  <h3 className="tool-card-title">{tool.title}</h3>
                  <p className="tool-card-description">{tool.description}</p>
                </div>

                {/* Footer */}
                <div className="tool-card-footer">
                  <button
                    className="tool-card-primary-btn"
                    disabled={isChecking}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToolClick(tool);
                    }}
                  >
                    {isChecking ? (
                      <>
                        <span className="tool-card-spinner"></span>
                        Checking Access...
                      </>
                    ) : (
                      <>
                        Get Started
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <button
                    className="tool-card-secondary-link"
                    onClick={(e) => handleHowToUse(e, tool.howToUse)}
                  >
                    <HelpCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    How to Use
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Access Modal */}
      <AccessModal 
        isOpen={showAccessModal} 
        onClose={() => setShowAccessModal(false)}
        onAccessGranted={handleAccessGranted}
      />
    </>
  );
}
