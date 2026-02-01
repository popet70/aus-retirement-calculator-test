/**
 * Client-Side PDF Generator for Retirement Planning
 * 
 * Generates PDFs entirely in the browser using jsPDF
 * Works on Vercel and other serverless platforms
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  splurgeAmount?: number;
  splurgeStartAge?: number;
  splurgeDuration?: number;
  inflationRate: number;
  selectedScenario: number;
  includeAgePension: boolean;
  chartData: any[];
  oneOffExpenses?: any[];
  monteCarloResults?: {
    successRate?: number;
    percentiles: any;
  };
  historicalMonteCarloResults?: {
    successRate?: number;
    percentiles: any;
  };
  formalTestResults?: any;
}

// Helper functions
const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const getScenarioName = (scenario: number): string => {
  const names: Record<number, string> = {
    1: 'Conservative (4.5% return)',
    2: 'Moderate (6.0% return)',
    3: 'Balanced (7.0% return)',
    4: 'Growth (8.0% return)',
    5: 'Aggressive (9.5% return)',
  };
  return names[scenario] || 'Unknown';
};

const getSpendingPatternName = (pattern: string): string => {
  const patterns: Record<string, string> = {
    'constant': 'Constant spending (inflation-adjusted)',
    'jpmorgan': 'JP Morgan age-based decline',
    'age-adjusted': 'Custom age-adjusted pattern',
  };
  return patterns[pattern] || 'Unknown';
};

export function generateClientSidePDF(data: RetirementData, filename: string = 'retirement-plan.pdf'): void {
  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Helper to add new page if needed
  const checkPageBreak = (heightNeeded: number) => {
    if (yPosition + heightNeeded > pageHeight - margin) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // ========== PAGE 1: COVER PAGE ==========
  
  doc.setFontSize(24);
  doc.setTextColor(31, 41, 55);
  doc.text('Australian Retirement Planning Report', margin, yPosition);
  yPosition += 15;

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-AU', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Planning Horizon: Age ${data.currentAge} to 100`, margin, yPosition);
  yPosition += 5;
  doc.text(`Retirement Age: ${data.retirementAge}`, margin, yPosition);
  yPosition += 20;

  // Disclaimer box
  doc.setFillColor(239, 246, 255);
  doc.rect(margin, yPosition, contentWidth, 30, 'F');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const disclaimerText = 'IMPORTANT DISCLAIMER: This report is for informational purposes only and does not constitute financial advice. The projections are based on assumptions that may not reflect actual future conditions. Consult with a qualified financial adviser before making any investment decisions.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth - 10);
  doc.text(splitDisclaimer, margin + 5, yPosition + 8);
  yPosition += 40;

  // ========== PAGE 2: EXECUTIVE SUMMARY ==========
  
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('Executive Summary', margin, yPosition);
  yPosition += 10;

  // Calculate summary statistics
  const chartData = data.chartData || [];
  let finalBalance = 0;
  let exhaustionAge = null;
  let avgSpending = 0;
  let totalIncome = 0;

  if (chartData.length > 0) {
    const finalData = chartData[chartData.length - 1];
    finalBalance = finalData['Total Balance'] || finalData.totalBalance || 0;

    // Find exhaustion age
    for (const d of chartData) {
      const balance = d['Total Balance'] || d.totalBalance || 0;
      if (balance <= 0) {
        exhaustionAge = d.age;
        break;
      }
    }

    // Calculate averages
    const retirementData = chartData.filter(d => d.age >= data.retirementAge);
    if (retirementData.length > 0) {
      const totalSpending = retirementData.reduce((sum, d) => sum + (d.Spending || d.spending || 0), 0);
      avgSpending = totalSpending / retirementData.length;
      totalIncome = retirementData.reduce((sum, d) => sum + (d.Income || d.income || 0), 0);
    }
  }

  const initialPortfolio = data.mainSuperBalance + data.sequencingBuffer;
  const outcome = finalBalance > 0 
    ? 'Success - Portfolio lasts to age 100' 
    : `Portfolio depletes at age ${exhaustionAge}`;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Initial Portfolio', formatCurrency(initialPortfolio)],
      ['Final Balance (Age 100)', formatCurrency(finalBalance)],
      ['Portfolio Outcome', outcome],
      ['', ''],
      ['Average Annual Spending', formatCurrency(avgSpending)],
      ['Total Income Received', formatCurrency(totalIncome)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Key Finding
  doc.setFontSize(12);
  doc.setTextColor(75, 85, 99);
  doc.text('Key Finding', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const finding = finalBalance > 0
    ? `Based on the assumptions provided, your retirement portfolio is projected to last until at least age 100, with an estimated balance of ${formatCurrency(finalBalance)}.`
    : `Based on current assumptions, your portfolio may be exhausted around age ${exhaustionAge}. Consider adjusting spending levels or retirement age.`;
  
  const splitFinding = doc.splitTextToSize(finding, contentWidth);
  doc.text(splitFinding, margin, yPosition);

  // ========== PAGE 3: PLANNING ASSUMPTIONS ==========
  
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('Planning Assumptions', margin, yPosition);
  yPosition += 10;

  // Portfolio Details
  doc.setFontSize(12);
  doc.setTextColor(75, 85, 99);
  doc.text('Portfolio Details', margin, yPosition);
  yPosition += 7;

  autoTable(doc, {
    startY: yPosition,
    body: [
      ['Main Superannuation', formatCurrency(data.mainSuperBalance)],
      ['Sequencing Buffer', formatCurrency(data.sequencingBuffer)],
      ['Total Starting Portfolio', formatCurrency(initialPortfolio)],
      ['', ''],
      ['Defined Benefit Pension', formatCurrency(data.totalPensionIncome) + ' per year'],
      ['Age Pension Eligible', data.includeAgePension ? 'Yes' : 'No'],
      ['Homeowner Status', data.isHomeowner ? 'Yes' : 'No'],
      ['Pension Type', data.pensionRecipientType === 'couple' ? 'Couple' : 'Single'],
    ],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Economic Assumptions
  doc.setFontSize(12);
  doc.setTextColor(75, 85, 99);
  doc.text('Economic Assumptions', margin, yPosition);
  yPosition += 7;

  autoTable(doc, {
    startY: yPosition,
    body: [
      ['Investment Scenario', getScenarioName(data.selectedScenario)],
      ['Inflation Rate', formatPercent(data.inflationRate)],
      ['Spending Pattern', getSpendingPatternName(data.spendingPattern)],
      ['Base Annual Spending', formatCurrency(data.baseSpending)],
    ],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // ========== PAGE 4: YEAR-BY-YEAR PROJECTION ==========
  
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('Year-by-Year Projection (Every 5 Years)', margin, yPosition);
  yPosition += 10;

  if (chartData.length > 0) {
    const tableData = [];
    
    for (let i = 0; i < chartData.length; i++) {
      if (i % 5 === 0 || i === chartData.length - 1) {
        const d = chartData[i];
        tableData.push([
          d.age?.toString() || '',
          formatCurrency(d['Total Balance'] || d.totalBalance || 0),
          formatCurrency(d.Spending || d.spending || 0),
          formatCurrency(d.Income || d.income || 0),
          formatCurrency(d['Main Super'] || d.mainSuper || 0),
          formatCurrency(d.Buffer || d.buffer || 0),
        ]);
      }
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Age', 'Portfolio', 'Spending', 'Income', 'Main Super', 'Buffer']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { halign: 'right', cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 'auto' },
        3: { halign: 'right', cellWidth: 'auto' },
        4: { halign: 'right', cellWidth: 'auto' },
        5: { halign: 'right', cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5;
    
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Note: Complete year-by-year data is available in the CSV export.', margin, yPosition);
  } else {
    doc.setFontSize(9);
    doc.text('No projection data available', margin, yPosition);
  }

  // ========== PAGE 5: MONTE CARLO RESULTS (IF AVAILABLE) ==========
  
  const mc = data.monteCarloResults || data.historicalMonteCarloResults;
  
  if (mc && mc.successRate !== undefined) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    const mcTitle = data.historicalMonteCarloResults 
      ? 'Historical Monte Carlo Results' 
      : 'Monte Carlo Simulation Results';
    doc.text(mcTitle, margin, yPosition);
    yPosition += 10;

    const percentiles = mc.percentiles || {};
    
    // Helper to get percentile value
    const getPercentileValue = (p: any): number => {
      if (typeof p === 'number') return p;
      if (p && typeof p === 'object' && 'finalBalance' in p) return p.finalBalance;
      return 0;
    };

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: [
        ['Success Rate (portfolio lasts to age 100)', formatPercent(mc.successRate)],
        ['', ''],
        ['Portfolio Balance at Age 100:', ''],
        ['10th Percentile (worst case)', formatCurrency(getPercentileValue(percentiles.p10))],
        ['25th Percentile', formatCurrency(getPercentileValue(percentiles.p25))],
        ['50th Percentile (median)', formatCurrency(getPercentileValue(percentiles.p50))],
        ['75th Percentile', formatCurrency(getPercentileValue(percentiles.p75))],
        ['90th Percentile (best case)', formatCurrency(getPercentileValue(percentiles.p90))],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: data.historicalMonteCarloResults ? [16, 185, 129] : [59, 130, 246],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right', cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Interpretation
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    let interpretation = '';
    if (mc.successRate >= 90) {
      interpretation = `With a ${mc.successRate.toFixed(1)}% success rate, your retirement plan shows strong resilience across various market scenarios.`;
    } else if (mc.successRate >= 75) {
      interpretation = `With a ${mc.successRate.toFixed(1)}% success rate, your retirement plan has a good probability of success, though some scenarios may require spending adjustments.`;
    } else {
      interpretation = `With a ${mc.successRate.toFixed(1)}% success rate, you may want to consider adjusting your retirement strategy to improve outcomes.`;
    }
    
    const splitInterpretation = doc.splitTextToSize(interpretation, contentWidth);
    doc.text(splitInterpretation, margin, yPosition);
  }

  // ========== PAGE 6: FORMAL TEST RESULTS (IF AVAILABLE) ==========
  
  const formalTests = data.formalTestResults;
  
  if (formalTests && Object.keys(formalTests).length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('Formal Test Scenarios', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('The following scenarios test your retirement plan against specific challenging situations:', margin, yPosition);
    yPosition += 10;

    for (const [testKey, testDataRaw] of Object.entries(formalTests)) {
      const testData = testDataRaw as any;
      
      if (!testData || typeof testData !== 'object') continue;

      checkPageBreak(40);

      doc.setFontSize(11);
      doc.setTextColor(75, 85, 99);
      doc.text(testData.name || testKey, margin, yPosition);
      yPosition += 5;

      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const descText = doc.splitTextToSize(testData.desc || 'No description', contentWidth);
      doc.text(descText, margin, yPosition);
      yPosition += descText.length * 4 + 3;

      // Calculate outcome
      const testSimData = testData.simulationData || [];
      if (testSimData.length > 0) {
        const finalBal = testSimData[testSimData.length - 1]?.totalBalance || 0;
        const minBal = Math.min(...testSimData.map((d: any) => d.totalBalance || 0));
        
        let outcome = '';
        let outcomeColor: [number, number, number] = [0, 0, 0];
        
        if (finalBal > 0) {
          outcome = `PASS - Portfolio survives with ${formatCurrency(finalBal)} remaining`;
          outcomeColor = [16, 185, 129]; // Green
        } else {
          const depletionAge = testSimData.find((d: any) => (d.totalBalance || 0) <= 0)?.age;
          outcome = `FAIL - Portfolio depletes at age ${depletionAge}`;
          outcomeColor = [239, 68, 68]; // Red
        }

        doc.setFontSize(9);
        doc.setTextColor(...outcomeColor);
        doc.text(outcome, margin, yPosition);
        yPosition += 5;

        doc.setTextColor(0, 0, 0);
        doc.text(`Lowest balance: ${formatCurrency(minBal)}`, margin, yPosition);
        yPosition += 10;
      }
    }
  }

  // ========== ONE-OFF EXPENSES (IF ANY) ==========
  
  const oneOffExpenses = data.oneOffExpenses || [];
  
  if (oneOffExpenses.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('Planned One-Off Expenses', margin, yPosition);
    yPosition += 10;

    const expenseData = oneOffExpenses.map(e => [
      e.age?.toString() || '',
      e.description || '',
      formatCurrency(e.amount || 0),
    ]);

    const totalExpenses = oneOffExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    expenseData.push(['', 'TOTAL', formatCurrency(totalExpenses)]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Age', 'Description', 'Amount']],
      body: expenseData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
    });
  }

  // ========== FINAL PAGE: IMPORTANT CONSIDERATIONS ==========
  
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('Important Considerations', margin, yPosition);
  yPosition += 15;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const considerations = [
    'This projection assumes consistent market returns based on the selected scenario. Actual returns will vary year to year and may differ significantly from projections.',
    
    'Inflation is assumed to be constant at the specified rate. Actual inflation may vary.',
    
    'Age Pension eligibility and payment amounts are based on current Centrelink rules and thresholds. These may change over time.',
    
    'This analysis does not account for taxation. Consult with a tax professional regarding tax implications of superannuation withdrawals and pension income.',
    
    'Healthcare costs, aged care needs, and other unforeseen expenses may significantly impact your retirement finances.',
    
    'Regular reviews of your retirement plan are recommended, especially when circumstances change.',
  ];

  for (let i = 0; i < considerations.length; i++) {
    checkPageBreak(15);
    const text = `${i + 1}. ${considerations[i]}`;
    const splitText = doc.splitTextToSize(text, contentWidth);
    doc.text(splitText, margin, yPosition);
    yPosition += splitText.length * 5 + 3;
  }

  yPosition += 10;
  checkPageBreak(15);

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const footerText = 'This report was generated using the Australian Retirement Planning Tool. For questions or to update this analysis, please consult with your financial adviser.';
  const splitFooter = doc.splitTextToSize(footerText, contentWidth);
  doc.text(splitFooter, margin, yPosition);

  // Save the PDF
  doc.save(filename);
}
