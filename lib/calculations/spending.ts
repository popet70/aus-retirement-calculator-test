import { GuardrailParams, SplurgeParams } from '../types';
import { SPENDING_PATTERNS } from '../data/constants';
import { getSpendingMultiplier } from '../utils/helpers';

/**
 * Calculate annual spending with age-based adjustments and guardrails
 */
export function calculateAnnualSpending(params: {
  baseSpending: number;
  age: number;
  spendingPattern: 'constant' | 'jpmorgan' | 'ageadjusted';
  guardrailParams?: GuardrailParams;
  portfolioValue?: number;
  initialPortfolioValue?: number;
  splurgeParams?: SplurgeParams;
  splurgeActive?: boolean;
}): number {
  const {
    baseSpending,
    age,
    spendingPattern,
    guardrailParams,
    portfolioValue,
    initialPortfolioValue,
    splurgeParams,
    splurgeActive = false
  } = params;

  let adjustedSpending = baseSpending;

  // Apply age-based spending pattern
  if (spendingPattern === 'jpmorgan') {
    const multiplier = getSpendingMultiplier(
      age,
      SPENDING_PATTERNS.jpmorgan.ages,
      SPENDING_PATTERNS.jpmorgan.multipliers
    );
    adjustedSpending *= multiplier;
  } else if (spendingPattern === 'ageadjusted') {
    const multiplier = getSpendingMultiplier(
      age,
      SPENDING_PATTERNS.ageadjusted.ages,
      SPENDING_PATTERNS.ageadjusted.multipliers
    );
    adjustedSpending *= multiplier;
  }
  // 'constant' pattern requires no adjustment

  // Apply guardrails if enabled
  if (
    guardrailParams?.useGuardrails &&
    portfolioValue !== undefined &&
    initialPortfolioValue !== undefined
  ) {
    adjustedSpending = applyGuardrails(
      adjustedSpending,
      portfolioValue,
      initialPortfolioValue,
      guardrailParams
    );
  }

  // Add splurge spending if active
  if (splurgeActive && splurgeParams) {
    const splurgeAmount = calculateSplurgeAmount(age, splurgeParams);
    adjustedSpending += splurgeAmount;
  }

  return adjustedSpending;
}

/**
 * Apply dynamic spending guardrails based on portfolio performance
 * 
 * Guardrails adjust spending based on portfolio value relative to initial value:
 * - If portfolio grows above upper guardrail, increase spending
 * - If portfolio falls below lower guardrail, decrease spending
 */
function applyGuardrails(
  baseSpending: number,
  currentPortfolio: number,
  initialPortfolio: number,
  guardrails: GuardrailParams
): number {
  const { upperGuardrail, lowerGuardrail, guardrailAdjustment } = guardrails;

  // Calculate portfolio value as percentage of initial value
  const portfolioPercentage = (currentPortfolio / initialPortfolio) * 100;

  // Upper guardrail: increase spending if portfolio has grown significantly
  if (portfolioPercentage >= 100 + upperGuardrail) {
    return baseSpending * (1 + guardrailAdjustment / 100);
  }

  // Lower guardrail: decrease spending if portfolio has declined significantly
  if (portfolioPercentage <= 100 - lowerGuardrail) {
    return baseSpending * (1 - guardrailAdjustment / 100);
  }

  // Within guardrails: no adjustment
  return baseSpending;
}

/**
 * Calculate splurge spending amount for a given age
 * 
 * Supports:
 * - Fixed duration splurge period
 * - Optional ramp-down over specified years
 */
function calculateSplurgeAmount(
  age: number,
  splurgeParams: SplurgeParams
): number {
  const { splurgeAmount, splurgeStartAge, splurgeDuration, splurgeRampDownYears } = splurgeParams;

  const splurgeEndAge = splurgeStartAge + splurgeDuration;
  const rampDownStartAge = splurgeEndAge - splurgeRampDownYears;

  // Before splurge period
  if (age < splurgeStartAge) {
    return 0;
  }

  // After splurge period
  if (age >= splurgeEndAge) {
    return 0;
  }

  // During full splurge period (before ramp down)
  if (splurgeRampDownYears === 0 || age < rampDownStartAge) {
    return splurgeAmount;
  }

  // During ramp down period
  const yearsIntoRampDown = age - rampDownStartAge;
  const rampDownFraction = 1 - (yearsIntoRampDown / splurgeRampDownYears);
  
  return splurgeAmount * rampDownFraction;
}

/**
 * Check if guardrails would trigger for current portfolio state
 */
export function checkGuardrailStatus(
  currentPortfolio: number,
  initialPortfolio: number,
  guardrails: GuardrailParams
): 'upper' | 'lower' | 'neutral' {
  if (!guardrails.useGuardrails) {
    return 'neutral';
  }

  const portfolioPercentage = (currentPortfolio / initialPortfolio) * 100;

  if (portfolioPercentage >= 100 + guardrails.upperGuardrail) {
    return 'upper';
  }

  if (portfolioPercentage <= 100 - guardrails.lowerGuardrail) {
    return 'lower';
  }

  return 'neutral';
}

/**
 * Calculate total spending including one-off expenses
 */
export function calculateTotalSpending(
  baseSpending: number,
  oneOffExpenses: number
): number {
  return baseSpending + oneOffExpenses;
}

/**
 * Estimate spending in future years with inflation
 */
export function projectSpending(
  currentSpending: number,
  years: number,
  inflationRate: number
): number {
  return currentSpending * Math.pow(1 + inflationRate / 100, years);
}

/**
 * Calculate safe withdrawal rate given portfolio and spending
 */
export function calculateWithdrawalRate(
  annualSpending: number,
  portfolioValue: number
): number {
  if (portfolioValue === 0) return 0;
  return (annualSpending / portfolioValue) * 100;
}
