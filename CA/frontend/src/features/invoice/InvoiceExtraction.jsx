import React from 'react';
import { API_URL } from '../../config';
import { isSessionDeactivatedError, handleSessionDeactivated } from '../../utils/sessionHandler';

export default function InvoiceExtraction() { return null; }

// Post file to backend and trigger download of processed invoice Excel (with async job polling)
export async function simulateInvoice(file, onProgress) {
  // Quick guard: Only .pdf supported by backend
  if (!/\.pdf$/i.test(file.name)) {
    throw new Error('Please upload a PDF file for invoice extraction.');
  }
  
  const form = new FormData();
  form.append('file', file);
  
  // Get trial token if in trial mode
  const trialToken = localStorage.getItem('trial_token');
  const headers = {};
  if (trialToken) {
    headers['Authorization'] = `Bearer ${trialToken}`;
  }
  
  // Step 1: Upload file and start job
  if (onProgress) onProgress(0, 'Uploading PDF file...');
  
  const uploadRes = await fetch(`${API_URL}/api/invoice/extract`, {
    method: 'POST',
    body: form,
    headers: headers,
    credentials: 'include'
  });
  
  if (!uploadRes.ok) {
    const errText = await safeReadText(uploadRes);
    
    // Check for session deactivation
    if (uploadRes.status === 401 && isSessionDeactivatedError(errText)) {
      handleSessionDeactivated();
      throw new Error('SESSION_DEACTIVATED');
    }
    
    throw new Error(errText || `Failed to start processing (${uploadRes.status})`);
  }
  
  const { job_id } = await uploadRes.json();
  
  if (!job_id) {
    throw new Error('No job ID received from server');
  }
  
  // Step 2: Poll for job status
  let lastProgress = 0;
  while (true) {
    await sleep(2000); // Poll every 2 seconds
    
    const statusRes = await fetch(`${API_URL}/api/invoice/status/${job_id}`, { credentials: 'include' });
    
    if (!statusRes.ok) {
      throw new Error('Failed to check job status');
    }
    
    const statusData = await statusRes.json();
    
    // Update progress callback (always update message; bump progress when it increases)
    if (onProgress) {
      const msg = statusData.message || 'Processing...';
      const pct = typeof statusData.progress === 'number' ? statusData.progress : lastProgress;
      onProgress(pct, msg);
      if (pct > lastProgress) lastProgress = pct;
    }
    
    if (statusData.status === 'completed') {
      // Step 3: Download the result
      if (onProgress) onProgress(100, 'Downloading result...');
      
      const downloadRes = await fetch(`${API_URL}/api/invoice/download/${job_id}`, { credentials: 'include' });
      
      if (!downloadRes.ok) {
        throw new Error('Failed to download result');
      }
      
      const blob = await downloadRes.blob();
      const cd = downloadRes.headers.get('content-disposition') || '';
      const filename = parseFilenameFromCD(cd) || file.name.replace(/\.pdf$/i, '') + '_invoices.xlsx';
      triggerDownload(blob, filename);
      
      return `Downloaded ${filename}`;
      
    } else if (statusData.status === 'failed') {
      throw new Error(statusData.error || 'Processing failed');
    }
    
    // Continue polling if still processing
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseFilenameFromCD(cd) {
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
  if (match) {
    return decodeURIComponent(match[1] || match[2] || '').trim();
  }
  return null;
}

async function safeReadText(res) {
  try { return await res.text(); } catch { return ''; }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

