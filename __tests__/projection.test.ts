import {
  calculateRetirementProjection,
  isProjectionSuccessful,
  getPortfolioExhaustionAge,
  calculateSuccessRate,
} from '../lib/calculations/projection';
import { RetirementParams } from '../lib/types';

describe('Retirement Projection', () => {
  const baseParams: RetirementParams = {
    currentAge: 55,
    retirementAge: 60,
    mainSuperBalance: 1000000,
    sequencingBuffer: 200000,
    totalPensionIncome: 50000,
    baseSpending: 80000,
    inflationRate: 2.5,
    selectedScenario: 3, // Balanced (7%)
    isHomeowner: true,
    includeAgePension: false,
    spendingPattern: 'constant',
    showNominalDollars: false,
  };

  describe('calculateRetirementProjection', () => {
    it('should generate projection data for all ages', () => {
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
      });

      expect(result.chartData.length).toBeGreaterThan(0);
      expect(result.chartData[0].age).toBe(55);
    });

    it('should not run out of money in balanced scenario', () => {
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
      });

      const finalBalance = result.chartData[result.chartData.length - 1].totalBalance;
      expect(finalBalance).toBeGreaterThan(0);
    });

    it('should run out of money with excessive spending', () => {
      const highSpendingParams = {
        ...baseParams,
        baseSpending: 200000, // Unsustainable
      };

      const result = calculateRetirementProjection({
        retirementParams: highSpendingParams,
      });

      const finalBalance = result.chartData[result.chartData.length - 1].totalBalance;
      expect(finalBalance).toBeLessThanOrEqual(0);
    });

    it('should apply age pension when enabled', () => {
      const withAgePension = {
        ...baseParams,
        includeAgePension: true,
        mainSuperBalance: 400000, // Low enough to qualify
      };

      const result = calculateRetirementProjection({
        retirementParams: withAgePension,
      });

      // Find first retirement year
      const firstRetiredYear = result.chartData.find(
        d => d.age >= withAgePension.retirementAge
      );

      expect(firstRetiredYear?.agePension).toBeGreaterThan(0);
    });

    it('should track portfolio components separately', () => {
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
      });

      const firstYear = result.chartData[0];
      
      expect(firstYear.mainSuper).toBeGreaterThan(0);
      expect(firstYear.buffer).toBeGreaterThan(0);
      expect(firstYear.totalBalance).toBe(
        firstYear.mainSuper + firstYear.buffer + firstYear.cash
      );
    });

    it('should apply market returns correctly', () => {
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
      });

      // Portfolio should grow before retirement (no withdrawals yet)
      const preRetirement = result.chartData.filter(d => d.age < baseParams.retirementAge);
      
      if (preRetirement.length > 1) {
        const firstBalance = preRetirement[0].totalBalance;
        const lastPreRetirementBalance = preRetirement[preRetirement.length - 1].totalBalance;
        
        // Should grow with 7% returns
        expect(lastPreRetirementBalance).toBeGreaterThan(firstBalance);
      }
    });

    it('should handle custom return sequence', () => {
      const customReturns = [10, -20, 30, 5, 7]; // Volatile returns
      
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
        returns: customReturns,
      });

      // Should use custom returns
      expect(result.chartData[0].marketReturn).toBe(10);
      expect(result.chartData[1].marketReturn).toBe(-20);
      expect(result.chartData[2].marketReturn).toBe(30);
    });

    it('should respect nominal vs real dollars setting', () => {
      const nominal = calculateRetirementProjection({
        retirementParams: baseParams,
        showNominalDollars: true,
      });

      const real = calculateRetirementProjection({
        retirementParams: baseParams,
        showNominalDollars: false,
      });

      // Nominal values should be higher in later years due to inflation
      const nominalLater = nominal.chartData[nominal.chartData.length - 1];
      const realLater = real.chartData[real.chartData.length - 1];

      expect(nominalLater.spending).toBeGreaterThan(realLater.spending);
    });

    it('should include one-off expenses in spending', () => {
      const oneOffExpenses = [
        { description: 'Car', age: 65, amount: 50000 },
      ];

      const withoutExpense = calculateRetirementProjection({
        retirementParams: baseParams,
      });

      const withExpense = calculateRetirementProjection({
        retirementParams: baseParams,
        oneOffExpenses,
      });

      const age65Without = withoutExpense.chartData.find(d => d.age === 65);
      const age65With = withExpense.chartData.find(d => d.age === 65);

      expect(age65With?.spending).toBeGreaterThan(age65Without?.spending || 0);
    });

    it('should withdraw from buffer before super', () => {
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
      });

      // Find first year of withdrawal
      const firstRetiredYear = result.chartData.find(
        d => d.age >= baseParams.retirementAge
      );
      const nextYear = result.chartData.find(
        d => d.age === baseParams.retirementAge + 1
      );

      if (firstRetiredYear && nextYear) {
        // Buffer should decline first
        expect(nextYear.buffer).toBeLessThan(firstRetiredYear.buffer);
      }
    });
  });

  describe('isProjectionSuccessful', () => {
    it('should return true when projection has positive ending balance', () => {
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
      });

      expect(isProjectionSuccessful(result)).toBe(true);
    });

    it('should return false when projection runs out of money', () => {
      const failParams = {
        ...baseParams,
        baseSpending: 250000,
      };

      const result = calculateRetirementProjection({
        retirementParams: failParams,
      });

      expect(isProjectionSuccessful(result)).toBe(false);
    });
  });

  describe('getPortfolioExhaustionAge', () => {
    it('should return null when portfolio lasts', () => {
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
      });

      const exhaustionAge = getPortfolioExhaustionAge(result);
      expect(exhaustionAge).toBeNull();
    });

    it('should return correct age when portfolio runs out', () => {
      const failParams = {
        ...baseParams,
        mainSuperBalance: 200000,
        sequencingBuffer: 50000,
        baseSpending: 100000,
      };

      const result = calculateRetirementProjection({
        retirementParams: failParams,
      });

      const exhaustionAge = getPortfolioExhaustionAge(result);
      
      expect(exhaustionAge).not.toBeNull();
      expect(exhaustionAge).toBeGreaterThan(failParams.retirementAge);
      expect(exhaustionAge).toBeLessThan(100);
    });
  });

  describe('calculateSuccessRate', () => {
    it('should calculate 100% success for all successful projections', () => {
      const projections = [
        calculateRetirementProjection({ retirementParams: baseParams }),
        calculateRetirementProjection({ retirementParams: baseParams }),
        calculateRetirementProjection({ retirementParams: baseParams }),
      ];

      const successRate = calculateSuccessRate(projections);
      expect(successRate).toBe(100);
    });

    it('should calculate 0% success for all failed projections', () => {
      const failParams = {
        ...baseParams,
        baseSpending: 250000,
      };

      const projections = [
        calculateRetirementProjection({ retirementParams: failParams }),
        calculateRetirementProjection({ retirementParams: failParams }),
        calculateRetirementProjection({ retirementParams: failParams }),
      ];

      const successRate = calculateSuccessRate(projections);
      expect(successRate).toBe(0);
    });

    it('should calculate partial success rate', () => {
      const successParams = baseParams;
      const failParams = { ...baseParams, baseSpending: 250000 };

      const projections = [
        calculateRetirementProjection({ retirementParams: successParams }),
        calculateRetirementProjection({ retirementParams: failParams }),
        calculateRetirementProjection({ retirementParams: successParams }),
        calculateRetirementProjection({ retirementParams: failParams }),
      ];

      const successRate = calculateSuccessRate(projections);
      expect(successRate).toBe(50);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero starting balance', () => {
      const zeroParams = {
        ...baseParams,
        mainSuperBalance: 0,
        sequencingBuffer: 0,
      };

      const result = calculateRetirementProjection({
        retirementParams: zeroParams,
      });

      expect(result.chartData.length).toBeGreaterThan(0);
      expect(result.chartData[0].totalBalance).toBe(0);
    });

    it('should handle negative returns', () => {
      const negativeReturns = [-10, -5, -15, -20];
      
      const result = calculateRetirementProjection({
        retirementParams: baseParams,
        returns: negativeReturns,
      });

      // Should still generate valid projection
      expect(result.chartData.length).toBeGreaterThan(0);
    });

    it('should handle retirement age equal to current age', () => {
      const immediateRetirement = {
        ...baseParams,
        currentAge: 60,
        retirementAge: 60,
      };

      const result = calculateRetirementProjection({
        retirementParams: immediateRetirement,
      });

      expect(result.chartData[0].age).toBe(60);
      expect(result.chartData[0].spending).toBeGreaterThan(0);
    });
  });
});
