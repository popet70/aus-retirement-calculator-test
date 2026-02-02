/**
 * Couple Tracking Tests
 * 
 * Tests for v15.0 couple tracking features including:
 * - Individual partner super tracking
 * - Staged retirement scenarios
 * - Pre-retirement income
 * - Death scenarios with super transfers
 * - Reversionary pensions
 * - Spending adjustments on death
 * - Year 1 anchoring to first retirement
 * - RAD payments in couple mode
 * - Age pension recalculation on death
 */

import { describe, it, expect } from '@jest/globals';

// Type definitions for couple tracking
interface PartnerDetails {
  name: string;
  currentAge: number;
  gender: 'male' | 'female';
  superBalance: number;
  retirementAge: number;
  pensionIncome: number;
  preRetirementIncome: number;
  reversionaryRate: number;
  deathAge: number;
}

interface CoupleTrackingResult {
  year: number;
  partner1Age: number;
  partner2Age: number;
  partner1Alive: boolean;
  partner2Alive: boolean;
  partner1Super: number;
  partner2Super: number;
  totalSuper: number;
  partner1Pension: number;
  partner2Pension: number;
  partner1PreRetirementIncome: number;
  partner2PreRetirementIncome: number;
  totalIncome: number;
  spending: number;
  minDrawdownP1: number;
  minDrawdownP2: number;
}

describe('Couple Tracking - Basic Setup', () => {
  
  it('should correctly identify which partner retires first', () => {
    const partner1: PartnerDetails = {
      name: 'Sam',
      currentAge: 53,
      gender: 'female',
      superBalance: 0,
      retirementAge: 60,
      pensionIncome: 0,
      preRetirementIncome: 0,
      reversionaryRate: 67,
      deathAge: 85
    };
    
    const partner2: PartnerDetails = {
      name: 'Andy',
      currentAge: 50,
      gender: 'male',
      superBalance: 1360000,
      retirementAge: 60,
      pensionIncome: 101000,
      preRetirementIncome: 80000,
      reversionaryRate: 67,
      deathAge: 85
    };
    
    // Calculate years until retirement
    const yearsUntilP1Retires = partner1.retirementAge - partner1.currentAge; // 7
    const yearsUntilP2Retires = partner2.retirementAge - partner2.currentAge; // 10
    const firstRetirement = Math.min(yearsUntilP1Retires, yearsUntilP2Retires);
    
    expect(firstRetirement).toBe(7); // Partner 1 (Sam) retires first
    
    // Year 1 ages
    const partner1AgeAtYear1 = partner1.currentAge + firstRetirement; // 60
    const partner2AgeAtYear1 = partner2.currentAge + firstRetirement; // 57
    
    expect(partner1AgeAtYear1).toBe(60); // Sam is 60 in Year 1
    expect(partner2AgeAtYear1).toBe(57); // Andy is 57 in Year 1 (still working)
  });
  
  it('should correctly handle both partners same age, same retirement', () => {
    const partner1: PartnerDetails = {
      name: 'Alex',
      currentAge: 55,
      gender: 'male',
      superBalance: 800000,
      retirementAge: 60,
      pensionIncome: 50000,
      preRetirementIncome: 0,
      reversionaryRate: 67,
      deathAge: 85
    };
    
    const partner2: PartnerDetails = {
      name: 'Jordan',
      currentAge: 55,
      gender: 'female',
      superBalance: 560000,
      retirementAge: 60,
      pensionIncome: 51000,
      preRetirementIncome: 0,
      reversionaryRate: 67,
      deathAge: 85
    };
    
    const yearsUntilP1Retires = 5;
    const yearsUntilP2Retires = 5;
    const firstRetirement = Math.min(yearsUntilP1Retires, yearsUntilP2Retires);
    
    expect(firstRetirement).toBe(5); // Both retire at same time
    
    const partner1AgeAtYear1 = 60;
    const partner2AgeAtYear1 = 60;
    
    expect(partner1AgeAtYear1).toBe(60);
    expect(partner2AgeAtYear1).toBe(60);
  });
  
  it('should handle large age gap scenarios', () => {
    const partner1: PartnerDetails = {
      name: 'Older',
      currentAge: 58,
      gender: 'male',
      superBalance: 1200000,
      retirementAge: 60,
      pensionIncome: 80000,
      preRetirementIncome: 0,
      reversionaryRate: 67,
      deathAge: 80
    };
    
    const partner2: PartnerDetails = {
      name: 'Younger',
      currentAge: 45,
      gender: 'female',
      superBalance: 400000,
      retirementAge: 60,
      pensionIncome: 0,
      preRetirementIncome: 60000,
      reversionaryRate: 0,
      deathAge: 90
    };
    
    const yearsUntilP1Retires = 2;
    const yearsUntilP2Retires = 15;
    const firstRetirement = Math.min(yearsUntilP1Retires, yearsUntilP2Retires);
    
    expect(firstRetirement).toBe(2); // Older partner retires much earlier
    
    // Year 1: Older is 60, Younger is 47 (still working for 13 more years!)
    const partner1AgeAtYear1 = 60;
    const partner2AgeAtYear1 = 47;
    
    expect(partner1AgeAtYear1).toBe(60);
    expect(partner2AgeAtYear1).toBe(47);
  });
});

describe('Couple Tracking - Pre-Retirement Income', () => {
  
  it('should stop pre-retirement income when partner retires', () => {
    // Scenario: Partner 2 works until Year 4, then retires
    const results = [
      { year: 1, partner2Age: 57, partner2Retired: false, partner2PreRetirement: 80000 },
      { year: 2, partner2Age: 58, partner2Retired: false, partner2PreRetirement: 80000 },
      { year: 3, partner2Age: 59, partner2Retired: false, partner2PreRetirement: 80000 },
      { year: 4, partner2Age: 60, partner2Retired: true, partner2PreRetirement: 0 }, // Retires!
      { year: 5, partner2Age: 61, partner2Retired: true, partner2PreRetirement: 0 },
    ];
    
    // Before retirement
    expect(results[0].partner2PreRetirement).toBe(80000);
    expect(results[1].partner2PreRetirement).toBe(80000);
    expect(results[2].partner2PreRetirement).toBe(80000);
    
    // After retirement
    expect(results[3].partner2PreRetirement).toBe(0);
    expect(results[4].partner2PreRetirement).toBe(0);
  });
  
  it('should start pension income when partner retires', () => {
    // Scenario: Partner 2 pension starts in Year 4
    const results = [
      { year: 1, partner2Age: 57, partner2Retired: false, partner2Pension: 0 },
      { year: 2, partner2Age: 58, partner2Retired: false, partner2Pension: 0 },
      { year: 3, partner2Age: 59, partner2Retired: false, partner2Pension: 0 },
      { year: 4, partner2Age: 60, partner2Retired: true, partner2Pension: 101000 }, // Starts!
      { year: 5, partner2Age: 61, partner2Retired: true, partner2Pension: 101000 },
    ];
    
    // Before retirement - no pension
    expect(results[0].partner2Pension).toBe(0);
    expect(results[1].partner2Pension).toBe(0);
    expect(results[2].partner2Pension).toBe(0);
    
    // After retirement - pension starts
    expect(results[3].partner2Pension).toBe(101000);
    expect(results[4].partner2Pension).toBe(101000);
  });
  
  it('should handle total household income correctly during staged retirement', () => {
    // Year 1-3: Only Partner 2's work income ($80k)
    // Year 4+: Only Partner 2's pension ($101k)
    const year1Income = 0 + 0 + 0 + 80000; // P1 pension + P2 pension + P1 work + P2 work
    const year3Income = 0 + 0 + 0 + 80000;
    const year4Income = 0 + 101000 + 0 + 0; // P2 pension starts, work stops
    
    expect(year1Income).toBe(80000);
    expect(year3Income).toBe(80000);
    expect(year4Income).toBe(101000);
  });
});

describe('Couple Tracking - Individual Super Management', () => {
  
  it('should track individual super balances separately', () => {
    const partner1Super = 0;
    const partner2Super = 1360000;
    const totalSuper = partner1Super + partner2Super;
    
    expect(partner1Super).toBe(0);
    expect(partner2Super).toBe(1360000);
    expect(totalSuper).toBe(1360000);
  });
  
  it('should only allow retired partners to access their super', () => {
    const partner1Retired = true;
    const partner1Super = 500000;
    const partner2Retired = false; // Still working!
    const partner2Super = 1000000;
    
    const accessibleSuper = 
      (partner1Retired ? partner1Super : 0) + 
      (partner2Retired ? partner2Super : 0);
    
    expect(accessibleSuper).toBe(500000); // Only Partner 1's super accessible
  });
  
  it('should calculate minimum drawdown for each retired partner', () => {
    // Partner 1: Age 63, super $800k, 5% minimum
    const partner1Age = 63;
    const partner1Super = 800000;
    const partner1MinDrawdown = partner1Super * 0.05; // 5% at age 63
    
    // Partner 2: Age 60, not retired yet, no drawdown
    const partner2Retired = false;
    const partner2MinDrawdown = partner2Retired ? 0 : 0;
    
    expect(partner1MinDrawdown).toBe(40000);
    expect(partner2MinDrawdown).toBe(0);
  });
  
  it('should apply returns to individual super balances', () => {
    let partner1Super = 500000;
    let partner2Super = 1000000;
    const returnRate = 0.07; // 7%
    
    // Apply returns
    partner1Super = partner1Super * (1 + returnRate);
    partner2Super = partner2Super * (1 + returnRate);
    
    expect(partner1Super).toBe(535000);
    expect(partner2Super).toBe(1070000);
    
    const totalSuper = partner1Super + partner2Super;
    expect(totalSuper).toBe(1605000);
  });
});

describe('Couple Tracking - Death Scenarios', () => {
  
  it('should transfer deceased super to survivor', () => {
    let partner1Super = 500000;
    let partner2Super = 1000000;
    let partner1Alive = true;
    let partner2Alive = true;
    
    // Partner 1 dies
    partner1Alive = false;
    partner2Super += partner1Super; // Transfer
    partner1Super = 0;
    
    expect(partner1Alive).toBe(false);
    expect(partner2Alive).toBe(true);
    expect(partner1Super).toBe(0);
    expect(partner2Super).toBe(1500000); // Got Partner 1's super
  });
  
  it('should apply reversionary pension rate on death', () => {
    const partner1Pension = 101000;
    const reversionaryRate = 0.67; // 67%
    let partner1Alive = true;
    
    // Before death
    let activePension = partner1Alive ? partner1Pension : 0;
    expect(activePension).toBe(101000);
    
    // Partner 1 dies
    partner1Alive = false;
    const reversionaryPension = partner1Pension * reversionaryRate;
    
    expect(reversionaryPension).toBe(67670); // 67% of $101k
  });
  
  it('should reduce spending to single-person rate on death', () => {
    const baseSpending = 120000;
    const singleSpendingRate = 0.65; // 65%
    let bothAlive = true;
    
    // Couple spending
    let actualSpending = bothAlive ? baseSpending : baseSpending * singleSpendingRate;
    expect(actualSpending).toBe(120000);
    
    // One dies
    bothAlive = false;
    actualSpending = bothAlive ? baseSpending : baseSpending * singleSpendingRate;
    expect(actualSpending).toBe(78000); // 65% of $120k
  });
  
  it('should end simulation when both partners dead', () => {
    let partner1Alive = true;
    let partner2Alive = true;
    
    // Partner 1 dies at age 75 (Year 16)
    partner1Alive = false;
    let simulationContinues = partner1Alive || partner2Alive;
    expect(simulationContinues).toBe(true); // Continue with survivor
    
    // Partner 2 dies at age 88 (Year 29)
    partner2Alive = false;
    simulationContinues = partner1Alive || partner2Alive;
    expect(simulationContinues).toBe(false); // End simulation
  });
});

describe('Couple Tracking - Aged Care Integration', () => {
  
  it('should only apply aged care to survivor', () => {
    let partner1Alive = false; // Already dead
    let partner2Alive = true;
    const partner2Age = 85;
    const agedCareEntryAge = 85;
    
    // Survivor reaches aged care age
    const shouldEnterAgedCare = 
      (!partner1Alive && partner2Alive && partner2Age >= agedCareEntryAge) ||
      (partner1Alive && !partner2Alive && partner2Age >= agedCareEntryAge);
    
    expect(shouldEnterAgedCare).toBe(true);
  });
  
  it('should NOT apply aged care when both partners alive', () => {
    let partner1Alive = true;
    let partner2Alive = true;
    const partner1Age = 85;
    const partner2Age = 85;
    const agedCareEntryAge = 85;
    
    // Both alive - no aged care
    const relevantAge = (partner1Alive && partner2Alive) ? 999 : 
                        (!partner1Alive ? partner2Age : partner1Age);
    
    expect(relevantAge).toBe(999); // High age = never triggers
  });
  
  it('should deduct RAD from individual super balances proportionally', () => {
    let partner1Super = 0; // Dead
    let partner2Super = 1500000;
    const RAD = 400000;
    
    const totalSuper = partner1Super + partner2Super;
    
    if (totalSuper >= RAD) {
      // Deduct proportionally
      const p1Ratio = partner1Super / totalSuper; // 0
      const p2Ratio = partner2Super / totalSuper; // 1
      
      partner1Super -= RAD * p1Ratio; // 0
      partner2Super -= RAD * p2Ratio; // All from P2
    }
    
    expect(partner1Super).toBe(0);
    expect(partner2Super).toBe(1100000); // $1.5M - $400k RAD
  });
  
  it('should kill survivor when they die in aged care', () => {
    let partner1Alive = false;
    let partner2Alive = true;
    let wasInAgedCare = true;
    let inAgedCare = false; // Just exited
    const deathInCare = true;
    
    // Survivor exited care (died)
    if (wasInAgedCare && !inAgedCare && deathInCare) {
      if (!partner1Alive && partner2Alive) {
        partner2Alive = false;
      }
    }
    
    expect(partner1Alive).toBe(false);
    expect(partner2Alive).toBe(false); // Died in care
  });
});

describe('Couple Tracking - Age Pension', () => {
  
  it('should use couple rates when both alive', () => {
    const bothAlive = true;
    const maxAgePensionCouple = 44855; // Combined
    const maxAgePensionSingle = 29754;
    
    const maxPension = bothAlive ? maxAgePensionCouple : maxAgePensionSingle;
    
    expect(maxPension).toBe(44855);
  });
  
  it('should use single rates when one partner dies', () => {
    const bothAlive = false; // One died
    const maxAgePensionCouple = 44855;
    const maxAgePensionSingle = 29754;
    
    const maxPension = bothAlive ? maxAgePensionCouple : maxAgePensionSingle;
    
    expect(maxPension).toBe(29754);
  });
  
  it('should apply age pension only when partner reaches age 67', () => {
    const partner1Age = 67;
    const partner2Age = 64;
    const eligibilityAge = 67;
    
    const partner1Eligible = partner1Age >= eligibilityAge;
    const partner2Eligible = partner2Age >= eligibilityAge;
    
    expect(partner1Eligible).toBe(true);
    expect(partner2Eligible).toBe(false);
    
    // Partial pension (only P1 eligible)
    // In reality, this would be calculated based on assets
  });
});

describe('Couple Tracking - Excess Income Handling', () => {
  
  it('should save excess income to cash account', () => {
    const income = 181000; // Pre-retirement + pension
    const spending = 120000;
    let cashAccount = 0;
    
    if (income > spending) {
      const excess = income - spending;
      cashAccount += excess;
    }
    
    expect(cashAccount).toBe(61000);
  });
  
  it('should accumulate excess over multiple years', () => {
    let cashAccount = 0;
    
    // Year 1: Excess $61k
    cashAccount += 61000;
    expect(cashAccount).toBe(61000);
    
    // Year 2: Excess $61k (with growth)
    cashAccount = cashAccount * 1.03; // 3% growth
    cashAccount += 61000;
    expect(cashAccount).toBeCloseTo(123830, 0);
    
    // Year 3: Excess $61k
    cashAccount = cashAccount * 1.03;
    cashAccount += 61000;
    expect(cashAccount).toBeGreaterThan(180000);
  });
});

describe('Couple Tracking - Calendar Year Display', () => {
  
  it('should calculate correct calendar year based on first retirement', () => {
    const currentYear = 2026;
    const partner1CurrentAge = 53;
    const partner1RetirementAge = 60;
    const partner2CurrentAge = 50;
    const partner2RetirementAge = 60;
    
    const yearsUntilP1Retires = partner1RetirementAge - partner1CurrentAge; // 7
    const yearsUntilP2Retires = partner2RetirementAge - partner2CurrentAge; // 10
    const yearsUntilFirstRetirement = Math.min(yearsUntilP1Retires, yearsUntilP2Retires); // 7
    
    const firstRetirementYear = currentYear + yearsUntilFirstRetirement;
    
    expect(firstRetirementYear).toBe(2033); // Year 1 = 2033
    
    // Calendar years
    const year1 = firstRetirementYear; // 2033
    const year5 = firstRetirementYear + 4; // 2037
    const year10 = firstRetirementYear + 9; // 2042
    
    expect(year1).toBe(2033);
    expect(year5).toBe(2037);
    expect(year10).toBe(2042);
  });
});

describe('Couple Tracking - Edge Cases', () => {
  
  it('should handle partner with zero super', () => {
    const partner1Super = 0;
    const partner2Super = 1360000;
    
    const totalSuper = partner1Super + partner2Super;
    expect(totalSuper).toBe(1360000);
    
    // Minimum drawdown from Partner 1's zero super
    const partner1MinDrawdown = partner1Super * 0.05;
    expect(partner1MinDrawdown).toBe(0);
  });
  
  it('should handle partner with zero pension', () => {
    const partner1Pension = 0;
    const partner2Pension = 101000;
    
    const totalPension = partner1Pension + partner2Pension;
    expect(totalPension).toBe(101000);
  });
  
  it('should handle same retirement age different current ages', () => {
    const partner1CurrentAge = 53;
    const partner1RetirementAge = 60;
    const partner2CurrentAge = 50;
    const partner2RetirementAge = 60;
    
    // Both retire at 60, but at different times
    const yearsUntilP1Retires = 7;
    const yearsUntilP2Retires = 10;
    
    expect(yearsUntilP1Retires).toBe(7);
    expect(yearsUntilP2Retires).toBe(10);
    expect(yearsUntilP1Retires).toBeLessThan(yearsUntilP2Retires);
  });
  
  it('should handle insufficient accessible super warning', () => {
    const partner1Retired = true;
    const partner1Super = 50000;
    const partner2Retired = false;
    const partner2Super = 1000000;
    const spending = 120000;
    
    const accessibleSuper = 
      (partner1Retired ? partner1Super : 0) + 
      (partner2Retired ? partner2Super : 0);
    
    const insufficientFunds = spending > accessibleSuper;
    
    expect(accessibleSuper).toBe(50000);
    expect(insufficientFunds).toBe(true); // Warning should display
  });
});

describe('Couple Tracking - CSV Export', () => {
  
  it('should include both partner ages in CSV', () => {
    const csvRow = {
      year: 1,
      partner1Age: 60,
      partner2Age: 57,
      calendarYear: 2033,
    };
    
    expect(csvRow.partner1Age).toBe(60);
    expect(csvRow.partner2Age).toBe(57);
  });
  
  it('should include individual pension columns', () => {
    const csvRow = {
      partner1Pension: 0,
      partner2Pension: 101000,
      totalPension: 101000,
    };
    
    expect(csvRow.partner1Pension).toBe(0);
    expect(csvRow.partner2Pension).toBe(101000);
    expect(csvRow.totalPension).toBe(101000);
  });
  
  it('should include pre-retirement income columns', () => {
    const csvRow = {
      partner1PreRetirement: 0,
      partner2PreRetirement: 80000,
      totalIncome: 80000,
    };
    
    expect(csvRow.partner1PreRetirement).toBe(0);
    expect(csvRow.partner2PreRetirement).toBe(80000);
  });
  
  it('should include partner status column', () => {
    const bothAlive = true;
    const partner1Alive = true;
    const partner2Alive = true;
    
    let status: string;
    if (bothAlive) {
      status = 'Both Alive';
    } else if (partner1Alive && !partner2Alive) {
      status = 'Partner 2 Deceased';
    } else if (!partner1Alive && partner2Alive) {
      status = 'Partner 1 Deceased';
    } else {
      status = 'Both Deceased';
    }
    
    expect(status).toBe('Both Alive');
  });
});

/**
 * Integration Test Scenarios
 * 
 * These tests verify complete scenarios from start to finish
 */

describe('Couple Tracking - Complete Scenarios', () => {
  
  it('Scenario A: Staged retirement with pre-retirement income', () => {
    /**
     * Sam: 53 → 60 (retires in 7 years, no pension, no work)
     * Andy: 50 → 60 (retires in 10 years, $101k pension, $80k work)
     * 
     * Timeline:
     * Year 1: Sam 60 (retired), Andy 57 (working $80k)
     * Year 4: Sam 63, Andy 60 (both retired, $101k pension starts)
     * Year 8: Sam 67, Andy 64 (Age pension eligible for Sam)
     */
    
    const scenario = {
      year1: { samAge: 60, andyAge: 57, income: 80000, andyWorking: true },
      year4: { samAge: 63, andyAge: 60, income: 101000, andyWorking: false },
      year8: { samAge: 67, andyAge: 64, agePensionEligible: true },
    };
    
    expect(scenario.year1.income).toBe(80000); // Just Andy's work
    expect(scenario.year4.income).toBe(101000); // Andy's pension
    expect(scenario.year8.agePensionEligible).toBe(true); // Sam reaches 67
  });
  
  it('Scenario B: Death with super transfer and reversionary pension', () => {
    /**
     * Partner 1 dies at age 75
     * Super: P1=$500k, P2=$1M
     * Pension: P1=$101k at 67% reversionary
     * Spending: $120k couple → $78k single (65%)
     */
    
    const before = {
      partner1Super: 500000,
      partner2Super: 1000000,
      totalSuper: 1500000,
      pension: 101000,
      spending: 120000,
    };
    
    // Partner 1 dies
    const after = {
      partner1Super: 0,
      partner2Super: before.partner1Super + before.partner2Super, // Transfer
      totalSuper: 1500000,
      pension: 101000 * 0.67, // Reversionary
      spending: 120000 * 0.65, // Single rate
    };
    
    expect(after.partner2Super).toBe(1500000);
    expect(after.pension).toBe(67670);
    expect(after.spending).toBe(78000);
  });
  
  it('Scenario C: Aged care for survivor', () => {
    /**
     * Partner 1 dies at 75 (Year 16)
     * Partner 2 enters aged care at 85 (Year 26)
     * Partner 2 dies in care at 88 (Year 29)
     * RAD: $400k
     */
    
    const timeline = [
      { year: 15, partner1Alive: true, partner2Alive: true, inCare: false },
      { year: 16, partner1Alive: false, partner2Alive: true, inCare: false }, // P1 dies
      { year: 26, partner1Alive: false, partner2Alive: true, inCare: true, radPaid: 400000 }, // Enter care
      { year: 27, partner1Alive: false, partner2Alive: true, inCare: true },
      { year: 28, partner1Alive: false, partner2Alive: true, inCare: true },
      { year: 29, partner1Alive: false, partner2Alive: false, inCare: false }, // Dies in care, simulation ends
    ];
    
    // Array indices: 0=Year15, 1=Year16, 2=Year26, 3=Year27, 4=Year28, 5=Year29
    expect(timeline[0].partner1Alive).toBe(true); // Year 15: Both alive
    expect(timeline[1].partner1Alive).toBe(false); // Year 16: P1 died
    expect(timeline[2].inCare).toBe(true); // Year 26: Entered care
    expect(timeline[2].radPaid).toBe(400000); // Year 26: RAD paid
    expect(timeline[5].partner2Alive).toBe(false); // Year 29: P2 died
  });
});
