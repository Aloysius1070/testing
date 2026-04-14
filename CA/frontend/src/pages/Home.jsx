import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/globals.css';
import '../styles/home-modern.css';

export default function Home() {
  return (
    <div className="home">
      <div className="container">

        {/* HERO SECTION */}
        <section className="hero-modern">
          <div className="hero-bg-decoration">
            <div className="hero-circle hero-circle-1"></div>
            <div className="hero-circle hero-circle-2"></div>
            <div className="hero-circle hero-circle-3"></div>
          </div>
          
          <div className="hero-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>Trusted by 500+ CA Firms</span>
          </div>

          <h3 className="hero-title-modern">
            Automate Accounting.<br/>
            <span className="gradient-text">Amplify Accuracy.</span>
          </h3>
          
          <p className="hero-description">
            Automation platform built for Chartered Accountants and finance professionals.
            Automate GST reconciliation, TDS computation, and invoice extraction — faster, cleaner, and error-free.
          </p>
          
          <div className="hero-actions-modern">
            <Link className="button-modern primary" to="/dashboard">
              <span>Explore Tools</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <Link className="button-modern secondary" to="/contact">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Book Demo Session</span>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">99%</div>
              <div className="stat-label">Accuracy Rate</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Files Processed</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">5 min</div>
              <div className="stat-label">Avg Processing Time</div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="features-section">
          <div className="section-header-modern">
            <span className="section-label">POWERFUL FEATURES</span>
            <h3 className="section-title-modern">Smart Financial Automation.<br/>Made Simple.</h3>
            <p className="section-description-modern">
              Streamline compliance workflows with intelligent modules designed for accuracy, scalability, and transparency.
            </p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                ),
                title: 'GST Reconciliation',
                text: 'Automatically match invoices between GSTR-2B and GSTR-3B. Identify mismatches, missing invoices, and unmatched credits in seconds.',
                color: 'blue'
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                ),
                title: 'TDS Computation',
                text: 'Auto-calculate TDS deductions with section-wise accuracy and generate summarized reports for filing and review.',
                color: 'purple'
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                ),
                title: 'Invoice Extraction',
                text: 'Extract key invoice details from PDFs using OCR and regex — structured, validated, and ready for compliance.',
                color: 'cyan'
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                ),
                title: 'Exception Reports',
                text: 'Review flagged mismatches and missing data instantly with an audit-ready exception dashboard.',
                color: 'orange'
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <polyline points="13 2 13 9 20 9"/>
                  </svg>
                ),
                title: 'Excel Export Engine',
                text: 'Generate polished, formatted Excel reports for audit, filing, and data validation in one click.',
                color: 'green'
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                ),
                title: 'Data Privacy',
                text: 'All processing happens locally — your financial data never leaves your environment.',
                color: 'indigo'
              },
            ].map((item, idx) => {
              const getLink = (title) => {
                if (title === 'GST Reconciliation') return '/Dashboard';
                if (title === 'TDS Computation') return '/Dashboard';
                if (title === 'Invoice Extraction') return '/Dashboard';
                return null;
              };
              
              const link = getLink(item.title);
              const CardContent = (
                <>
                  <div className="feature-icon">
                    {item.icon}
                  </div>
                  <h3 className="feature-title">{item.title}</h3>
                  <p className="feature-description">{item.text}</p>
                  <div className="feature-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </>
              );

              return link ? (
                <Link to={link} className={`feature-card feature-${item.color}`} key={idx} style={{ textDecoration: 'none' }}>
                  {CardContent}
                </Link>
              ) : (
                <div className={`feature-card feature-${item.color}`} key={idx}>
                  {CardContent}
                </div>
              );
            })}
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section className="security-section">
          <div className="section-header-modern">
            <span className="section-label">ENTERPRISE-GRADE SECURITY</span>
            <h3 className="section-title-modern">Your Data. Your Control.<br/>Complete Privacy.</h3>
            <p className="section-description-modern">
              Bank-level security with zero-storage architecture. All processing happens locally on your device.
            </p>
          </div>
          
          <div className="security-grid">
            <div className="security-card">
              <div className="security-icon-wrapper blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3>Client-Side Processing</h3>
              <p>All file processing happens in your browser. No data is uploaded to external servers, ensuring complete privacy.</p>
              <div className="security-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>100% Local</span>
              </div>
            </div>

            <div className="security-card">
              <div className="security-icon-wrapper purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3>Zero Data Storage</h3>
              <p>Files are processed in real-time and immediately discarded. We don't store any client information or financial data.</p>
              <div className="security-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>No Cloud Upload</span>
              </div>
            </div>

            <div className="security-card">
              <div className="security-icon-wrapper cyan">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>Instant Processing</h3>
              <p>Get results in seconds without waiting for server uploads or downloads. Everything runs locally on your device.</p>
              <div className="security-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Real-time Results</span>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON SECTION */}
        <section className="comparison-section">
          <div className="section-header-modern">
            <span className="section-label">THE DIFFERENCE IS CLEAR</span>
            <h3 className="section-title-modern">Manual vs Automated<br/>Workflows</h3>
            <p className="section-description-modern">
              See how CA Automation transforms tedious manual work into smart, auditable, and efficient processing.
            </p>
          </div>
          
          <div className="comparison-modern">
            <div className="comparison-column old">
              <div className="comparison-header">
                <div className="comparison-icon old-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </div>
                <h3>Manual Accounting</h3>
                <p>Time-consuming & error-prone</p>
              </div>
              <ul className="comparison-list">
                <li>
                  <span className="comparison-icon-small negative">✕</span>
                  <span>2-3 hours for large GST files</span>
                </li>
                <li>
                  <span className="comparison-icon-small negative">✕</span>
                  <span>Prone to human errors</span>
                </li>
                <li>
                  <span className="comparison-icon-small negative">✕</span>
                  <span>No clear audit trail</span>
                </li>
                <li>
                  <span className="comparison-icon-small negative">✕</span>
                  <span>Limited scalability</span>
                </li>
                <li>
                  <span className="comparison-icon-small negative">✕</span>
                  <span>Unstructured outputs</span>
                </li>
              </ul>
            </div>

            <div className="comparison-divider">
              <div className="vs-badge">VS</div>
            </div>

            <div className="comparison-column new">
              <div className="comparison-header">
                <div className="comparison-icon new-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3>CA Automation</h3>
                <p>Fast, accurate & scalable</p>
              </div>
              <ul className="comparison-list">
                <li>
                  <span className="comparison-icon-small positive">✓</span>
                  <span><strong>Under 5 minutes</strong> per reconciliation</span>
                </li>
                <li>
                  <span className="comparison-icon-small positive">✓</span>
                  <span><strong>99% accuracy</strong> through automation logic</span>
                </li>
                <li>
                  <span className="comparison-icon-small positive">✓</span>
                  <span><strong>Full traceability</strong> with audit logs</span>
                </li>
                <li>
                  <span className="comparison-icon-small positive">✓</span>
                  <span><strong>1,00,000+ rows</strong> without slowdown</span>
                </li>
                <li>
                  <span className="comparison-icon-small positive">✓</span>
                  <span><strong>Standardized reports</strong> ready to file</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="faq-section">
          <div className="section-header-modern">
            <span className="section-label">FAQ</span>
            <h3 className="section-title-modern">Frequently Asked<br/>Questions</h3>
            <p className="section-description-modern">
              Got questions? We've got answers.
            </p>
          </div>
          
          <div className="faq-container">
            {[
              {
                question: 'Is my financial data secure?',
                answer: 'Absolutely. All processing happens directly in your browser using client-side JavaScript. No data is ever uploaded to external servers, ensuring complete privacy and security of your financial information.'
              },
              {
                question: 'What file formats are supported?',
                answer: 'We support Excel files (.xlsx, .xls) for GST, TDS, and Ledger tools. For Invoice Extraction, we accept PDF documents and image files (.png, .jpg, .jpeg). All files are processed locally without uploading.'
              },
              {
                question: 'Can I process large files?',
                answer: 'Yes! The platform is built to handle large datasets efficiently. You can process files with 10,000+ rows without any slowdown. Batch processing is supported for all tools.'
              },
              {
                question: 'Do I need to install any software?',
                answer: 'No installation required! CA Automation is a web-based platform that works directly in your browser. Simply log in and start processing your files instantly from any device.'
              },
              {
                question: 'What kind of reports can I generate?',
                answer: 'You can generate comprehensive Excel reports including GST reconciliation summaries, TDS calculations with section-wise breakdowns, extracted invoice data, and classified ledger entries. All reports are formatted and ready for audit or filing.'
              },
              {
                question: 'Is there a free trial available?',
                answer: 'Yes! We offer a free trial so you can experience the platform and see the time savings firsthand. Check our pricing page for current plans and trial details.'
              }
            ].map((faq, idx) => (
              <details className="faq-item" key={idx}>
                <summary className="faq-question">
                  <span>{faq.question}</span>
                  <div className="faq-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </div>
                </summary>
                <p className="faq-answer">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="cta-section-modern">
          <div className="cta-band">
            <h2>Ready to Transform Your Accounting Workflow?</h2>
            <p>Join 500+ CA firms already saving time and improving accuracy with intelligent automation.</p>
            <div className="cta-buttons">
              <Link className="button-modern primary large" to="/dashboard">
                <span>Get Started Free</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <Link className="button-modern secondary large" to="/contact">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                  <polyline points="22 7 12 13 2 7"/>
                </svg>
                <span>Schedule a Demo</span>
              </Link>
            </div>
            <p className="cta-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>No credit card required • 100% local processing • Cancel anytime</span>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
