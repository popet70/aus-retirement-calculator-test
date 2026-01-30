import {
  calculateAgePension,
  isEligibleForAgePension,
  getAssetCutoffThreshold,
  getPensionAssetSensitivity,
} from '../lib/calculations/agePension';
import { AGE_PENSION_THRESHOLDS } from '../lib/data/constants';

describe('Age Pension Calculations', () => {
  describe('calculateAgePension', () => {
    describe('Single homeowner', () => {
      it('should return full pension when assets below threshold', () => {
        const pension = calculateAgePension({
          totalBalance: 250000,
          pensionIncome: 0,
          isHomeowner: true,
          pensionRecipientType: 'single',
        });

        expect(pension).toBe(AGE_PENSION_THRESHOLDS.single.maxRate);
      });

      it('should return zero when assets well above cutoff', () => {
        const pension = calculateAgePension({
          totalBalance: 1500000,
          pensionIncome: 0,
          isHomeowner: true,
          pensionRecipientType: 'single',
        });

        expect(pension).toBe(0);
      });

      it('should taper pension correctly for mid-range assets', () => {
        const pension = calculateAgePension({
          totalBalance: 400000,
          pensionIncome: 0,
          isHomeowner: true,
          pensionRecipientType: 'single',
        });

        // Should be less than full pension but greater than zero
        expect(pension).toBeGreaterThan(0);
        expect(pension).toBeLessThan(AGE_PENSION_THRESHOLDS.single.maxRate);

        // Calculate expected taper
        const excessAssets = 400000 - AGE_PENSION_THRESHOLDS.single.assetThresholdHomeowner;
        const expectedReduction = excessAssets * AGE_PENSION_THRESHOLDS.single.assetTaperRate;
        const expectedPension = AGE_PENSION_THRESHOLDS.single.maxRate - expectedReduction;

        expect(pension).toBeCloseTo(expectedPension, 2);
      });
    });

    describe('Couple homeowner', () => {
      it('should return full pension when assets below threshold', () => {
        const pension = calculateAgePension({
          totalBalance: 400000,
          pensionIncome: 0,
          isHomeowner: true,
          pensionRecipientType: 'couple',
        });

        expect(pension).toBe(AGE_PENSION_THRESHOLDS.couple.maxRate);
      });

      it('should return zero when assets exceed cutoff', () => {
        const pension = calculateAgePension({
          totalBalance: 2000000,
          pensionIncome: 0,
          isHomeowner: true,
          pensionRecipientType: 'couple',
        });

        expect(pension).toBe(0);
      });

      it('should apply correct taper rate', () => {
        const pension = calculateAgePension({
          totalBalance: 600000,
          pensionIncome: 0,
          isHomeowner: true,
          pensionRecipientType: 'couple',
        });

        const excessAssets = 600000 - AGE_PENSION_THRESHOLDS.couple.assetThresholdHomeowner;
        const expectedReduction = excessAssets * AGE_PENSION_THRESHOLDS.couple.assetTaperRate;
        const expectedPension = AGE_PENSION_THRESHOLDS.couple.maxRate - expectedReduction;

        expect(pension).toBeCloseTo(expectedPension, 2);
      });
    });

    describe('Income test', () => {
      it('should reduce pension based on income over threshold', () => {
        const pensionWithNoIncome = calculateAgePension({
          totalBalance: 250000,
          pensionIncome: 0,
          isHomeowner: true,
          pensionRecipientType: 'single',
        });

        const pensionWithIncome = calculateAgePension({
          totalBalance: 250000,
          pensionIncome: 30000,
          isHomeowner: true,
          pensionRecipientType: 'single',
        });

        // Pension should be lower with income
        expect(pensionWithIncome).toBeLessThan(pensionWithNoIncome);
      });

      it('should use lower of asset test and income test', () => {
        // Scenario where income test is more restrictive
        const pension = calculateAgePension({
          totalBalance: 250000, // Low assets (pass asset test easily)
          pensionIncome: 50000, // High income (fail income test)
          isHomeowner: true,
          pensionRecipientType: 'single',
        });

        // Should be zero or very low due to income test
        expect(pension).toBeLessThan(AGE_PENSION_THRESHOLDS.single.maxRate / 2);
      });
    });

    describe('Non-homeowner', () => {
      it('should use higher asset threshold for non-homeowners', () => {
        const assets = 350000;

        const homeownerPension = calculateAgePension({
          totalBalance: assets,
          pensionIncome: 0,
          isHomeowner: true,
          pensionRecipientType: 'single',
        });

        const nonHomeownerPension = calculateAgePension({
          totalBalance: assets,
          pensionIncome: 0,
          isHomeowner: false,
          pensionRecipientType: 'single',
        });

        // Non-homeowner should get more pension with same assets
        expect(nonHomeownerPension).toBeGreaterThan(homeownerPension);
      });
    });
  });

  describe('isEligibleForAgePension', () => {
    it('should return true when eligible', () => {
      const eligible = isEligibleForAgePension({
        totalBalance: 300000,
        pensionIncome: 10000,
        isHomeowner: true,
        pensionRecipientType: 'couple',
      });

      expect(eligible).toBe(true);
    });

    it('should return false when not eligible', () => {
      const eligible = isEligibleForAgePension({
        totalBalance: 2000000,
        pensionIncome: 0,
        isHomeowner: true,
        pensionRecipientType: 'couple',
      });

      expect(eligible).toBe(false);
    });
  });

  describe('getAssetCutoffThreshold', () => {
    it('should calculate correct cutoff for couple homeowner', () => {
      const cutoff = getAssetCutoffThreshold(true, 'couple');
      
      // Cutoff = threshold + (maxRate / taperRate)
      const expectedCutoff = 
        AGE_PENSION_THRESHOLDS.couple.assetThresholdHomeowner +
        (AGE_PENSION_THRESHOLDS.couple.maxRate / AGE_PENSION_THRESHOLDS.couple.assetTaperRate);

      expect(cutoff).toBeCloseTo(expectedCutoff, 0);
    });

    it('should be higher for non-homeowners', () => {
      const homeownerCutoff = getAssetCutoffThreshold(true, 'single');
      const nonHomeownerCutoff = getAssetCutoffThreshold(false, 'single');

      expect(nonHomeownerCutoff).toBeGreaterThan(homeownerCutoff);
    });
  });

  describe('getPensionAssetSensitivity', () => {
    it('should return correct taper rate', () => {
      const sensitivity = getPensionAssetSensitivity('couple');
      expect(sensitivity).toBe(AGE_PENSION_THRESHOLDS.couple.assetTaperRate);
    });

    it('should be same for both recipient types', () => {
      const singleSensitivity = getPensionAssetSensitivity('single');
      const coupleSensitivity = getPensionAssetSensitivity('couple');
      
      // Both should be 0.003 (current Centrelink rate)
      expect(singleSensitivity).toBe(coupleSensitivity);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero assets', () => {
      const pension = calculateAgePension({
        totalBalance: 0,
        pensionIncome: 0,
        isHomeowner: true,
        pensionRecipientType: 'single',
      });

      expect(pension).toBe(AGE_PENSION_THRESHOLDS.single.maxRate);
    });

    it('should never return negative pension', () => {
      const pension = calculateAgePension({
        totalBalance: 10000000,
        pensionIncome: 200000,
        isHomeowner: true,
        pensionRecipientType: 'couple',
      });

      expect(pension).toBeGreaterThanOrEqual(0);
    });

    it('should handle assets exactly at threshold', () => {
      const pension = calculateAgePension({
        totalBalance: AGE_PENSION_THRESHOLDS.couple.assetThresholdHomeowner,
        pensionIncome: 0,
        isHomeowner: true,
        pensionRecipientType: 'couple',
      });

      expect(pension).toBe(AGE_PENSION_THRESHOLDS.couple.maxRate);
    });
  });
});
