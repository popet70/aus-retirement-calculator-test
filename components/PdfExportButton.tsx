'use client';

import React from 'react';

interface RetirementData {
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
  constantReturnChartData?: any[];
  oneOffExpenses: any[];
  enableCoupleTracking?: boolean;
  partner1?: any;
  partner2?: any;
  monteCarloResults?: {
    medianSimulation: any;
    successRate: number;
    percentiles: any;
  };
  historicalMonteCarloResults?: {
    medianSimulation: any;
    successRate: number;
    percentiles: any;
  };
  formalTestResults?: any;
}

interface DocxExportButtonProps {
  retirementData: RetirementData;
}

const DocxExportButton: React.FC<DocxExportButtonProps> = ({ retirementData }) => {
  
  const generateDocx = async () => {
    try {
      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(retirementData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Document generation failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retirement-plan-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate document: ${errorMessage}`);
    }
  };

  return (
    <button
      onClick={generateDocx}
      className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
      title="Export comprehensive retirement plan report as Word document"
    >
      📄 Export Word
    </button>
  );
};

export default DocxExportButton;
