/**
 * Couple Tracking Utility Functions Tests
 * 
 * Tests for the utility functions in lib/utils/coupleTracking.ts
 */

import { 
  getLifeExpectancy, 
  calculateAgePensionForCouple,
  calculateReversionaryPension,
  createDefaultPartner,
  LIFE_EXPECTANCY_TABLES,
  AGE_PENSION_RATES,
} from '@/lib/utils/coupleTracking';

describe('Life Expectancy Calculations', () => {
  
  it('should return correct life expectancy for exact age matches', () => {
    expect(getLifeExpectancy(55, 'male')).toBe(85.2);
    expect(getLifeExpectancy(60, 'male')).toBe(85.6);
    expect(getLifeExpectancy(65, 'male')).toBe(86.1);
    
    expect(getLifeExpectancy(55, 'female')).toBe(88.3);
    expect(getLifeExpectancy(60, 'female')).toBe(88.6);
    expect(getLifeExpectancy(65, 'female')).toBe(89.0);
  });
  
  it('should interpolate for ages between brackets', () => {
    // Age 57.5 is halfway between 55 (85.2) and 60 (85.6)
    // Expected: 85.2 + 0.5 * (85.6 - 85.2) = 85.4
    const result = getLifeExpectancy(57.5, 'male');
    expect(result).toBeCloseTo(85.4, 1);
  });
  
  it('should handle ages below minimum bracket', () => {
    // Age 50 is below 55, should return 55's value
    expect(getLifeExpectancy(50, 'male')).toBe(85.2);
    expect(getLifeExpectancy(50, 'female')).toBe(88.3);
  });
  
  it('should handle ages above maximum bracket', () => {
    // Age 85 is above 80, should return 80's value
    expect(getLifeExpectancy(85, 'male')).toBe(89.8);
    expect(getLifeExpectancy(85, 'female')).toBe(92.0);
  });
  
  it('should show females live longer than males', () => {
    const maleLife = getLifeExpectancy(65, 'male');
    const femaleLife = getLifeExpectancy(65, 'female');
    
    expect(femaleLife).toBeGreaterThan(maleLife);
    expect(femaleLife - maleLife).toBeCloseTo(2.9, 1); // ~3 year difference
  });
});

describe('Age Pension for Couples', () => {
  
  describe('Both Partners Alive', () => {
    
    it('should return full couple rate when assets below threshold', () => {
      const pension = calculateAgePensionForCouple({
        partner1Alive: true,
        partner2Alive: true,
        totalAssets: 400000, // Below couple threshold
        totalIncome: 0,
        isHomeowner: true,
      });
      
      expect(pension).toBe(AGE_PENSION_RATES.couple.maxRate); // ~$45,952
    });
    
    it('should reduce pension based on asset test when over threshold', () => {
      const pension = calculateAgePensionForCouple({
        partner1Alive: true,
        partner2Alive: true,
        totalAssets: 551500, // $100k over couple threshold ($451,500)
        totalIncome: 0,
        isHomeowner: true,
      });
      
      // $100k excess = 100 * $3/fortnight * 26 fortnights = $7,800 reduction
      const expectedReduction = 100 * 3 * 26; // $7,800
      const expectedPension = AGE_PENSION_RATES.couple.maxRate - expectedReduction;
      
      expect(pension).toBe(expectedPension);
    });
    
    it('should return zero when assets far exceed threshold', () => {
      const pension = calculateAgePensionForCouple({
        partner1Alive: true,
        partner2Alive: true,
        totalAssets: 2000000, // Very high assets
        totalIncome: 0,
        isHomeowner: true,
      });
      
      expect(pension).toBe(0);
    });
    
    it('should use non-homeowner threshold when not homeowner', () => {
      // Just below non-homeowner threshold
      const pension = calculateAgePensionForCouple({
        partner1Alive: true,
        partner2Alive: true,
        totalAssets: 693000, // Below non-homeowner threshold ($693,500)
        totalIncome: 0,
        isHomeowner: false,
      });
      
      expect(pension).toBe(AGE_PENSION_RATES.couple.maxRate);
    });
  });
  
  describe('One Partner Deceased', () => {
    
    it('should return full single rate when assets below threshold (partner 1 alive)', () => {
      const pension = calculateAgePensionForCouple({
        partner1Alive: true,
        partner2Alive: false, // Deceased
        totalAssets: 250000, // Below single threshold
        totalIncome: 0,
        isHomeowner: true,
      });
      
      expect(pension).toBe(AGE_PENSION_RATES.single.maxRate); // ~$29,754
    });
    
    it('should return full single rate when assets below threshold (partner 2 alive)', () => {
      const pension = calculateAgePensionForCouple({
        partner1Alive: false, // Deceased
        partner2Alive: true,
        totalAssets: 250000,
        totalIncome: 0,
        isHomeowner: true,
      });
      
      expect(pension).toBe(AGE_PENSION_RATES.single.maxRate);
    });
    
    it('should reduce pension based on asset test for singles', () => {
      const pension = calculateAgePensionForCouple({
        partner1Alive: true,
        partner2Alive: false,
        totalAssets: 351750, // $50k over single threshold ($301,750)
        totalIncome: 0,
        isHomeowner: true,
      });
      
      // $50k excess = 50 * $3/fortnight * 26 fortnights = $3,900 reduction
      const expectedReduction = 50 * 3 * 26; // $3,900
      const expectedPension = AGE_PENSION_RATES.single.maxRate - expectedReduction;
      
      expect(pension).toBe(expectedPension);
    });
    
    it('should return zero for single when assets far exceed threshold', () => {
      const pension = calculateAgePensionForCouple({
        partner1Alive: true,
        partner2Alive: false,
        totalAssets: 1500000,
        totalIncome: 0,
        isHomeowner: true,
      });
      
      expect(pension).toBe(0);
    });
  });
  
  describe('Both Partners Deceased', () => {
    
    it('should return zero when both deceased', () => {
      const pension = calculateAgePensionForCouple({
        partner1Alive: false,
        partner2Alive: false,
        totalAssets: 500000,
        totalIncome: 0,
        isHomeowner: true,
      });
      
      expect(pension).toBe(0);
    });
  });
  
  describe('Rate Comparison', () => {
    
    it('should show single rate is higher than half couple rate', () => {
      const singleRate = AGE_PENSION_RATES.single.maxRate;
      const halfCoupleRate = AGE_PENSION_RATES.couple.maxRate / 2;
      
      // Singles get more per person than couples
      expect(singleRate).toBeGreaterThan(halfCoupleRate);
    });
  });
});

describe('Reversionary Pension Calculations', () => {
  
  it('should calculate 67% reversionary rate correctly (PSS default)', () => {
    const originalPension = 101000;
    const reversionaryRate = 67;
    
    const result = calculateReversionaryPension(originalPension, reversionaryRate);
    
    expect(result).toBe(67670); // 67% of $101,000
  });
  
  it('should calculate 50% reversionary rate', () => {
    const originalPension = 80000;
    const reversionaryRate = 50;
    
    const result = calculateReversionaryPension(originalPension, reversionaryRate);
    
    expect(result).toBe(40000);
  });
  
  it('should calculate 100% reversionary rate', () => {
    const originalPension = 60000;
    const reversionaryRate = 100;
    
    const result = calculateReversionaryPension(originalPension, reversionaryRate);
    
    expect(result).toBe(60000);
  });
  
  it('should handle 0% reversionary rate (no continuation)', () => {
    const originalPension = 90000;
    const reversionaryRate = 0;
    
    const result = calculateReversionaryPension(originalPension, reversionaryRate);
    
    expect(result).toBe(0);
  });
  
  it('should handle decimal results correctly', () => {
    const originalPension = 100000;
    const reversionaryRate = 66.67;
    
    const result = calculateReversionaryPension(originalPension, reversionaryRate);
    
    expect(result).toBeCloseTo(66670, 0);
  });
});

describe('Create Default Partner', () => {
  
  it('should create default male partner with correct values', () => {
    const partner = createDefaultPartner('John', 55, 'male');
    
    expect(partner.name).toBe('John');
    expect(partner.currentAge).toBe(55);
    expect(partner.gender).toBe('male');
    expect(partner.retirementAge).toBe(60);
    expect(partner.superBalance).toBe(0);
    expect(partner.pensionIncome).toBe(0);
    expect(partner.reversionaryRate).toBe(67);
    expect(partner.preRetirementIncome).toBe(0);
    expect(partner.deathAge).toBe(Math.round(getLifeExpectancy(55, 'male'))); // ~85
  });
  
  it('should create default female partner with correct values', () => {
    const partner = createDefaultPartner('Jane', 53, 'female');
    
    expect(partner.name).toBe('Jane');
    expect(partner.currentAge).toBe(53);
    expect(partner.gender).toBe('female');
    expect(partner.retirementAge).toBe(60);
    expect(partner.superBalance).toBe(0);
    expect(partner.pensionIncome).toBe(0);
    expect(partner.reversionaryRate).toBe(67);
    expect(partner.preRetirementIncome).toBe(0);
    expect(partner.deathAge).toBe(Math.round(getLifeExpectancy(53, 'female'))); // ~88
  });
  
  it('should calculate different death ages for males vs females', () => {
    const male = createDefaultPartner('Male', 60, 'male');
    const female = createDefaultPartner('Female', 60, 'female');
    
    // Females live longer
    expect(female.deathAge).toBeGreaterThan(male.deathAge);
  });
  
  it('should use 67% as default reversionary rate (PSS standard)', () => {
    const partner = createDefaultPartner('Test', 60, 'male');
    
    expect(partner.reversionaryRate).toBe(67);
  });
  
  it('should use 60 as default retirement age', () => {
    const partner = createDefaultPartner('Test', 55, 'male');
    
    expect(partner.retirementAge).toBe(60);
  });
  
  it('should round death age to nearest integer', () => {
    const partner = createDefaultPartner('Test', 57, 'male');
    
    // Life expectancy might be 85.4, should round to 85
    expect(Number.isInteger(partner.deathAge)).toBe(true);
  });
});

describe('Life Expectancy Tables Constants', () => {
  
  it('should have valid life expectancy tables', () => {
    expect(LIFE_EXPECTANCY_TABLES.male).toBeDefined();
    expect(LIFE_EXPECTANCY_TABLES.female).toBeDefined();
  });
  
  it('should have life expectancies in reasonable range', () => {
    const maleAges = Object.values(LIFE_EXPECTANCY_TABLES.male);
    const femaleAges = Object.values(LIFE_EXPECTANCY_TABLES.female);
    
    // All should be between 80 and 95 (reasonable for Australia)
    maleAges.forEach(age => {
      expect(age).toBeGreaterThanOrEqual(80);
      expect(age).toBeLessThanOrEqual(95);
    });
    
    femaleAges.forEach(age => {
      expect(age).toBeGreaterThanOrEqual(80);
      expect(age).toBeLessThanOrEqual(95);
    });
  });
  
  it('should show life expectancy increases with starting age (survivor bias)', () => {
    const male55 = LIFE_EXPECTANCY_TABLES.male[55];
    const male80 = LIFE_EXPECTANCY_TABLES.male[80];
    
    // Older starting age = higher expected death age (survivor effect)
    expect(male80).toBeGreaterThan(male55);
  });
});

describe('Age Pension Rates Constants', () => {
  
  it('should have valid couple rates', () => {
    expect(AGE_PENSION_RATES.couple.maxRate).toBeGreaterThan(0);
    expect(AGE_PENSION_RATES.couple.assetTestThreshold.homeowner).toBeGreaterThan(0);
    expect(AGE_PENSION_RATES.couple.assetTestThreshold.nonHomeowner).toBeGreaterThan(0);
  });
  
  it('should have valid single rates', () => {
    expect(AGE_PENSION_RATES.single.maxRate).toBeGreaterThan(0);
    expect(AGE_PENSION_RATES.single.assetTestThreshold.homeowner).toBeGreaterThan(0);
    expect(AGE_PENSION_RATES.single.assetTestThreshold.nonHomeowner).toBeGreaterThan(0);
  });
  
  it('should have non-homeowner thresholds higher than homeowner', () => {
    const coupleHomeowner = AGE_PENSION_RATES.couple.assetTestThreshold.homeowner;
    const coupleNonHomeowner = AGE_PENSION_RATES.couple.assetTestThreshold.nonHomeowner;
    
    const singleHomeowner = AGE_PENSION_RATES.single.assetTestThreshold.homeowner;
    const singleNonHomeowner = AGE_PENSION_RATES.single.assetTestThreshold.nonHomeowner;
    
    expect(coupleNonHomeowner).toBeGreaterThan(coupleHomeowner);
    expect(singleNonHomeowner).toBeGreaterThan(singleHomeowner);
  });
  
  it('should have couple thresholds higher than single thresholds', () => {
    const coupleThreshold = AGE_PENSION_RATES.couple.assetTestThreshold.homeowner;
    const singleThreshold = AGE_PENSION_RATES.single.assetTestThreshold.homeowner;
    
    expect(coupleThreshold).toBeGreaterThan(singleThreshold);
  });
});
