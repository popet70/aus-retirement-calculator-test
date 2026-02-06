import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, ShadingType, HeadingLevel, convertInchesToTwip, LevelFormat, UnderlineType } from 'docx';

// Helper functions
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getRiskLevel(successRate: number): { text: string; color: string } {
  if (successRate >= 85) return { text: 'LOW RISK', color: '22C55E' };
  if (successRate >= 70) return { text: 'MODERATE RISK', color: 'F59E0B' };
  return { text: 'HIGH RISK', color: 'EF4444' };
}

function createColoredCell(text: string, color: string, bold: boolean = true): TableCell {
  // Use more readable colors for table headers
  const readableColors: { [key: string]: string } = {
    '1E3A8A': '3B82F6',  // Dark navy → Bright blue (much more readable)
    '475569': '6B7280',  // Dark slate → Medium gray (lighter, better contrast)
  };
  
  const backgroundColor = readableColors[color] || color;
  
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold, color: 'FFFFFF', size: 22 })],
      alignment: AlignmentType.CENTER,
    })],
    shading: { fill: backgroundColor, type: ShadingType.SOLID },
    margins: { top: 150, bottom: 150, left: 100, right: 100 },
  });
}

function createTableCell(text: string, options: any = {}): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ 
        text, 
        bold: options.bold || false,
        size: 22,
        color: options.color || (options.bold ? '1E3A8A' : '374151'), // Dark gray for readability
      })],
      alignment: options.alignment || AlignmentType.LEFT,
    })],
    shading: options.shading,
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Calculate pension income - handle couple tracking
    let pensionIncome = 0;
    if (data.enableCoupleTracking && data.partner1 && data.partner2) {
      pensionIncome = (data.partner1.pensionIncome || 0) + (data.partner2.pensionIncome || 0);
    } else {
      pensionIncome = data.totalPensionIncome || 0;
    }
    
    // Calculate key metrics
    const portfolioTotal = (data.mainSuperBalance || 0) + (data.sequencingBuffer || 0);
    const annualSpending = data.baseSpending || 0;
    const netDrawdown = annualSpending - pensionIncome;
    const withdrawalRate = portfolioTotal > 0 ? (netDrawdown / portfolioTotal) * 100 : 0;
    
    const mcResults = data.monteCarloResults || data.historicalMonteCarloResults;
    const successRate = mcResults?.successRate || 0;
    const riskLevel = getRiskLevel(successRate);
    
    const chartData = data.chartData || [];
    const constantReturnChartData = data.constantReturnChartData || [];
    const oneOffExpenses = data.oneOffExpenses || [];
    
    // Build document sections - can contain Paragraphs and Tables
    const sections: (Paragraph | Table)[] = [];
    
    // ========== COVER PAGE ==========
    sections.push(
      new Paragraph({
        text: 'Australian Retirement Planning Report',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 400 },
        style: 'Heading1',
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Comprehensive Financial Analysis & Projections',
            size: 28, // 14pt
            color: '475569',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      })
    );
    
    // Key Info Table with enhanced styling
    sections.push(
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({ 
                  children: [new TextRun({ text: 'Prepared For:', bold: true, size: 22 })],
                })],
                width: { size: 35, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [new TextRun({ text: (data.pensionRecipientType || 'single').toUpperCase() + ' RETIREE', size: 22 })],
                })],
                width: { size: 65, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({ 
                  children: [new TextRun({ text: 'Current Age:', bold: true, size: 22 })],
                })],
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [new TextRun({ text: String(data.currentAge || 'N/A'), size: 22 })],
                })],
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({ 
                  children: [new TextRun({ text: 'Retirement Age:', bold: true, size: 22 })],
                })],
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [new TextRun({ text: String(data.retirementAge || 'N/A'), size: 22 })],
                })],
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({ 
                  children: [new TextRun({ text: 'Report Date:', bold: true, size: 22 })],
                })],
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [new TextRun({ text: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }), size: 22 })],
                })],
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
              }),
            ],
          }),
        ],
        width: { size: 70, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        },
      })
    );
    
    sections.push(new Paragraph({ text: '', spacing: { before: 800 } }));
    
    // Disclaimer - clean design with border only
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Important Disclaimer: ', bold: true, size: 20, color: 'DC2626' }),
          new TextRun({ 
            text: 'This report is for illustrative purposes only and does not constitute financial advice. The projections are based on assumptions that may not reflect actual future outcomes. Consult with a qualified financial adviser before making retirement decisions. Past performance is not indicative of future results.',
            size: 20,
            color: '374151',
          }),
        ],
        spacing: { before: 800 },
        alignment: AlignmentType.BOTH,
        border: {
          top: { style: BorderStyle.SINGLE, size: 8, color: 'DC2626' },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: 'DC2626' },
          left: { style: BorderStyle.SINGLE, size: 8, color: 'DC2626' },
          right: { style: BorderStyle.SINGLE, size: 8, color: 'DC2626' },
        },
      })
    );
    
    sections.push(new Paragraph({ text: '', pageBreakBefore: true }));
    
    // ========== TABLE OF CONTENTS ==========
    sections.push(
      new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 600 },
      })
    );
    
    const tocItems = [
      '1. Executive Summary - Key findings and portfolio health',
      '2. Financial Assumptions - Input parameters and methodology',
      '3. Portfolio Projections - Year-by-year balance and income',
      '4. Risk Analysis - Monte Carlo results and stress testing',
      '5. Recommendations - Actionable insights for your plan',
      '6. Scenario Details - Detailed breakdowns and assumptions',
    ];
    
    tocItems.forEach(item => {
      const [title, desc] = item.split(' - ');
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: 24, color: '1E3A8A' })],
          bullet: { level: 0 },
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: desc, size: 20, color: '64748B', italics: true })],
          spacing: { after: 240 },
          indent: { left: 720 },
        })
      );
    });
    
    sections.push(new Paragraph({ text: '', pageBreakBefore: true }));
    
    // ========== 1. EXECUTIVE SUMMARY ==========
    sections.push(
      new Paragraph({
        text: '1. Executive Summary',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'This section provides a high-level overview of your retirement plan, including portfolio size, spending patterns, and key risk indicators. The findings below highlight the most important aspects of your financial position.',
            size: 22,
            color: '4B5563',
          }),
        ],
        spacing: { after: 400 },
      })
    );
    
    // Status Banner
    if (mcResults) {
      sections.push(
        new Table({
          rows: [
            new TableRow({
              children: [createColoredCell(`PORTFOLIO STATUS: ${riskLevel.text}`, riskLevel.color)],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({ text: '', spacing: { after: 200 } })
      );
    }
    
    // Key Metrics Table
    const metricsRows = [
      new TableRow({
        children: [
          createTableCell('Total Portfolio', { bold: true }),
          createTableCell(formatCurrency(portfolioTotal), { bold: true, alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          createTableCell('Annual Spending', { bold: true }),
          createTableCell(formatCurrency(annualSpending), { bold: true, alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          createTableCell('Pension Income', { bold: true }),
          createTableCell(formatCurrency(pensionIncome), { bold: true, alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          createTableCell('Net Annual Drawdown', { bold: true }),
          createTableCell(formatCurrency(netDrawdown), { bold: true, alignment: AlignmentType.RIGHT }),
        ],
      }),
    ];
    
    if (mcResults) {
      metricsRows.push(
        new TableRow({
          children: [
            createTableCell('Monte Carlo Success Rate', { bold: true }),
            createTableCell(formatPercent(successRate), { bold: true, alignment: AlignmentType.RIGHT }),
          ],
        })
      );
    }
    
    sections.push(
      new Table({
        rows: metricsRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({ text: '', spacing: { after: 400 } })
    );
    
    // Key Findings
    sections.push(
      new Paragraph({
        text: 'Key Findings',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 300 },
      })
    );
    
    const findings: string[] = [];
    
    if (withdrawalRate <= 4) {
      findings.push(`✓ Sustainable withdrawal rate of ${withdrawalRate.toFixed(1)}% (recommended ≤4%)`);
    } else if (withdrawalRate <= 5) {
      findings.push(`⚠ Moderate withdrawal rate of ${withdrawalRate.toFixed(1)}% (slightly above 4% guideline)`);
    } else {
      findings.push(`⚠ High withdrawal rate of ${withdrawalRate.toFixed(1)}% (exceeds 4% safe guideline)`);
    }
    
    if (mcResults) {
      if (successRate >= 85) {
        findings.push(`✓ Strong portfolio resilience with ${successRate.toFixed(1)}% success across 1,000 scenarios`);
      } else if (successRate >= 70) {
        findings.push(`⚠ Moderate portfolio resilience with ${successRate.toFixed(1)}% success rate`);
      } else {
        findings.push(`⚠ Portfolio at risk with only ${successRate.toFixed(1)}% success rate`);
      }
    }
    
    if (pensionIncome > 0) {
      const coverage = (pensionIncome / annualSpending) * 100;
      findings.push(`ℹ Pension income covers ${coverage.toFixed(0)}% of spending needs`);
    }
    
    findings.forEach(finding => {
      sections.push(new Paragraph({ 
        children: [new TextRun({ text: finding, size: 22 })],
        bullet: { level: 0 },
        spacing: { after: 150 },
      }));
    });
    
    sections.push(new Paragraph({ text: '', pageBreakBefore: true }));
    
    // ========== 2. FINANCIAL ASSUMPTIONS ==========
    sections.push(
      new Paragraph({
        text: '2. Financial Assumptions',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'The projections in this report are based on the assumptions detailed below. These include your current financial resources, expected retirement timeline, spending patterns, and economic assumptions about investment returns and inflation.',
            size: 22,
            color: '4B5563',
          }),
        ],
        spacing: { after: 400 },
      })
    );
    
    // Personal Details
    sections.push(
      new Paragraph({
        text: 'Personal Details',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              createTableCell('Current Age', { bold: true }),
              createTableCell(String(data.currentAge || 'N/A'), { alignment: AlignmentType.RIGHT }),
            ],
          }),
          new TableRow({
            children: [
              createTableCell('Retirement Age', { bold: true }),
              createTableCell(String(data.retirementAge || 'N/A'), { alignment: AlignmentType.RIGHT }),
            ],
          }),
          new TableRow({
            children: [
              createTableCell('Recipient Type', { bold: true }),
              createTableCell((data.pensionRecipientType || 'single').charAt(0).toUpperCase() + (data.pensionRecipientType || 'single').slice(1), { alignment: AlignmentType.RIGHT }),
            ],
          }),
          new TableRow({
            children: [
              createTableCell('Homeowner Status', { bold: true }),
              createTableCell(data.isHomeowner ? 'Yes' : 'No', { alignment: AlignmentType.RIGHT }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({ text: '', spacing: { after: 400 } })
    );
    
    // Financial Resources
    sections.push(
      new Paragraph({
        text: 'Financial Resources',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              createTableCell('Superannuation Balance', { bold: true }),
              createTableCell(formatCurrency(data.mainSuperBalance || 0), { alignment: AlignmentType.RIGHT }),
            ],
          }),
          new TableRow({
            children: [
              createTableCell('Sequencing Buffer', { bold: true }),
              createTableCell(formatCurrency(data.sequencingBuffer || 0), { alignment: AlignmentType.RIGHT }),
            ],
          }),
          new TableRow({
            children: [
              createTableCell('Total Portfolio', { bold: true }),
              createTableCell(formatCurrency(portfolioTotal), { bold: true, alignment: AlignmentType.RIGHT }),
            ],
          }),
          new TableRow({
            children: [
              createTableCell('Annual Pension Income', { bold: true }),
              createTableCell(formatCurrency(pensionIncome), { alignment: AlignmentType.RIGHT }),
            ],
          }),
          ...(data.enableCoupleTracking && data.partner1 && data.partner2 ? [
            new TableRow({
              children: [
                createTableCell(`  - ${data.partner1.name || 'Partner 1'} Pension`, { }),
                createTableCell(formatCurrency(data.partner1.pensionIncome || 0), { alignment: AlignmentType.RIGHT }),
              ],
            }),
            new TableRow({
              children: [
                createTableCell(`  - ${data.partner2.name || 'Partner 2'} Pension`, { }),
                createTableCell(formatCurrency(data.partner2.pensionIncome || 0), { alignment: AlignmentType.RIGHT }),
              ],
            }),
          ] : []),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({ text: '', spacing: { after: 400 } })
    );
    
    // Spending & Economic Assumptions
    sections.push(
      new Paragraph({
        text: 'Spending & Economic Assumptions',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      })
    );
    
    const assumptionRows = [
      new TableRow({
        children: [
          createTableCell('Annual Base Spending', { bold: true }),
          createTableCell(formatCurrency(annualSpending), { alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          createTableCell('Spending Pattern', { bold: true }),
          createTableCell((data.spendingPattern || 'constant').charAt(0).toUpperCase() + (data.spendingPattern || 'constant').slice(1), { alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          createTableCell('Expected Return', { bold: true }),
          createTableCell(formatPercent(data.selectedScenario || 0), { alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          createTableCell('Inflation Rate', { bold: true }),
          createTableCell(formatPercent(data.inflationRate || 2.5), { alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          createTableCell('Age Pension', { bold: true }),
          createTableCell(data.includeAgePension ? 'Included' : 'Excluded', { alignment: AlignmentType.RIGHT }),
        ],
      }),
    ];
    
    if (data.splurgeAmount && data.splurgeAmount > 0) {
      assumptionRows.push(
        new TableRow({
          children: [
            createTableCell('Splurge Spending', { bold: true }),
            createTableCell(`${formatCurrency(data.splurgeAmount)} for ${data.splurgeDuration || 0} years`, { alignment: AlignmentType.RIGHT }),
          ],
        })
      );
    }
    
    sections.push(
      new Table({
        rows: assumptionRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({ text: '', pageBreakBefore: true })
    );
    
    // ========== 3. PORTFOLIO PROJECTIONS ==========
    sections.push(
      new Paragraph({
        text: '3. Portfolio Projections',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'This section shows year-by-year projections of your portfolio balance, income, and spending throughout retirement. The constant return scenario provides a baseline planning path, assuming consistent investment returns and inflation.',
            size: 22,
            color: '4B5563',
          }),
        ],
        spacing: { after: 400 },
      })
    );
    
    // Always show Constant Return for portfolio projections
    const scenarioDescription = `Constant Return Projection (${formatPercent(data.selectedScenario || 0)} annual return, ${formatPercent(data.inflationRate || 2.5)} inflation)`;
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Scenario: ', bold: true, size: 22, color: '1E3A8A' }),
          new TextRun({ text: scenarioDescription, size: 22, color: '374151' }),
        ],
        spacing: { after: 400, before: 100 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 24, color: '3B82F6' },
        },
      })
    );
    
    if (constantReturnChartData.length > 0) {
      // Condensed view
      let selectedYears = constantReturnChartData;
      let condensed = false;
      
      if (constantReturnChartData.length > 25) {
        selectedYears = [
          ...constantReturnChartData.slice(0, 10),
          ...constantReturnChartData.slice(Math.floor(constantReturnChartData.length / 2) - 2, Math.floor(constantReturnChartData.length / 2) + 3),
          ...constantReturnChartData.slice(-10),
        ];
        condensed = true;
      }
      
      // Create projection table
      const projectionRows = [
        new TableRow({
          children: [
            createColoredCell('Year', '1E3A8A'),
            createColoredCell('Age', '1E3A8A'),
            createColoredCell('Total Balance', '1E3A8A'),
            createColoredCell('Income', '1E3A8A'),
            createColoredCell('Spending', '1E3A8A'),
          ],
        }),
      ];
      
      selectedYears.forEach((row: any) => {
        const balance = row['Total Balance'] || row.totalBalance || 0;
        const income = row['Income'] || row.income || 0;
        const spending = row['Spending'] || row.spending || 0;
        
        projectionRows.push(
          new TableRow({
            children: [
              createTableCell(String(row.year || ''), { alignment: AlignmentType.CENTER }),
              createTableCell(String(row.age || ''), { alignment: AlignmentType.CENTER }),
              createTableCell(typeof balance === 'number' ? formatCurrency(balance) : String(balance), { alignment: AlignmentType.RIGHT }),
              createTableCell(typeof income === 'number' ? formatCurrency(income) : String(income), { alignment: AlignmentType.RIGHT }),
              createTableCell(typeof spending === 'number' ? formatCurrency(spending) : String(spending), { alignment: AlignmentType.RIGHT }),
            ],
          })
        );
      });
      
      sections.push(
        new Table({
          rows: projectionRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      
      if (condensed) {
        sections.push(
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Note: Table shows representative years. Export detailed CSV for complete year-by-year data.', italics: true, size: 18 })],
            alignment: AlignmentType.CENTER,
          })
        );
      }
    } else {
      sections.push(new Paragraph({ text: 'No projection data available.' }));
    }
    
    sections.push(new Paragraph({ text: '', pageBreakBefore: true }));
    
    // ========== 4. RISK ANALYSIS ==========
    sections.push(
      new Paragraph({
        text: '4. Risk Analysis',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Monte Carlo analysis tests your retirement plan across 1,000 different market scenarios with randomized returns. This provides statistical confidence about the likelihood of your portfolio lasting throughout retirement, along with best-case, typical, and worst-case outcomes.',
            size: 22,
            color: '4B5563',
          }),
        ],
        spacing: { after: 400 },
      })
    );
    
    if (mcResults) {
      // Success Rate Banner
      sections.push(
        new Table({
          rows: [
            new TableRow({
              children: [createColoredCell(`Monte Carlo Success Rate: ${successRate.toFixed(1)}%\n${riskLevel.text}`, riskLevel.color)],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({ text: '', spacing: { after: 400 } })
      );
      
      // Interpretation
      sections.push(
        new Paragraph({
          text: 'What This Means',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        })
      );
      
      let interpretation = '';
      if (successRate >= 90) {
        interpretation = 'Excellent: Your portfolio is highly resilient across a wide range of market conditions.';
      } else if (successRate >= 80) {
        interpretation = 'Good: Your portfolio shows strong resilience in most market scenarios.';
      } else if (successRate >= 70) {
        interpretation = 'Moderate: Your portfolio succeeds in most scenarios but has meaningful risk in adverse conditions.';
      } else if (successRate >= 60) {
        interpretation = 'Caution: Your portfolio has significant risk of depletion in challenging markets.';
      } else {
        interpretation = 'High Risk: Your portfolio is likely to deplete prematurely in many scenarios.';
      }
      
      sections.push(
        new Paragraph({ text: interpretation }),
        new Paragraph({ text: '', spacing: { after: 200 } }),
        new Paragraph({ 
          text: `Out of 1,000 simulated retirement scenarios with varying market returns, ${Math.round(successRate * 10)} scenarios maintained sufficient funds through retirement while ${Math.round((100 - successRate) * 10)} scenarios depleted prematurely.`
        }),
        new Paragraph({ text: '', spacing: { after: 400 } })
      );
      
      // Percentile Analysis
      if (mcResults.percentiles) {
        sections.push(
          new Paragraph({
            text: 'Portfolio Balance at Retirement End (Percentiles)',
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        
        const percentileRows = [
          new TableRow({
            children: [
              createColoredCell('Percentile', '475569'),
              createColoredCell('Final Balance', '475569'),
              createColoredCell('Interpretation', '475569'),
            ],
          }),
        ];
        
        const pItems = [
          { key: 'p10', label: '10th', interp: 'Worst case (bottom 10%)' },
          { key: 'p25', label: '25th', interp: 'Below average' },
          { key: 'p50', label: '50th', interp: 'Median (typical outcome)' },
          { key: 'p75', label: '75th', interp: 'Above average' },
          { key: 'p90', label: '90th', interp: 'Best case (top 10%)' },
        ];
        
        pItems.forEach(item => {
          const value = mcResults.percentiles[item.key] || 0;
          percentileRows.push(
            new TableRow({
              children: [
                createTableCell(item.label),
                createTableCell(formatCurrency(value), { alignment: AlignmentType.RIGHT }),
                createTableCell(item.interp),
              ],
            })
          );
        });
        
        sections.push(
          new Table({
            rows: percentileRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
      }
    } else {
      sections.push(
        new Paragraph({ 
          text: 'No Monte Carlo analysis available. Run Monte Carlo simulation for comprehensive risk assessment.' 
        })
      );
    }
    
    sections.push(new Paragraph({ text: '', pageBreakBefore: true }));
    
    // ========== 5. RECOMMENDATIONS ==========
    sections.push(
      new Paragraph({
        text: '5. Recommendations',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Based on the analysis above, the following recommendations are provided to help optimize your retirement plan. Each recommendation includes the rationale and specific actions you can take. These are prioritized by importance, with high-priority items requiring immediate attention.',
            size: 22,
            color: '4B5563',
          }),
        ],
        spacing: { after: 400 },
      })
    );
    
    // Build recommendations
    const recommendations: Array<{ priority: string; color: string; title: string; rationale: string; action: string }> = [];
    
    if (withdrawalRate > 5) {
      recommendations.push({
        priority: 'HIGH PRIORITY',
        color: 'EF4444',
        title: `Reduce withdrawal rate from ${withdrawalRate.toFixed(1)}% to 4-5%`,
        rationale: 'Current withdrawal rate significantly exceeds the 4% safe withdrawal guideline, increasing risk of portfolio depletion.',
        action: `Consider reducing annual spending by ${formatCurrency(annualSpending - (portfolioTotal * 0.04) - pensionIncome)} or increasing portfolio balance.`,
      });
    } else if (withdrawalRate > 4) {
      recommendations.push({
        priority: 'MEDIUM PRIORITY',
        color: 'F59E0B',
        title: `Monitor withdrawal rate of ${withdrawalRate.toFixed(1)}%`,
        rationale: 'Withdrawal rate is slightly above the conservative 4% guideline but within acceptable range.',
        action: 'Consider modest spending reductions or portfolio growth strategies if markets underperform.',
      });
    }
    
    if (mcResults) {
      if (successRate < 70) {
        recommendations.push({
          priority: 'HIGH PRIORITY',
          color: 'EF4444',
          title: `Improve success rate from ${successRate.toFixed(1)}%`,
          rationale: 'Less than 70% success rate indicates significant risk of portfolio failure.',
          action: 'Options: (1) Reduce spending, (2) Delay retirement, (3) Increase savings, (4) Review asset allocation for better risk-adjusted returns.',
        });
      } else if (successRate < 85) {
        recommendations.push({
          priority: 'MEDIUM PRIORITY',
          color: 'F59E0B',
          title: 'Strengthen portfolio resilience',
          rationale: `Success rate of ${successRate.toFixed(1)}% is adequate but could be improved for greater security.`,
          action: 'Consider modest adjustments to spending or contributions to reach 85%+ success rate target.',
        });
      }
    }
    
    recommendations.push({
      priority: 'MEDIUM PRIORITY',
      color: 'F59E0B',
      title: 'Maintain age-appropriate asset allocation',
      rationale: 'Balanced portfolios typically target 60-70% growth assets (shares) with 30-40% defensive (bonds/cash) for retirees.',
      action: 'Review your current allocation with a financial adviser to ensure it matches your risk tolerance and time horizon.',
    });
    
    const sequencingBuffer = data.sequencingBuffer || 0;
    if (sequencingBuffer < annualSpending * 2) {
      recommendations.push({
        priority: 'MEDIUM PRIORITY',
        color: 'F59E0B',
        title: 'Increase sequencing buffer',
        rationale: `Current buffer of ${formatCurrency(sequencingBuffer)} provides less than 2 years of spending protection.`,
        action: `Consider increasing buffer to ${formatCurrency(annualSpending * 2)} (2 years of expenses) to protect against early market downturns.`,
      });
    }
    
    if (!data.includeAgePension) {
      recommendations.push({
        priority: 'LOW PRIORITY',
        color: '10B981',
        title: 'Consider Age Pension eligibility',
        rationale: 'Age Pension provides valuable inflation-indexed income that reduces portfolio drawdown.',
        action: 'Check eligibility using Services Australia online estimator. Even partial pension entitlement can improve portfolio longevity.',
      });
    }
    
    // Display recommendations
    recommendations.forEach((rec, index) => {
      sections.push(
        new Table({
          rows: [
            new TableRow({
              children: [createColoredCell(rec.priority, rec.color)],
            }),
          ],
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({ text: '', spacing: { after: 100 } }),
        new Paragraph({
          children: [new TextRun({ text: `${index + 1}. ${rec.title}`, bold: true, size: 24 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Rationale: ', bold: true, italics: true }),
            new TextRun({ text: rec.rationale, italics: true }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Recommended Action: ', bold: true, italics: true }),
            new TextRun({ text: rec.action, italics: true }),
          ],
          spacing: { after: 300 },
        })
      );
    });
    
    sections.push(
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Professional Advice: ', bold: true }),
          new TextRun({ text: 'These recommendations are based on the assumptions and projections in this report. Consult with a licensed financial adviser to develop a personalized strategy that considers your complete financial situation, goals, and risk tolerance.' }),
        ],
      }),
      new Paragraph({ text: '', pageBreakBefore: true })
    );
    
    // ========== 6. SCENARIO DETAILS ==========
    sections.push(
      new Paragraph({
        text: '6. Scenario Details',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'This section provides additional detail on the scenarios tested, including one-off expenses, test results across multiple market conditions, and the methodology used in the calculations.',
            size: 22,
            color: '4B5563',
          }),
        ],
        spacing: { after: 400 },
      })
    );
    
    // One-off expenses
    const activeExpenses = oneOffExpenses.filter((e: any) => e.amount > 0);
    if (activeExpenses.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Planned One-Off Expenses',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        })
      );
      
      const expenseRows = [
        new TableRow({
          children: [
            createColoredCell('Description', '475569'),
            createColoredCell('Age', '475569'),
            createColoredCell('Amount', '475569'),
          ],
        }),
      ];
      
      activeExpenses.forEach((expense: any) => {
        expenseRows.push(
          new TableRow({
            children: [
              createTableCell(expense.description || 'N/A'),
              createTableCell(String(expense.age || 'N/A'), { alignment: AlignmentType.CENTER }),
              createTableCell(formatCurrency(expense.amount || 0), { alignment: AlignmentType.RIGHT }),
            ],
          })
        );
      });
      
      sections.push(
        new Table({
          rows: expenseRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({ text: '', spacing: { after: 400 } })
      );
    }
    
    // ========== TEST SCENARIO RESULTS ==========
    const hasTestResults = data.formalTestResults || chartData.length > 0 || mcResults;
    if (hasTestResults) {
      sections.push(
        new Paragraph({
          text: 'Test Scenario Results',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: 'Your retirement plan has been tested against multiple market scenarios to assess resilience.',
          spacing: { after: 300 },
        })
      );
      
      // Summary table of all scenarios
      const scenarioRows = [
        new TableRow({
          children: [
            createColoredCell('Scenario', '1E3A8A'),
            createColoredCell('Description', '1E3A8A'),
            createColoredCell('Result', '1E3A8A'),
            createColoredCell('Details', '1E3A8A'),
          ],
        }),
      ];
      
      // Monte Carlo scenario
      if (mcResults) {
        const successRate = mcResults.successRate || 0;
        const passed = successRate >= 70; // 70% threshold for "passed"
        
        scenarioRows.push(
          new TableRow({
            children: [
              createTableCell('Monte Carlo Simulation', { bold: true }),
              createTableCell('1,000 scenarios with randomized returns'),
              createTableCell(
                passed ? 'Passed ✓' : 'Failed ✗',
                { 
                  alignment: AlignmentType.CENTER,
                  bold: true,
                  color: passed ? '166534' : 'B91C1C', // Dark green or dark red
                  shading: { fill: passed ? 'E8F5E9' : 'FFEBEE', type: ShadingType.SOLID }
                }
              ),
              createTableCell(`${successRate.toFixed(1)}% success rate`, { alignment: AlignmentType.RIGHT }),
            ],
          })
        );
      }
      
      // Historical Monte Carlo scenario
      if (data.historicalMonteCarloResults && !mcResults) {
        const successRate = data.historicalMonteCarloResults.successRate || 0;
        const passed = successRate >= 70;
        
        scenarioRows.push(
          new TableRow({
            children: [
              createTableCell('Historical Monte Carlo', { bold: true }),
              createTableCell('1,000 scenarios using historical returns (1928-2025)'),
              createTableCell(
                passed ? 'Passed ✓' : 'Failed ✗',
                { 
                  alignment: AlignmentType.CENTER,
                  bold: true,
                  color: passed ? '166534' : 'B91C1C',
                  shading: { fill: passed ? 'E8F5E9' : 'FFEBEE', type: ShadingType.SOLID }
                }
              ),
              createTableCell(`${successRate.toFixed(1)}% success rate`, { alignment: AlignmentType.RIGHT }),
            ],
          })
        );
      }
      
      // Constant Return scenario
      if (chartData.length > 0) {
        const finalYear = chartData[chartData.length - 1];
        const finalBalance = finalYear['Total Balance'] || finalYear.totalBalance || 0;
        const passed = finalBalance > 0;
        
        scenarioRows.push(
          new TableRow({
            children: [
              createTableCell('Constant Return', { bold: true }),
              createTableCell(`${formatPercent(data.selectedScenario || 0)} annual return with ${formatPercent(data.inflationRate || 2.5)} inflation`),
              createTableCell(
                passed ? 'Passed ✓' : 'Failed ✗',
                { 
                  alignment: AlignmentType.CENTER,
                  bold: true,
                  color: passed ? '166534' : 'B91C1C',
                  shading: { fill: passed ? 'E8F5E9' : 'FFEBEE', type: ShadingType.SOLID }
                }
              ),
              createTableCell(`Final: ${formatCurrency(finalBalance)}`, { alignment: AlignmentType.RIGHT }),
            ],
          })
        );
      }
      
      // Formal stress test scenarios
      if (data.formalTestResults) {
        const formalTests = [
          { key: 'A1', name: 'A1: Base Case', desc: '5% return baseline test' },
          { key: 'A2', name: 'A2: Low Returns', desc: '3.5% return structural test' },
          { key: 'B1', name: 'B1: Market Crash', desc: 'Immediate crash then recovery' },
          { key: 'B2', name: 'B2: Bear Market', desc: '10 years zero return' },
          { key: 'B3', name: 'B3: High Volatility', desc: 'High volatility with 5% average' },
          { key: 'C1', name: 'C1: High Inflation', desc: '5% CPI entire period' },
          { key: 'D1', name: 'D1: Extreme Longevity', desc: 'Survival to age 105' },
          { key: 'G1', name: 'G1: Health Shock', desc: '$30k/year from age 75' },
          { key: 'H1', name: 'H1: Worst Case', desc: 'Crash + High CPI + Health shock' },
        ];
        
        formalTests.forEach(test => {
          const result = data.formalTestResults[test.key];
          if (result) {
            const passed = result.passed || false;
            const finalBalance = result.finalBalance || 0;
            
            scenarioRows.push(
              new TableRow({
                children: [
                  createTableCell(test.name, { bold: true }),
                  createTableCell(test.desc),
                  createTableCell(
                    passed ? 'Passed ✓' : 'Failed ✗',
                    { 
                      alignment: AlignmentType.CENTER,
                      bold: true,
                      color: passed ? '166534' : 'B91C1C',
                      shading: { fill: passed ? 'E8F5E9' : 'FFEBEE', type: ShadingType.SOLID }
                    }
                  ),
                  createTableCell(`Final: ${formatCurrency(finalBalance)}`, { alignment: AlignmentType.RIGHT }),
                ],
              })
            );
          }
        });
      }
      
      sections.push(
        new Table({
          rows: scenarioRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({ text: '', spacing: { after: 300 } })
      );
      
      // Monte Carlo detailed analysis
      if (mcResults) {
        sections.push(
          new Paragraph({
            text: 'Monte Carlo Analysis',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Success Rate: ', bold: true }),
              new TextRun({ text: `${successRate.toFixed(1)}% of 1,000 simulations maintained sufficient funds` }),
            ],
            spacing: { after: 100 },
          })
        );
        
        if (mcResults.percentiles) {
          sections.push(
            new Paragraph({
              text: 'Portfolio outcomes across simulations:',
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: `  • 10th percentile (worst 10%): ${formatCurrency(mcResults.percentiles.p10 || 0)}`,
              spacing: { after: 0 },
              indent: { left: 200 },
            }),
            new Paragraph({
              text: `  • Median (typical outcome): ${formatCurrency(mcResults.percentiles.p50 || 0)}`,
              spacing: { after: 0 },
              indent: { left: 200 },
            }),
            new Paragraph({
              text: `  • 90th percentile (best 10%): ${formatCurrency(mcResults.percentiles.p90 || 0)}`,
              spacing: { after: 200 },
              indent: { left: 200 },
            })
          );
        }
      }
      
      // Summary interpretation for stress tests
      if (data.formalTestResults) {
        const allResults = Object.values(data.formalTestResults) as any[];
        const passedCount = allResults.filter((r: any) => r.passed).length;
        const totalCount = allResults.length;
        
        sections.push(
          new Paragraph({
            text: 'Stress Test Summary',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Results: ', bold: true }),
              new TextRun({ text: `${passedCount} of ${totalCount} stress tests passed` }),
            ],
            spacing: { after: 100 },
          })
        );
        
        // Interpretation
        let interpretation = '';
        if (passedCount === totalCount) {
          interpretation = 'Excellent: Your portfolio demonstrates exceptional resilience, surviving even the worst historical market conditions including the Great Depression.';
        } else if (passedCount >= totalCount * 0.75) {
          interpretation = 'Strong: Your portfolio shows good resilience, passing most stress tests. Consider reviewing strategies to strengthen protection against the most severe scenarios.';
        } else if (passedCount >= totalCount * 0.5) {
          interpretation = 'Moderate: Your portfolio passes some stress tests but may be vulnerable in severe market downturns. Consider increasing your buffer or reducing spending.';
        } else {
          interpretation = 'Caution: Your portfolio struggles in most stress test scenarios. Strongly consider increasing your financial resources or reducing planned spending.';
        }
        
        sections.push(
          new Paragraph({
            text: interpretation,
            spacing: { after: 200 },
          })
        );
        
        // Detailed results for each test
        sections.push(
          new Paragraph({
            text: 'Detailed Stress Test Results',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
        
        const formalTests = [
          { key: 'A1', name: 'A1: Base Case (5% return)' },
          { key: 'A2', name: 'A2: Low Returns (3.5%)' },
          { key: 'B1', name: 'B1: Market Crash' },
          { key: 'B2', name: 'B2: Bear Market (10 years zero return)' },
          { key: 'B3', name: 'B3: High Volatility' },
          { key: 'C1', name: 'C1: High Inflation (5% CPI)' },
          { key: 'D1', name: 'D1: Extreme Longevity (to age 105)' },
          { key: 'G1', name: 'G1: Health Shock ($30k/year)' },
          { key: 'H1', name: 'H1: Worst Case Scenario' },
        ];
        
        formalTests.forEach(test => {
          const result = data.formalTestResults[test.key];
          if (result) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${test.name}: `, bold: true }),
                  new TextRun({ 
                    text: result.passed ? 'PASSED ✓' : 'FAILED ✗',
                    bold: true,
                    color: result.passed ? '22C55E' : 'EF4444',
                  }),
                ],
                bullet: { level: 0 },
              }),
              new Paragraph({
                text: `  Final balance: ${formatCurrency(result.finalBalance)}`,
                spacing: { after: 0 },
                indent: { left: 400 },
              }),
              new Paragraph({
                text: `  Portfolio lasted: ${result.yearsLasted} of ${result.targetYears} years`,
                spacing: { after: 100 },
                indent: { left: 400 },
              })
            );
          }
        });
      }
      
      sections.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    }
    
    // Methodology
    sections.push(
      new Paragraph({
        text: 'Calculation Methodology',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
      new Paragraph({ text: 'This analysis uses a year-by-year projection model that accounts for:' }),
      new Paragraph({ text: '', spacing: { after: 100 } })
    );
    
    const methodologyPoints = [
      'Investment returns (with optional stochastic variation via Monte Carlo)',
      'Inflation effects on spending and Age Pension',
      'Minimum superannuation drawdown requirements',
      'Australian Age Pension asset and income tests',
      'Dynamic spending adjustments based on selected pattern',
      'Sequencing risk buffer to protect against early market downturns',
    ];
    
    methodologyPoints.forEach(point => {
      sections.push(new Paragraph({ text: point, bullet: { level: 0 } }));
    });
    
    sections.push(
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({ 
        text: 'Monte Carlo simulations run 1,000 scenarios with randomized annual returns based on your expected return and volatility inputs, providing statistical confidence intervals for outcomes.' 
      })
    );
    
    // Create the document with professional styling
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 22, // 11pt
            },
            paragraph: {
              spacing: {
                line: 276, // 1.15 line spacing
                after: 200,
              },
            },
          },
          heading1: {
            run: {
              font: 'Calibri Light',
              size: 32, // 16pt
              bold: true,
              color: '1E3A8A', // Navy blue
            },
            paragraph: {
              spacing: {
                before: 480,
                after: 240,
              },
            },
          },
          heading2: {
            run: {
              font: 'Calibri',
              size: 28, // 14pt
              bold: true,
              color: '2563EB', // Medium blue
            },
            paragraph: {
              spacing: {
                before: 360,
                after: 180,
              },
            },
          },
          heading3: {
            run: {
              font: 'Calibri',
              size: 24, // 12pt
              bold: true,
              color: '475569', // Slate gray
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: sections,
      }],
    });
    
    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Convert Buffer to Uint8Array for Next.js compatibility
    const uint8Array = new Uint8Array(buffer);
    
    // Return document
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="retirement-plan-${new Date().toISOString().split('T')[0]}.docx"`,
      },
    });
    
  } catch (error) {
    console.error('DOCX generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
