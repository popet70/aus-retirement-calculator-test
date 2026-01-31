/**
 * PDF Report Generator for Australian Retirement Calculator
 * 
 * This utility generates a professional PDF report suitable for sharing with
 * financial advisers, including charts, tables, and detailed analysis.
 */

interface RetirementData {
  // Portfolio
  mainSuperBalance: number;
  sequencingBuffer: number;
  totalPensionIncome: number;
  
  // Demographics
  currentAge: number;
  retirementAge: number;
  pensionRecipientType: 'single' | 'couple';
  isHomeowner: boolean;
  
  // Spending
  baseSpending: number;
  spendingPattern: string;
  splurgeAmount: number;
  splurgeStartAge: number;
  splurgeDuration: number;
  
  // Assumptions
  inflationRate: number;
  selectedScenario: number;
  includeAgePension: boolean;
  
  // Results
  chartData: any[];
  
  // Optional features
  useGuardrails?: boolean;
  guardrailParams?: any;
  oneOffExpenses?: any[];
  monteCarloResults?: any;
}

/**
 * Generate a comprehensive PDF report
 * 
 * This function should be called from a server-side API route or
 * backend function, as reportlab is a Python library.
 */
export async function generatePdfReport(data: RetirementData): Promise<Blob> {
  // This TypeScript function calls a Python script that generates the PDF
  // In a Next.js app, you'd implement this as an API route
  
  const response = await fetch('/api/generate-pdf-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate PDF report');
  }
  
  return await response.blob();
}

/**
 * Download the PDF report
 */
export function downloadPdfReport(blob: Blob, filename: string = 'retirement-plan.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculate summary statistics for the report
 */
export function calculateSummaryStats(chartData: any[]) {
  if (!chartData || chartData.length === 0) {
    return null;
  }
  
  const finalAge = chartData[chartData.length - 1]?.age || 100;
  const finalBalance = chartData[chartData.length - 1]?.totalBalance || 0;
  
  // Find portfolio exhaustion age (if any)
  let exhaustionAge = null;
  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i].totalBalance <= 0) {
      exhaustionAge = chartData[i].age;
      break;
    }
  }
  
  // Calculate retirement years
  const retirementData = chartData.filter(d => d.age >= chartData[0].age);
  const yearsOfRetirement = retirementData.length;
  
  // Calculate average annual values
  const avgSpending = retirementData.reduce((sum, d) => sum + (d.spending || 0), 0) / yearsOfRetirement;
  const avgIncome = retirementData.reduce((sum, d) => sum + (d.income || 0), 0) / yearsOfRetirement;
  const avgAgePension = retirementData.reduce((sum, d) => sum + (d.agePension || 0), 0) / yearsOfRetirement;
  
  // Total withdrawals
  const totalWithdrawn = retirementData.reduce((sum, d) => sum + (d.withdrawal || 0), 0);
  
  // Total age pension received
  const totalAgePension = retirementData.reduce((sum, d) => sum + (d.agePension || 0), 0);
  
  // Peak balance
  const peakBalance = Math.max(...chartData.map(d => d.totalBalance || 0));
  const peakAge = chartData.find(d => d.totalBalance === peakBalance)?.age;
  
  // Minimum balance (excluding zero/negative)
  const positiveBalances = chartData.filter(d => d.totalBalance > 0);
  const minBalance = positiveBalances.length > 0 
    ? Math.min(...positiveBalances.map(d => d.totalBalance))
    : 0;
  const minAge = chartData.find(d => d.totalBalance === minBalance)?.age;
  
  return {
    finalAge,
    finalBalance,
    exhaustionAge,
    yearsOfRetirement,
    avgSpending,
    avgIncome,
    avgAgePension,
    totalWithdrawn,
    totalAgePension,
    peakBalance,
    peakAge,
    minBalance,
    minAge,
    successfulRetirement: finalBalance > 0,
  };
}

/**
 * Get scenario name
 */
export function getScenarioName(scenario: number): string {
  const scenarios: Record<number, string> = {
    1: 'Conservative (4.5% return)',
    2: 'Moderate (6.0% return)',
    3: 'Balanced (7.0% return)',
    4: 'Growth (8.0% return)',
    5: 'Aggressive (9.5% return)',
  };
  return scenarios[scenario] || 'Unknown';
}

/**
 * Get spending pattern description
 */
export function getSpendingPatternDescription(pattern: string): string {
  const patterns: Record<string, string> = {
    'constant': 'Constant spending (adjusted for inflation)',
    'jpmorgan': 'JP Morgan age-based decline (~1% per year)',
    'age-adjusted': 'Custom age-adjusted pattern',
  };
  return patterns[pattern] || pattern;
}
