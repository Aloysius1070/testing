import React from 'react';

export default function LedgerClassification() { return null; }

export function simulateLedger(file) {
  const delay = 2100 + (file.name.length % 6) * 310;
  return new Promise((resolve) => {
    setTimeout(() => {
      const groups = ['Revenue', 'Expense', 'Assets', 'Liabilities', 'Equity'];
      resolve(`Ledger classification done for ${file.name}. Groups identified: ${groups.slice(0, 3 + (file.size % 2)).join(', ')}.`);
    }, delay);
  });
}
