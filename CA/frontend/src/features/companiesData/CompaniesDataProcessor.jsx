import React from 'react';
import { API_URL } from '../../config';
import { handleSessionDeactivated, isSessionDeactivatedError } from '../../utils/sessionHandler';

export async function simulateCompaniesData(companyName, purchaseFile, salesFile, onProgress) {
  if (!companyName || !companyName.trim()) {
    throw new Error('Company name is required.');
  }

  if (!purchaseFile || !salesFile) {
    throw new Error('Please upload both purchase and sales DayBook files.');
  }

  if (!/\.(xlsx|xls)$/i.test(purchaseFile.name) || !/\.(xlsx|xls)$/i.test(salesFile.name)) {
    throw new Error('Both files must be Excel (.xlsx or .xls).');
  }

  const form = new FormData();
  form.append('company_name', companyName.trim());
  form.append('purchase_file', purchaseFile);
  form.append('sales_file', salesFile);

  const trialToken = localStorage.getItem('trial_token');
  const headers = {};
  if (trialToken) {
    headers.Authorization = `Bearer ${trialToken}`;
  }

  if (onProgress) onProgress(0, 'Uploading files...');

  const uploadRes = await fetchWithTimeout(`${API_URL}/api/companies-data/process`, {
    method: 'POST',
    body: form,
    headers,
    credentials: 'include',
  }, 60000);

  if (!uploadRes.ok) {
    const errText = await safeReadText(uploadRes);

    if (uploadRes.status === 401 && isSessionDeactivatedError(errText)) {
      handleSessionDeactivated();
      throw new Error('SESSION_DEACTIVATED');
    }

    throw new Error(errText || `Failed to start processing (${uploadRes.status})`);
  }

  const { job_id: jobId } = await uploadRes.json();
  if (!jobId) {
    throw new Error('No job ID received from server.');
  }

  let lastProgress = 0;
  let statusTimeouts = 0;
  const startedAt = Date.now();
  const maxWaitMs = 10 * 60 * 1000;
  while (true) {
    await sleep(2000);

    if (Date.now() - startedAt > maxWaitMs) {
      throw new Error('Processing is taking too long. Please try again.');
    }

    let statusRes;
    try {
      statusRes = await fetchWithTimeout(
        `${API_URL}/api/companies-data/status/${jobId}?t=${Date.now()}`,
        {
          credentials: 'include',
          headers,
          cache: 'no-store',
        },
        20000
      );
      statusTimeouts = 0;
    } catch (err) {
      if (err?.name === 'AbortError') {
        statusTimeouts += 1;
        if (statusTimeouts < 3) {
          if (onProgress) onProgress(lastProgress, 'Still processing... retrying status check');
          continue;
        }
        throw new Error('Status check timed out repeatedly. Please try again.');
      }
      throw err;
    }

    if (!statusRes.ok) {
      throw new Error('Failed to check processing status.');
    }

    const status = await statusRes.json();
    if (onProgress) {
      const pct = typeof status.progress === 'number' ? status.progress : lastProgress;
      const msg = status.message || 'Processing...';
      onProgress(pct, msg);
      if (pct > lastProgress) lastProgress = pct;
    }

    if (status.status === 'completed') {
      if (onProgress) onProgress(100, 'Downloading output...');
      const downloadRes = await fetchWithTimeout(
        `${API_URL}/api/companies-data/download/${jobId}?t=${Date.now()}`,
        {
          credentials: 'include',
          headers,
          cache: 'no-store',
        },
        60000
      );

      if (!downloadRes.ok) {
        throw new Error('Failed to download output file.');
      }

      const blob = await downloadRes.blob();
      const contentDisposition = downloadRes.headers.get('content-disposition') || '';
      const filename = parseFilenameFromCD(contentDisposition) || `${companyName}_companies_data.xlsx`;
      await saveBlobToDisk(blob, filename);
      return `Downloaded ${filename}`;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || status.message || 'Processing failed.');
    }
  }
}

async function saveBlobToDisk(blob, filename) {
  // Use File System Access API only when browser reports active user gesture.
  if (window.showSaveFilePicker) {
    const hasUserGesture = !!window.navigator?.userActivation?.isActive;
    if (hasUserGesture) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Excel Workbook',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                'application/vnd.ms-excel': ['.xls'],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        // User canceled picker: keep this as an explicit stop.
        if (err?.name === 'AbortError') {
          throw new Error('Download canceled.');
        }
        // NotAllowedError/SecurityError and similar should fallback to anchor download.
      }
    }
  }

  if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === 'function') {
    window.navigator.msSaveOrOpenBlob(blob, filename);
    return;
  }

  // Generic fallback.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

function parseFilenameFromCD(cd) {
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1] || match[2] || '').trim() || null;
}

async function safeReadText(res) {
  try {
    const text = await res.text();
    if (!text) return '';
    try {
      const parsed = JSON.parse(text);
      return parsed.detail || text;
    } catch {
      return text;
    }
  } catch {
    return '';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
