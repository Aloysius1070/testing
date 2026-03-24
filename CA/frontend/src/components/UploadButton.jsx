import React, { useRef } from 'react';

export default function UploadButton({ onFile, accept, disabled }) {
  const inputRef = useRef();

  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFile(file);
      e.target.value = '';
    }
  };

  const openFileDialog = () => {
    if (!disabled) inputRef.current?.click();
  };

  const UploadIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M7 9l5-5 5 5" />
      <path d="M12 4v12" />
    </svg>
  );

  return (
    <>
      <button className="button" onClick={openFileDialog} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <UploadIcon />
        <span>Upload</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        style={{ display: 'none' }}
      />
    </>
  );
}
