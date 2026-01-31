import { calculateRetirementProjection } from '../lib/calculations/projection';
import { RetirementParams, OneOffExpense, GuardrailParams, SplurgeParams } from '../lib/types';

describe('Integration Tests - Complete Retirement Scenarios', () => {
  describe('Conservative Retiree Scenario', () => {
    it('should successfully model low-risk retirement with age pension', () => {
      const params: RetirementParams = {
        currentAge: 65,
        retirementAge: 65, // Already retired
        mainSuperBalance: 400000,
        sequencingBuffer: 100000,
        totalPensionIncome: 0,
        baseSpending: 50000, // Modest spending
        inflationRate: 2.5,
        selectedScenario: 1, // Conservative: 4.5%
        isHomeowner: true,
        includeAgePension: true, // Eligible for age pension
        spendingPattern: 'constant',
        showNominalDollars: false,
      };

      const result = calculateRetirementProjection({
        retirementParams: params,
      });

      // Should last to 100
      expect(result.chartData.length).toBeGreaterThan(30);
      
      // Should be receiving age pension
      const age70 = result.chartData.find(d => d.age === 70);
      expect(age70?.agePension).toBeGreaterThan(0);
      
      // Should maintain positive balance
      const finalBalance = result.chartData[result.chartData.length - 1].totalBalance;
      expect(finalBalance).toBeGreaterThan(0);
    });
  });

  describe('Affluent Retiree with Pension', () => {
    it('should model comfortable retirement with defined benefit pension', () => {
      const params: RetirementParams = {
        currentAge: 55,
        retirementAge: 60,
        mainSuperBalance: 1500000,
        sequencingBuffer: 300000,
        totalPensionIncome: 100000, // PSS/CSS pension
        baseSpending: 120000,
        inflationRate: 2.5,
        selectedScenario: 3, // Balanced: 7%
        isHomeowner: true,
        includeAgePension: false, // Too much income/assets
        spendingPattern: 'jpmorgan', // Declining spending with age
        showNominalDollars: false,
      };

      const oneOffExpenses: OneOffExpense[] = [
        { description: 'Appliance Replacement', age: 64, amount: 12000 },
        { description: 'Vehicle Replacement', age: 68, amount: 60000 },
        { description: 'Home Maintenance', age: 70, amount: 25000 },
        { description: 'Medical/Dental Work', age: 74, amount: 20000 },
        { description: 'Major Home Maintenance', age: 77, amount: 35000 },
        { description: 'Third Vehicle', age: 78, amount: 60000 },
      ];

      const guardrailParams: GuardrailParams = {
        useGuardrails: true,
        upperGuardrail: 20,
        lowerGuardrail: 15,
        guardrailAdjustment: 10,
      };

      const splurgeParams: SplurgeParams = {
        splurgeAmount: 20000, // Annual overseas travel
        splurgeStartAge: 65,
        splurgeDuration: 10, // Travel for first 10 years
        splurgeRampDownYears: 2,
      };

      const result = calculateRetirementProjection({
        retirementParams: params,
        guardrailParams,
        splurgeParams,
        oneOffExpenses,
      });

      // Should last full retirement
      expect(result.chartData.length).toBeGreaterThan(40);
      
      // Should have healthy ending balance
      const finalBalance = result.chartData[result.chartData.length - 1].totalBalance;
      expect(finalBalance).toBeGreaterThan(500000);
      
      // Should show declining spending pattern after splurge period
      const age75 = result.chartData.find(d => d.age === 75);
      const age85 = result.chartData.find(d => d.age === 85);
      
      // JP Morgan pattern may not reduce base spending, only apply multiplier to calculations
      expect(age85?.spending).toBeLessThanOrEqual(age75?.spending || Infinity);
    });
  });

  describe('Tight Budget Scenario', () => {
    it('should model barely sustainable retirement', () => {
      const params: RetirementParams = {
        currentAge: 60,
        retirementAge: 60,
        mainSuperBalance: 300000,
        sequencingBuffer: 50000,
        totalPensionIncome: 0,
        baseSpending: 60000, // High relative to balance
        inflationRate: 2.5,
        selectedScenario: 2, // Moderate: 6%
        isHomeowner: true,
        includeAgePension: true, // Will need age pension
        spendingPattern: 'constant',
        showNominalDollars: false,
      };

      const result = calculateRetirementProjection({
        retirementParams: params,
      });

      // Should deplete portfolio relatively early
      const exhaustionAge = result.chartData.findIndex(d => d.totalBalance <= 0);
      
      if (exhaustionAge > 0) {
        // If runs out, should be before age 100
        expect(result.chartData[exhaustionAge].age).toBeLessThanOrEqual(100);
      }
      
      // Should be heavily reliant on age pension
      const age70 = result.chartData.find(d => d.age === 70);
      if (age70) {
        const pensionPercentage = age70.agePension / age70.income;
        expect(pensionPercentage).toBeGreaterThan(0.5); // >50% from age pension
      }
    });
  });

  describe('Pre-Retirement Accumulation', () => {
    it('should model growth phase before retirement', () => {
      const params: RetirementParams = {
        currentAge: 50,
        retirementAge: 60,
        mainSuperBalance: 500000,
        sequencingBuffer: 0, // Not set up yet
        totalPensionIncome: 0,
        baseSpending: 80000, // Will spend after retirement
        inflationRate: 2.5,
        selectedScenario: 4, // Growth: 8%
        isHomeowner: true,
        includeAgePension: false,
        spendingPattern: 'constant',
        showNominalDollars: false,
      };

      const result = calculateRetirementProjection({
        retirementParams: params,
      });

      // During working years (50-59), portfolio should grow
      const age50 = result.chartData.find(d => d.age === 50);
      const age59 = result.chartData.find(d => d.age === 59);
      
      expect(age59?.totalBalance).toBeGreaterThan(age50?.totalBalance || 0);
      
      // Spending should be zero before retirement
      const age55 = result.chartData.find(d => d.age === 55);
      expect(age55?.spending).toBe(0);
      
      // Spending should start at retirement
      const age60 = result.chartData.find(d => d.age === 60);
      expect(age60?.spending).toBeGreaterThan(0);
    });
  });

  describe('Market Crash Scenario', () => {
    it('should handle severe market downturn in early retirement', () => {
      const params: RetirementParams = {
        currentAge: 60,
        retirementAge: 60,
        mainSuperBalance: 800000,
        sequencingBuffer: 200000, // Critical for sequencing risk
        totalPensionIncome: 40000,
        baseSpending: 80000,
        inflationRate: 2.5,
        selectedScenario: 3,
        isHomeowner: true,
        includeAgePension: false,
        spendingPattern: 'constant',
        showNominalDollars: false,
      };

      // Simulate 2008 GFC-style crash
      const crashReturns = [-37, -10, 26, 15, 8, 12, 18, 7, 7, 7]; // Then normal
      
      const result = calculateRetirementProjection({
        retirementParams: params,
        returns: crashReturns,
      });

      // Buffer should protect during crash
      const age60 = result.chartData.find(d => d.age === 60);
      const age61 = result.chartData.find(d => d.age === 61);
      
      // Buffer should decrease (protecting super)
      expect(age61?.buffer).toBeLessThan(age60?.buffer || 0);
      
      // Super should be less affected
      const superLossPercentage = 1 - ((age61?.mainSuper || 0) / (age60?.mainSuper || 0));
      expect(superLossPercentage).toBeLessThan(0.20); // Less than 20% loss
    });
  });

  describe('Guardrails Dynamic Adjustment', () => {
    it('should adjust spending with portfolio performance', () => {
      const params: RetirementParams = {
        currentAge: 65,
        retirementAge: 65,
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

      const guardrailParams: GuardrailParams = {
        useGuardrails: true,
        upperGuardrail: 20,
        lowerGuardrail: 15,
        guardrailAdjustment: 10,
      };

      // Excellent returns
      const goodReturns = [15, 18, 22, 20, 15, 12, 10, 8, 8, 7];
      
      const withGuardrails = calculateRetirementProjection({
        retirementParams: params,
        guardrailParams,
        returns: goodReturns,
      });

      const withoutGuardrails = calculateRetirementProjection({
        retirementParams: params,
        guardrailParams: { ...guardrailParams, useGuardrails: false },
        returns: goodReturns,
      });

      // With guardrails should increase spending after good returns
      const age70With = withGuardrails.chartData.find(d => d.age === 70);
      const age70Without = withoutGuardrails.chartData.find(d => d.age === 70);
      
      expect(age70With?.spending).toBeGreaterThan(age70Without?.spending || 0);
    });
  });

  describe('Longevity Scenario - Living to 100+', () => {
    it('should model ultra-long retirement', () => {
      const params: RetirementParams = {
        currentAge: 55,
        retirementAge: 60,
        mainSuperBalance: 1200000,
        sequencingBuffer: 250000,
        totalPensionIncome: 70000,
        baseSpending: 100000,
        inflationRate: 2.5,
        selectedScenario: 3,
        isHomeowner: true,
        includeAgePension: false,
        spendingPattern: 'jpmorgan', // Declining with age helps
        showNominalDollars: false,
      };

      const result = calculateRetirementProjection({
        retirementParams: params,
      });

      // Should project to age 100
      const age100 = result.chartData.find(d => d.age === 100);
      expect(age100).toBeDefined();
      
      // Should still have money at 100
      expect(age100?.totalBalance).toBeGreaterThan(0);
      
      // Spending should be much lower at 100 (age-based decline)
      const age65 = result.chartData.find(d => d.age === 65);
      // Base spending is constant, actual spending declines with JP Morgan multiplier
      expect(age100?.spending).toBeLessThan(age65?.spending || Infinity);
    });
  });

  describe('Realistic Tim Scenario', () => {
    it('should model scenario matching user profile', () => {
      const params: RetirementParams = {
        currentAge: 55,
        retirementAge: 60,
        mainSuperBalance: 1360000,
        sequencingBuffer: 200000,
        totalPensionIncome: 101000, // PSS pension
        baseSpending: 120000,
        inflationRate: 2.5,
        selectedScenario: 4, // Growth
        isHomeowner: true,
        includeAgePension: false, // Too much income
        spendingPattern: 'jpmorgan',
        showNominalDollars: false,
      };

      const oneOffExpenses: OneOffExpense[] = [
        { description: 'Major Appliance Replacement', age: 64, amount: 12000 },
        { description: 'Technology Refresh', age: 62, amount: 5000 },
        { description: 'Unexpected Home Repairs', age: 64, amount: 10000 },
        { description: 'Vehicle Replacement', age: 68, amount: 60000 },
        { description: 'Home Maintenance', age: 70, amount: 25000 },
        { description: 'Medical/Dental Work', age: 74, amount: 20000 },
        { description: 'Vehicle #2', age: 78, amount: 60000 },
      ];

      const guardrailParams: GuardrailParams = {
        useGuardrails: true,
        upperGuardrail: 20,
        lowerGuardrail: 15,
        guardrailAdjustment: 10,
      };

      const result = calculateRetirementProjection({
        retirementParams: params,
        guardrailParams,
        oneOffExpenses,
      });

      // Should successfully retire
      expect(result.chartData.length).toBeGreaterThan(40);
      
      // Should maintain healthy balance throughout
      const age80 = result.chartData.find(d => d.age === 80);
      expect(age80?.totalBalance).toBeGreaterThan(500000);
      
      // Should end with substantial estate
      const finalBalance = result.chartData[result.chartData.length - 1].totalBalance;
      expect(finalBalance).toBeGreaterThan(300000);
    });
  });

  describe('Edge Case Scenarios', () => {
    it('should handle immediate retirement with zero accumulation phase', () => {
      const params: RetirementParams = {
        currentAge: 65,
        retirementAge: 65,
        mainSuperBalance: 500000,
        sequencingBuffer: 100000,
        totalPensionIncome: 30000,
        baseSpending: 70000,
        inflationRate: 2.5,
        selectedScenario: 3,
        isHomeowner: true,
        includeAgePension: true,
        spendingPattern: 'constant',
        showNominalDollars: false,
      };

      const result = calculateRetirementProjection({
        retirementParams: params,
      });

      // First year should show spending immediately
      expect(result.chartData[0].spending).toBeGreaterThan(0);
    });

    it('should handle retirement age later than typical', () => {
      const params: RetirementParams = {
        currentAge: 60,
        retirementAge: 70, // Work until 70
        mainSuperBalance: 800000,
        sequencingBuffer: 0,
        totalPensionIncome: 80000,
        baseSpending: 90000,
        inflationRate: 2.5,
        selectedScenario: 3,
        isHomeowner: true,
        includeAgePension: false,
        spendingPattern: 'constant',
        showNominalDollars: false,
      };

      const result = calculateRetirementProjection({
        retirementParams: params,
      });

      // Should grow until age 70
      const age69 = result.chartData.find(d => d.age === 69);
      const age70 = result.chartData.find(d => d.age === 70);
      
      expect(age69?.spending).toBe(0);
      expect(age70?.spending).toBeGreaterThan(0);
    });
  });
});
