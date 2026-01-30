import {
  formatCurrency,
  formatPercentage,
  clamp,
  getSpendingMultiplier,
  calculatePercentile,
  compoundGrowth,
  adjustForInflation,
  calculateLoanPayment,
} from '../lib/utils/helpers';

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(1234567)).toBe('$1,234,567');
    });

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000');
    });

    it('should round to nearest dollar', () => {
      expect(formatCurrency(1000.49)).toBe('$1,000');
      expect(formatCurrency(1000.51)).toBe('$1,001');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });
  });

  describe('formatPercentage', () => {
    it('should format with default 1 decimal', () => {
      expect(formatPercentage(5.5)).toBe('5.5%');
      expect(formatPercentage(10)).toBe('10.0%');
    });

    it('should format with custom decimals', () => {
      expect(formatPercentage(5.555, 2)).toBe('5.55%');
      expect(formatPercentage(5.555, 0)).toBe('6%');
    });
  });

  describe('clamp', () => {
    it('should clamp values above max', () => {
      expect(clamp(150, 0, 100)).toBe(100);
    });

    it('should clamp values below min', () => {
      expect(clamp(-50, 0, 100)).toBe(0);
    });

    it('should not clamp values within range', () => {
      expect(clamp(50, 0, 100)).toBe(50);
    });

    it('should handle equal min and max', () => {
      expect(clamp(50, 100, 100)).toBe(100);
    });
  });

  describe('getSpendingMultiplier', () => {
    const ages = [60, 70, 80, 90];
    const multipliers = [1.0, 0.9, 0.8, 0.7];

    it('should return first multiplier for age at or below minimum', () => {
      expect(getSpendingMultiplier(55, ages, multipliers)).toBe(1.0);
      expect(getSpendingMultiplier(60, ages, multipliers)).toBe(1.0);
    });

    it('should return last multiplier for age at or above maximum', () => {
      expect(getSpendingMultiplier(90, ages, multipliers)).toBe(0.7);
      expect(getSpendingMultiplier(95, ages, multipliers)).toBe(0.7);
    });

    it('should interpolate between points', () => {
      // At age 65 (midpoint between 60 and 70)
      const result = getSpendingMultiplier(65, ages, multipliers);
      expect(result).toBeCloseTo(0.95, 2); // Midpoint between 1.0 and 0.9
    });

    it('should handle exact age matches', () => {
      expect(getSpendingMultiplier(70, ages, multipliers)).toBe(0.9);
      expect(getSpendingMultiplier(80, ages, multipliers)).toBe(0.8);
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate median (50th percentile)', () => {
      const data = [1, 2, 3, 4, 5];
      expect(calculatePercentile(data, 50)).toBe(3);
    });

    it('should calculate 25th percentile', () => {
      const data = [1, 2, 3, 4, 5];
      expect(calculatePercentile(data, 25)).toBe(2);
    });

    it('should calculate 75th percentile', () => {
      const data = [1, 2, 3, 4, 5];
      expect(calculatePercentile(data, 75)).toBe(4);
    });

    it('should interpolate between values', () => {
      const data = [1, 2, 3, 4];
      const result = calculatePercentile(data, 50);
      expect(result).toBeCloseTo(2.5, 1);
    });

    it('should handle single value', () => {
      expect(calculatePercentile([5], 50)).toBe(5);
    });

    it('should handle empty array', () => {
      expect(calculatePercentile([], 50)).toBe(0);
    });
  });

  describe('compoundGrowth', () => {
    it('should calculate simple compound growth', () => {
      // $100,000 at 7% for 10 years
      const result = compoundGrowth(100000, 7, 10);
      expect(result).toBeCloseTo(196715.14, 2);
    });

    it('should handle zero growth rate', () => {
      expect(compoundGrowth(100000, 0, 10)).toBe(100000);
    });

    it('should handle negative growth', () => {
      const result = compoundGrowth(100000, -5, 2);
      expect(result).toBeLessThan(100000);
    });

    it('should handle zero years', () => {
      expect(compoundGrowth(100000, 7, 0)).toBe(100000);
    });
  });

  describe('adjustForInflation', () => {
    it('should increase amount by inflation', () => {
      // $100,000 with 2.5% inflation over 10 years
      const result = adjustForInflation(100000, 2.5, 10);
      expect(result).toBeCloseTo(128008.45, 2);
    });

    it('should handle zero inflation', () => {
      expect(adjustForInflation(100000, 0, 10)).toBe(100000);
    });

    it('should handle zero years', () => {
      expect(adjustForInflation(100000, 2.5, 0)).toBe(100000);
    });
  });

  describe('calculateLoanPayment', () => {
    it('should calculate correct monthly payment', () => {
      // $200,000 loan at 5% for 10 years
      const monthlyPayment = calculateLoanPayment(200000, 5, 10);
      expect(monthlyPayment).toBeCloseTo(2121.31, 2);
    });

    it('should handle zero interest rate', () => {
      // Should just divide principal by number of months
      const monthlyPayment = calculateLoanPayment(120000, 0, 10);
      expect(monthlyPayment).toBeCloseTo(1000, 2);
    });

    it('should calculate higher payment for shorter term', () => {
      const payment10yr = calculateLoanPayment(200000, 5, 10);
      const payment5yr = calculateLoanPayment(200000, 5, 5);
      
      expect(payment5yr).toBeGreaterThan(payment10yr);
    });

    it('should calculate higher payment for higher rate', () => {
      const payment5pct = calculateLoanPayment(200000, 5, 10);
      const payment7pct = calculateLoanPayment(200000, 7, 10);
      
      expect(payment7pct).toBeGreaterThan(payment5pct);
    });
  });

  describe('Edge cases and robustness', () => {
    it('should handle very large numbers', () => {
      const result = compoundGrowth(1000000000, 5, 20);
      expect(result).toBeGreaterThan(1000000000);
      expect(isFinite(result)).toBe(true);
    });

    it('should handle very small numbers', () => {
      const result = adjustForInflation(0.01, 2.5, 10);
      expect(result).toBeGreaterThan(0);
      expect(isFinite(result)).toBe(true);
    });

    it('should not produce NaN for valid inputs', () => {
      expect(isNaN(clamp(50, 0, 100))).toBe(false);
      expect(isNaN(compoundGrowth(100, 5, 10))).toBe(false);
      expect(isNaN(calculatePercentile([1, 2, 3], 50))).toBe(false);
    });
  });
});
