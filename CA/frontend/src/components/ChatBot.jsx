import React, { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/chatbot.css';

const ChatBot = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'Hello! 👋 I\'m your CA Assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Knowledge base with questions and answers (memoized)
  const knowledgeBase = useMemo(() => ({
    // Greetings
    'hello': 'Hello! How can I assist you today?',
    'hi': 'Hi there! What can I help you with?',
    'hey': 'Hey! How may I help you?',
    
    // Features
    'features': 'We offer 4 main features:\n\n1. GST Reconciliation - Compare GSTR-2A with Purchase Register\n2. TDS Calculation - Automate TDS computation\n3. Invoice Extraction - Extract data from PDF invoices\n4. Ledger Classification - Organize transactions automatically\n\nWhich feature would you like to know more about?',
    
    'gst': 'GST Reconciliation helps you:\n- Compare GSTR-2A with your Purchase Register\n- Identify mismatches automatically\n- Generate detailed reconciliation reports\n- Export results in Excel format\n\nWould you like to try it? Type "go to gst" to get started!',
    
    'tds': 'TDS Calculation feature:\n- Automatically calculates TDS amounts\n- Supports multiple TDS sections\n- Generates TDS certificates\n- Provides compliance reports\n\nType "go to tds" to access the TDS calculator!',
    
    'invoice': 'Invoice Extraction can:\n- Extract data from PDF invoices\n- Recognize invoice numbers, dates, amounts\n- Process multiple invoices at once\n- Export data to Excel\n\nType "go to invoice" to start extracting!',
    
    'ledger': 'Ledger Classification helps:\n- Auto-categorize transactions\n- Organize your financial data\n- Generate classification reports\n- Improve accounting efficiency\n\nType "go to ledger" to classify your ledger!',
    
    // Navigation
    'dashboard': 'Taking you to the Dashboard...',
    'home': 'Taking you to the Home page...',
    'about': 'Taking you to the About page...',
    'contact': 'Taking you to the Contact page...',
    'faq': 'Taking you to the FAQ page...',
    'privacy': 'Taking you to the Privacy Policy...',
    'terms': 'Taking you to Terms & Conditions...',
    
    // Help
    'help': 'I can help you with:\n\n📋 Features - Learn about our services\n🔄 Navigation - Go to different pages\n❓ FAQ - Common questions\n📞 Contact - Get in touch with us\n\nJust ask me anything or use commands like:\n- "go to dashboard"\n- "tell me about GST"\n- "show features"',
    
    // Pricing
    'pricing': 'Our services are competitively priced. For detailed pricing information, please contact our sales team. Type "go to contact" to reach out!',
    'price': 'For pricing details, please contact our team. Type "go to contact" to get started!',
    
    // General
    'how': 'You can:\n1. Upload your files (Excel/PDF)\n2. Select the feature you need\n3. Process your data\n4. Download the results\n\nWould you like to try a specific feature?',
    'what': 'We provide AI-powered accounting automation tools for CA professionals. Our platform helps with GST reconciliation, TDS calculations, invoice extraction, and ledger classification.',
    'why': 'Our tools save you time by automating repetitive accounting tasks, reducing errors, and improving efficiency. We use advanced AI to process your data quickly and accurately.',
    'who': 'We serve Chartered Accountants, accounting firms, and finance professionals who want to automate their workflows and focus on higher-value tasks.',
    
    // Default
    'default': 'I\'m not sure I understand. You can ask me about:\n- Our features (GST, TDS, Invoice, Ledger)\n- Navigation (type "go to [page]")\n- General help (type "help")\n\nWhat would you like to know?'
  }), []);

  // Quick action buttons (memoized)
  const quickActions = useMemo(() => [
    { label: '📊 Dashboard', action: '/dashboard' },
    { label: '✨ Features', query: 'features' },
    { label: '❓ Help', query: 'help' },
    { label: '📞 Contact', action: '/contact' }
  ], []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  const findBestMatch = useCallback((input) => {
    const lowerInput = input.toLowerCase().trim();
    
    // Check for navigation commands
    if (lowerInput.includes('go to') || lowerInput.includes('open') || lowerInput.includes('show me')) {
      const navigationMap = {
        'dashboard': '/dashboard',
        'home': '/',
        'about': '/about',
        'contact': '/contact',
        'faq': '/faq',
        'privacy': '/privacy',
        'terms': '/terms',
        'gst': '/dashboard',
        'tds': '/dashboard',
        'invoice': '/dashboard',
        'ledger': '/dashboard'
      };
      
      for (const [key, path] of Object.entries(navigationMap)) {
        if (lowerInput.includes(key)) {
          return { response: `Taking you to ${key}...`, navigate: path };
        }
      }
    }
    
    // Check knowledge base
    for (const [key, value] of Object.entries(knowledgeBase)) {
      if (lowerInput.includes(key)) {
        return { response: value };
      }
    }
    
    // Check for specific keywords
    if (lowerInput.includes('reconciliation')) return { response: knowledgeBase.gst };
    if (lowerInput.includes('calculation') || lowerInput.includes('calculate')) return { response: knowledgeBase.tds };
    if (lowerInput.includes('extraction') || lowerInput.includes('extract')) return { response: knowledgeBase.invoice };
    if (lowerInput.includes('classification') || lowerInput.includes('classify')) return { response: knowledgeBase.ledger };
    
    return { response: knowledgeBase.default };
  }, [knowledgeBase]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot thinking
    setTimeout(() => {
      const result = findBestMatch(inputValue);
      
      const botMessage = {
        type: 'bot',
        text: result.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      // Handle navigation
      if (result.navigate) {
        setTimeout(() => {
          navigate(result.navigate);
          setIsOpen(false);
        }, 1500);
      }
    }, 800);
  }, [inputValue, findBestMatch, navigate]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleQuickAction = useCallback((action) => {
    if (action.action) {
      navigate(action.action);
      setIsOpen(false);
    } else if (action.query) {
      setInputValue(action.query);
      handleSend();
    }
  }, [navigate, handleSend]);

  const formatTime = useCallback((date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const toggleOpen = useCallback(() => setIsOpen(prev => !prev), []);

  // Don't render if not open (save resources)
  if (!isOpen) {
    return (
      <button
        className="chatbot-toggle"
        onClick={toggleOpen}
        aria-label="Toggle chatbot"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: 'none',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          color: 'white'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    );
  }

  return (
    <>
      {/* Chat Button */}
      <button
        className={`chatbot-toggle ${isOpen ? 'active' : ''}`}
        onClick={toggleOpen}
        aria-label="Toggle chatbot"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: 'none',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          color: 'white'
        }}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Chat Window */}
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </div>
            <div>
              <h3>CA Assistant</h3>
              <span className="chatbot-status">
                <span className="status-dot"></span>
                Online
              </span>
            </div>
          </div>
          <button 
            className="chatbot-close"
            onClick={toggleOpen}
            aria-label="Close chatbot"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="chatbot-quick-actions">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="quick-action-btn"
              onClick={() => handleQuickAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-content">
                {message.text.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < message.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          ))}
          {isTyping && (
            <div className="message bot">
              <div className="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input">
          <input
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
});

ChatBot.displayName = 'ChatBot';

export default ChatBot;
