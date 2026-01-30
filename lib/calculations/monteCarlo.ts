import { ProjectionOptions, calculateRetirementProjection } from './projection';
import { ProjectionResult, YearlyData } from '../types';
import { randomNormal, calculatePercentile } from '../utils/helpers';

export interface MonteCarloParams {
  runs: number;
  expectedReturn: number;
  volatility: number;
  projectionYears: number;
}

export interface MonteCarloResult {
  successRate: number;
  percentiles: {
    p10: YearlyData[];
    p25: YearlyData[];
    p50: YearlyData[];
    p75: YearlyData[];
    p90: YearlyData[];
  };
  medianProjection: ProjectionResult;
  allProjections: ProjectionResult[];
  endingBalances: number[];
}

/**
 * Run Monte Carlo simulation with random returns
 * 
 * Generates multiple retirement scenarios using normally-distributed
 * random returns to assess probability of success.
 */
export function runMonteCarloSimulation(
  baseOptions: ProjectionOptions,
  mcParams: MonteCarloParams
): MonteCarloResult {
  const { runs, expectedReturn, volatility, projectionYears } = mcParams;
  
  const allProjections: ProjectionResult[] = [];
  const endingBalances: number[] = [];
  
  // Run multiple simulations
  for (let run = 0; run < runs; run++) {
    // Generate random return sequence
    const returns = generateRandomReturns(
      projectionYears,
      expectedReturn,
      volatility
    );
    
    // Run projection with this return sequence
    const projection = calculateRetirementProjection({
      ...baseOptions,
      returns,
    });
    
    allProjections.push(projection);
    
    // Record ending balance
    const endingBalance = projection.chartData[projection.chartData.length - 1]?.totalBalance || 0;
    endingBalances.push(endingBalance);
  }
  
  // Calculate success rate
  const successfulRuns = endingBalances.filter(balance => balance > 0).length;
  const successRate = (successfulRuns / runs) * 100;
  
  // Calculate percentiles
  const percentiles = calculateMonteCarloPercentiles(allProjections);
  
  // Find median projection
  const sortedByEndingBalance = [...allProjections].sort((a, b) => {
    const balanceA = a.chartData[a.chartData.length - 1]?.totalBalance || 0;
    const balanceB = b.chartData[b.chartData.length - 1]?.totalBalance || 0;
    return balanceA - balanceB;
  });
  
  const medianProjection = sortedByEndingBalance[Math.floor(runs / 2)];
  
  return {
    successRate,
    percentiles,
    medianProjection,
    allProjections,
    endingBalances: endingBalances.sort((a, b) => a - b),
  };
}

/**
 * Generate random return sequence using normal distribution
 */
function generateRandomReturns(
  years: number,
  meanReturn: number,
  volatility: number
): number[] {
  const returns: number[] = [];
  
  for (let i = 0; i < years; i++) {
    const randomReturn = randomNormal(meanReturn, volatility);
    returns.push(randomReturn);
  }
  
  return returns;
}

/**
 * Calculate percentile trajectories across all simulations
 * 
 * For each year, finds the 10th, 25th, 50th, 75th, and 90th percentile
 * portfolio balance across all simulations.
 */
function calculateMonteCarloPercentiles(
  projections: ProjectionResult[]
): MonteCarloResult['percentiles'] {
  if (projections.length === 0) {
    throw new Error('No projections to analyze');
  }
  
  // Find maximum projection length
  const maxLength = Math.max(...projections.map(p => p.chartData.length));
  
  // Initialize percentile arrays
  const p10: YearlyData[] = [];
  const p25: YearlyData[] = [];
  const p50: YearlyData[] = [];
  const p75: YearlyData[] = [];
  const p90: YearlyData[] = [];
  
  // For each year, calculate percentiles across all simulations
  for (let yearIndex = 0; yearIndex < maxLength; yearIndex++) {
    const balancesThisYear: number[] = [];
    const spendingThisYear: number[] = [];
    const incomeThisYear: number[] = [];
    
    // Collect data from all projections for this year
    for (const projection of projections) {
      if (yearIndex < projection.chartData.length) {
        const yearData = projection.chartData[yearIndex];
        balancesThisYear.push(yearData.totalBalance);
        spendingThisYear.push(yearData.spending);
        incomeThisYear.push(yearData.income);
      }
    }
    
    if (balancesThisYear.length === 0) continue;
    
    // Sort for percentile calculation
    balancesThisYear.sort((a, b) => a - b);
    spendingThisYear.sort((a, b) => a - b);
    incomeThisYear.sort((a, b) => a - b);
    
    // Get reference year data (from first projection)
    const referenceYear = projections[0].chartData[yearIndex];
    
    // Calculate percentiles
    p10.push({
      ...referenceYear,
      totalBalance: calculatePercentile(balancesThisYear, 10),
      spending: calculatePercentile(spendingThisYear, 10),
      income: calculatePercentile(incomeThisYear, 10),
    });
    
    p25.push({
      ...referenceYear,
      totalBalance: calculatePercentile(balancesThisYear, 25),
      spending: calculatePercentile(spendingThisYear, 25),
      income: calculatePercentile(incomeThisYear, 25),
    });
    
    p50.push({
      ...referenceYear,
      totalBalance: calculatePercentile(balancesThisYear, 50),
      spending: calculatePercentile(spendingThisYear, 50),
      income: calculatePercentile(incomeThisYear, 50),
    });
    
    p75.push({
      ...referenceYear,
      totalBalance: calculatePercentile(balancesThisYear, 75),
      spending: calculatePercentile(spendingThisYear, 75),
      income: calculatePercentile(incomeThisYear, 75),
    });
    
    p90.push({
      ...referenceYear,
      totalBalance: calculatePercentile(balancesThisYear, 90),
      spending: calculatePercentile(spendingThisYear, 90),
      income: calculatePercentile(incomeThisYear, 90),
    });
  }
  
  return { p10, p25, p50, p75, p90 };
}

/**
 * Calculate probability of portfolio lasting to a specific age
 */
export function calculateProbabilityToAge(
  mcResult: MonteCarloResult,
  targetAge: number
): number {
  let successCount = 0;
  
  for (const projection of mcResult.allProjections) {
    const dataAtAge = projection.chartData.find(d => d.age === targetAge);
    if (dataAtAge && dataAtAge.totalBalance > 0) {
      successCount++;
    }
  }
  
  return (successCount / mcResult.allProjections.length) * 100;
}

/**
 * Get percentile value for a specific metric at a specific age
 */
export function getPercentileAtAge(
  mcResult: MonteCarloResult,
  age: number,
  percentile: 10 | 25 | 50 | 75 | 90,
  metric: keyof YearlyData
): number | undefined {
  const key = `p${percentile}` as keyof MonteCarloResult['percentiles'];
  const data = mcResult.percentiles[key];
  const yearData = data.find(d => d.age === age);
  return yearData?.[metric] as number | undefined;
}

/**
 * Calculate worst-case scenario (5th percentile ending balance)
 */
export function getWorstCaseScenario(mcResult: MonteCarloResult): number {
  return calculatePercentile(mcResult.endingBalances, 5);
}

/**
 * Calculate best-case scenario (95th percentile ending balance)
 */
export function getBestCaseScenario(mcResult: MonteCarloResult): number {
  return calculatePercentile(mcResult.endingBalances, 95);
}
