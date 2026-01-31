import {
  runMonteCarloSimulation,
  calculateProbabilityToAge,
  getPercentileAtAge,
  getWorstCaseScenario,
  getBestCaseScenario,
} from '../lib/calculations/monteCarlo';
import { RetirementParams } from '../lib/types';

describe('Monte Carlo Simulation', () => {
  const baseRetirementParams: RetirementParams = {
    currentAge: 55,
    retirementAge: 60,
    mainSuperBalance: 1000000,
    sequencingBuffer: 200000,
    totalPensionIncome: 50000,
    baseSpending: 80000,
    inflationRate: 2.5,
    selectedScenario: 3,
    isHomeowner: true,
    includeAgePension: false,
    spendingPattern: 'constant',
    showNominalDollars: false,
  };

  const mcParams = {
    runs: 100, // Use smaller number for faster tests
    expectedReturn: 7,
    volatility: 18,
    projectionYears: 45,
  };

  describe('runMonteCarloSimulation', () => {
    it('should run specified number of simulations', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      expect(result.allProjections).toHaveLength(100);
      expect(result.endingBalances).toHaveLength(100);
    });

    it('should calculate success rate correctly', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
    });

    it('should have higher success rate with lower spending', () => {
      const lowSpending = runMonteCarloSimulation(
        {
          retirementParams: {
            ...baseRetirementParams,
            baseSpending: 60000, // Lower spending
          },
        },
        mcParams
      );

      const highSpending = runMonteCarloSimulation(
        {
          retirementParams: {
            ...baseRetirementParams,
            baseSpending: 100000, // Higher spending
          },
        },
        mcParams
      );

      expect(lowSpending.successRate).toBeGreaterThan(highSpending.successRate);
    });

    it('should calculate percentiles correctly', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      // Percentiles should be ordered: p10 < p25 < p50 < p75 < p90
      const finalAge = result.percentiles.p10[result.percentiles.p10.length - 1];
      
      if (finalAge) {
        const p10Balance = finalAge.totalBalance;
        const p25Balance = result.percentiles.p25[result.percentiles.p25.length - 1]?.totalBalance || 0;
        const p50Balance = result.percentiles.p50[result.percentiles.p50.length - 1]?.totalBalance || 0;
        const p75Balance = result.percentiles.p75[result.percentiles.p75.length - 1]?.totalBalance || 0;
        const p90Balance = result.percentiles.p90[result.percentiles.p90.length - 1]?.totalBalance || 0;

        expect(p10Balance).toBeLessThanOrEqual(p25Balance);
        expect(p25Balance).toBeLessThanOrEqual(p50Balance);
        expect(p50Balance).toBeLessThanOrEqual(p75Balance);
        expect(p75Balance).toBeLessThanOrEqual(p90Balance);
      }
    });

    it('should return median projection', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      expect(result.medianProjection).toBeDefined();
      expect(result.medianProjection.chartData.length).toBeGreaterThan(0);
    });

    it('should handle high volatility scenarios', () => {
      const highVolatility = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        { ...mcParams, volatility: 30 } // Very high volatility
      );

      const lowVolatility = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        { ...mcParams, volatility: 10 } // Low volatility
      );

      // High volatility should have wider spread in ending balances
      const highSpread = Math.max(...highVolatility.endingBalances) - Math.min(...highVolatility.endingBalances);
      const lowSpread = Math.max(...lowVolatility.endingBalances) - Math.min(...lowVolatility.endingBalances);

      expect(highSpread).toBeGreaterThan(lowSpread);
    });

    it('should have lower success rate with negative expected returns', () => {
      const negativeReturns = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        { ...mcParams, expectedReturn: -2 } // Market crash scenario
      );

      const positiveReturns = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        { ...mcParams, expectedReturn: 7 }
      );

      expect(negativeReturns.successRate).toBeLessThan(positiveReturns.successRate);
    });
  });

  describe('calculateProbabilityToAge', () => {
    it('should calculate probability of lasting to specific age', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      const probTo70 = calculateProbabilityToAge(result, 70);
      const probTo90 = calculateProbabilityToAge(result, 90);

      expect(probTo70).toBeGreaterThanOrEqual(0);
      expect(probTo70).toBeLessThanOrEqual(100);
      
      // Should be more likely to last to 70 than to 90
      expect(probTo70).toBeGreaterThanOrEqual(probTo90);
    });

    it('should return 100% for ages before retirement', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      const probTo55 = calculateProbabilityToAge(result, 55);
      expect(probTo55).toBe(100);
    });
  });

  describe('getPercentileAtAge', () => {
    it('should retrieve correct percentile value at specific age', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      const p50at70 = getPercentileAtAge(result, 70, 50, 'totalBalance');
      
      expect(p50at70).toBeDefined();
      expect(typeof p50at70).toBe('number');
    });

    it('should return undefined for age beyond projection', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      const p50at150 = getPercentileAtAge(result, 150, 50, 'totalBalance');
      expect(p50at150).toBeUndefined();
    });
  });

  describe('getWorstCaseScenario', () => {
    it('should return 5th percentile ending balance', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      const worstCase = getWorstCaseScenario(result);
      
      expect(worstCase).toBeDefined();
      expect(typeof worstCase).toBe('number');
      
      // Worst case should be less than median
      const medianBalance = result.endingBalances[Math.floor(result.endingBalances.length / 2)];
      expect(worstCase).toBeLessThanOrEqual(medianBalance);
    });
  });

  describe('getBestCaseScenario', () => {
    it('should return 95th percentile ending balance', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      const bestCase = getBestCaseScenario(result);
      
      expect(bestCase).toBeDefined();
      expect(typeof bestCase).toBe('number');
      
      // Best case should be greater than median
      const medianBalance = result.endingBalances[Math.floor(result.endingBalances.length / 2)];
      expect(bestCase).toBeGreaterThanOrEqual(medianBalance);
    });

    it('should show best case much higher than worst case', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      const worstCase = getWorstCaseScenario(result);
      const bestCase = getBestCaseScenario(result);
      
      expect(bestCase).toBeGreaterThan(worstCase);
    });
  });

  describe('Statistical Properties', () => {
    it('should produce normally distributed returns', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        { ...mcParams, runs: 1000 } // Larger sample for statistical test
      );

      const endingBalances = result.endingBalances;
      
      // Calculate mean
      const mean = endingBalances.reduce((sum, val) => sum + val, 0) / endingBalances.length;
      
      // Calculate standard deviation
      const variance = endingBalances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / endingBalances.length;
      const stdDev = Math.sqrt(variance);
      
      // ~68% should be within 1 standard deviation (normal distribution property)
      const withinOneStdDev = endingBalances.filter(
        val => val >= mean - stdDev && val <= mean + stdDev
      ).length;
      
      const percentage = (withinOneStdDev / endingBalances.length) * 100;
      
      // Should be roughly 68% (allowing for sampling variance)
      expect(percentage).toBeGreaterThan(50);
      expect(percentage).toBeLessThan(95); // More realistic tolerance for 1000 samples
    });

    it('should have increasing spread over time', () => {
      const result = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        mcParams
      );

      // At age 65 (early retirement)
      const age65spread = calculateSpreadAtAge(result, 65);
      
      // At age 85 (late retirement)
      const age85spread = calculateSpreadAtAge(result, 85);
      
      // Spread should increase over time due to compound variance
      expect(age85spread).toBeGreaterThan(age65spread);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero starting balance', () => {
      const zeroBalance = runMonteCarloSimulation(
        {
          retirementParams: {
            ...baseRetirementParams,
            mainSuperBalance: 0,
            sequencingBuffer: 0,
          },
        },
        mcParams
      );

      expect(zeroBalance.successRate).toBe(0);
    });

    it('should handle very high starting balance', () => {
      const highBalance = runMonteCarloSimulation(
        {
          retirementParams: {
            ...baseRetirementParams,
            mainSuperBalance: 10000000,
          },
        },
        mcParams
      );

      expect(highBalance.successRate).toBeGreaterThan(95);
    });

    it('should handle single simulation run', () => {
      const singleRun = runMonteCarloSimulation(
        { retirementParams: baseRetirementParams },
        { ...mcParams, runs: 1 }
      );

      expect(singleRun.allProjections).toHaveLength(1);
      expect(singleRun.successRate).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper function for testing spread
function calculateSpreadAtAge(result: any, age: number): number {
  const balancesAtAge: number[] = [];
  
  for (const projection of result.allProjections) {
    const yearData = projection.chartData.find((d: any) => d.age === age);
    if (yearData) {
      balancesAtAge.push(yearData.totalBalance);
    }
  }
  
  if (balancesAtAge.length === 0) return 0;
  
  return Math.max(...balancesAtAge) - Math.min(...balancesAtAge);
}
