import { useState } from 'react';
import { useTrialContext } from '../contexts/TrialContext';
import { executeToolWithTrial } from '../services/trialService';

/**
 * Hook for executing tools with trial/subscription support
 * Handles trial runs tracking and trial ended scenario
 * 
 * @param {string} toolName - Tool name in uppercase: 'GST', 'TDS', 'INVOICE', 'LEDGER'
 * @param {function} onTrialEnded - Callback when trial runs are exhausted
 */
export function useToolExecute(toolName, onTrialEnded) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState(null);
  const { trialMode, updateRunsLeft } = useTrialContext();

  const execute = async (payload) => {
    setIsExecuting(true);
    setExecutionError(null);

    try {
      const response = await executeToolWithTrial(toolName, payload);

      // Update trial runs if in trial mode
      if (response.trial && response.trial.remaining_runs !== undefined) {
        updateRunsLeft(response.trial.remaining_runs);

        // Check if trial has ended
        if (response.trial.remaining_runs === 0) {
          if (onTrialEnded) {
            onTrialEnded();
          }
        }
      }

      return response;
    } catch (error) {
      setExecutionError(error.message);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    execute,
    isExecuting,
    executionError,
    trialMode
  };
}
