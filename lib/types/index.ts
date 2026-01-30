// Core calculation parameters
export interface RetirementParams {
  currentAge: number;
  retirementAge: number;
  mainSuperBalance: number;
  sequencingBuffer: number;
  totalPensionIncome: number;
  baseSpending: number;
  inflationRate: number;
  selectedScenario: number;
  isHomeowner: boolean;
  includeAgePension: boolean;
  spendingPattern: 'constant' | 'jpmorgan' | 'ageadjusted';
  showNominalDollars: boolean;
}

export interface GuardrailParams {
  useGuardrails: boolean;
  upperGuardrail: number;
  lowerGuardrail: number;
  guardrailAdjustment: number;
}

export interface SplurgeParams {
  splurgeAmount: number;
  splurgeStartAge: number;
  splurgeDuration: number;
  splurgeRampDownYears: number;
}

export interface OneOffExpense {
  description: string;
  age: number;
  amount: number;
}

export interface AgedCareParams {
  includeAgedCare: boolean;
  agedCareApproach: 'probabilistic' | 'deterministic';
  agedCareRAD: number;
  agedCareAnnualCost: number;
  deterministicAgedCareAge: number;
  agedCareDuration: number;
  personAtHomeSpending: number;
  deathInCare: boolean;
  includePartnerAgedCare: boolean;
}

export interface PartnerParams {
  partnerAge: number;
  includePartnerMortality: boolean;
  partnerGender: 'male' | 'female';
  pensionReversionary: number;
}

export interface DebtParams {
  includeDebt: boolean;
  debts: Array<{
    name: string;
    amount: number;
    interestRate: number;
    repaymentYears: number;
    extraPayment: number;
  }>;
}

export type PensionRecipientType = 'single' | 'couple';

export interface YearlyData {
  age: number;
  year: number;
  mainSuper: number;
  buffer: number;
  cash: number;
  totalBalance: number;
  income: number;
  spending: number;
  agePension: number;
  withdrawal: number;
  marketReturn: number;
  inflationAdjustment: number;
  baseSpendingReal: number;
  baseSpendingNominal: number;
  inAgedCare?: boolean;
  partnerInAgedCare?: boolean;
  partnerAlive?: boolean;
}

export interface ProjectionResult {
  chartData: YearlyData[];
  successRate?: number;
  medianEndingBalance?: number;
  percentiles?: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

export interface AgePensionParams {
  totalBalance: number;
  pensionIncome: number;
  isHomeowner: boolean;
  pensionRecipientType: PensionRecipientType;
}

export interface ScenarioReturns {
  conservative: number;
  moderate: number;
  balanced: number;
  growth: number;
  aggressive: number;
}
