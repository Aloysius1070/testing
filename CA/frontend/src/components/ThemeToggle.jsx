import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  // Always start with light mode, don't persist theme
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Always set light mode on mount and clear any saved theme
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.removeItem('ca-theme');
  }, []);

  useEffect(() => {
    // Update theme attribute when toggle is clicked
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const SunIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );

  const MoonIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );

  return (
    <button
      onClick={toggle}
      className="icon-btn"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
