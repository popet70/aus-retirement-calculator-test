/**
 * PDF Export Button Component
 * 
 * Generates PDFs client-side using jsPDF
 * Works on Vercel and other serverless platforms
 */

'use client';

import { useState } from 'react';
import { generateClientSidePDF } from '@/lib/utils/generateClientPdf';

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

export default function PdfExportButton({ 
  retirementData, 
  buttonText = '📄 Export PDF Report',
  filename = `retirement-plan-${new Date().toISOString().split('T')[0]}.pdf`
}: PdfExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGeneratePdf = () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Generate PDF client-side
      generateClientSidePDF(retirementData, filename);
      
      // Small delay to show the generating state
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsGenerating(false);
    }
  };
  
  return (
    <div>
      <button
        onClick={handleGeneratePdf}
        disabled={isGenerating}
        className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
      >
        {isGenerating ? '⏳ Generating...' : buttonText}
      </button>
      
      {error && (
        <div className="mt-2 text-xs text-red-600">
          Error: {error}
        </div>
      )}
    </div>
  );
}
