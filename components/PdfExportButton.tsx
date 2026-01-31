/**
 * PDF Export Button Component
 * 
 * Add this button to your retirement calculator to generate PDF reports
 */

import React, { useState } from 'react';

interface PdfExportButtonProps {
  // All the data needed for the report
  retirementData: {
    mainSuperBalance: number;
    sequencingBuffer: number;
    totalPensionIncome: number;
    currentAge: number;
    retirementAge: number;
    pensionRecipientType: 'single' | 'couple';
    isHomeowner: boolean;
    baseSpending: number;
    spendingPattern: string;
    splurgeAmount: number;
    splurgeStartAge: number;
    splurgeDuration: number;
    inflationRate: number;
    selectedScenario: number;
    includeAgePension: boolean;
    chartData: any[];
    useGuardrails?: boolean;
    guardrailParams?: any;
    oneOffExpenses?: any[];
    
    // Monte Carlo results
    monteCarloResults?: {
      medianSimulation?: any[];
      successRate?: number;
      percentiles?: any;
    };
    
    // Historical Monte Carlo results
    historicalMonteCarloResults?: {
      medianSimulation?: any[];
      successRate?: number;
      percentiles?: any;
    };
    
    // Formal test results
    formalTestResults?: {
      [key: string]: {
        name: string;
        desc: string;
        simulationData: any[];
      };
    };
  };
  
  // Optional custom button text
  buttonText?: string;
  
  // Optional custom filename
  filename?: string;
}

export const PdfExportButton: React.FC<PdfExportButtonProps> = ({
  retirementData,
  buttonText = '📄 Export PDF Report',
  filename = 'retirement-plan.pdf',
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-pdf-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(retirementData),
      });
      
      if (!response.ok) {
        // Only try to parse JSON if it's an error response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate PDF');
        } else {
          throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
        }
      }
      
      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div>
      <button
        onClick={handleGeneratePdf}
        disabled={isGenerating}
        className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isGenerating ? '⏳ Generating PDF...' : buttonText}
      </button>
      
      {error && (
        <div className="mt-2 text-xs text-red-600">
          Error: {error}
        </div>
      )}
    </div>
  );
};

/**
 * Example usage in your RetirementCalculator component:
 * 
 * <PdfExportButton
 *   retirementData={{
 *     mainSuperBalance,
 *     sequencingBuffer,
 *     totalPensionIncome,
 *     currentAge,
 *     retirementAge,
 *     pensionRecipientType,
 *     isHomeowner,
 *     baseSpending,
 *     spendingPattern,
 *     splurgeAmount,
 *     splurgeStartAge,
 *     splurgeDuration,
 *     inflationRate,
 *     selectedScenario,
 *     includeAgePension,
 *     chartData,
 *     oneOffExpenses,
 *   }}
 * />
 */
