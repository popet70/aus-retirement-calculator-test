import {
  RetirementParams,
  GuardrailParams,
  SplurgeParams,
  OneOffExpense,
  AgedCareParams,
  PartnerParams,
  DebtParams,
  YearlyData,
  ProjectionResult,
} from '../types';
import { calculateAgePension } from './agePension';
import { calculateAnnualSpending } from './spending';
import { SCENARIO_RETURNS } from '../data/constants';
import { adjustForInflation } from '../utils/helpers';

export interface ProjectionOptions {
  retirementParams: RetirementParams;
  guardrailParams?: GuardrailParams;
  splurgeParams?: SplurgeParams;
  oneOffExpenses?: OneOffExpense[];
  agedCareParams?: AgedCareParams;
  partnerParams?: PartnerParams;
  debtParams?: DebtParams;
  returns?: number[]; // Optional: custom return sequence (for historical/MC)
  showNominalDollars?: boolean;
}

/**
 * Main retirement projection calculation
 * 
 * Simulates year-by-year retirement from current age to 100,
 * tracking portfolio balances, income, spending, and other factors.
 */
export function calculateRetirementProjection(
  options: ProjectionOptions
): ProjectionResult {
  const {
    retirementParams,
    guardrailParams,
    splurgeParams,
    oneOffExpenses = [],
    agedCareParams,
    partnerParams,
    debtParams,
    returns,
    showNominalDollars = false,
  } = options;

  const chartData: YearlyData[] = [];
  
  // Initialize portfolio state
  let mainSuper = retirementParams.mainSuperBalance;
  let buffer = retirementParams.sequencingBuffer;
  let cash = 0;
  
  const initialTotalBalance = mainSuper + buffer;
  
  // Track pension income (may change with partner mortality)
  let currentPensionIncome = retirementParams.totalPensionIncome;
  
  // Track if in aged care
  let inAgedCare = false;
  let partnerInAgedCare = false;
  let partnerAlive = true;
  let agedCareEntryAge: number | null = null;
  let partnerAgedCareEntryAge: number | null = null;
  
  // Inflation accumulator
  let cumulativeInflation = 1.0;
  
  // Base spending in current dollars (will be adjusted for age/guardrails)
  let baseSpendingReal = retirementParams.baseSpending;

  // Get scenario return rate
  const scenarioReturn = getScenarioReturn(retirementParams.selectedScenario);
  
  // Process debt repayment at retirement if applicable
  if (debtParams?.includeDebt && retirementParams.currentAge >= retirementParams.retirementAge) {
    const totalDebt = debtParams.debts.reduce((sum, debt) => sum + debt.amount, 0);
    // Pay off debts from buffer/super at retirement
    if (buffer >= totalDebt) {
      buffer -= totalDebt;
    } else {
      const remaining = totalDebt - buffer;
      buffer = 0;
      mainSuper = Math.max(0, mainSuper - remaining);
    }
  }

  // Simulate each year from current age to 100
  for (let age = retirementParams.currentAge; age <= 100; age++) {
    const yearIndex = age - retirementParams.currentAge;
    const year = 2026 + yearIndex; // Assuming current year is 2026
    
    // Update cumulative inflation
    cumulativeInflation *= (1 + retirementParams.inflationRate / 100);
    
    // Calculate market return for this year
    let marketReturn: number;
    if (returns && yearIndex < returns.length) {
      // Use provided return sequence (historical or Monte Carlo)
      marketReturn = returns[yearIndex];
    } else {
      // Use scenario-based return
      marketReturn = scenarioReturn;
    }
    
    // Check if retired
    const isRetired = age >= retirementParams.retirementAge;
    
    // Calculate total balance before this year's activity
    const totalBalance = mainSuper + buffer + cash;
    
    // Calculate age pension if eligible and enabled
    let agePension = 0;
    if (isRetired && retirementParams.includeAgePension) {
      agePension = calculateAgePension({
        totalBalance,
        pensionIncome: currentPensionIncome,
        isHomeowner: retirementParams.isHomeowner,
        pensionRecipientType: 'couple', // TODO: Make dynamic based on partner status
      });
      
      // Adjust for inflation
      agePension *= cumulativeInflation;
    }
    
    // Calculate spending for this year
    let spending = 0;
    if (isRetired) {
      // Check if splurge is active this year
      const splurgeActive = splurgeParams 
        ? age >= splurgeParams.splurgeStartAge && 
          age < splurgeParams.splurgeStartAge + splurgeParams.splurgeDuration
        : false;
      
      spending = calculateAnnualSpending({
        baseSpending: baseSpendingReal,
        age,
        spendingPattern: retirementParams.spendingPattern,
        guardrailParams,
        portfolioValue: totalBalance,
        initialPortfolioValue: initialTotalBalance,
        splurgeParams,
        splurgeActive,
      });
      
      // Apply inflation to spending
      spending *= cumulativeInflation;
      
      // Add one-off expenses
      const oneOffThisYear = oneOffExpenses
        .filter(expense => expense.age === age)
        .reduce((sum, expense) => sum + expense.amount * cumulativeInflation, 0);
      
      spending += oneOffThisYear;
    }
    
    // Calculate income
    let income = 0;
    if (isRetired) {
      income = currentPensionIncome * cumulativeInflation + agePension;
    }
    
    // Calculate withdrawal needed
    const withdrawal = Math.max(0, spending - income);
    
    // Process withdrawal (buffer first, then main super)
    if (withdrawal > 0) {
      if (buffer >= withdrawal) {
        buffer -= withdrawal;
      } else {
        const fromBuffer = buffer;
        buffer = 0;
        const remaining = withdrawal - fromBuffer;
        mainSuper = Math.max(0, mainSuper - remaining);
      }
    } else {
      // Surplus - add to cash
      cash += (income - spending);
    }
    
    // Apply market returns to invested assets
    const returnMultiplier = 1 + marketReturn / 100;
    mainSuper *= returnMultiplier;
    buffer *= returnMultiplier;
    
    // Rebalance: if cash builds up, move to buffer
    if (cash > baseSpendingReal * 2 * cumulativeInflation) {
      const excess = cash - baseSpendingReal * cumulativeInflation;
      buffer += excess;
      cash -= excess;
    }
    
    // Convert to real dollars if requested
    const displayMultiplier = showNominalDollars ? 1 : (1 / cumulativeInflation);
    
    // Store yearly data
    chartData.push({
      age,
      year,
      mainSuper: mainSuper * displayMultiplier,
      buffer: buffer * displayMultiplier,
      cash: cash * displayMultiplier,
      totalBalance: (mainSuper + buffer + cash) * displayMultiplier,
      income: income * displayMultiplier,
      spending: spending * displayMultiplier,
      agePension: agePension * displayMultiplier,
      withdrawal: withdrawal * displayMultiplier,
      marketReturn,
      inflationAdjustment: cumulativeInflation,
      baseSpendingReal,
      baseSpendingNominal: baseSpendingReal * cumulativeInflation,
      inAgedCare,
      partnerInAgedCare,
      partnerAlive,
    });
    
    // Check for portfolio exhaustion
    if (mainSuper + buffer + cash <= 0) {
      break;
    }
  }
  
  return {
    chartData,
    medianEndingBalance: chartData[chartData.length - 1]?.totalBalance || 0,
  };
}

/**
 * Get return rate for selected scenario
 */
function getScenarioReturn(scenario: number): number {
  switch (scenario) {
    case 1: return SCENARIO_RETURNS.conservative;
    case 2: return SCENARIO_RETURNS.moderate;
    case 3: return SCENARIO_RETURNS.balanced;
    case 4: return SCENARIO_RETURNS.growth;
    case 5: return SCENARIO_RETURNS.aggressive;
    default: return SCENARIO_RETURNS.balanced;
  }
}

/**
 * Check if retirement projection is successful (doesn't run out of money)
 */
export function isProjectionSuccessful(projection: ProjectionResult): boolean {
  const finalBalance = projection.chartData[projection.chartData.length - 1]?.totalBalance || 0;
  return finalBalance > 0;
}

/**
 * Get the age at which portfolio runs out (if it does)
 */
export function getPortfolioExhaustionAge(projection: ProjectionResult): number | null {
  for (let i = 0; i < projection.chartData.length; i++) {
    if (projection.chartData[i].totalBalance <= 0) {
      return projection.chartData[i].age;
    }
  }
  return null;
}

/**
 * Calculate success rate from multiple projections
 */
export function calculateSuccessRate(projections: ProjectionResult[]): number {
  const successful = projections.filter(isProjectionSuccessful).length;
  return (successful / projections.length) * 100;
}
