import React, { useState, useEffect } from 'react';
import '../styles/spinner.css';

export default function LoadingOverlay({ text = 'Processing', progress = 0 }) {
  const [dots, setDots] = useState('');

  // Animated dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  return (
    <div className="overlay" aria-live="polite" aria-label={text}>
      <div className="loading-content">
        <div className="spinner" />
        <div className="loading-text-container">
          <div className="loading-title">{text}{dots}</div>
          {progress > 0 && (
            <>
              <div className="loading-status">{progress}% complete</div>
              <div className="loading-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
