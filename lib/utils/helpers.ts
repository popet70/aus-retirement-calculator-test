/**
 * Utility functions for formatting and common operations
 */

/**
 * Format a number as Australian currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Get interpolated spending multiplier for a given age
 */
export function getSpendingMultiplier(
  age: number,
  ages: number[],
  multipliers: number[]
): number {
  if (age <= ages[0]) return multipliers[0];
  if (age >= ages[ages.length - 1]) return multipliers[multipliers.length - 1];

  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age <= ages[i + 1]) {
      const t = (age - ages[i]) / (ages[i + 1] - ages[i]);
      return lerp(multipliers[i], multipliers[i + 1], t);
    }
  }

  return 1.0;
}

/**
 * Calculate percentile from sorted array
 */
export function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sortedArray[lower];
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Generate random normal distribution value (Box-Muller transform)
 */
export function randomNormal(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Calculate compound growth
 */
export function compoundGrowth(
  principal: number,
  rate: number,
  years: number
): number {
  return principal * Math.pow(1 + rate / 100, years);
}

/**
 * Adjust for inflation
 */
export function adjustForInflation(
  amount: number,
  inflationRate: number,
  years: number
): number {
  return amount * Math.pow(1 + inflationRate / 100, years);
}

/**
 * Convert to real dollars (remove inflation)
 */
export function toRealDollars(
  nominalAmount: number,
  inflationRate: number,
  years: number
): number {
  return nominalAmount / Math.pow(1 + inflationRate / 100, years);
}

/**
 * Calculate loan payment using amortization formula
 */
export function calculateLoanPayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  if (annualRate === 0) return principal / (years * 12);
  
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

/**
 * Get retirement year from current age and retirement age
 */
export function getRetirementYear(
  currentAge: number,
  retirementAge: number,
  currentYear: number = 2026
): number {
  return currentYear + (retirementAge - currentAge);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
