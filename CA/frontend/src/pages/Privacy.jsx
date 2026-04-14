import React from 'react';

export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h1>Privacy Policy</h1>
      <p className="tagline">Last updated: Nov 2025 (demo)</p>
      <p style={{ lineHeight: 1.7 }}>We respect your privacy. This demo app processes uploaded files transiently for feature demonstrations and does not persist data. For production use, replace demo logic with your secure data-handling policies, including encryption, access controls, and retention rules.</p>
    </div>
  );
}
