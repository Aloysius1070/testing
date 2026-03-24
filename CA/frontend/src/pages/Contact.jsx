import React, { useState } from 'react';
import { User, Building2, Mail, Phone, Calendar, Clock, CheckCircle, ArrowRight, Shield } from 'lucide-react';
import '../styles/contact-conversion.css';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    firmName: '',
    date: '',
    time: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="demo-page-container">
      <div className="demo-content-wrapper">
        
        {/* Left: Hero & Trust Section */}
        <div className="demo-hero-section">
          <h1 className="demo-hero-heading">
            Save <span className="highlight">10+ Hours</span> Weekly on GST, TDS & Invoice Processing
          </h1>
          <p className="demo-hero-subheading">
            See how 500+ CA firms automate compliance tasks in minutes—not hours. Book a free 15-minute demo tailored to your practice.
          </p>

          {/* What Happens Next Section */}
          <div className="demo-what-next">
            <h3 className="demo-what-next-title">
              <Calendar size={20} />
              What Happens Next?
            </h3>
            <ol className="demo-steps-list">
              <li className="demo-step-item">
                <div className="demo-step-number">1</div>
                <div className="demo-step-content">
                  <h4>Choose Your Time</h4>
                  <p>Pick a date and time that works best for you—we'll confirm within 2 hours.</p>
                </div>
              </li>
              <li className="demo-step-item">
                <div className="demo-step-number">2</div>
                <div className="demo-step-content">
                  <h4>15-Minute Live Demo</h4>
                  <p>Our CA expert walks through GST reconciliation, TDS calculation, and invoice extraction—live with your data if you'd like.</p>
                </div>
              </li>
              <li className="demo-step-item">
                <div className="demo-step-number">3</div>
                <div className="demo-step-content">
                  <h4>Get Custom Pricing</h4>
                  <p>No pressure. We'll share pricing based on your firm size and answer any questions.</p>
                </div>
              </li>
            </ol>

            {/* Trust Badges */}
            <div className="demo-trust-badges">
              <div className="demo-trust-badge">
                <CheckCircle size={18} />
                <span>No spam, ever</span>
              </div>
              <div className="demo-trust-badge">
                <CheckCircle size={18} />
                <span>15–20 min demo</span>
              </div>
              <div className="demo-trust-badge">
                <CheckCircle size={18} />
                <span>CA-focused platform</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Demo Booking Form */}
        <div className="demo-form-card">
          <div className="demo-form-header">
            <h2 className="demo-form-title">Schedule Your Free Demo</h2>
            <p className="demo-form-subtitle">We'll respond within 2 hours</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Personal Details Section */}
            <div className="demo-form-section">
              <span className="demo-section-label">Your Details</span>
              
              <div className="demo-input-group">
                <label className="demo-input-label">Full Name</label>
                <div className="demo-input-wrapper">
                  <User size={18} className="demo-input-icon" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Rajesh Kumar"
                    className="demo-input"
                    required
                  />
                </div>
              </div>

              <div className="demo-input-group">
                <label className="demo-input-label">Work Email</label>
                <div className="demo-input-wrapper">
                  <Mail size={18} className="demo-input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@firm.com"
                    className="demo-input"
                    required
                  />
                </div>
              </div>

              <div className="demo-input-group">
                <label className="demo-input-label">Phone Number</label>
                <div className="demo-input-wrapper">
                  <Phone size={18} className="demo-input-icon" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="demo-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Firm Details Section */}
            <div className="demo-form-section">
              <span className="demo-section-label">Firm Information</span>
              
              <div className="demo-input-group">
                <label className="demo-input-label">Firm Name</label>
                <div className="demo-input-wrapper">
                  <Building2 size={18} className="demo-input-icon" />
                  <input
                    type="text"
                    name="firmName"
                    value={formData.firmName}
                    onChange={handleChange}
                    placeholder="e.g., Kumar & Associates"
                    className="demo-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="demo-form-section">
              <span className="demo-section-label">Preferred Schedule</span>
              
              <div className="demo-input-row">
                <div className="demo-input-group">
                  <label className="demo-input-label">Date</label>
                  <div className="demo-input-wrapper">
                    <Calendar size={18} className="demo-input-icon" />
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="demo-input"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="demo-input-group">
                  <label className="demo-input-label">Time</label>
                  <div className="demo-input-wrapper">
                    <Clock size={18} className="demo-input-icon" />
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      className="demo-input"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="demo-submit-btn">
              <span>Schedule Free Demo</span>
              <ArrowRight size={18} />
            </button>

            {/* Form Footer */}
            <div className="demo-form-footer">
              <p className="demo-form-note">
                <Shield size={14} />
                Your information is secure. We never share your data.
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
