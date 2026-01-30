import { AGE_PENSION_THRESHOLDS } from '../data/constants';
import { AgePensionParams, PensionRecipientType } from '../types';

/**
 * Calculate annual Age Pension entitlement based on means testing
 * 
 * Age Pension in Australia is subject to both income and asset tests.
 * The lower of the two test results determines the actual payment.
 * 
 * @param params - Age pension calculation parameters
 * @returns Annual age pension amount
 */
export function calculateAgePension(params: AgePensionParams): number {
  const { totalBalance, pensionIncome, isHomeowner, pensionRecipientType } = params;
  
  const thresholds = AGE_PENSION_THRESHOLDS[pensionRecipientType];
  
  // Asset test calculation
  const assetTest = calculateAssetTest(
    totalBalance,
    isHomeowner,
    pensionRecipientType
  );
  
  // Income test calculation
  const incomeTest = calculateIncomeTest(
    pensionIncome,
    pensionRecipientType
  );
  
  // Take the lower of the two tests
  return Math.max(0, Math.min(assetTest, incomeTest));
}

/**
 * Calculate age pension based on asset test
 */
function calculateAssetTest(
  totalAssets: number,
  isHomeowner: boolean,
  recipientType: PensionRecipientType
): number {
  const thresholds = AGE_PENSION_THRESHOLDS[recipientType];
  const assetThreshold = isHomeowner 
    ? thresholds.assetThresholdHomeowner 
    : thresholds.assetThresholdNonHomeowner;
  
  // If assets below threshold, full pension
  if (totalAssets <= assetThreshold) {
    return thresholds.maxRate;
  }
  
  // Calculate taper - FIXED: Annual pension reduction
  const excessAssets = totalAssets - assetThreshold;
  const annualReduction = excessAssets * thresholds.assetTaperRate;
  const pension = thresholds.maxRate - annualReduction;
  
  return Math.max(0, pension);
}

/**
 * Calculate age pension based on income test
 */
function calculateIncomeTest(
  annualIncome: number,
  recipientType: PensionRecipientType
): number {
  const thresholds = AGE_PENSION_THRESHOLDS[recipientType];
  
  // Convert to fortnightly for calculation (Centrelink uses fortnightly)
  const fortnightlyIncome = annualIncome / 26;
  
  // If income below threshold, full pension
  if (fortnightlyIncome <= thresholds.incomeThreshold) {
    return thresholds.maxRate;
  }
  
  // Calculate taper (50 cents per dollar over threshold)
  const excessIncome = fortnightlyIncome - thresholds.incomeThreshold;
  const fortnightlyReduction = excessIncome * thresholds.incomeTaperRate;
  const fortnightlyMaxPension = thresholds.maxRate / 26;
  const fortnightlyPension = fortnightlyMaxPension - fortnightlyReduction;
  
  // Convert back to annual
  const annualPension = Math.max(0, fortnightlyPension * 26);
  
  return annualPension;
}

/**
 * Calculate deeming income (deemed income from financial assets for income test)
 * 
 * Currently not used but available for future enhancement.
 * Centrelink assumes financial assets earn a 'deemed' rate of return.
 */
export function calculateDeemingIncome(
  financialAssets: number,
  recipientType: PensionRecipientType
): number {
  // 2025 deeming thresholds and rates
  const deemingThresholds = {
    single: { lower: 60400, lowerRate: 0.025, upperRate: 0.0425 },
    couple: { lower: 100200, lowerRate: 0.025, upperRate: 0.0425 }
  };
  
  const threshold = deemingThresholds[recipientType];
  
  if (financialAssets <= threshold.lower) {
    return financialAssets * threshold.lowerRate;
  }
  
  const lowerIncome = threshold.lower * threshold.lowerRate;
  const upperIncome = (financialAssets - threshold.lower) * threshold.upperRate;
  
  return lowerIncome + upperIncome;
}

/**
 * Estimate future age pension with inflation adjustment
 */
export function estimateFutureAgePension(
  params: AgePensionParams,
  yearsFromNow: number,
  inflationRate: number
): number {
  const currentPension = calculateAgePension(params);
  
  // Age pension is indexed to CPI
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromNow);
  
  return currentPension * inflationMultiplier;
}

/**
 * Check if eligible for any age pension
 */
export function isEligibleForAgePension(params: AgePensionParams): boolean {
  return calculateAgePension(params) > 0;
}

/**
 * Get pension reduction per dollar of assets over threshold
 */
export function getPensionAssetSensitivity(
  recipientType: PensionRecipientType
): number {
  return AGE_PENSION_THRESHOLDS[recipientType].assetTaperRate;
}

/**
 * Calculate the asset level at which pension cuts out entirely
 */
export function getAssetCutoffThreshold(
  isHomeowner: boolean,
  recipientType: PensionRecipientType
): number {
  const thresholds = AGE_PENSION_THRESHOLDS[recipientType];
  const baseThreshold = isHomeowner 
    ? thresholds.assetThresholdHomeowner 
    : thresholds.assetThresholdNonHomeowner;
  
  // How much in excess assets before pension = 0
  const excessForZero = thresholds.maxRate / thresholds.assetTaperRate;
  
  return baseThreshold + excessForZero;
}
