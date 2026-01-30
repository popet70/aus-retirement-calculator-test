import {
  calculateAnnualSpending,
  checkGuardrailStatus,
  calculateWithdrawalRate,
} from '../lib/calculations/spending';

describe('Spending Calculations', () => {
  describe('calculateAnnualSpending', () => {
    const baseSpending = 100000;

    describe('Constant spending pattern', () => {
      it('should return base spending with no adjustments', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 65,
          spendingPattern: 'constant',
        });

        expect(spending).toBe(baseSpending);
      });

      it('should remain constant across all ages', () => {
        const spending65 = calculateAnnualSpending({
          baseSpending,
          age: 65,
          spendingPattern: 'constant',
        });

        const spending85 = calculateAnnualSpending({
          baseSpending,
          age: 85,
          spendingPattern: 'constant',
        });

        expect(spending65).toBe(spending85);
      });
    });

    describe('JPMorgan spending pattern', () => {
      it('should reduce spending with age', () => {
        const spending65 = calculateAnnualSpending({
          baseSpending,
          age: 65,
          spendingPattern: 'jpmorgan',
        });

        const spending85 = calculateAnnualSpending({
          baseSpending,
          age: 85,
          spendingPattern: 'jpmorgan',
        });

        expect(spending85).toBeLessThan(spending65);
      });

      it('should not exceed base spending at age 60', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 60,
          spendingPattern: 'jpmorgan',
        });

        expect(spending).toBeLessThanOrEqual(baseSpending);
      });

      it('should reduce to approximately 65% by age 100', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 100,
          spendingPattern: 'jpmorgan',
        });

        expect(spending).toBeCloseTo(baseSpending * 0.65, -3);
      });
    });

    describe('Guardrails', () => {
      const guardrailParams = {
        useGuardrails: true,
        upperGuardrail: 20,
        lowerGuardrail: 15,
        guardrailAdjustment: 10,
      };

      it('should increase spending when portfolio exceeds upper guardrail', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 65,
          spendingPattern: 'constant',
          guardrailParams,
          portfolioValue: 1200000, // 120% of initial
          initialPortfolioValue: 1000000,
        });

        expect(spending).toBe(baseSpending * 1.1); // 10% increase
      });

      it('should decrease spending when portfolio falls below lower guardrail', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 65,
          spendingPattern: 'constant',
          guardrailParams,
          portfolioValue: 800000, // 80% of initial
          initialPortfolioValue: 1000000,
        });

        expect(spending).toBe(baseSpending * 0.9); // 10% decrease
      });

      it('should maintain base spending within guardrails', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 65,
          spendingPattern: 'constant',
          guardrailParams,
          portfolioValue: 950000, // 95% of initial
          initialPortfolioValue: 1000000,
        });

        expect(spending).toBe(baseSpending);
      });

      it('should not apply guardrails when disabled', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 65,
          spendingPattern: 'constant',
          guardrailParams: { ...guardrailParams, useGuardrails: false },
          portfolioValue: 1200000,
          initialPortfolioValue: 1000000,
        });

        expect(spending).toBe(baseSpending);
      });
    });

    describe('Splurge spending', () => {
      const splurgeParams = {
        splurgeAmount: 20000,
        splurgeStartAge: 65,
        splurgeDuration: 5,
        splurgeRampDownYears: 0,
      };

      it('should add splurge amount during splurge period', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 67, // Within splurge period
          spendingPattern: 'constant',
          splurgeParams,
          splurgeActive: true,
        });

        expect(spending).toBe(baseSpending + splurgeParams.splurgeAmount);
      });

      it('should not add splurge before splurge period', () => {
        const spending = calculateAnnualSpending({
          baseSpending,
          age: 64, // Before splurge
          spendingPattern: 'constant',
          splurgeParams,
          splurgeActive: false,
        });

        expect(spending).toBe(baseSpending);
      });

      it('should ramp down splurge when specified', () => {
        const rampDownSplurge = {
          ...splurgeParams,
          splurgeRampDownYears: 2,
        };

        const spending = calculateAnnualSpending({
          baseSpending,
          age: 69, // First year of ramp down (age 65-69 = 5 year duration, last 2 years ramp)
          spendingPattern: 'constant',
          splurgeParams: rampDownSplurge,
          splurgeActive: true,
        });

        // Should be between base and base + full splurge
        expect(spending).toBeGreaterThan(baseSpending);
        expect(spending).toBeLessThan(baseSpending + rampDownSplurge.splurgeAmount);
      });
    });

    describe('Combined adjustments', () => {
      it('should apply both age pattern and guardrails', () => {
        const guardrailParams = {
          useGuardrails: true,
          upperGuardrail: 20,
          lowerGuardrail: 15,
          guardrailAdjustment: 10,
        };

        const spending = calculateAnnualSpending({
          baseSpending,
          age: 85, // Age reduces spending
          spendingPattern: 'jpmorgan',
          guardrailParams,
          portfolioValue: 1200000, // Guardrail increases spending
          initialPortfolioValue: 1000000,
        });

        // Should be affected by both adjustments
        expect(spending).toBeLessThan(baseSpending * 1.1); // Age effect reduces it
        expect(spending).toBeGreaterThan(baseSpending * 0.7); // Guardrail effect increases it
      });
    });
  });

  describe('checkGuardrailStatus', () => {
    const guardrailParams = {
      useGuardrails: true,
      upperGuardrail: 20,
      lowerGuardrail: 15,
      guardrailAdjustment: 10,
    };

    it('should return upper when above upper guardrail', () => {
      const status = checkGuardrailStatus(1200000, 1000000, guardrailParams);
      expect(status).toBe('upper');
    });

    it('should return lower when below lower guardrail', () => {
      const status = checkGuardrailStatus(800000, 1000000, guardrailParams);
      expect(status).toBe('lower');
    });

    it('should return neutral within guardrails', () => {
      const status = checkGuardrailStatus(950000, 1000000, guardrailParams);
      expect(status).toBe('neutral');
    });

    it('should return neutral when guardrails disabled', () => {
      const status = checkGuardrailStatus(
        1200000,
        1000000,
        { ...guardrailParams, useGuardrails: false }
      );
      expect(status).toBe('neutral');
    });
  });

  describe('calculateWithdrawalRate', () => {
    it('should calculate correct withdrawal rate', () => {
      const rate = calculateWithdrawalRate(40000, 1000000);
      expect(rate).toBe(4);
    });

    it('should handle zero portfolio', () => {
      const rate = calculateWithdrawalRate(40000, 0);
      expect(rate).toBe(0);
    });

    it('should calculate rate for high spending', () => {
      const rate = calculateWithdrawalRate(100000, 1000000);
      expect(rate).toBe(10);
    });

    it('should handle fractional percentages', () => {
      const rate = calculateWithdrawalRate(37500, 1000000);
      expect(rate).toBeCloseTo(3.75, 2);
    });
  });
});
