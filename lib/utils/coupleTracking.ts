/**
 * Couple Tracking Types and Utilities
 * 
 * Handles individual partner tracking for couples including:
 * - Separate super balances
 * - Individual retirement ages
 * - Death scenarios
 * - Reversionary pensions
 */

export interface PartnerDetails {
  name: string;
  currentAge: number;
  retirementAge: number;
  superBalance: number;
  pensionIncome: number;  // PSS/CSS or other defined benefit
  reversionaryRate: number;  // Percentage that continues to survivor (default 67%)
  gender: 'male' | 'female';
  deathAge: number;  // For scenario modeling
  preRetirementIncome: number;  // Net annual income before retirement (default 0)
}

export interface CoupleTrackingState {
  enabled: boolean;  // Whether individual tracking is active
  partner1: PartnerDetails;
  partner2: PartnerDetails;
  jointBuffer: number;  // Sequencing buffer (shared)
}

/**
 * Australian Life Expectancy Tables (ABS 2020-2022)
 * https://www.abs.gov.au/statistics/people/population/life-tables
 */
export const LIFE_EXPECTANCY_TABLES = {
  male: {
    55: 85.2,
    60: 85.6,
    65: 86.1,
    70: 87.0,
    75: 88.2,
    80: 89.8,
  },
  female: {
    55: 88.3,
    60: 88.6,
    65: 89.0,
    70: 89.7,
    75: 90.7,
    80: 92.0,
  }
};

/**
 * Get life expectancy for a given age and gender
 */
export function getLifeExpectancy(age: number, gender: 'male' | 'female'): number {
  const table = LIFE_EXPECTANCY_TABLES[gender];
  
  // Find closest age bracket
  const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
  
  if (age <= ages[0]) return table[ages[0] as keyof typeof table];
  if (age >= ages[ages.length - 1]) return table[ages[ages.length - 1] as keyof typeof table];
  
  // Interpolate
  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age < ages[i + 1]) {
      const lower = ages[i];
      const upper = ages[i + 1];
      const lowerExp = table[lower as keyof typeof table];
      const upperExp = table[upper as keyof typeof table];
      
      const ratio = (age - lower) / (upper - lower);
      return lowerExp + ratio * (upperExp - lowerExp);
    }
  }
  
  return 100; // Fallback
}

/**
 * Age Pension Rates (2024-25)
 * Single vs Couple rates
 */
export const AGE_PENSION_RATES = {
  couple: {
    maxRate: 45952,  // Combined per year
    incomeTestThreshold: 360,  // Combined fortnightly
    assetTestThreshold: {
      homeowner: 451500,
      nonHomeowner: 693500,
    },
  },
  single: {
    maxRate: 29754,  // Per year
    incomeTestThreshold: 212,  // Fortnightly
    assetTestThreshold: {
      homeowner: 301750,
      nonHomeowner: 543750,
    },
  },
};

/**
 * Calculate age pension for couple with potential death scenario
 */
export function calculateAgePensionForCouple(
  params: {
    partner1Alive: boolean;
    partner2Alive: boolean;
    totalAssets: number;
    totalIncome: number;
    isHomeowner: boolean;
  }
): number {
  const { partner1Alive, partner2Alive, totalAssets, totalIncome, isHomeowner } = params;
  
  // Both alive - couple rate
  if (partner1Alive && partner2Alive) {
    const rates = AGE_PENSION_RATES.couple;
    const assetThreshold = isHomeowner ? rates.assetTestThreshold.homeowner : rates.assetTestThreshold.nonHomeowner;
    
    // Asset test
    if (totalAssets > assetThreshold) {
      const excessAssets = totalAssets - assetThreshold;
      const reduction = (excessAssets / 1000) * 3 * 26; // $3/fortnight per $1000 excess
      const agePension = Math.max(0, rates.maxRate - reduction);
      
      // Income test would go here (simplified for now)
      return agePension;
    }
    
    return rates.maxRate;
  }
  
  // One alive - single rate
  if (partner1Alive || partner2Alive) {
    const rates = AGE_PENSION_RATES.single;
    const assetThreshold = isHomeowner ? rates.assetTestThreshold.homeowner : rates.assetTestThreshold.nonHomeowner;
    
    // Asset test
    if (totalAssets > assetThreshold) {
      const excessAssets = totalAssets - assetThreshold;
      const reduction = (excessAssets / 1000) * 3 * 26; // $3/fortnight per $1000 excess
      const agePension = Math.max(0, rates.maxRate - reduction);
      
      return agePension;
    }
    
    return rates.maxRate;
  }
  
  // Both deceased
  return 0;
}

/**
 * Calculate reversionary pension after death
 */
export function calculateReversionaryPension(
  originalPension: number,
  reversionaryRate: number
): number {
  return originalPension * (reversionaryRate / 100);
}

/**
 * Default partner details
 */
export function createDefaultPartner(
  name: string,
  currentAge: number,
  gender: 'male' | 'female'
): PartnerDetails {
  return {
    name,
    currentAge,
    retirementAge: 60,
    superBalance: 0,
    pensionIncome: 0,
    reversionaryRate: 67,
    gender,
    deathAge: Math.round(getLifeExpectancy(currentAge, gender)),
    preRetirementIncome: 0,
  };
}
