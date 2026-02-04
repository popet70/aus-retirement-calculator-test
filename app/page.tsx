'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import PdfExportButton from '@/components/PdfExportButton';
import { PartnerDetails, createDefaultPartner, calculateAgePensionForCouple, calculateReversionaryPension } from '@/lib/utils/coupleTracking';
import { CoupleTrackingPanel } from '@/components/CoupleTrackingPanel';


const InfoTooltip = ({ text }: { text: string }) => {
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: '4px' }}>
      <span 
        style={{ 
          color: '#2563eb', 
          cursor: 'help', 
          fontSize: '14px',
          fontWeight: 'bold'
        }}
        title={text}
      >
        ⓘ
      </span>
    </span>
  );
};

// Custom tooltip that shows partner ages when couple tracking is enabled
const CustomChartTooltip = ({ active, payload, label, enableCoupleTracking, partner1Name, partner2Name }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const showPartnerAges = enableCoupleTracking && data.partner1Age !== null;
    
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold mb-1">Year {label}</p>
        {showPartnerAges && (
          <p className="text-xs text-gray-600 mb-2">
            {partner1Name}: Age {data.partner1Age} | {partner2Name}: Age {data.partner2Age}
          </p>
        )}
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const RetirementCalculator = () => {
  const [mainSuperBalance, setMainSuperBalance] = useState(1360000);
  const [sequencingBuffer, setSequencingBuffer] = useState(200000);
  const [totalPensionIncome, setTotalPensionIncome] = useState(101000);
  const [baseSpending, setBaseSpending] = useState(120000);
  const [selectedScenario, setSelectedScenario] = useState(4);
  const [isHomeowner, setIsHomeowner] = useState(true);
  const [includeAgePension, setIncludeAgePension] = useState(true);
  const [spendingPattern, setSpendingPattern] = useState('jpmorgan');
  const [useGuardrails, setUseGuardrails] = useState(false);
  const [upperGuardrail, setUpperGuardrail] = useState(20);
  const [lowerGuardrail, setLowerGuardrail] = useState(15);
  const [guardrailAdjustment, setGuardrailAdjustment] = useState(10);
  const [showNominalDollars, setShowNominalDollars] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [inflationRate, setInflationRate] = useState(2.5);
  const [useHistoricalData, setUseHistoricalData] = useState(false);
  const [useMonteCarlo, setUseMonteCarlo] = useState(false);
  const [useFormalTest, setUseFormalTest] = useState(false);
  const [useComprehensive, setUseComprehensive] = useState(false);
  const [historicalPeriod, setHistoricalPeriod] = useState('gfc2008');
  const [monteCarloRuns, setMonteCarloRuns] = useState(1000);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [returnVolatility, setReturnVolatility] = useState(18);
  const [monteCarloResults, setMonteCarloResults] = useState<any>(null);
  const [useHistoricalMonteCarlo, setUseHistoricalMonteCarlo] = useState(false);
  const [historicalMethod, setHistoricalMethod] = useState<'shuffle' | 'overlapping' | 'block'>('overlapping');
  const [blockSize, setBlockSize] = useState(5);
  const [historicalMonteCarloResults, setHistoricalMonteCarloResults] = useState<any>(null);
  const [showPercentileBands, setShowPercentileBands] = useState(true);
  const [formalTestResults, setFormalTestResults] = useState(null);
  const [selectedFormalTest, setSelectedFormalTest] = useState<string | null>(null);
  const [splurgeAmount, setSplurgeAmount] = useState(0);
  const [splurgeStartAge, setSplurgeStartAge] = useState(65);
  const [splurgeDuration, setSplurgeDuration] = useState(5);
  const [splurgeRampDownYears, setSplurgeRampDownYears] = useState(0);
  const [oneOffExpenses, setOneOffExpenses] = useState([
    { description: 'Major Appliance Replacement', age: 64, amount: 12000 },
    { description: 'Technology Refresh', age: 62, amount: 5000 },
    { description: 'Unexpected Home Repairs', age: 64, amount: 10000 },
    { description: 'Vehicle Replacement', age: 68, amount: 60000 },
    { description: 'Second Appliance Cycle', age: 68, amount: 10000 },
    { description: 'Home Maintenance', age: 70, amount: 25000 },
    { description: 'Technology Upgrade #2', age: 72, amount: 6000 },
    { description: 'Medical/Dental Work', age: 74, amount: 20000 },
    { description: 'Minor Accessibility Mods', age: 75, amount: 10000 },
    { description: 'Major Home Maintenance #2', age: 77, amount: 35000 },
    { description: 'Third Vehicle', age: 78, amount: 60000 },
    { description: 'Appliance Cycle #3', age: 79, amount: 12000 },
    { description: 'Significant Accessibility Modifications', age: 82, amount: 30000 },
    { description: 'In-home Care Setup', age: 84, amount: 15000 }
  ]);
  const [includeOneOffExpenses, setIncludeOneOffExpenses] = useState(true); // Toggle to enable/disable
  const [showOneOffExpenses, setShowOneOffExpenses] = useState(false);
  const [showPensionSummary, setShowPensionSummary] = useState(true);
  const [showPensionDetails, setShowPensionDetails] = useState(false);
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false);
  
  // What-If Scenario Comparison
  const [showWhatIfComparison, setShowWhatIfComparison] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<Array<{
    name: string;
    timestamp: number;
    params: {
      mainSuper: number;
      pension: number;
      retirementAge: number;
      baseSpending: number;
      splurgeAmount: number;
      splurgeDuration: number;
      selectedScenario: number;
      useHistoricalData: boolean;
      historicalPeriod: string;
      useMonteCarlo: boolean;
      useFormalTest: boolean;
    };
    results: {
      endingBalance: number;
      yearsLasted: number;
      success: boolean;
      mcSuccessRate?: number;
      formalTestsPassed?: number;
      formalTestsTotal?: number;
    };
  }>>([]);
  const [currentAge, setCurrentAge] = useState(55);
  const [retirementAge, setRetirementAge] = useState(60);
  const [pensionRecipientType, setPensionRecipientType] = useState<'single' | 'couple'>('couple');
  
  // Couple Tracking
  const [enableCoupleTracking, setEnableCoupleTracking] = useState(false);
  const [partner1, setPartner1] = useState<PartnerDetails>({
    name: 'Partner 1',
    currentAge: 55,
    retirementAge: 60,
    superBalance: 1000000,
    pensionIncome: 10000,
    reversionaryRate: 67,
    gender: 'male',
    deathAge: 85,
    preRetirementIncome: 0,
  });
  const [partner2, setPartner2] = useState<PartnerDetails>({
    name: 'Partner 2',
    currentAge: 56,
    retirementAge: 60,
    superBalance: 0,
    pensionIncome: 100000,
    reversionaryRate: 67,
    gender: 'female',
    deathAge: 89,
    preRetirementIncome: 0,
});
  const [deathScenario, setDeathScenario] = useState<'both-alive' | 'partner1-dies' | 'partner2-dies'>('both-alive');
  const [singleSpendingMultiplier, setSingleSpendingMultiplier] = useState(0.65); // Single person uses ~65% of couple spending

  // Disclaimer
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const TERMS_VERSION = 'v1.0';
  const [showTerms, setShowTerms] = useState(false);

  const [showAssumptions, setShowAssumptions] = useState(false);
  
  // Aged Care Configuration
  const [includeAgedCare, setIncludeAgedCare] = useState(false);
  const [agedCareApproach, setAgedCareApproach] = useState<'probabilistic' | 'deterministic'>('probabilistic');
  const [agedCareRAD, setAgedCareRAD] = useState(400000); // Refundable Accommodation Deposit
  const [agedCareAnnualCost, setAgedCareAnnualCost] = useState(65000); // Basic + means-tested fees
  const [deterministicAgedCareAge, setDeterministicAgedCareAge] = useState(85);
  const [agedCareDuration, setAgedCareDuration] = useState(3); // Average stay duration
  const [personAtHomeSpending, setPersonAtHomeSpending] = useState(0.70); // Person at home needs 70% of couple spending
  const [deathInCare, setDeathInCare] = useState(true); // Assume death in aged care (vs exit)
  
  // Partner configuration for aged care
  const [partnerAge, setPartnerAge] = useState(55); // Simone's age
  const [includePartnerAgedCare, setIncludePartnerAgedCare] = useState(true);
  
  // Partner Mortality Modeling
  const [includePartnerMortality, setIncludePartnerMortality] = useState(false);
  const [partnerGender, setPartnerGender] = useState<'male' | 'female'>('female');
  const [pensionReversionary, setPensionReversionary] = useState(0.67); // PSS/CSS reversionary percentage

  // Debt Repayment at Retirement
  const [includeDebt, setIncludeDebt] = useState(false);
  const [debts, setDebts] = useState<Array<{
    name: string;
    amount: number;
    interestRate: number;
    repaymentYears: number;
    extraPayment: number;
  }>>([
    { name: 'Home Mortgage', amount: 200000, interestRate: 5.5, repaymentYears: 10, extraPayment: 0 }
  ]);
  
  // Validation State
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [validationWarnings, setValidationWarnings] = useState<{[key: string]: string}>({});
  
  // Validation Function
  const validateInputs = () => {
    const errors: {[key: string]: string} = {};
    const warnings: {[key: string]: string} = {};
    
    // Basic financial validations
    if (mainSuperBalance < 0) errors.mainSuper = "Super balance cannot be negative";
    if (sequencingBuffer < 0) errors.seqBuffer = "Sequencing buffer cannot be negative";
    if (totalPensionIncome < 0) errors.pension = "Pension income cannot be negative";
    if (baseSpending < 0) errors.spending = "Base spending cannot be negative";
    
    // Reasonable bounds warnings
    if (mainSuperBalance > 10000000) warnings.mainSuper = "Super balance over $10M is unusual - verify this value";
    if (baseSpending < 30000) warnings.spending = "Annual spending below $30k is quite low - is this correct?";
    if (baseSpending > 300000) warnings.spending = "Annual spending over $300k is very high - verify this value";
    
    // Spending vs resources
    const totalResources = mainSuperBalance + sequencingBuffer + (enableCoupleTracking ? 0 : totalPensionIncome * 20);
    if (baseSpending > totalResources / 10) {
      warnings.sustainability = "Spending rate is high relative to resources - plan may not be sustainable";
    }
    
    // Couple tracking validations
    if (enableCoupleTracking && pensionRecipientType === 'couple') {
      if (partner1.superBalance < 0) errors.p1Super = "Partner 1 super cannot be negative";
      if (partner2.superBalance < 0) errors.p2Super = "Partner 2 super cannot be negative";
      if (partner1.pensionIncome < 0) errors.p1Pension = "Partner 1 pension cannot be negative";
      if (partner2.pensionIncome < 0) errors.p2Pension = "Partner 2 pension cannot be negative";
      
      if (partner1.retirementAge < partner1.currentAge) {
        errors.p1Retirement = "Partner 1 retirement age must be >= current age";
      }
      if (partner2.retirementAge < partner2.currentAge) {
        errors.p2Retirement = "Partner 2 retirement age must be >= current age";
      }
      
      if (partner1.deathAge <= partner1.currentAge) {
        errors.p1Death = "Partner 1 modeled death age must be > current age";
      }
      if (partner2.deathAge <= partner2.currentAge) {
        errors.p2Death = "Partner 2 modeled death age must be > current age";
      }
      
      if (partner1.deathAge < partner1.retirementAge) {
        warnings.p1DeathEarly = "Partner 1 dies before retirement in this scenario";
      }
      if (partner2.deathAge < partner2.retirementAge) {
        warnings.p2DeathEarly = "Partner 2 dies before retirement in this scenario";
      }
      
      // Pre-retirement income validation
      if (partner1.currentAge < partner1.retirementAge && partner1.preRetirementIncome === 0) {
        warnings.p1PreRetire = "Partner 1 not yet retired but has no pre-retirement income";
      }
      if (partner2.currentAge < partner2.retirementAge && partner2.preRetirementIncome === 0) {
        warnings.p2PreRetire = "Partner 2 not yet retired but has no pre-retirement income";
      }
      
      if (partner1.reversionaryRate < 0 || partner1.reversionaryRate > 100) {
        errors.p1Rev = "Reversionary rate must be between 0-100%";
      }
      if (partner2.reversionaryRate < 0 || partner2.reversionaryRate > 100) {
        errors.p2Rev = "Reversionary rate must be between 0-100%";
      }
    } else {
      // Simple mode validations
      if (retirementAge < currentAge) {
        errors.retirement = "Retirement age must be >= current age";
      }
    }
    
    // Inflation validation
    if (inflationRate < 0) errors.inflation = "Inflation rate cannot be negative";
    if (inflationRate > 10) warnings.inflation = "Inflation over 10% is very high - verify this assumption";
    
    // Monte Carlo validations
    if (useMonteCarlo || useHistoricalMonteCarlo) {
      if (monteCarloRuns < 100) warnings.mcRuns = "Fewer than 100 runs may not provide reliable results";
      if (monteCarloRuns > 10000) warnings.mcRuns = "More than 10,000 runs may be slow to calculate";
      if (expectedReturn < -10 || expectedReturn > 20) {
        errors.expectedReturn = "Expected return should be between -10% and 20%";
      }
      if (returnVolatility < 0 || returnVolatility > 50) {
        errors.volatility = "Return volatility should be between 0% and 50%";
      }
    }
    
    // Guardrails validation
    if (useGuardrails) {
      if (upperGuardrail <= lowerGuardrail) {
        errors.guardrails = "Upper guardrail must be > lower guardrail";
      }
      if (lowerGuardrail < 5) warnings.lowerGuardrail = "Lower guardrail below 5% is very aggressive";
      if (upperGuardrail > 50) warnings.upperGuardrail = "Upper guardrail above 50% is very wide";
      if (guardrailAdjustment < 1 || guardrailAdjustment > 30) {
        warnings.guardrailAdj = "Guardrail adjustment should typically be 5-20%";
      }
    }
    
    // Splurge validation
    if (splurgeAmount > 0) {
      if (splurgeAmount > baseSpending) {
        warnings.splurge = "Splurge amount exceeds base spending - verify this is intentional";
      }
      if (splurgeStartAge < currentAge) {
        errors.splurgeStart = "Splurge start age cannot be in the past";
      }
      if (splurgeDuration < 1) errors.splurgeDuration = "Splurge duration must be at least 1 year";
      if (splurgeDuration > 20) warnings.splurgeDuration = "Splurge duration over 20 years is unusual";
    }
    
    // Aged Care validation
    if (includeAgedCare) {
      if (agedCareRAD < 0) errors.agedCareRAD = "RAD cannot be negative";
      if (agedCareRAD > 1000000) warnings.agedCareRAD = "RAD over $1M is very high - verify this amount";
      if (agedCareAnnualCost < 0) errors.agedCareCost = "Annual aged care cost cannot be negative";
      if (agedCareDuration < 1) errors.agedCareDuration = "Aged care duration must be at least 1 year";
      
      if (agedCareApproach === 'deterministic') {
        if (deterministicAgedCareAge < currentAge) {
          errors.agedCareAge = "Aged care entry age cannot be in the past";
        }
        if (deterministicAgedCareAge > 100) {
          warnings.agedCareAge = "Aged care entry after age 100 is unusual";
        }
      }
    }
    
    // Debt validation
    if (includeDebt && debts.length > 0) {
      debts.forEach((debt, idx) => {
        if (debt.amount < 0) errors[`debt${idx}Amount`] = `Debt ${idx + 1}: Amount cannot be negative`;
        if (debt.interestRate < 0) errors[`debt${idx}Rate`] = `Debt ${idx + 1}: Interest rate cannot be negative`;
        if (debt.interestRate > 30) warnings[`debt${idx}Rate`] = `Debt ${idx + 1}: Interest rate over 30% is very high`;
        if (debt.repaymentYears < 1) errors[`debt${idx}Years`] = `Debt ${idx + 1}: Term must be at least 1 year`;
        if (debt.repaymentYears > 30) warnings[`debt${idx}Years`] = `Debt ${idx + 1}: Term over 30 years is unusual`;
        if (debt.extraPayment < 0) errors[`debt${idx}Extra`] = `Debt ${idx + 1}: Extra payment cannot be negative`;
      });
    }
    
    setValidationErrors(errors);
    setValidationWarnings(warnings);
    
    return Object.keys(errors).length === 0;
  };
  
  // Run validation whenever key inputs change
  useEffect(() => {
    validateInputs();
  }, [mainSuperBalance, sequencingBuffer, totalPensionIncome, baseSpending, currentAge, retirementAge,
      enableCoupleTracking, partner1, partner2, inflationRate, useMonteCarlo, useHistoricalMonteCarlo,
      monteCarloRuns, expectedReturn, returnVolatility, useGuardrails, upperGuardrail, lowerGuardrail,
      guardrailAdjustment, splurgeAmount, splurgeStartAge, splurgeDuration, includeAgedCare,
      agedCareRAD, agedCareAnnualCost, agedCareDuration, agedCareApproach, deterministicAgedCareAge,
      includeDebt, debts]);
  
  useEffect(() => {
    const accepted = localStorage.getItem(`termsAccepted_${TERMS_VERSION}`);
    if (accepted === 'true') {
      setTermsAcknowledged(true);
    }
    setIsMounted(true);
  }, []);

  const acknowledgeTerms = () => {
    localStorage.setItem(`termsAccepted_${TERMS_VERSION}`, 'true');
    setTermsAcknowledged(true);
  };

  // Calculate retirement year based on current age
  const getRetirementYear = (retAge: number) => {
    const currentYear = 2026;
    const yearsUntilRetirement = retAge - currentAge;
    return currentYear + yearsUntilRetirement;
  };
  
  // Calculate calendar year for any simulation year
  const getCalendarYear = (simulationYear: number) => {
    if (enableCoupleTracking && pensionRecipientType === 'couple') {
      // Year 1 = first retirement
      const yearsUntilPartner1Retires = partner1.retirementAge - partner1.currentAge;
      const yearsUntilPartner2Retires = partner2.retirementAge - partner2.currentAge;
      const yearsUntilFirstRetirement = Math.min(yearsUntilPartner1Retires, yearsUntilPartner2Retires);
      const firstRetirementYear = 2026 + yearsUntilFirstRetirement;
      return firstRetirementYear + (simulationYear - 1);
    } else {
      // Simple mode
      return getRetirementYear(retirementAge) + (simulationYear - 1);
    }
  };

  const historicalReturns = {
    gfc2008: [-37,26,15,2,16,32,14,1,12,22,-4,29,19,31,-18,27,16,21,12,26,18,22,15,28,8,18,12,20,15,18,17,16,18,17,18],
    covid2020: [-18,27,16,21,12,26,18,22,15,28,8,18,12,20,15,18,22,16,19,24,11,17,14,21,13,19,16,23,12,18,17,18,16,19,17],
    depression1929: [-8,-25,-43,-8,54,48,-1,33,-35,31,26,0,-10,29,-12,34,20,36,25,6,19,31,24,18,16,7,21,43,32,19,23,20,18,22,19],
    dotcom2000: [-9,-12,-22,29,11,5,16,6,-37,26,15,2,16,32,14,1,12,22,-4,29,19,31,-18,27,16,21,12,26,18,22,19,20,17,18,19],
    stagflation1973: [-15,-26,37,24,-7,7,18,32,22,6,-5,21,5,16,32,18,-3,31,21,7,12,16,15,22,18,26,19,28,14,20,18,19,20,17,19],
    bullmarket1982: [22,23,6,32,18,5,17,32,31,19,-3,38,23,33,28,21,10,-9,-12,-22,29,11,5,16,6,-37,26,15,2,16,14,12,15,11,13]
  };

  const historicalLabels = {
    gfc2008: '2008 Global Financial Crisis',
    covid2020: '2020 COVID-19 Pandemic',
    depression1929: '1929 Great Depression',
    dotcom2000: '2000 Dot-com Crash',
    stagflation1973: '1973 Stagflation Crisis',
    bullmarket1982: '1982 Bull Market'
  };

  const formalTests = {
    A1: { name: 'A1: Base Case', returns: Array(35).fill(5), cpi: 2.5, desc: '5% return, baseline test', health: false, years: 35 },
    A2: { name: 'A2: Low Returns', returns: Array(35).fill(3.5), cpi: 2.5, desc: '3.5% return, structural test', health: false, years: 35 },
    B1: { name: 'B1: Crash', returns: [-25,-15,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5], cpi: 2.5, desc: 'Immediate crash then recovery', health: false, years: 35 },
    B2: { name: 'B2: Bear Market', returns: [0,0,0,0,0,0,0,0,0,0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5], cpi: 2.5, desc: '10 years zero return', health: false, years: 35 },
    B3: { name: 'B3: High Volatility', returns: [12,-18,15,-12,20,-15,18,-10,10,-8,15,-12,8,-5,12,-8,10,-6,8,-4,7,-3,6,-2,5,5,5,5,5,5,5,5,5,5,5], cpi: 2.5, desc: 'High volatility 5% average', health: false, years: 35 },
    C1: { name: 'C1: High Inflation', returns: Array(35).fill(5), cpi: 5, desc: '5% CPI entire period', health: false, years: 35 },
    D1: { name: 'D1: Extreme Longevity', returns: Array(45).fill(5), cpi: 2.5, desc: 'Survival to age 105', health: false, years: 45 },
    G1: { name: 'G1: Health Shock', returns: Array(35).fill(5), cpi: 2.5, desc: '$30k/year from age 75', health: true, years: 35 },
    H1: { name: 'H1: Worst Case', returns: [-25,-15,5,0,0,0,0,0,0,0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5], cpi: 5, desc: 'Crash + High CPI + Health', health: true, years: 35 }
  };

  // Historical market data: S&P 500 Total Return Index (1928-2025, 98 years)
  // Source: Robert Shiller (Yale University) and Ibbotson SBBI
  // Data represents actual annual total returns (price appreciation + reinvested dividends)
  // This is verified, authoritative data used by financial professionals worldwide
  const historicalMarketData = [
    // 1928-1940: Great Depression era
    { year: 1928, return: 43.8 }, { year: 1929, return: -8.4 }, { year: 1930, return: -25.1 },
    { year: 1931, return: -43.3 }, { year: 1932, return: -8.2 }, { year: 1933, return: 54.0 },
    { year: 1934, return: -1.4 }, { year: 1935, return: 47.7 }, { year: 1936, return: 33.9 },
    { year: 1937, return: -35.0 }, { year: 1938, return: 31.1 }, { year: 1939, return: -0.4 },
    { year: 1940, return: -9.8 },
    // 1941-1960: WWII and post-war boom
    { year: 1941, return: -11.6 }, { year: 1942, return: 20.3 }, { year: 1943, return: 25.9 },
    { year: 1944, return: 19.8 }, { year: 1945, return: 36.4 }, { year: 1946, return: -8.1 },
    { year: 1947, return: 5.7 }, { year: 1948, return: 5.5 }, { year: 1949, return: 18.8 },
    { year: 1950, return: 31.7 }, { year: 1951, return: 24.0 }, { year: 1952, return: 18.4 },
    { year: 1953, return: -1.0 }, { year: 1954, return: 52.6 }, { year: 1955, return: 31.6 },
    { year: 1956, return: 6.6 }, { year: 1957, return: -10.8 }, { year: 1958, return: 43.4 },
    { year: 1959, return: 12.0 }, { year: 1960, return: 0.5 },
    // 1961-1980: Growth, then stagflation
    { year: 1961, return: 26.9 }, { year: 1962, return: -8.7 }, { year: 1963, return: 22.8 },
    { year: 1964, return: 16.5 }, { year: 1965, return: 12.5 }, { year: 1966, return: -10.1 },
    { year: 1967, return: 24.0 }, { year: 1968, return: 11.1 }, { year: 1969, return: -8.5 },
    { year: 1970, return: 4.0 }, { year: 1971, return: 14.3 }, { year: 1972, return: 19.0 },
    { year: 1973, return: -14.7 }, { year: 1974, return: -26.5 }, { year: 1975, return: 37.2 },
    { year: 1976, return: 23.8 }, { year: 1977, return: -7.2 }, { year: 1978, return: 6.6 },
    { year: 1979, return: 18.4 }, { year: 1980, return: 32.4 },
    // 1981-2000: Reagan/Thatcher era, dot-com boom
    { year: 1981, return: -4.9 }, { year: 1982, return: 21.4 }, { year: 1983, return: 22.5 },
    { year: 1984, return: 6.3 }, { year: 1985, return: 32.2 }, { year: 1986, return: 18.5 },
    { year: 1987, return: 5.2 }, { year: 1988, return: 16.8 }, { year: 1989, return: 31.5 },
    { year: 1990, return: -3.2 }, { year: 1991, return: 30.5 }, { year: 1992, return: 7.7 },
    { year: 1993, return: 10.0 }, { year: 1994, return: 1.3 }, { year: 1995, return: 37.4 },
    { year: 1996, return: 23.1 }, { year: 1997, return: 33.4 }, { year: 1998, return: 28.6 },
    { year: 1999, return: 21.0 }, { year: 2000, return: -9.1 },
    // 2001-2025: Dot-com crash, GFC, COVID, recent
    { year: 2001, return: -11.9 }, { year: 2002, return: -22.1 }, { year: 2003, return: 28.7 },
    { year: 2004, return: 10.9 }, { year: 2005, return: 4.9 }, { year: 2006, return: 15.8 },
    { year: 2007, return: 5.5 }, { year: 2008, return: -37.0 }, { year: 2009, return: 26.5 },
    { year: 2010, return: 15.1 }, { year: 2011, return: 2.1 }, { year: 2012, return: 16.0 },
    { year: 2013, return: 32.4 }, { year: 2014, return: 13.7 }, { year: 2015, return: 1.4 },
    { year: 2016, return: 12.0 }, { year: 2017, return: 21.8 }, { year: 2018, return: -4.4 },
    { year: 2019, return: 31.5 }, { year: 2020, return: 18.4 }, { year: 2021, return: 28.7 },
    { year: 2022, return: -18.1 }, { year: 2023, return: 26.3 }, { year: 2024, return: 23.3 },
    { year: 2025, return: 12.1 }
  ];

  // Auto-switch aged care to deterministic when leaving Monte Carlo scenarios
  useEffect(() => {
    if (includeAgedCare && agedCareApproach === 'probabilistic' && !useMonteCarlo && !useHistoricalMonteCarlo) {
      setAgedCareApproach('deterministic');
    }
  }, [useMonteCarlo, useHistoricalMonteCarlo, includeAgedCare, agedCareApproach]);

 // Clear Monte Carlo results when key parameters change to force re-run
  // This ensures charts update when you change settings
  useEffect(() => {
    if (monteCarloResults !== null || historicalMonteCarloResults !== null) {
      setMonteCarloResults(null);
      setHistoricalMonteCarloResults(null);
    }
  }, [mainSuperBalance, sequencingBuffer, baseSpending, includeAgedCare, agedCareApproach, 
      deterministicAgedCareAge, agedCareDuration, agedCareRAD, agedCareAnnualCost,
      includeDebt, debts, useGuardrails, includeAgePension, totalPensionIncome,
      splurgeAmount, splurgeStartAge, splurgeDuration, splurgeRampDownYears, oneOffExpenses, 
      upperGuardrail, lowerGuardrail, guardrailAdjustment, pensionRecipientType,
      includePartnerMortality, partnerAge, deathInCare, personAtHomeSpending]);
  
  const runFormalTests = () => {
    const results: any = {};
    Object.keys(formalTests).forEach((key: string) => {
      const test = formalTests[key as keyof typeof formalTests];
      const simResult = runSimulation(test.returns, test.cpi, test.health, test.years);
      const targetYears = test.years;
      const passed = simResult && simResult.length >= targetYears && simResult[simResult.length - 1].totalBalance >= 0;
      results[key] = {
        name: test.name,
        desc: test.desc,
        passed: passed,
        finalBalance: simResult && simResult.length > 0 ? simResult[simResult.length - 1].totalBalance : 0,
        yearsLasted: simResult ? simResult.length : 0,
        targetYears: targetYears,
        simulationData: simResult
      };
    });
    return results;
  };

  const agePensionParams = useMemo(() => {
    if (pensionRecipientType === 'single') {
      return {
        eligibilityAge: 67,
        maxPensionPerYear: 29754,  // Single rate
        assetTestThresholdHomeowner: 314000,
        assetTestCutoffHomeowner: 695500,
        assetTestThresholdNonHomeowner: 566000,
        assetTestCutoffNonHomeowner: 947500,
        assetTaperPerYear: 78,
        incomeTestFreeArea: 5512,  // Single rate
        incomeTaperRate: 0.50
      };
    } else {
      return {
        eligibilityAge: 67,
        maxPensionPerYear: 44855,  // Couple rate (combined)
        assetTestThresholdHomeowner: 451500,
        assetTestCutoffHomeowner: 986500,
        assetTestThresholdNonHomeowner: 675500,
        assetTestCutoffNonHomeowner: 1210500,
        assetTaperPerYear: 78,
        incomeTestFreeArea: 8736,  // Couple rate
        incomeTaperRate: 0.50
      };
    }
  }, [pensionRecipientType]);

  // Get CSS class for input fields based on validation
  const getInputClass = (fieldKey: string, baseClass: string = "w-full p-2 border rounded") => {
    if (validationErrors[fieldKey]) {
      return `${baseClass} border-red-500 bg-red-50`;
    }
    if (validationWarnings[fieldKey]) {
      return `${baseClass} border-yellow-400 bg-yellow-50`;
    }
    return baseClass;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value);
  };

  // Convert value for display
  // Simulation stores values in NOMINAL dollars (inflation-adjusted forward from retirement year)
  // year is years from retirement (1-35)
  const toDisplayValue = (value: number, year = 1, cpi?: number) => {
    if (showNominalDollars) {
      // Show nominal - simulation values are already nominal
      return value;
    } else {
      // Convert from nominal to real retirement year dollars by deflating
      // Use provided CPI rate if available (for formal tests with different CPI), otherwise use global inflationRate
      const cpiToUse = cpi !== undefined ? cpi : inflationRate;
      return value / Math.pow(1 + cpiToUse / 100, year - 1);
    }
  };

   const splurgeSummary = useMemo(() => {
    if (splurgeAmount === 0) {
      return { 
        enabled: false, 
        message: "Set splurge amount above $0 to activate", 
        totalSplurge: 0, 
        activePeriod: '', 
        annualImpact: '',
        rampDownPeriod: '',
        totalWithRampDown: 0
      };
    }
    
    const totalSplurge = splurgeAmount * splurgeDuration;
    const endAge = splurgeStartAge + splurgeDuration - 1;
    const rampDownEndAge = endAge + splurgeRampDownYears;
    const startYear = getRetirementYear(retirementAge) + (splurgeStartAge - retirementAge);
    const endYear = startYear + splurgeDuration - 1;
    const rampDownEndYear = endYear + splurgeRampDownYears;
    const combinedSpending = baseSpending + splurgeAmount;
    
    // Calculate total ramp-down spending (triangular sum: average * years)
    const rampDownTotal = splurgeRampDownYears > 0 
      ? (splurgeAmount * splurgeRampDownYears) / 2 
      : 0;
    
    return {
      enabled: true,
      totalSplurge,
      activePeriod: `Age ${splurgeStartAge} to ${endAge} (${startYear}-${endYear})`,
      annualImpact: `Combined spending ${formatCurrency(combinedSpending)}/year`,
      rampDownPeriod: splurgeRampDownYears > 0 
        ? `Ramp-down age ${endAge + 1} to ${rampDownEndAge} (${endYear + 1}-${rampDownEndYear})` 
        : '',
      totalWithRampDown: totalSplurge + rampDownTotal
    };
  }, [splurgeAmount, splurgeStartAge, splurgeDuration, splurgeRampDownYears, baseSpending, retirementAge, currentAge]);

  const getSpendingMultiplier = (year: number) => {
    if (spendingPattern === 'cpi') {
      return 1.0;
    } else {
      // JP Morgan declining pattern
      if (year <= 10) {
        return Math.pow(0.982, year - 1);
      } else if (year <= 20) {
        const year10Multiplier = Math.pow(0.982, 9);
        return year10Multiplier * Math.pow(0.986, year - 10);
      } else {
        const year10Multiplier = Math.pow(0.982, 9);
        const year20Multiplier = year10Multiplier * Math.pow(0.986, 10);
        return year20Multiplier * Math.pow(0.999, year - 20);
      }
    }
  };

  const getMinimumDrawdown = (age: number, balance: number) => {
    if (balance <= 0) return 0;
    let rate;
    if (age < 65) rate = 0.04;
    else if (age < 75) rate = 0.05;
    else if (age < 80) rate = 0.06;
    else if (age < 85) rate = 0.07;
    else if (age < 90) rate = 0.09;
    else if (age < 95) rate = 0.11;
    else rate = 0.14;
    return balance * rate;
  };

  // Calculate probability of needing aged care by age
  // Based on Australian data: ~30% of people use residential aged care
  // Risk increases sharply after 80
  const getAgedCareProbability = (age: number) => {
    if (age < 75) return 0.02; // 2% cumulative by 75
    if (age < 80) return 0.05; // 5% by 80
    if (age < 85) return 0.15; // 15% by 85
    if (age < 90) return 0.30; // 30% by 90
    if (age < 95) return 0.45; // 45% by 95
    return 0.55; // 55% by 100
  };

  // Calculate aged care costs for a given year
  // Returns: { radRequired, annualCost, inAgedCare }
  const getAgedCareCosts = (
    age: number, 
    year: number, 
    cpiRate: number,
    randomValue: number, // For probabilistic approach
    currentlyInCare: boolean,
    yearsInCare: number
  ) => {
    if (!includeAgedCare) return { radRequired: 0, annualCost: 0, inAgedCare: false, yearsInCare: 0 };

    let inAgedCare = currentlyInCare;
    let newYearsInCare = yearsInCare;

    if (agedCareApproach === 'deterministic') {
      // Simple: enter at specified age, stay for specified duration
      if (age >= deterministicAgedCareAge && age < deterministicAgedCareAge + agedCareDuration) {
        inAgedCare = true;
        newYearsInCare = age - deterministicAgedCareAge + 1;
      } else if (age >= deterministicAgedCareAge + agedCareDuration) {
        // Exited care after completing duration
        inAgedCare = false;
        newYearsInCare = 0;
      }
    } else {
      // Probabilistic: use age-based probability and random value
      if (!currentlyInCare) {
        const probability = getAgedCareProbability(age);
        // Check if this is the year they enter care
        // Use cumulative approach: if random value < probability for this age band
        if (randomValue < probability / 100) { // Convert probability to 0-1 range
          inAgedCare = true;
          newYearsInCare = 1;
        }
      } else {
        // Already in care, continue until duration expires
        newYearsInCare = yearsInCare + 1;
        if (newYearsInCare <= agedCareDuration) {
          inAgedCare = true;
        } else {
          // Exited care (or died)
          inAgedCare = false;
          newYearsInCare = 0;
        }
      }
    }

    if (!inAgedCare) {
      return { radRequired: 0, annualCost: 0, inAgedCare: false, yearsInCare: newYearsInCare };
    }

    // RAD is required in first year of care
    const inflationAdjustedRAD = newYearsInCare === 1 
      ? agedCareRAD * Math.pow(1 + cpiRate / 100, year - 1)
      : 0;

    // Annual costs increase with CPI
    const inflationAdjustedAnnualCost = agedCareAnnualCost * Math.pow(1 + cpiRate / 100, year - 1);

    return {
      radRequired: inflationAdjustedRAD,
      annualCost: inflationAdjustedAnnualCost,
      inAgedCare: true,
      yearsInCare: newYearsInCare
    };
  };

  // Australian mortality probabilities (probability of death in next year)
  // Based on ABS Life Tables 2020-2022
  const getMortalityProbability = (age: number, gender: 'male' | 'female') => {
    // Simplified Australian life table data
    const maleMortality: { [key: number]: number } = {
      55: 0.0033, 60: 0.0055, 65: 0.0095, 70: 0.0157, 75: 0.0266,
      80: 0.0468, 85: 0.0816, 90: 0.1418, 95: 0.2347, 100: 0.35
    };
    
    const femaleMortality: { [key: number]: number } = {
      55: 0.0020, 60: 0.0031, 65: 0.0052, 70: 0.0091, 75: 0.0160,
      80: 0.0293, 85: 0.0557, 90: 0.1086, 95: 0.1960, 100: 0.32
    };
    
    const table = gender === 'male' ? maleMortality : femaleMortality;
    
    // Find appropriate probability
    if (age < 55) return 0.001; // Very low before 55
    if (age >= 100) return table[100];
    
    // Find bracket
    const brackets = [55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    let lowerBracket = 55;
    for (const bracket of brackets) {
      if (age >= bracket) lowerBracket = bracket;
    }
    
    return table[lowerBracket];
  };

  // Calculate minimum annual payment for amortized loan
  const calculateMinimumDebtPayment = (principal: number, annualRate: number, years: number): number => {
    if (principal <= 0 || years <= 0) return 0;
    if (annualRate === 0) return principal / years;
    
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                           (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return monthlyPayment * 12;
  };

  const runSimulation = (returnSequence: number[], cpiRate: number, healthShock: boolean, maxYears?: number) => {
    // Initialize with STARTING values (both partners alive initially in couple tracking mode)
    let mainSuper: number;
    let seqBuffer: number;
    let startAge: number;
    let initialPortfolio: number;
    
    // Couple tracking state
    let partner1Alive = true;
    let partner2Alive = true;
    let currentPensionIncome: number;
    
    // Track individual super balances for couple tracking
    let partner1Super = 0;
    let partner2Super = 0;
    
    if (enableCoupleTracking && pensionRecipientType === 'couple') {
      // Couple tracking mode - track super separately
      // IMPORTANT: Super balance inputs represent balance AT each partner's retirement
      // Pre-retirement partners start with 0 (we don't model pre-retirement growth/contributions)
      // Their balance gets set to the input value when they actually retire
      
      const yearsUntilPartner1Retires = partner1.retirementAge - partner1.currentAge;
      const yearsUntilPartner2Retires = partner2.retirementAge - partner2.currentAge;
      const yearsUntilFirstRetirement = Math.min(yearsUntilPartner1Retires, yearsUntilPartner2Retires);
      
      // Initialize super balances based on who has already retired at Year 1
      partner1Super = yearsUntilPartner1Retires === yearsUntilFirstRetirement ? partner1.superBalance : 0;
      partner2Super = yearsUntilPartner2Retires === yearsUntilFirstRetirement ? partner2.superBalance : 0;
      
      mainSuper = partner1Super + partner2Super; // Combined for display
      seqBuffer = sequencingBuffer;
      
      // Calculate which partner retires FIRST chronologically (using vars from above)
      if (yearsUntilPartner1Retires <= yearsUntilPartner2Retires) {
        // Partner 1 retires first (or same time)
        startAge = partner1.retirementAge;
      } else {
        // Partner 2 retires first
        startAge = partner2.retirementAge;
      }
      
      initialPortfolio = mainSuper + seqBuffer;
      // Pension income starts at 0, will be added as each partner retires
      currentPensionIncome = 0;
    } else {
      // Simple mode
      mainSuper = mainSuperBalance;
      seqBuffer = sequencingBuffer;
      startAge = retirementAge;
      initialPortfolio = mainSuperBalance + sequencingBuffer;
      currentPensionIncome = totalPensionIncome;
    }
    
    let cashAccount = 0;
    const results = [];
    let currentSpendingBase = baseSpending;
    const initialWithdrawalRate = baseSpending / initialPortfolio;
    const yearsToRun = maxYears || 35;
    
    // Track individual partner ages for death events
    // Year 1 = first retirement, so calculate each partner's age at that time
    let partner1CurrentAge: number;
    let partner2CurrentAge: number;
    
    if (enableCoupleTracking && pensionRecipientType === 'couple') {
      // Calculate which partner retires first chronologically
      const yearsUntilPartner1Retires = partner1.retirementAge - partner1.currentAge;
      const yearsUntilPartner2Retires = partner2.retirementAge - partner2.currentAge;
      
      let yearsUntilFirstRetirement: number;
      if (yearsUntilPartner1Retires <= yearsUntilPartner2Retires) {
        yearsUntilFirstRetirement = yearsUntilPartner1Retires;
      } else {
        yearsUntilFirstRetirement = yearsUntilPartner2Retires;
      }
      
      // Calculate each partner's age at Year 1 (first retirement)
      partner1CurrentAge = partner1.currentAge + yearsUntilFirstRetirement;
      partner2CurrentAge = partner2.currentAge + yearsUntilFirstRetirement;
    } else {
      partner1CurrentAge = currentAge;
      partner2CurrentAge = currentAge;
    }
    
    // Aged care state tracking
    let inAgedCare = false;
    let yearsInAgedCare = 0;
    let radPaid = 0; // Track if RAD has been paid (refundable on exit)
    const agedCareRandomValue = Math.random(); // Single random value for probabilistic aged care
    
    // Partner survival tracking (for aged care death scenario)
    let partnerAlive = pensionRecipientType === 'couple'; // Only relevant if couple
    let spendingAdjustedForSingle = false; // Track if we've already adjusted to single

    // Debt tracking (if enabled)
    const debtBalances = includeDebt ? debts.map(d => ({
      name: d.name,
      balance: d.amount,
      interestRate: d.interestRate,
      repaymentYears: d.repaymentYears,
      extraPayment: d.extraPayment,
      minimumPayment: calculateMinimumDebtPayment(d.amount, d.interestRate, d.repaymentYears)
    })) : [];

    for (let year = 1; year <= yearsToRun; year++) {
      const age = startAge + year - 1;
      let guardrailStatus = 'normal';
      
      // Increment individual partner ages (if couple tracking enabled)
      if (year > 1 && enableCoupleTracking && pensionRecipientType === 'couple') {
        partner1CurrentAge++;
        partner2CurrentAge++;
      }
      
      // COUPLE TRACKING RETIREMENT EVENTS  
      // Track pre-retirement income and add pensions when each partner retires
      let preRetirementIncome = 0;
      if (enableCoupleTracking && pensionRecipientType === 'couple') {
        // Partner 1 - either working or retired
        if (partner1Alive) {
          if (partner1CurrentAge < partner1.retirementAge) {
            // Still working - add pre-retirement income
            preRetirementIncome += partner1.preRetirementIncome;
          } else if (partner1CurrentAge === partner1.retirementAge || (year === 1 && partner1CurrentAge >= partner1.retirementAge)) {
            // Retiring this year - add pension AND initialize super balance
            // Also add if Year 1 and already past retirement age
            currentPensionIncome += partner1.pensionIncome;
            
            // Initialize super balance to configured amount (only if not already set)
            if (partner1Super === 0 && year > 1) {
              partner1Super = partner1.superBalance;
              mainSuper = partner1Super + partner2Super;
            }
          }
          // If already retired (age > retirement), pension already in currentPensionIncome
        }
        
        // Partner 2 - either working or retired
        if (partner2Alive) {
          if (partner2CurrentAge < partner2.retirementAge) {
            // Still working - add pre-retirement income
            preRetirementIncome += partner2.preRetirementIncome;
          } else if (partner2CurrentAge === partner2.retirementAge || (year === 1 && partner2CurrentAge >= partner2.retirementAge)) {
            // Retiring this year - add pension AND initialize super balance
            // Also add if Year 1 and already past retirement age
            currentPensionIncome += partner2.pensionIncome;
            
            // Initialize super balance to configured amount (only if not already set)
            if (partner2Super === 0 && year > 1) {
              partner2Super = partner2.superBalance;
              mainSuper = partner1Super + partner2Super;
            }
          }
          // If already retired (age > retirement), pension already in currentPensionIncome
        }
      }
      
      // COUPLE TRACKING DEATH EVENTS
      // Only apply death events if NOT in "both alive" scenario
      if (enableCoupleTracking && pensionRecipientType === 'couple' && deathScenario !== 'both-alive') {
        // Check Partner 1 death (only if "partner1-dies" scenario selected)
        if (deathScenario === 'partner1-dies' && partner1Alive && partner1CurrentAge >= partner1.deathAge) {
          partner1Alive = false;
          // Transfer Partner 1's super to Partner 2
          partner2Super += partner1Super;
          partner1Super = 0;
          mainSuper = partner1Super + partner2Super;
          // Reduce Partner 1's pension to reversionary rate
          const reversionaryAmount = calculateReversionaryPension(partner1.pensionIncome, partner1.reversionaryRate);
          // Recalculate total: partner1's reversionary + partner2's full (if retired)
          currentPensionIncome = reversionaryAmount;
          if (partner2Alive && partner2CurrentAge >= partner2.retirementAge) {
            currentPensionIncome += partner2.pensionIncome;
          }
          // Reduce spending to single person rate
          currentSpendingBase = baseSpending * singleSpendingMultiplier;
        }
        
        // Check Partner 2 death (only if "partner2-dies" scenario selected)
        if (deathScenario === 'partner2-dies' && partner2Alive && partner2CurrentAge >= partner2.deathAge) {
          partner2Alive = false;
          // Transfer Partner 2's super to Partner 1
          partner1Super += partner2Super;
          partner2Super = 0;
          mainSuper = partner1Super + partner2Super;
          // Reduce Partner 2's pension to reversionary rate
          const reversionaryAmount = calculateReversionaryPension(partner2.pensionIncome, partner2.reversionaryRate);
          // Recalculate total: partner1's full (if retired) + partner2's reversionary
          currentPensionIncome = reversionaryAmount;
          if (partner1Alive && partner1CurrentAge >= partner1.retirementAge) {
            currentPensionIncome += partner1.pensionIncome;
          }
          // Reduce spending to single person rate
          currentSpendingBase = baseSpending * singleSpendingMultiplier;
        }
        
        // If BOTH partners are dead, end simulation but keep final balances
        if (!partner1Alive && !partner2Alive) {
          currentPensionIncome = 0;
          // Don't process any more spending/withdrawals this year
          // Just record final state and end
          results.push({
            year,
            age,
            mainSuper,
            seqBuffer,
            cashAccount,
            totalBalance: mainSuper + seqBuffer + cashAccount,
            spending: 0, // No spending - both dead
            income: 0, // No income - both dead
            pensionIncome: 0,
            agePension: 0,
            withdrawn: 0,
            minDrawdown: 0,
            cpiRate,
            guardrailStatus: 'normal',
            splurgeActive: false,
            oneOffExpense: 0
          });
          break; // End simulation - both dead
        }
      }
      
      // Store starting balances for minimum drawdown calculation
      const startingMainSuper = mainSuper;
      
      // AGED CARE STATUS CHECK (must happen before guardrails)
      // Determine if we're entering, in, or exiting aged care
      // In couple mode: aged care applies to the survivor only
      let relevantAgeForCare = age;
      if (enableCoupleTracking && pensionRecipientType === 'couple') {
        // Use survivor's age for aged care decisions
        if (!partner1Alive && partner2Alive) {
          relevantAgeForCare = partner2CurrentAge;
        } else if (partner1Alive && !partner2Alive) {
          relevantAgeForCare = partner1CurrentAge;
        } else if (partner1Alive && partner2Alive) {
          // Both alive - no aged care yet (as per our note)
          relevantAgeForCare = 999; // High age so it never triggers
        }
      }
      
      const agedCareCosts = getAgedCareCosts(relevantAgeForCare, year, cpiRate, agedCareRandomValue, inAgedCare, yearsInAgedCare);
      const wasInCare = inAgedCare;
      inAgedCare = agedCareCosts.inAgedCare;
      yearsInAgedCare = agedCareCosts.yearsInCare;
      
      // AGED CARE SPENDING ADJUSTMENT (must happen before guardrails)
      // When person enters aged care, adjust base spending to "person at home alone" level
      if (inAgedCare && !spendingAdjustedForSingle && pensionRecipientType === 'couple') {
        currentSpendingBase = baseSpending * personAtHomeSpending;
        spendingAdjustedForSingle = true; // Mark that we've adjusted
      }
      
      // DEATH IN AGED CARE
      // If person was in care and is now exiting, check if they died or recovered
      if (enableCoupleTracking && pensionRecipientType === 'couple') {
        // Couple mode: survivor exits care = they died
        if (wasInCare && !inAgedCare && deathInCare) {
          // Survivor died in aged care
          if (!partner1Alive && partner2Alive) {
            partner2Alive = false;
          } else if (partner1Alive && !partner2Alive) {
            partner1Alive = false;
          }
          // Both now dead - will trigger break in next iteration
        }
      } else {
        // Simple mode: original logic
        if (wasInCare && !inAgedCare && deathInCare && partnerAlive && pensionRecipientType === 'couple') {
          // Partner died in aged care - survivor continues at same spending level
          partnerAlive = false;
          // Spending already at correct single level (personAtHomeSpending %), no change needed
          
        } else if (wasInCare && !inAgedCare && !deathInCare && spendingAdjustedForSingle) {
          // Person recovered and exited care - restore couple spending
          currentSpendingBase = baseSpending; // Restore to original couple level
          spendingAdjustedForSingle = false;
        }
      }
      
      // GUARDRAILS (now uses correct spending base after aged care adjustment)
      if (useGuardrails && year > 1) {
        const currentPortfolio = mainSuper + seqBuffer + cashAccount;
        // Compare withdrawal rates in REAL terms
        const realPortfolio = currentPortfolio / Math.pow(1 + cpiRate / 100, year - 1);
        
        // Calculate total planned spending for this year (base + splurge if applicable)
        let totalPlannedSpending = currentSpendingBase;
        if (splurgeAmount > 0) {
          const splurgeEndAge = splurgeStartAge + splurgeDuration - 1;
          if (age >= splurgeStartAge && age <= splurgeEndAge) {
            totalPlannedSpending += splurgeAmount;
          }
        }
        
        const currentWithdrawalRate = totalPlannedSpending / realPortfolio;
        const safeWithdrawalRate = initialWithdrawalRate;
        const withdrawalRateRatio = (currentWithdrawalRate / safeWithdrawalRate) * 100;
  
  if (withdrawalRateRatio <= 100 - upperGuardrail) {
    guardrailStatus = 'increase';
    currentSpendingBase = currentSpendingBase * (1 + guardrailAdjustment / 100);
  } else if (withdrawalRateRatio >= 100 + lowerGuardrail) {
    guardrailStatus = 'decrease';
    const proposedSpending = currentSpendingBase * (1 - guardrailAdjustment / 100);
    const spendingMultiplier = getSpendingMultiplier(year);
    const indexedPensionFloor = currentPensionIncome / spendingMultiplier;
    currentSpendingBase = Math.max(proposedSpending, indexedPensionFloor);
  }
}
      
      const spendingMultiplier = getSpendingMultiplier(year);
      
      // Calculate base spending in real terms including splurge
      let realBaseSpending = currentSpendingBase;
      
      // Add splurge to base if within the splurge period (in real terms)
      if (splurgeAmount > 0) {
        const splurgeEndAge = splurgeStartAge + splurgeDuration - 1;
        const rampDownEndAge = splurgeEndAge + splurgeRampDownYears;
        
        if (age >= splurgeStartAge && age <= splurgeEndAge) {
          // Full splurge period
          realBaseSpending += splurgeAmount;
        } else if (splurgeRampDownYears > 0 && age > splurgeEndAge && age <= rampDownEndAge) {
          // Ramp-down period - linear decline from splurgeAmount to 0
          const yearsIntoRampDown = age - splurgeEndAge;
          const rampDownFraction = 1 - (yearsIntoRampDown / splurgeRampDownYears);
          const rampDownAmount = splurgeAmount * rampDownFraction;
          realBaseSpending += rampDownAmount;
        }
      }

      
      // Now inflate this combined base to nominal terms
      const inflationAdjustedSpending = realBaseSpending * Math.pow(1 + cpiRate / 100, year - 1);
      
      // Additional costs not subject to guardrails
      let additionalCosts = 0;
      if (healthShock && year >= 15) {
        // Health shock is $30k in REAL terms, must be inflated to nominal
        additionalCosts = 30000 * Math.pow(1 + cpiRate / 100, year - 1);
      }
      
      // Annual aged care fees (not refundable, not subject to guardrails)
      additionalCosts += agedCareCosts.annualCost;
      
      // Debt repayment (not subject to guardrails - unavoidable commitment)
      let totalDebtPayment = 0;
      let totalDebtInterest = 0;
      let totalDebtPrincipal = 0;
      let totalDebtBalance = 0;
      
      if (includeDebt && debtBalances.length > 0) {
        debtBalances.forEach(debt => {
          if (debt.balance > 0) {
            const interestPaid = debt.balance * (debt.interestRate / 100);
            const payment = debt.minimumPayment + debt.extraPayment;
            const actualPayment = Math.min(payment, debt.balance + interestPaid);
            const principalPaid = actualPayment - interestPaid;
            debt.balance = Math.max(0, debt.balance + interestPaid - actualPayment);
            
            totalDebtPayment += actualPayment;
            totalDebtInterest += interestPaid;
            totalDebtPrincipal += principalPaid;
            totalDebtBalance += debt.balance;
          }
        });
        
        additionalCosts += totalDebtPayment;
      }
      
      // RAD (Refundable Accommodation Deposit) - comes from main super as lump sum
      let radWithdrawn = 0;
      if (agedCareCosts.radRequired > 0) {
        radWithdrawn = agedCareCosts.radRequired;
        // Note: radPaid will be set AFTER withdrawal to reflect actual amount paid
      }
      
      // When exiting aged care, RAD is refunded
      let radRefund = 0;
      if (radPaid > 0 && !inAgedCare) {
        radRefund = radPaid;
        radPaid = 0; // Reset after refund
      }
      
      // Add one-off expenses for this age (not subject to guardrails)
      let oneOffAddition = 0;
      if (includeOneOffExpenses) {
        oneOffExpenses.forEach(expense => {
          if (expense.age === age) {
            oneOffAddition += expense.amount;
          }
        });
      }
      
      const totalSpending = inflationAdjustedSpending * spendingMultiplier + additionalCosts + oneOffAddition;

      const totalAssets = mainSuper + seqBuffer;
      
      // Determine which age pension params to use based on couple survival status
      // Handles both couple tracking deaths and aged care deaths
      let activePensionParams = agePensionParams; // Default from state
      if (pensionRecipientType === 'couple') {
        // Check couple tracking deaths OR aged care death
        const anyPartnerDead = (enableCoupleTracking && (!partner1Alive || !partner2Alive)) || !partnerAlive;
        if (anyPartnerDead) {
          activePensionParams = {
            eligibilityAge: 67,
            maxPensionPerYear: 29754,  // Single rate
            assetTestThresholdHomeowner: 314000,
            assetTestCutoffHomeowner: 695500,
            assetTestThresholdNonHomeowner: 566000,
            assetTestCutoffNonHomeowner: 947500,
            assetTaperPerYear: 78,
            incomeTestFreeArea: 5512,  // Single rate
            incomeTaperRate: 0.50
          };
        }
      }
      
      const indexedMaxPension = activePensionParams.maxPensionPerYear * Math.pow(1 + cpiRate / 100, year - 1);
      const indexedThreshold = (isHomeowner ? activePensionParams.assetTestThresholdHomeowner : activePensionParams.assetTestThresholdNonHomeowner) * Math.pow(1 + cpiRate / 100, year - 1);
      const indexedCutoff = (isHomeowner ? activePensionParams.assetTestCutoffHomeowner : activePensionParams.assetTestCutoffNonHomeowner) * Math.pow(1 + cpiRate / 100, year - 1);
      const indexedTaper = activePensionParams.assetTaperPerYear * Math.pow(1 + cpiRate / 100, year - 1);
      const indexedPensionIncome = currentPensionIncome * Math.pow(1 + cpiRate / 100, year - 1);
      
      let agePension = 0;
      
      // For couple tracking: Calculate age pension based on individual partner eligibility
      if (includeAgePension && enableCoupleTracking && pensionRecipientType === 'couple') {
        const partner1Eligible = partner1Alive && partner1CurrentAge >= activePensionParams.eligibilityAge;
        const partner2Eligible = partner2Alive && partner2CurrentAge >= activePensionParams.eligibilityAge;
        
        if (partner1Eligible && partner2Eligible) {
          // Both eligible: Use couple rate (combined)
          let assetTestPension = activePensionParams.maxPensionPerYear * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedThreshold = (isHomeowner ? activePensionParams.assetTestThresholdHomeowner : activePensionParams.assetTestThresholdNonHomeowner) * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedCutoff = (isHomeowner ? activePensionParams.assetTestCutoffHomeowner : activePensionParams.assetTestCutoffNonHomeowner) * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedTaper = activePensionParams.assetTaperPerYear;
          
          if (totalAssets > indexedThreshold) {
            const excess = totalAssets - indexedThreshold;
            const reduction = Math.floor(excess / 1000) * (indexedTaper / Math.pow(1 + cpiRate / 100, year - 1)) * Math.pow(1 + cpiRate / 100, year - 1);
            assetTestPension = Math.max(0, assetTestPension - reduction);
          }
          if (totalAssets >= indexedCutoff) assetTestPension = 0;

          const indexedIncomeTestFreeArea = activePensionParams.incomeTestFreeArea * Math.pow(1 + cpiRate / 100, year - 1);
          let incomeTestPension = activePensionParams.maxPensionPerYear * Math.pow(1 + cpiRate / 100, year - 1);
          if (indexedPensionIncome > indexedIncomeTestFreeArea) {
            const excessIncome = indexedPensionIncome - indexedIncomeTestFreeArea;
            const reduction = excessIncome * activePensionParams.incomeTaperRate;
            incomeTestPension = Math.max(0, incomeTestPension - reduction);
          }
          agePension = Math.min(assetTestPension, incomeTestPension);
          
        } else if (partner1Eligible || partner2Eligible) {
          // Only one eligible: Use single rate for that partner
          const singleRateParams = {
            maxPensionPerYear: 29754,  // Single rate
            assetTestThresholdHomeowner: 314000,
            assetTestThresholdNonHomeowner: 566000,
            assetTestCutoffHomeowner: 695250,
            assetTestCutoffNonHomeowner: 947250,
            assetTaperPerYear: 3.00,  // $3 per $1000
            incomeTestFreeArea: 212,
            incomeTaperRate: 0.50,
            eligibilityAge: 67
          };
          
          let assetTestPension = singleRateParams.maxPensionPerYear * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedThreshold = (isHomeowner ? singleRateParams.assetTestThresholdHomeowner : singleRateParams.assetTestThresholdNonHomeowner) * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedCutoff = (isHomeowner ? singleRateParams.assetTestCutoffHomeowner : singleRateParams.assetTestCutoffNonHomeowner) * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedTaper = singleRateParams.assetTaperPerYear;
          
          if (totalAssets > indexedThreshold) {
            const excess = totalAssets - indexedThreshold;
            const reduction = Math.floor(excess / 1000) * (indexedTaper / Math.pow(1 + cpiRate / 100, year - 1)) * Math.pow(1 + cpiRate / 100, year - 1);
            assetTestPension = Math.max(0, assetTestPension - reduction);
          }
          if (totalAssets >= indexedCutoff) assetTestPension = 0;

          const indexedIncomeTestFreeArea = singleRateParams.incomeTestFreeArea * Math.pow(1 + cpiRate / 100, year - 1);
          let incomeTestPension = singleRateParams.maxPensionPerYear * Math.pow(1 + cpiRate / 100, year - 1);
          if (indexedPensionIncome > indexedIncomeTestFreeArea) {
            const excessIncome = indexedPensionIncome - indexedIncomeTestFreeArea;
            const reduction = excessIncome * singleRateParams.incomeTaperRate;
            incomeTestPension = Math.max(0, incomeTestPension - reduction);
          }
          agePension = Math.min(assetTestPension, incomeTestPension);
        }
        // else: neither eligible, agePension stays 0
        
      } else {
        // Non-couple or legacy mode: Use simple eligibility check
        const anyoneAlive = enableCoupleTracking && pensionRecipientType === 'couple'
          ? (partner1Alive || partner2Alive)
          : true; // In simple mode, assume alive
          
        if (includeAgePension && anyoneAlive && age >= activePensionParams.eligibilityAge) {
          const indexedMaxPension = activePensionParams.maxPensionPerYear * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedThreshold = (isHomeowner ? activePensionParams.assetTestThresholdHomeowner : activePensionParams.assetTestThresholdNonHomeowner) * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedCutoff = (isHomeowner ? activePensionParams.assetTestCutoffHomeowner : activePensionParams.assetTestCutoffNonHomeowner) * Math.pow(1 + cpiRate / 100, year - 1);
          const indexedTaper = activePensionParams.assetTaperPerYear;
          
          let assetTestPension = indexedMaxPension;
          if (totalAssets > indexedThreshold) {
            const excess = totalAssets - indexedThreshold;
            const reduction = Math.floor(excess / 1000) * (indexedTaper / Math.pow(1 + cpiRate / 100, year - 1)) * Math.pow(1 + cpiRate / 100, year - 1);
            assetTestPension = Math.max(0, indexedMaxPension - reduction);
          }
          if (totalAssets >= indexedCutoff) assetTestPension = 0;

          const indexedIncomeTestFreeArea = activePensionParams.incomeTestFreeArea * Math.pow(1 + cpiRate / 100, year - 1);
          let incomeTestPension = indexedMaxPension;
          if (indexedPensionIncome > indexedIncomeTestFreeArea) {
            const excessIncome = indexedPensionIncome - indexedIncomeTestFreeArea;
            const reduction = excessIncome * activePensionParams.incomeTaperRate;
            incomeTestPension = Math.max(0, indexedMaxPension - reduction);
          }
          agePension = Math.min(assetTestPension, incomeTestPension);
        }
      }
      
      // Inflate pre-retirement income (if any)
      const indexedPreRetirementIncome = preRetirementIncome * Math.pow(1 + cpiRate / 100, year - 1);
      
      const totalIncome = indexedPensionIncome + agePension + indexedPreRetirementIncome;
      
      // If income > spending, save excess to cash account
      if (totalIncome > totalSpending) {
        const excess = totalIncome - totalSpending;
        cashAccount += excess;
      }
      
      const netSpendingNeed = Math.max(0, totalSpending - totalIncome);

      // STEP 1: MINIMUM DRAWDOWN (Required by law - must happen first)
      // For couple tracking: only retired partners must take minimum drawdown
      let superDrawnForMinimum = 0;
      let minDrawdown = 0; // Total minimum drawdown required
      let accessibleSuper = mainSuper; // Total super accessible (retired partners only in couple mode)
      let insufficientFundsWarning = false;
      
      if (enableCoupleTracking && pensionRecipientType === 'couple') {
        // Only retired partners can access their super
        accessibleSuper = 0;
        if (partner1Alive && partner1CurrentAge >= partner1.retirementAge) {
          accessibleSuper += partner1Super;
        }
        if (partner2Alive && partner2CurrentAge >= partner2.retirementAge) {
          accessibleSuper += partner2Super;
        }
        
        // Minimum drawdown from each retired partner's super
        if (partner1Alive && partner1CurrentAge >= partner1.retirementAge && partner1Super > 0) {
          const p1MinDrawdown = getMinimumDrawdown(partner1CurrentAge, partner1Super);
          if (p1MinDrawdown > 0 && partner1Super >= p1MinDrawdown) {
            partner1Super -= p1MinDrawdown;
            cashAccount += p1MinDrawdown;
            superDrawnForMinimum += p1MinDrawdown;
            minDrawdown += p1MinDrawdown;
          }
        }
        if (partner2Alive && partner2CurrentAge >= partner2.retirementAge && partner2Super > 0) {
          const p2MinDrawdown = getMinimumDrawdown(partner2CurrentAge, partner2Super);
          if (p2MinDrawdown > 0 && partner2Super >= p2MinDrawdown) {
            partner2Super -= p2MinDrawdown;
            cashAccount += p2MinDrawdown;
            superDrawnForMinimum += p2MinDrawdown;
            minDrawdown += p2MinDrawdown;
          }
        }
        // Update combined mainSuper for display
        mainSuper = partner1Super + partner2Super;
      } else {
        // Simple mode - normal minimum drawdown
        minDrawdown = getMinimumDrawdown(age, startingMainSuper);
        if (minDrawdown > 0 && mainSuper >= minDrawdown) {
          mainSuper -= minDrawdown;
          cashAccount += minDrawdown;
          superDrawnForMinimum = minDrawdown;
        }
      }

      // STEP 2: SPENDING WITHDRAWAL LOGIC
      // Now use Cash → Buffer → Super waterfall to cover spending needs
      let withdrawn = 0;
      if (netSpendingNeed > 0) {
        // Withdraw from Cash Account first
        if (cashAccount >= netSpendingNeed) {
          cashAccount -= netSpendingNeed;
          withdrawn = netSpendingNeed;
        } else {
          withdrawn = cashAccount;
          cashAccount = 0;
          let remaining = netSpendingNeed - withdrawn;
          
          // Withdraw from Sequencing Buffer
          if (seqBuffer >= remaining) {
            seqBuffer -= remaining;
            withdrawn += remaining;
          } else {
            withdrawn += seqBuffer;
            remaining = remaining - seqBuffer;
            seqBuffer = 0;
            
            // Withdraw from Super (only accessible super in couple mode)
            // In couple mode: only retired partners can access their super
            if (enableCoupleTracking && pensionRecipientType === 'couple') {
              // Recalculate accessible super AFTER minimum drawdown
              const accessibleFromRetired = 
                (partner1Alive && partner1CurrentAge >= partner1.retirementAge ? partner1Super : 0) +
                (partner2Alive && partner2CurrentAge >= partner2.retirementAge ? partner2Super : 0);
              
              if (accessibleFromRetired >= remaining) {
                // Proportionally withdraw from each retired partner's super
                if (accessibleFromRetired > 0) {
                  const p1Ratio = (partner1Alive && partner1CurrentAge >= partner1.retirementAge) 
                    ? partner1Super / accessibleFromRetired : 0;
                  const p2Ratio = (partner2Alive && partner2CurrentAge >= partner2.retirementAge) 
                    ? partner2Super / accessibleFromRetired : 0;
                  
                  const p1Withdrawal = remaining * p1Ratio;
                  const p2Withdrawal = remaining * p2Ratio;
                  
                  partner1Super -= p1Withdrawal;
                  partner2Super -= p2Withdrawal;
                  mainSuper = partner1Super + partner2Super;
                  withdrawn += remaining;
                }
              } else {
                // Insufficient accessible funds - withdraw what we can
                if (accessibleFromRetired > 0) {
                  // Withdraw all accessible super
                  if (partner1Alive && partner1CurrentAge >= partner1.retirementAge) {
                    withdrawn += partner1Super;
                    partner1Super = 0;
                  }
                  if (partner2Alive && partner2CurrentAge >= partner2.retirementAge) {
                    withdrawn += partner2Super;
                    partner2Super = 0;
                  }
                  mainSuper = partner1Super + partner2Super;
                }
                insufficientFundsWarning = true;
              }
            } else {
              // Simple mode - normal withdrawal
              if (mainSuper >= remaining) {
                mainSuper -= remaining;
                withdrawn += remaining;
              } else {
                withdrawn += mainSuper;
                mainSuper = 0;
              }
            }
          }
        }
      }

      // Total withdrawn from super = minimum drawdown + any additional for spending
      const totalSuperWithdrawn = superDrawnForMinimum + Math.max(0, netSpendingNeed - (withdrawn - Math.max(0, netSpendingNeed - cashAccount - seqBuffer)));

      // STEP 3: RAD PAYMENT (if entering aged care)
      // RAD cascades through accounts: Main Super → Buffer → Cash (like normal spending)
      if (radWithdrawn > 0) {
        let radRemaining = radWithdrawn;
        
        // In couple mode, deduct proportionally from individual super balances
        if (enableCoupleTracking && pensionRecipientType === 'couple') {
          const totalSuper = partner1Super + partner2Super;
          if (totalSuper >= radRemaining) {
            // Deduct proportionally from each partner's super
            const p1Ratio = partner1Super / totalSuper;
            const p2Ratio = partner2Super / totalSuper;
            partner1Super -= radRemaining * p1Ratio;
            partner2Super -= radRemaining * p2Ratio;
            mainSuper = partner1Super + partner2Super;
            radRemaining = 0;
          } else {
            // Not enough in super, take all super then cascade to buffer/cash
            radRemaining -= totalSuper;
            partner1Super = 0;
            partner2Super = 0;
            mainSuper = 0;
            
            // Then Sequencing Buffer
            if (seqBuffer >= radRemaining) {
              seqBuffer -= radRemaining;
              radRemaining = 0;
            } else {
              radRemaining -= seqBuffer;
              seqBuffer = 0;
              
              // Finally Cash Account
              if (cashAccount >= radRemaining) {
                cashAccount -= radRemaining;
                radRemaining = 0;
              } else {
                radRemaining -= cashAccount;
                cashAccount = 0;
              }
            }
          }
        } else {
          // Simple mode - original logic
          // Try Main Super first
          if (mainSuper >= radRemaining) {
            mainSuper -= radRemaining;
            radRemaining = 0;
          } else {
            radRemaining -= mainSuper;
            mainSuper = 0;
            
            // Then Sequencing Buffer
            if (seqBuffer >= radRemaining) {
              seqBuffer -= radRemaining;
              radRemaining = 0;
            } else {
              radRemaining -= seqBuffer;
              seqBuffer = 0;
              
              // Finally Cash Account
              if (cashAccount >= radRemaining) {
                cashAccount -= radRemaining;
                radRemaining = 0;
              } else {
                radRemaining -= cashAccount;
                cashAccount = 0;
              }
            }
          }
        }
        
        // If still short, record actual amount paid (partial RAD)
        // This would trigger DAP in reality, but we keep it simple
        if (radRemaining > 0) {
          radWithdrawn -= radRemaining; // Only paid what was available
        }
        
        // Track the actual amount paid for future refund
        radPaid = radWithdrawn;
      }
      
      // STEP 4: RAD REFUND (if exiting aged care)
      // RAD is refunded to main super when exiting care
      if (radRefund > 0) {
        if (enableCoupleTracking && pensionRecipientType === 'couple') {
          // In couple mode, refund proportionally to individual supers
          const totalSuper = partner1Super + partner2Super;
          if (totalSuper > 0) {
            const p1Ratio = partner1Super / totalSuper;
            const p2Ratio = partner2Super / totalSuper;
            partner1Super += radRefund * p1Ratio;
            partner2Super += radRefund * p2Ratio;
          } else {
            // If both supers are zero, give all to survivor
            if (partner1Alive && !partner2Alive) {
              partner1Super += radRefund;
            } else if (!partner1Alive && partner2Alive) {
              partner2Super += radRefund;
            } else {
              // Both alive (shouldn't happen), split 50/50
              partner1Super += radRefund / 2;
              partner2Super += radRefund / 2;
            }
          }
          mainSuper = partner1Super + partner2Super;
        } else {
          // Simple mode
          mainSuper += radRefund;
        }
      }

      // APPLY RETURNS:
      // Main Super: Variable returns based on scenario/historical/Monte Carlo
      // Buffer & Cash: Fixed 3% real return (defensive assets)
      const yearReturn = returnSequence[year - 1] || 0;
      
      if (enableCoupleTracking && pensionRecipientType === 'couple') {
        // Apply returns ONLY to retired partners' super balances
        // Pre-retirement super is frozen at input value (avoids modeling contributions, fees, etc.)
        if (partner1Alive && partner1CurrentAge >= partner1.retirementAge) {
          partner1Super = partner1Super * (1 + yearReturn / 100);
        }
        if (partner2Alive && partner2CurrentAge >= partner2.retirementAge) {
          partner2Super = partner2Super * (1 + yearReturn / 100);
        }
        mainSuper = partner1Super + partner2Super; // Update combined total
      } else {
        // Simple mode - apply to mainSuper directly
        mainSuper = mainSuper * (1 + yearReturn / 100);
      }
      
      seqBuffer = seqBuffer * 1.03;  // 3% real
      cashAccount = cashAccount * 1.03;  // 3% real
      const totalBalance = mainSuper + seqBuffer + cashAccount;

      results.push({
        year, age, mainSuper, seqBuffer, cashAccount, totalBalance,
        spending: totalSpending, income: totalIncome, agePension, pensionIncome: indexedPensionIncome,
        withdrawn, minDrawdown, superDrawnForMinimum,
        yearReturn, cpiRate, guardrailStatus, currentSpendingBase,
        inAgedCare, agedCareAnnualCost: agedCareCosts.annualCost, radWithdrawn, radRefund,
        partnerAlive,
        partner1Super, // Individual partner 1 super balance
        partner2Super, // Individual partner 2 super balance
        // Partner pension = private pension (only if retired) + age pension allocation
        // When a partner dies, show reversionary pension continuing
        partner1Pension: enableCoupleTracking ? (() => {
          let pension = 0;
          
          // Private pension component
          if (partner1Alive && partner1CurrentAge >= partner1.retirementAge) {
            // Partner 1 alive and retired - gets full pension
            pension += partner1.pensionIncome * Math.pow(1 + cpiRate / 100, year - 1);
          } else if (!partner1Alive && partner2Alive) {
            // Partner 1 dead, Partner 2 alive - show reversionary amount
            pension += calculateReversionaryPension(partner1.pensionIncome, partner1.reversionaryRate) * Math.pow(1 + cpiRate / 100, year - 1);
          }
          
          // Age pension component (only if Partner 1 alive)
          if (partner1Alive) {
            const partner1Eligible = partner1CurrentAge >= activePensionParams.eligibilityAge;
            const partner2Eligible = partner2Alive && partner2CurrentAge >= activePensionParams.eligibilityAge;
            if (partner1Eligible && partner2Eligible) pension += agePension / 2; // Both eligible: split 50/50
            else if (partner1Eligible && !partner2Eligible) pension += agePension; // Only partner1 eligible: gets full single rate
          }
          
          return pension;
        })() : 0,
        
        partner2Pension: enableCoupleTracking ? (() => {
          let pension = 0;
          
          // Private pension component
          if (partner2Alive && partner2CurrentAge >= partner2.retirementAge) {
            // Partner 2 alive and retired - gets full pension
            pension += partner2.pensionIncome * Math.pow(1 + cpiRate / 100, year - 1);
          } else if (!partner2Alive && partner1Alive) {
            // Partner 2 dead, Partner 1 alive - show reversionary amount
            pension += calculateReversionaryPension(partner2.pensionIncome, partner2.reversionaryRate) * Math.pow(1 + cpiRate / 100, year - 1);
          }
          
          // Age pension component (only if Partner 2 alive)
          if (partner2Alive) {
            const partner1Eligible = partner1Alive && partner1CurrentAge >= activePensionParams.eligibilityAge;
            const partner2Eligible = partner2CurrentAge >= activePensionParams.eligibilityAge;
            if (partner1Eligible && partner2Eligible) pension += agePension / 2; // Both eligible: split 50/50
            else if (partner2Eligible && !partner1Eligible) pension += agePension; // Only partner2 eligible: gets full single rate
          }
          
          return pension;
        })() : 0,
        debtBalance: totalDebtBalance,
        debtPayment: totalDebtPayment,
        debtInterestPaid: totalDebtInterest,
        debtPrincipalPaid: totalDebtPrincipal,
        insufficientFunds: insufficientFundsWarning
      });

      if (totalBalance <= 0) break;
    }
    return results;
  };

  const runMonteCarlo = () => {
    const allResults = [];
    const failureAnalysis = [];
    
    for (let i = 0; i < monteCarloRuns; i++) {
      const returns = [];
      for (let year = 0; year < 35; year++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const randomReturn = expectedReturn + z0 * returnVolatility;
        returns.push(randomReturn);
      }
      const result = runSimulation(returns, inflationRate, false, 35);
      allResults.push(result);
      
      // Analyze if this scenario failed
      const failed = result.length < 35 || result[result.length - 1].totalBalance < 0;
      if (failed) {
        const failureYear = result.length;
        const failureAge = result[result.length - 1]?.age || 0;
        
        // Analyze the failure
        let earlyReturns = returns.slice(0, Math.min(10, returns.length));
        let avgEarlyReturn = earlyReturns.reduce((a, b) => a + b, 0) / earlyReturns.length;
        
        // Find worst consecutive years
        let worstStreak = 0;
        let worstStreakStart = 0;
        let currentStreak = 0;
        let currentStreakStart = 0;
        
        for (let j = 0; j < returns.length; j++) {
          if (returns[j] < 0) {
            if (currentStreak === 0) currentStreakStart = j + 1;
            currentStreak++;
            if (currentStreak > worstStreak) {
              worstStreak = currentStreak;
              worstStreakStart = currentStreakStart;
            }
          } else {
            currentStreak = 0;
          }
        }
        
        // Determine primary failure cause
        let primaryCause = '';
        if (worstStreak >= 3 && worstStreakStart <= 5) {
          primaryCause = 'Early sequence risk';
        } else if (avgEarlyReturn < 0) {
          primaryCause = 'Poor early returns';
        } else if (worstStreak >= 4) {
          primaryCause = 'Extended bear market';
        } else {
          primaryCause = 'Gradual depletion';
        }
        
        failureAnalysis.push({
          scenarioNumber: i + 1,
          failureYear: failureYear,
          failureAge: failureAge,
          avgEarlyReturn: avgEarlyReturn,
          worstStreak: worstStreak,
          worstStreakStart: worstStreakStart,
          primaryCause: primaryCause,
          returns: returns
        });
      }
    }

    // Count successes
    // Success = portfolio has positive balance at the END of the simulation
    // (whether that's age 100, or earlier if both partners died)
    const successful = allResults.filter(r => {
      if (r.length === 0) return false;
      const lastYear = r[r.length - 1];
      // Success if final balance > 0, regardless of how long simulation ran
      // (simulation may end early if both partners die, which is fine)
      return lastYear && lastYear.totalBalance > 0;
    }).length;
    const successRate = (successful / monteCarloRuns) * 100;
    const finalBalances = allResults.map(r => {
      const lastYear = r[r.length - 1];
      return lastYear ? lastYear.totalBalance : 0;
    }).sort((a, b) => a - b);

    const getPercentile = (arr: number[], p: number) => {
      const index = Math.floor(arr.length * p / 100);
      return arr[index] || 0;
    };

    const percentiles = {
      p10: getPercentile(finalBalances, 10),
      p50: getPercentile(finalBalances, 50),
      p90: getPercentile(finalBalances, 90)
    };

    const medianBalance = percentiles.p50;
    let closestIndex = 0;
    let closestDiff = Math.abs(finalBalances[0] - medianBalance);
    for (let i = 1; i < allResults.length; i++) {
      const lastYear = allResults[i][allResults[i].length - 1];
      const balance = lastYear ? lastYear.totalBalance : 0;
      const diff = Math.abs(balance - medianBalance);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    
    // Calculate year-by-year percentile bands for charting
    const maxYears = Math.max(...allResults.map(r => r.length));
    const percentileBands = [];
    
    for (let yearIdx = 0; yearIdx < maxYears; yearIdx++) {
      const balancesThisYear: number[] = [];
      const incomeThisYear: number[] = [];
      const spendingThisYear: number[] = [];
      
      allResults.forEach(result => {
        if (result[yearIdx]) {
          balancesThisYear.push(result[yearIdx].totalBalance);
          incomeThisYear.push(result[yearIdx].income);
          spendingThisYear.push(result[yearIdx].spending);
        }
      });
      
      balancesThisYear.sort((a, b) => a - b);
      incomeThisYear.sort((a, b) => a - b);
      spendingThisYear.sort((a, b) => a - b);
      
      percentileBands.push({
        year: yearIdx + 1,
        balance_p10: getPercentile(balancesThisYear, 10),
        balance_p25: getPercentile(balancesThisYear, 25),
        balance_p50: getPercentile(balancesThisYear, 50),
        balance_p75: getPercentile(balancesThisYear, 75),
        balance_p90: getPercentile(balancesThisYear, 90),
        income_p10: getPercentile(incomeThisYear, 10),
        income_p50: getPercentile(incomeThisYear, 50),
        income_p90: getPercentile(incomeThisYear, 90),
        spending_p10: getPercentile(spendingThisYear, 10),
        spending_p50: getPercentile(spendingThisYear, 50),
        spending_p90: getPercentile(spendingThisYear, 90)
      });
    }
    
    // Aggregate failure statistics
    let failureStats = null;
    if (failureAnalysis.length > 0) {
      const avgFailureYear = failureAnalysis.reduce((sum, f) => sum + f.failureYear, 0) / failureAnalysis.length;
      const avgFailureAge = failureAnalysis.reduce((sum, f) => sum + f.failureAge, 0) / failureAnalysis.length;
      
      const causeCount: { [key: string]: number } = {};
      failureAnalysis.forEach(f => {
        causeCount[f.primaryCause] = (causeCount[f.primaryCause] || 0) + 1;
      });
      
      const topCauses = Object.entries(causeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cause, count]) => ({ cause, count, percentage: (count / failureAnalysis.length * 100) }));
      
      failureStats = {
        totalFailures: failureAnalysis.length,
        avgFailureYear: Math.round(avgFailureYear),
        avgFailureAge: Math.round(avgFailureAge),
        topCauses: topCauses,
        allFailures: failureAnalysis.slice(0, 10) // Keep first 10 for detailed view
      };
    }
    
    return {
      medianSimulation: allResults[closestIndex],
      successRate: successRate,
      percentiles: percentiles,
      percentileBands: percentileBands,
      failureStats: failureStats
    };
  };

  const runHistoricalMonteCarlo = () => {
    const allResults = [];
    const failureAnalysis = [];
    
    // For Complete Blocks method, determine the actual number of unique scenarios
    let actualRuns = monteCarloRuns;
    let uniqueBlocksMap = new Map(); // Track unique starting years for Complete Blocks
    
    if (historicalMethod === 'block') {
      // Complete 35-year blocks: maximum possible is (dataLength - 35 + 1)
      const maxUniqueBlocks = historicalMarketData.length - 35 + 1;
      actualRuns = Math.min(monteCarloRuns, maxUniqueBlocks);
      
      // Pre-generate all unique starting indices
      const allStartIndices = Array.from({ length: maxUniqueBlocks }, (_, i) => i);
      
      // If user wants fewer than max, randomly select which ones to use
      if (actualRuns < maxUniqueBlocks) {
        // Shuffle and take first actualRuns
        for (let i = allStartIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allStartIndices[i], allStartIndices[j]] = [allStartIndices[j], allStartIndices[i]];
        }
        allStartIndices.length = actualRuns;
      }
      
      // Run each unique block exactly once
      for (let i = 0; i < actualRuns; i++) {
        const startIdx = allStartIndices[i];
        const startYear = historicalMarketData[startIdx].year;
        const endYear = historicalMarketData[startIdx + 34].year;
        
        let returns: number[] = [];
        for (let year = 0; year < 35; year++) {
          returns.push(historicalMarketData[startIdx + year].return);
        }
        
        const result = runSimulation(returns, inflationRate, false, 35);
        allResults.push(result);
        
        // Track this unique block
        uniqueBlocksMap.set(i, { startYear, endYear, startIdx });
        
        // Analyze if this scenario failed
        const failed = result.length < 35 || result[result.length - 1].totalBalance < 0;
        if (failed) {
          const failureYear = result.length;
          const failureAge = result[result.length - 1]?.age || 0;
          
          let earlyReturns = returns.slice(0, Math.min(10, returns.length));
          let avgEarlyReturn = earlyReturns.reduce((a, b) => a + b, 0) / earlyReturns.length;
          
          let worstStreak = 0;
          let worstStreakStart = 0;
          let currentStreak = 0;
          let currentStreakStart = 0;
          
          for (let j = 0; j < returns.length; j++) {
            if (returns[j] < 0) {
              if (currentStreak === 0) currentStreakStart = j + 1;
              currentStreak++;
              if (currentStreak > worstStreak) {
                worstStreak = currentStreak;
                worstStreakStart = currentStreakStart;
              }
            } else {
              currentStreak = 0;
            }
          }
          
          let primaryCause = '';
          if (worstStreak >= 3 && worstStreakStart <= 5) {
            primaryCause = 'Early sequence risk';
          } else if (avgEarlyReturn < 0) {
            primaryCause = 'Poor early returns';
          } else if (worstStreak >= 4) {
            primaryCause = 'Extended bear market';
          } else {
            primaryCause = 'Gradual depletion';
          }
          
          failureAnalysis.push({
            scenarioNumber: i + 1,
            failureYear: failureYear,
            failureAge: failureAge,
            avgEarlyReturn: avgEarlyReturn,
            worstStreak: worstStreak,
            worstStreakStart: worstStreakStart,
            primaryCause: primaryCause,
            returns: returns,
            historicalPeriod: `${startYear}-${endYear}` // Track which historical period failed
          });
        }
      }
    } else {
      // Shuffle or Overlapping methods - use normal loop
      for (let i = 0; i < monteCarloRuns; i++) {
        let returns: number[] = [];
        
        if (historicalMethod === 'shuffle') {
          // Method 1: Shuffled years - random sampling with replacement
          for (let year = 0; year < 35; year++) {
            const randomIdx = Math.floor(Math.random() * historicalMarketData.length);
            returns.push(historicalMarketData[randomIdx].return);
          }
        } else {
          // Method 3: Overlapping block bootstrap (default)
          while (returns.length < 35) {
            const maxStartIdx = historicalMarketData.length - blockSize;
            const startIdx = Math.floor(Math.random() * (maxStartIdx + 1));
            for (let j = 0; j < blockSize && returns.length < 35; j++) {
              returns.push(historicalMarketData[startIdx + j].return);
            }
          }
        }
        
        const result = runSimulation(returns, inflationRate, false, 35);
        allResults.push(result);
      
      // Analyze if this scenario failed
      const failed = result.length < 35 || result[result.length - 1].totalBalance < 0;
      if (failed) {
        const failureYear = result.length;
        const failureAge = result[result.length - 1]?.age || 0;
        
        // Analyze the failure
        let earlyReturns = returns.slice(0, Math.min(10, returns.length));
        let avgEarlyReturn = earlyReturns.reduce((a, b) => a + b, 0) / earlyReturns.length;
        
        // Find worst consecutive years
        let worstStreak = 0;
        let worstStreakStart = 0;
        let currentStreak = 0;
        let currentStreakStart = 0;
        
        for (let j = 0; j < returns.length; j++) {
          if (returns[j] < 0) {
            if (currentStreak === 0) currentStreakStart = j + 1;
            currentStreak++;
            if (currentStreak > worstStreak) {
              worstStreak = currentStreak;
              worstStreakStart = currentStreakStart;
            }
          } else {
            currentStreak = 0;
          }
        }
        
        // Determine primary failure cause
        let primaryCause = '';
        if (worstStreak >= 3 && worstStreakStart <= 5) {
          primaryCause = 'Early sequence risk';
        } else if (avgEarlyReturn < 0) {
          primaryCause = 'Poor early returns';
        } else if (worstStreak >= 4) {
          primaryCause = 'Extended bear market';
        } else {
          primaryCause = 'Gradual depletion';
        }
        
        failureAnalysis.push({
          scenarioNumber: i + 1,
          failureYear: failureYear,
          failureAge: failureAge,
          avgEarlyReturn: avgEarlyReturn,
          worstStreak: worstStreak,
          worstStreakStart: worstStreakStart,
          primaryCause: primaryCause,
          returns: returns
        });
      }
      }
    }

    // Count successes
    // Success = portfolio has positive balance at the END of the simulation
    // (whether that's age 100, or earlier if both partners died)
    const successful = allResults.filter(r => {
      if (r.length === 0) return false;
      const lastYear = r[r.length - 1];
      // Success if final balance > 0, regardless of how long simulation ran
      return lastYear && lastYear.totalBalance > 0;
    }).length;
    const successRate = (successful / actualRuns) * 100;
    const finalBalances = allResults.map(r => {
      const lastYear = r[r.length - 1];
      return lastYear ? lastYear.totalBalance : 0;
    }).sort((a, b) => a - b);

    const getPercentile = (arr: number[], p: number) => {
      const index = Math.floor(arr.length * p / 100);
      return arr[index] || 0;
    };

    const percentiles = {
      p10: getPercentile(finalBalances, 10),
      p50: getPercentile(finalBalances, 50),
      p90: getPercentile(finalBalances, 90)
    };

    const medianBalance = percentiles.p50;
    let closestIndex = 0;
    let closestDiff = Math.abs(finalBalances[0] - medianBalance);
    for (let i = 1; i < allResults.length; i++) {
      const lastYear = allResults[i][allResults[i].length - 1];
      const balance = lastYear ? lastYear.totalBalance : 0;
      const diff = Math.abs(balance - medianBalance);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    
    // Calculate year-by-year percentile bands for charting
    const maxYears = Math.max(...allResults.map(r => r.length));
    const percentileBands = [];
    
    for (let yearIdx = 0; yearIdx < maxYears; yearIdx++) {
      const balancesThisYear: number[] = [];
      const incomeThisYear: number[] = [];
      const spendingThisYear: number[] = [];
      
      allResults.forEach(result => {
        if (result[yearIdx]) {
          balancesThisYear.push(result[yearIdx].totalBalance);
          incomeThisYear.push(result[yearIdx].income);
          spendingThisYear.push(result[yearIdx].spending);
        }
      });
      
      balancesThisYear.sort((a, b) => a - b);
      incomeThisYear.sort((a, b) => a - b);
      spendingThisYear.sort((a, b) => a - b);
      
      percentileBands.push({
        year: yearIdx + 1,
        balance_p10: getPercentile(balancesThisYear, 10),
        balance_p25: getPercentile(balancesThisYear, 25),
        balance_p50: getPercentile(balancesThisYear, 50),
        balance_p75: getPercentile(balancesThisYear, 75),
        balance_p90: getPercentile(balancesThisYear, 90),
        income_p10: getPercentile(incomeThisYear, 10),
        income_p50: getPercentile(incomeThisYear, 50),
        income_p90: getPercentile(incomeThisYear, 90),
        spending_p10: getPercentile(spendingThisYear, 10),
        spending_p50: getPercentile(spendingThisYear, 50),
        spending_p90: getPercentile(spendingThisYear, 90)
      });
    }
    
    // Aggregate failure statistics
    let failureStats = null;
    if (failureAnalysis.length > 0) {
      const avgFailureYear = failureAnalysis.reduce((sum, f) => sum + f.failureYear, 0) / failureAnalysis.length;
      const avgFailureAge = failureAnalysis.reduce((sum, f) => sum + f.failureAge, 0) / failureAnalysis.length;
      
      const causeCount: { [key: string]: number } = {};
      failureAnalysis.forEach(f => {
        causeCount[f.primaryCause] = (causeCount[f.primaryCause] || 0) + 1;
      });
      
      const topCauses = Object.entries(causeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cause, count]) => ({ cause, count, percentage: (count / failureAnalysis.length * 100) }));
      
      failureStats = {
        totalFailures: failureAnalysis.length,
        avgFailureYear: Math.round(avgFailureYear),
        avgFailureAge: Math.round(avgFailureAge),
        topCauses: topCauses,
        allFailures: failureAnalysis.slice(0, 10) // Keep first 10 for detailed view
      };
    }
    
    return {
      medianSimulation: allResults[closestIndex],
      successRate: successRate,
      percentiles: percentiles,
      percentileBands: percentileBands,
      method: historicalMethod,
      dataYears: historicalMarketData.length,
      failureStats: failureStats,
      actualRuns: actualRuns,
      uniqueBlocksMap: historicalMethod === 'block' ? uniqueBlocksMap : null
    };
  };

  const simulationResults = useMemo(() => {
    // Priority: Historical Monte Carlo > Regular Monte Carlo > Formal Test > Historical > Constant
    if (useHistoricalMonteCarlo && historicalMonteCarloResults && historicalMonteCarloResults.medianSimulation) {
      return historicalMonteCarloResults.medianSimulation;
    }
    
    if (useMonteCarlo && monteCarloResults && monteCarloResults.medianSimulation) {
      return monteCarloResults.medianSimulation;
    }
    
    // Use selected formal test data when available
    if (useFormalTest && selectedFormalTest && formalTestResults) {
      const testResult = formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any;
      if (testResult && testResult.simulationData) {
        return testResult.simulationData;
      }
    }
    
    let returns;
    if (useHistoricalData) {
      returns = historicalReturns[historicalPeriod as keyof typeof historicalReturns];
    } else {
      returns = Array(35).fill(selectedScenario);
    }
    return runSimulation(returns, inflationRate, false, 35);
  }, [mainSuperBalance, sequencingBuffer, totalPensionIncome, baseSpending,
      selectedScenario, isHomeowner, includeAgePension, spendingPattern, useGuardrails, upperGuardrail, lowerGuardrail, guardrailAdjustment,
      useHistoricalData, historicalPeriod, useMonteCarlo, monteCarloResults, splurgeAmount, splurgeStartAge, splurgeDuration, oneOffExpenses, includeOneOffExpenses,
      currentAge, retirementAge, agePensionParams, pensionRecipientType, selectedFormalTest, formalTestResults,
      includeAgedCare, agedCareApproach, agedCareRAD, agedCareAnnualCost, deterministicAgedCareAge, agedCareDuration,
      personAtHomeSpending, deathInCare, enableCoupleTracking, partner1, partner2, deathScenario, singleSpendingMultiplier]);

  const chartData = useMemo(() => {
    if (!simulationResults) return [];
    return simulationResults.map((r: any) => {
      // Calculate individual partner ages if couple tracking enabled
      let partner1Age = null;
      let partner2Age = null;
      if (enableCoupleTracking && pensionRecipientType === 'couple') {
        // Calculate which partner retires first chronologically
        const yearsUntilPartner1Retires = partner1.retirementAge - partner1.currentAge;
        const yearsUntilPartner2Retires = partner2.retirementAge - partner2.currentAge;
        const yearsUntilFirstRetirement = Math.min(yearsUntilPartner1Retires, yearsUntilPartner2Retires);
        
        const partner1AgeAtYear1 = partner1.currentAge + yearsUntilFirstRetirement;
        const partner2AgeAtYear1 = partner2.currentAge + yearsUntilFirstRetirement;
        partner1Age = partner1AgeAtYear1 + (r.year - 1);
        partner2Age = partner2AgeAtYear1 + (r.year - 1);
      }
      
      const calendarYear = getCalendarYear(r.year);
      
      return {
        year: r.year,
        calendarYear,
        age: r.age,
        partner1Age,
        partner2Age,
        'Total Balance': toDisplayValue(r.totalBalance, r.year, r.cpiRate),
        'Main Super': toDisplayValue(r.mainSuper, r.year, r.cpiRate),
        'Buffer': toDisplayValue(r.seqBuffer, r.year, r.cpiRate),
        'Cash': toDisplayValue(r.cashAccount, r.year, r.cpiRate),
        'Spending': toDisplayValue(r.spending, r.year, r.cpiRate),
        'Income': toDisplayValue(r.income, r.year, r.cpiRate),
        'Partner 1 Super': toDisplayValue(r.partner1Super || 0, r.year, r.cpiRate),
        'Partner 2 Super': toDisplayValue(r.partner2Super || 0, r.year, r.cpiRate),
        'Partner 1 Pension': toDisplayValue(r.partner1Pension || 0, r.year, r.cpiRate),
        'Partner 2 Pension': toDisplayValue(r.partner2Pension || 0, r.year, r.cpiRate)
      };
    });
  }, [simulationResults, showNominalDollars, inflationRate, enableCoupleTracking, pensionRecipientType, partner1, partner2]);

  // Enriched chart data with percentile bands for Monte Carlo scenarios
  const enrichedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return chartData;
    
    // Only add percentile bands for Monte Carlo scenarios
    const mcResults = useMonteCarlo ? monteCarloResults : useHistoricalMonteCarlo ? historicalMonteCarloResults : null;
    
    if (!mcResults || !mcResults.percentileBands) {
      return chartData; // Return basic chart data if no MC results
    }
    
    // Merge percentile bands into chart data (always include when available)
    return chartData.map((dataPoint: any, idx: number) => {
      const bands = mcResults.percentileBands[idx];
      if (!bands) return dataPoint;
      
      // Get the inflation rate for this year (from simulation results)
      const simYear = simulationResults[idx];
      const yearNum = simYear?.year || idx + 1;
      const cpi = simYear?.cpiRate || inflationRate;
      
      // Convert percentiles to display values
      const p10 = toDisplayValue(bands.balance_p10, yearNum, cpi);
      const p25 = toDisplayValue(bands.balance_p25, yearNum, cpi);
      const p50 = toDisplayValue(bands.balance_p50, yearNum, cpi);
      const p75 = toDisplayValue(bands.balance_p75, yearNum, cpi);
      const p90 = toDisplayValue(bands.balance_p90, yearNum, cpi);
      
      const incomeP10 = toDisplayValue(bands.income_p10, yearNum, cpi);
      const incomeP50 = toDisplayValue(bands.income_p50, yearNum, cpi);
      const incomeP90 = toDisplayValue(bands.income_p90, yearNum, cpi);
      
      const spendingP10 = toDisplayValue(bands.spending_p10, yearNum, cpi);
      const spendingP50 = toDisplayValue(bands.spending_p50, yearNum, cpi);
      const spendingP90 = toDisplayValue(bands.spending_p90, yearNum, cpi);
      
      return {
        ...dataPoint,
        // Absolute percentile values (for reference)
        'Balance P10': p10,
        'Balance P25': p25,
        'Balance P50': p50,
        'Balance P75': p75,
        'Balance P90': p90,
        // Band ranges (heights for stacked areas)
        'Balance Band 10-25': p25 - p10,
        'Balance Band 25-75': p75 - p25,
        'Balance Band 75-90': p90 - p75,
        'Balance Base': p10, // Start from p10
        // Income/Spending percentiles
        'Income P10': incomeP10,
        'Income P50': incomeP50,
        'Income P90': incomeP90,
        'Income Band': incomeP90 - incomeP10,
        'Income Base': incomeP10,
        'Spending P10': spendingP10,
        'Spending P50': spendingP50,
        'Spending P90': spendingP90,
        'Spending Band': spendingP90 - spendingP10,
        'Spending Base': spendingP10
      };
    });
  }, [chartData, useMonteCarlo, useHistoricalMonteCarlo, monteCarloResults, historicalMonteCarloResults, simulationResults, inflationRate]);

  const pensionChartData = useMemo(() => {
    if (!simulationResults) return [];
    return simulationResults.map((r: any) => {
      // Calculate individual partner ages if couple tracking enabled
      let partner1Age = null;
      let partner2Age = null;
      if (enableCoupleTracking && pensionRecipientType === 'couple') {
        // Calculate which partner retires first chronologically
        const yearsUntilPartner1Retires = partner1.retirementAge - partner1.currentAge;
        const yearsUntilPartner2Retires = partner2.retirementAge - partner2.currentAge;
        const yearsUntilFirstRetirement = Math.min(yearsUntilPartner1Retires, yearsUntilPartner2Retires);
        
        const partner1AgeAtYear1 = partner1.currentAge + yearsUntilFirstRetirement;
        const partner2AgeAtYear1 = partner2.currentAge + yearsUntilFirstRetirement;
        partner1Age = partner1AgeAtYear1 + (r.year - 1);
        partner2Age = partner2AgeAtYear1 + (r.year - 1);
      }
      
      const calendarYear = getCalendarYear(r.year);
      
      return {
        year: r.year,
        calendarYear,
        age: r.age,
        partner1Age,
        partner2Age,
        'Age Pension': toDisplayValue(r.agePension, r.year, r.cpiRate),
        'PSS/CSS Pension': toDisplayValue(r.pensionIncome, r.year, r.cpiRate),
        'Total Income': toDisplayValue(r.income, r.year, r.cpiRate)
      };
    });
  }, [simulationResults, showNominalDollars, inflationRate, enableCoupleTracking, pensionRecipientType, partner1, partner2]);

  const exportDetailedCSV = () => {
    if (!simulationResults || simulationResults.length === 0) {
      alert('No simulation results to export. Please run a simulation first.');
      return;
    }

    // Determine which columns to include based on configuration
    const hasAnyOneOffs = oneOffExpenses.length > 0 && oneOffExpenses.some(e => e.amount > 0);
    const hasSplurge = splurgeAmount > 0;
    const hasAgedCare = includeAgedCare;
    const hasDebt = includeDebt && debts.length > 0;
    const hasCoupleTracking = pensionRecipientType === 'couple' && enableCoupleTracking;
    const isJPMorgan = spendingPattern === 'jpmorgan';
    
    // Detect if this is a health shock scenario (check if any year has health costs)
    const hasHealthShock = simulationResults.some((r: any, idx: number) => {
      if (idx < 14) return false; // Health shock starts year 15
      const spending = r.spending;
      const expectedBase = baseSpending * Math.pow(1 + r.cpiRate / 100, r.year - 1);
      const expectedAgedCare = r.agedCareAnnualCost || 0;
      const expectedOneOffs = oneOffExpenses.filter(e => e.age === r.age).reduce((sum, e) => sum + e.amount, 0);
      const expectedSpending = expectedBase + expectedAgedCare + expectedOneOffs;
      return Math.abs(spending - expectedSpending) > 1000; // More than $1k difference suggests health shock
    });

    // Build header dynamically
    let headers = [];
    
    // Core columns (always)
    headers.push('Year');
    if (hasCoupleTracking) {
      headers.push(`${partner1.name} Age`, `${partner2.name} Age`);
    } else {
      headers.push('Age');
    }
    headers.push('Calendar Year');
    
    // Starting balances (always)
    headers.push('Portfolio Start', 'Main Super Start', 'Buffer Start', 'Cash Start');
    
    // Spending calculation
    headers.push('Current Spending Base (Real)');
    if (isJPMorgan) headers.push('Spending Multiplier');
    if (hasSplurge) headers.push('Splurge Addition');
    if (hasAnyOneOffs) headers.push('One-Off Expenses');
    if (hasHealthShock) headers.push('Health Shock Costs');
    if (hasAgedCare) headers.push('Aged Care Annual Costs');
    if (hasDebt) headers.push('Debt Payments');
    headers.push('Total Spending');
    
    // Income calculation
    if (hasCoupleTracking) {
      if (partner1.pensionIncome > 0) headers.push(`${partner1.name} Pension`);
      if (partner2.pensionIncome > 0) headers.push(`${partner2.name} Pension`);
      if (partner1.preRetirementIncome > 0) headers.push(`${partner1.name} Pre-Retirement Income`);
      if (partner2.preRetirementIncome > 0) headers.push(`${partner2.name} Pre-Retirement Income`);
      headers.push('PSS/CSS Pension Total');
    } else {
      if (totalPensionIncome > 0) headers.push('PSS/CSS Pension');
    }
    if (includeAgePension) headers.push('Age Pension');
    headers.push('Total Income', 'Net Spending Need');
    
    // Withdrawals
    headers.push('Minimum Drawdown', 'Cash Used', 'Buffer Used', 'Super Used');
    
    // Aged care transactions
    if (hasAgedCare) {
      headers.push('RAD Withdrawn', 'RAD Refunded');
    }
    
    // Returns and ending balances
    headers.push('Return %', 'Main Super End', 'Buffer End', 'Cash End', 'Portfolio End');
    
    // Status indicators
    if (useGuardrails) headers.push('Guardrail Status');
    if (hasAgedCare) headers.push('In Aged Care');
    if (hasCoupleTracking) headers.push('Partner Status');
    if (hasDebt) headers.push('Debt Balance');
    
    let csv = headers.join(',') + '\n';

    // Build data rows
    simulationResults.forEach((r: any, index: number) => {
      const calendarYear = getRetirementYear(retirementAge) + r.year - 1;
      
      // Previous year balances
      const prevMainSuper = index === 0 ? mainSuperBalance : simulationResults[index - 1].mainSuper;
      const prevBuffer = index === 0 ? sequencingBuffer : simulationResults[index - 1].seqBuffer;
      const prevCash = index === 0 ? 0 : simulationResults[index - 1].cashAccount;
      const prevTotal = prevMainSuper + prevBuffer + prevCash;

      // Calculate spending components
      const actualSpendingMultiplier = getSpendingMultiplier(r.year);
      const currentSpendingBaseReal = r.currentSpendingBase || baseSpending;
      
     // Calculate splurge with ramp-down
      let splurgeAddition = 0;
      if (splurgeAmount > 0) {
        const splurgeEndAge = splurgeStartAge + splurgeDuration - 1;
        const rampDownEndAge = splurgeEndAge + splurgeRampDownYears;
        
        if (r.age >= splurgeStartAge && r.age <= splurgeEndAge) {
          // Full splurge period
          splurgeAddition = splurgeAmount * Math.pow(1 + r.cpiRate / 100, r.year - 1);
        } else if (splurgeRampDownYears > 0 && r.age > splurgeEndAge && r.age <= rampDownEndAge) {
          // Ramp-down period
          const yearsIntoRampDown = r.age - splurgeEndAge;
          const rampDownFraction = 1 - (yearsIntoRampDown / splurgeRampDownYears);
          const rampDownAmount = splurgeAmount * rampDownFraction;
          splurgeAddition = rampDownAmount * Math.pow(1 + r.cpiRate / 100, r.year - 1);
        }
      }

      
      // Calculate one-offs
      const oneOffTotal = oneOffExpenses.filter(e => e.age === r.age).reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate health shock (if year >= 15)
      const healthShockCost = (r.year >= 15) ? 30000 * Math.pow(1 + r.cpiRate / 100, r.year - 1) : 0;
      
      // Aged care costs
      const agedCareAnnual = r.agedCareAnnualCost || 0;
      const radWithdrawn = r.radWithdrawn || 0;
      const radRefunded = r.radRefund || 0;
      
      // Debt
      const debtPayment = r.debtPayment || 0;
      const debtBalance = r.debtBalance || 0;
      
      // Minimum drawdown
      const minDrawdownAmount = r.minDrawdown || 0;
      const superForMinimum = r.superDrawnForMinimum || 0;
      
      // Spending withdrawals
      const netSpendingNeed = Math.max(0, r.spending - r.income);
      
      // Calculate withdrawal breakdown (Cash → Buffer → Super waterfall)
      const cashAvailable = prevCash + superForMinimum;
      let cashUsed = 0, bufferUsed = 0, superUsedForSpending = 0;
      
      if (netSpendingNeed > 0) {
        if (cashAvailable >= netSpendingNeed) {
          cashUsed = netSpendingNeed;
        } else {
          cashUsed = cashAvailable;
          const remaining1 = netSpendingNeed - cashUsed;
          
          if (prevBuffer >= remaining1) {
            bufferUsed = remaining1;
          } else {
            bufferUsed = prevBuffer;
            superUsedForSpending = remaining1 - bufferUsed;
          }
        }
      }
      
      // Build row
      let row = [];
      
      // Core
      row.push(r.year);
      if (hasCoupleTracking) {
        // Calculate partner ages
        const yearsUntilPartner1Retires = partner1.retirementAge - partner1.currentAge;
        const yearsUntilPartner2Retires = partner2.retirementAge - partner2.currentAge;
        const yearsUntilFirstRetirement = Math.min(yearsUntilPartner1Retires, yearsUntilPartner2Retires);
        
        const partner1AgeAtYear1 = partner1.currentAge + yearsUntilFirstRetirement;
        const partner2AgeAtYear1 = partner2.currentAge + yearsUntilFirstRetirement;
        const partner1Age = partner1AgeAtYear1 + (r.year - 1);
        const partner2Age = partner2AgeAtYear1 + (r.year - 1);
        
        row.push(partner1Age, partner2Age);
      } else {
        row.push(r.age);
      }
      row.push(calendarYear);
      
      // Starting balances
      row.push(prevTotal.toFixed(2), prevMainSuper.toFixed(2), prevBuffer.toFixed(2), prevCash.toFixed(2));
      
      // Spending calculation
      row.push(currentSpendingBaseReal.toFixed(2));
      if (isJPMorgan) row.push(actualSpendingMultiplier.toFixed(4));
      if (hasSplurge) row.push(splurgeAddition.toFixed(2));
      if (hasAnyOneOffs) row.push(oneOffTotal.toFixed(2));
      if (hasHealthShock) row.push(healthShockCost.toFixed(2));
      if (hasAgedCare) row.push(agedCareAnnual.toFixed(2));
      if (hasDebt) row.push(debtPayment.toFixed(2));
      row.push(r.spending.toFixed(2));
      
      // Income
      if (hasCoupleTracking) {
        // Calculate individual partner incomes based on retirement status
        const yearsUntilPartner1Retires = partner1.retirementAge - partner1.currentAge;
        const yearsUntilPartner2Retires = partner2.retirementAge - partner2.currentAge;
        const yearsUntilFirstRetirement = Math.min(yearsUntilPartner1Retires, yearsUntilPartner2Retires);
        
        const partner1AgeAtYear1 = partner1.currentAge + yearsUntilFirstRetirement;
        const partner2AgeAtYear1 = partner2.currentAge + yearsUntilFirstRetirement;
        const partner1Age = partner1AgeAtYear1 + (r.year - 1);
        const partner2Age = partner2AgeAtYear1 + (r.year - 1);
        
        // Check if each partner is retired and add their income
        if (partner1.pensionIncome > 0) {
          const partner1Pension = partner1Age >= partner1.retirementAge ? 
            (partner1.pensionIncome * Math.pow(1 + r.cpiRate / 100, r.year - 1)) : 0;
          row.push(partner1Pension.toFixed(2));
        }
        if (partner2.pensionIncome > 0) {
          const partner2Pension = partner2Age >= partner2.retirementAge ? 
            (partner2.pensionIncome * Math.pow(1 + r.cpiRate / 100, r.year - 1)) : 0;
          row.push(partner2Pension.toFixed(2));
        }
        
        // Pre-retirement income (only if not yet retired)
        if (partner1.preRetirementIncome > 0) {
          const partner1PreRetirement = partner1Age < partner1.retirementAge ? 
            (partner1.preRetirementIncome * Math.pow(1 + r.cpiRate / 100, r.year - 1)) : 0;
          row.push(partner1PreRetirement.toFixed(2));
        }
        if (partner2.preRetirementIncome > 0) {
          const partner2PreRetirement = partner2Age < partner2.retirementAge ? 
            (partner2.preRetirementIncome * Math.pow(1 + r.cpiRate / 100, r.year - 1)) : 0;
          row.push(partner2PreRetirement.toFixed(2));
        }
        
        // Total PSS/CSS pension
        row.push((r.pensionIncome || 0).toFixed(2));
      } else {
        if (totalPensionIncome > 0) row.push((r.pensionIncome || 0).toFixed(2));
      }
      if (includeAgePension) row.push((r.agePension || 0).toFixed(2));
      row.push(r.income.toFixed(2), netSpendingNeed.toFixed(2));
      
      // Withdrawals
      row.push(minDrawdownAmount.toFixed(2), cashUsed.toFixed(2), bufferUsed.toFixed(2), superUsedForSpending.toFixed(2));
      
      // Aged care transactions
      if (hasAgedCare) {
        row.push(radWithdrawn.toFixed(2), radRefunded.toFixed(2));
      }
      
      // Returns and ending balances
      row.push(r.yearReturn.toFixed(2), r.mainSuper.toFixed(2), r.seqBuffer.toFixed(2), r.cashAccount.toFixed(2), r.totalBalance.toFixed(2));
      
      // Status
      if (useGuardrails) row.push(r.guardrailStatus || 'normal');
      if (hasAgedCare) row.push(r.inAgedCare ? 'TRUE' : 'FALSE');
      if (hasCoupleTracking) {
        // Add partner status based on death scenario
        if (deathScenario === 'both-alive') {
          row.push('Both Alive');
        } else {
          row.push(r.partnerAlive !== undefined ? (r.partnerAlive ? 'Partner Alive' : 'Partner Deceased') : 'N/A');
        }
      }
      if (hasDebt) row.push(debtBalance.toFixed(2));
      
      csv += row.join(',') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate descriptive filename
    const scenarioName = useMonteCarlo ? 'MonteCarlo' : 
                         useHistoricalMonteCarlo ? 'HistoricalMC' :
                         useFormalTest ? (selectedFormalTest || 'FormalTest') :
                         useHistoricalData ? historicalLabels[historicalPeriod as keyof typeof historicalLabels].replace(/[^a-zA-Z0-9]/g, '') :
                         `Return${selectedScenario}pct`;
    
    a.download = `retirement_${scenarioName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };
  
  // Early return if not mounted (for SSR compatibility)
  if (!isMounted) {
    return null;
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50">

    {(!termsAcknowledged || showTerms) && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
        <div className="bg-white max-w-3xl w-full mx-4 p-6 rounded-lg shadow-xl overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-semibold mb-4">
            Disclaimer and Terms of Use
          </h2>

         <div className="text-sm text-gray-700 space-y-3">
          <p>
            This retirement calculator is provided for <strong>general information
            and educational purposes only</strong>. It does not constitute
            financial, investment, tax, superannuation, or retirement advice.
          </p>

          <p>
            The calculator does not take into account your personal objectives,
            financial situation, or needs. You should consider seeking advice from
            a licensed financial adviser before making any financial decisions.
          </p>

          <p>
            All outputs are <strong>illustrative only</strong> and are based on
            user-selected inputs and stated assumptions. Actual outcomes may differ
            materially.
          </p>

          <p>
            This tool is provided “as is”, without warranty of any kind. To the
            maximum extent permitted by law, the creator disclaims all liability
            for any loss or damage arising from use of, or reliance on, this tool.
          </p>

          <p>
            This calculator does not intentionally collect or store personally
            identifiable information. Any usage analytics, if enabled, are used
            solely to improve functionality.
          </p>

          <p>
            These terms are governed by the laws of Australia.
          </p>

          <p className="pt-2">
            Contact:{' '}
            <a
              href="mailto:aust-retirement-calculator@proton.me"
              className="text-blue-600 underline"
            >
              aust-retirement-calculator@proton.me
            </a>
          </p>
        </div>

        {!termsAcknowledged && (
          <div className="mt-6 flex items-center gap-3">
          <input
            id="acknowledge"
            type="checkbox"
            className="h-4 w-4"
            onChange={acknowledgeTerms}
          />
          <label htmlFor="acknowledge" className="text-sm text-gray-800">
            I have read and acknowledge the Disclaimer and Terms of Use
          </label>
        </div>
        )}
          {/* Close button — only when reopening after acceptance */}
          {termsAcknowledged && (
           <div className="mt-6 text-right">
            <button
              onClick={() => setShowTerms(false)}
              className="px-4 py-2 bg-gray-200 rounded text-sm"
            >
            Close
         </button>
      </div>
    )}
      </div>
    </div>
  )}

      
  <div className="bg-white rounded-lg shadow-lg p-6">
  <div className="flex justify-between items-start mb-4">
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Australian Retirement Planning Tool</h1>
      <p className="text-gray-600">Version 15.2 - Executive Summary Dashboard</p>
    </div>
    <div className="text-right">
      <label className="block text-sm font-medium text-gray-700 mb-2">Display Values</label>
      <div className="flex justify-end gap-2 mb-2">
        <button 
          onClick={() => setShowNominalDollars(false)} 
          className={'px-4 py-2 rounded text-sm font-medium ' + (!showNominalDollars ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')}
        >
          Real {getRetirementYear(retirementAge)} $
        </button>
        <button 
          onClick={() => setShowNominalDollars(true)} 
          className={'px-4 py-2 rounded text-sm font-medium ' + (showNominalDollars ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')}
        >
          Nominal $
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {showNominalDollars ? 'Future dollar amounts' : 'Retirement year purchasing power'}
      </p>
      
      {/* 2x2 Button Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Row 1 */}
        <button 
          onClick={() => setShowHelpPanel(!showHelpPanel)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          {showHelpPanel ? '📖 Hide Help' : '📖 Quick Help'}
        </button>
        
        <button
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm font-medium hover:bg-gray-300"
        >
          📑 Key Assumptions
        </button>

        {/* Row 2 */}
        <button 
          onClick={exportDetailedCSV}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
        >
          📊 Export CSV
        </button>
        
        <PdfExportButton
          retirementData={{
            mainSuperBalance,
            sequencingBuffer,
            totalPensionIncome,
            currentAge,
            retirementAge,
            pensionRecipientType,
            isHomeowner,
            baseSpending,
            spendingPattern,
            splurgeAmount,
            splurgeStartAge,
            splurgeDuration,
            inflationRate,
            selectedScenario,
            includeAgePension,
            chartData,  
            oneOffExpenses,
            monteCarloResults: useMonteCarlo && monteCarloResults ? {
              medianSimulation: monteCarloResults.medianSimulation,
              successRate: monteCarloResults.successRate,
              percentiles: monteCarloResults.percentiles,
            } : undefined,

            historicalMonteCarloResults: useHistoricalMonteCarlo && historicalMonteCarloResults ? {
              medianSimulation: historicalMonteCarloResults.medianSimulation,
              successRate: historicalMonteCarloResults.successRate,
              percentiles: historicalMonteCarloResults.percentiles,
            } : undefined,

            formalTestResults: useFormalTest && formalTestResults ? formalTestResults : undefined,
          }}
        />
      </div>
    </div>
  </div>

        {showAssumptions && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-gray-800">
    
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">Key Assumptions</h3>
              <button
                onClick={() => setShowAssumptions(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
                aria-label="Close assumptions"
              >
               ✕
             </button>
            </div>

          <ul className="list-disc ml-5 space-y-1">
            <li>This tool does not provide financial, tax, or retirement advice and does not consider your personal circumstances.</li>
            <li>Investment returns are scenario-based assumptions, not forecasts or guarantees.</li>
            <li>Monte Carlo simulations use normally distributed returns (7% expected, 18% volatility by default); Historical Monte Carlo samples 98 years of verified S&P 500 data (Shiller/Ibbotson, 1928-2025).</li>
            <li>Inflation follows user or scenario inputs and may differ from future cost-of-living outcomes.</li>
            <li>Life expectancy modeling uses simplified assumptions; couple tracking applies probabilistic death at specified ages with immediate super transfer and reversionary pension reduction.</li>
            <li>All calculations use annual time steps; intra-year cash-flow timing and sequence-of-returns within years are not modelled.</li>
            <li>Withdrawal hierarchy is Cash Account → Sequencing Buffer → Main Super (or individual partner supers in couple mode); minimum pension drawdowns are applied annually.</li>
            <li>Aged care uses deterministic (fixed age/duration) or probabilistic (age-based risk) entry; RAD is refundable, annual costs are indexed to inflation.</li>
            <li>Debt repayment assumes fixed interest rates and minimum payments; extra payments reduce principal immediately; balances cannot go negative.</li>
            <li>Taxation is simplified: super earnings are tax-free in pension phase; Age Pension uses current means test thresholds (not indexed); income test ignores account-based pension deeming assumptions.</li>
            <li>Guardrails adjust spending by ±10% when portfolio crosses thresholds (20th percentile lower, 80th percentile upper); floor is set at pension income.</li>
            <li>Government benefits and superannuation rules assume broadly stable legislation; future policy changes are not incorporated.</li>
            <li>Historical data, Monte Carlo simulations, and formal stress tests are illustrative and not predictive of future outcomes.</li>
          </ul>
         </div>
        )}

        {/* Validation Errors - Always visible if present */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  ⚠️ Input Errors Detected ({Object.keys(validationErrors).length})
                </h3>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {Object.entries(validationErrors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
                <p className="text-xs text-red-600 mt-2 italic">
                  Please correct these errors before running calculations. Results may be unreliable.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Warnings - Collapsible */}
        {Object.keys(validationWarnings).length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                  ⚡ Warnings ({Object.keys(validationWarnings).length})
                </h3>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {Object.entries(validationWarnings).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-600 mt-2 italic">
                  These warnings highlight unusual values. Review them to ensure they're intentional.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success indicator when no errors/warnings */}
        {Object.keys(validationErrors).length === 0 && Object.keys(validationWarnings).length === 0 && (
          <div className="mb-6 p-3 bg-green-50 border-l-4 border-green-400 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  ✓ All inputs validated - Ready to calculate
                </p>
              </div>
            </div>
          </div>
        )}

        
        {showHelpPanel && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              📖 Quick Help Guide
              <button 
                onClick={() => setShowHelpPanel(false)}
                className="ml-auto text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                ✕ Close
              </button>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold text-lg mb-2 text-blue-700">🎯 Getting Started</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li><strong>Main Super:</strong> Your growth assets earning variable returns</li>
                  <li><strong>Sequencing Buffer:</strong> 3-5 years defensive cash (optional, earns 3% real)</li>
                  <li><strong>PSS/CSS Pension:</strong> Defined benefit pension income (indexed to CPI)</li>
                  <li><strong>Age Pension:</strong> Government payment (asset/income tested)</li>
                  <li><strong>Couple Tracking:</strong> Model each partner separately with individual ages, super, pensions, and death scenarios</li>
                </ul>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold text-lg mb-2 text-green-700">📊 Testing Methods</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li><strong>Constant Return:</strong> Simple baseline (e.g., 7% annually)</li>
                  <li><strong>Historical Sequences:</strong> Test specific events (GFC 2008, COVID, 1929 Crash, etc.)</li>
                  <li><strong>Monte Carlo:</strong> 1000s of random scenarios using statistical distributions</li>
                  <li><strong>Historical Monte Carlo:</strong> Random samples from 98 years of actual S&P 500 data (1928-2025)</li>
                  <li><strong>Formal Tests:</strong> Structured stress scenarios (Early Bear, Late Bear, Persistent Low, etc.)</li>
                </ul>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold text-lg mb-2 text-purple-700">🛡️ Dynamic Strategies</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li><strong>Guardrails:</strong> Adjust spending based on portfolio health (±10% when crossing thresholds)</li>
                  <li><strong>Increase spending:</strong> When portfolio exceeds upper guardrail</li>
                  <li><strong>Decrease spending:</strong> When portfolio falls below lower guardrail</li>
                  <li><strong>Floor protection:</strong> Never below pension income level</li>
                  <li><strong>Recommended:</strong> Enable for more realistic retirement modeling</li>
                </ul>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold text-lg mb-2 text-orange-700">🏥 Advanced Features</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li><strong>Aged Care:</strong> Deterministic or probabilistic RAD/annual costs</li>
                  <li><strong>Debt Repayment:</strong> Multiple loans with extra payments at retirement</li>
                  <li><strong>One-Off Expenses:</strong> Major purchases at specific ages (cars, renovations)</li>
                  <li><strong>Splurge Spending:</strong> Increased spending for early retirement years (travel)</li>
                  <li><strong>Death Scenarios:</strong> Model partner mortality and financial impacts</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-gray-700">
                <strong>💡 Recommended Workflow:</strong> (1) Start with Constant Return to establish baseline. 
                (2) Test with Historical Monte Carlo to see performance across actual market history. 
                (3) Enable Guardrails for realistic spending flexibility. 
                (4) Use Formal Tests to examine specific failure modes. 
                Success rates 80%+ are generally recommended by financial advisors. Historical MC provides more realistic outcomes than parametric Monte Carlo.
              </p>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Need more detail?</strong> Full documentation covers all features, calculations, and examples.
              </p>
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => {
                    window.open('https://github.com/popet70/aus-retirement-calculator-test/raw/main/docs/Retirement_Calculator_User_Guide_v15_2.pdf', '_blank');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  📥 Download PDF Guide
                </button>
                <button 
                  onClick={() => {
                    window.open('https://github.com/popet70/aus-retirement-calculator-test/raw/main/docs/Retirement_Calculator_User_Guide_v15_2.docx', '_blank');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                >
                  📥 Download Word Guide
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Comprehensive guide with examples, calculations, and detailed explanations
              </p>
            </div>
          </div>
        )}
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <h2 className="text-xl font-bold mb-3">Initial Situation</h2>
          
          {/* COMMON INPUTS - Always visible */}
          <div className="mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">Household Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Base Annual Spending</label>
                <input 
                  type="number" 
                  value={baseSpending} 
                  onChange={(e) => setBaseSpending(Number(e.target.value))} 
                  className={getInputClass('spending')}
                  step="5000" 
                />
                {validationErrors.spending && <p className="text-xs text-red-600 mt-1">{validationErrors.spending}</p>}
                {validationWarnings.spending && <p className="text-xs text-yellow-600 mt-1">{validationWarnings.spending}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sequencing Buffer
                  <InfoTooltip text="Cash/defensive assets to cover early retirement years. Withdrawals follow: Cash → Buffer → Main Super. Earns 3% real return (defensive)." />
                </label>
                <input 
                  type="number" 
                  value={sequencingBuffer} 
                  onChange={(e) => setSequencingBuffer(Number(e.target.value))} 
                  className={getInputClass('seqBuffer')}
                  step="10000" 
                />
                {validationErrors.seqBuffer && <p className="text-xs text-red-600 mt-1">{validationErrors.seqBuffer}</p>}
                {validationWarnings.seqBuffer && <p className="text-xs text-yellow-600 mt-1">{validationWarnings.seqBuffer}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  CPI / Inflation Rate (% per year)
                  <InfoTooltip text="Annual inflation rate used for projections. Affects spending growth, pension indexation, and real returns. Australian long-term average is 2.5%." />
                </label>
                <input 
                  type="number" 
                  value={inflationRate} 
                  onChange={(e) => setInflationRate(Number(e.target.value))} 
                  className={getInputClass('inflation')}
                  step="0.1"
                  min="0"
                  max="10"
                />
                {validationErrors.inflation && <p className="text-xs text-red-600 mt-1">{validationErrors.inflation}</p>}
                {validationWarnings.inflation && <p className="text-xs text-yellow-600 mt-1">{validationWarnings.inflation}</p>}
              </div>
            </div>
          </div>
          
          {/* Couple Tracking Toggle */}
          {pensionRecipientType === 'couple' && (
             <div className="mb-4 p-3 bg-white border border-blue-200 rounded">
               <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCoupleTracking}
                  onChange={(e) => {
                    setEnableCoupleTracking(e.target.checked);
                    // If enabling for first time, sync with current values
                   if (e.target.checked && partner1.superBalance === 1360000) {
                     setPartner1({
                      ...partner1,
                      currentAge,
                      retirementAge,
                      superBalance: mainSuperBalance,
                     pensionIncome: totalPensionIncome,
                   });
               }
           }}
        className="mr-3"
      />
      <span className="font-medium text-blue-900">
        Track partners individually
      </span>
      <InfoTooltip text="Enable separate tracking for each partner's super, pensions, retirement ages, and death scenarios." />
    </label>
  </div>
)}
   {/* Original Simple Inputs - only show when NOT tracking individually */}
     {!(pensionRecipientType === 'couple' && enableCoupleTracking) && (
      <div>
        <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium mb-1">
                Main Super Balance
                <InfoTooltip text="Your superannuation balance at retirement. This is the amount you'll have when you start drawing from super (not your current balance if you're still working)." />
              </label>
              <input 
                type="number" 
                value={mainSuperBalance} 
                onChange={(e) => setMainSuperBalance(Number(e.target.value))} 
                className={getInputClass('mainSuper')}
                step="10000" 
              />
              {validationErrors.mainSuper && <p className="text-xs text-red-600 mt-1">{validationErrors.mainSuper}</p>}
              {validationWarnings.mainSuper && <p className="text-xs text-yellow-600 mt-1">{validationWarnings.mainSuper}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Pension Income (per year)
                <InfoTooltip text="Your annual PSS/CSS/defined benefit pension income starting from retirement. Automatically indexed to inflation each year." />
              </label>
              <input 
                type="number" 
                value={totalPensionIncome} 
                onChange={(e) => setTotalPensionIncome(Number(e.target.value))} 
                className={getInputClass('pension')}
                step="5000" 
              />
              {validationErrors.pension && <p className="text-xs text-red-600 mt-1">{validationErrors.pension}</p>}
              {validationWarnings.pension && <p className="text-xs text-yellow-600 mt-1">{validationWarnings.pension}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Current Age
                <InfoTooltip text="Your age today. Used to calculate when you'll reach retirement age." />
              </label>
              <select 
                value={currentAge} 
                onChange={(e) => setCurrentAge(Number(e.target.value))} 
                className="w-full p-2 border rounded"
              >
                {[50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65].map(age => (
                  <option key={age} value={age}>
                    Age {age}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Retirement Age
                <InfoTooltip text="The age at which you plan to retire and start drawing from your super." />
              </label>
              <select 
                value={retirementAge} 
                onChange={(e) => setRetirementAge(Number(e.target.value))} 
                className="w-full p-2 border rounded"
              >
                {[55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70]
                  .filter(age => age >= currentAge)
                  .map(age => (
                    <option key={age} value={age}>
                      Age {age} (Year: {getRetirementYear(age)})
                    </option>
                  ))}
              </select>
          </div>
        </div>
      </div>
    )}
    {/* NEW: Couple Tracking Panel */}
         {pensionRecipientType === 'couple' && enableCoupleTracking && (
          <CoupleTrackingPanel
            partner1={partner1}
            partner2={partner2}
            onPartner1Change={setPartner1}
            onPartner2Change={setPartner2}
          />
      )}
      
      {/* Death Scenario Selector */}
      {pensionRecipientType === 'couple' && enableCoupleTracking && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 mt-4">
          <h3 className="font-bold mb-2 text-amber-900">Death Scenario Modeling</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Scenario to Model
                <InfoTooltip text="Three scenarios: (1) BOTH ALIVE: Standard couple throughout retirement with couple spending and age pension rates. (2) PARTNER 1 DIES: At configured age, their super transfers to Partner 2, pension reduces to reversionary rate (e.g., 67%), spending drops to single-person level (default 65%), age pension becomes single rate (~$30k vs ~$44k couple). Partner 2 continues alone. (3) PARTNER 2 DIES: Same but Partner 1 survives. Use to stress-test survivor adequacy." />
              </label>
              <select
                value={deathScenario}
                onChange={(e) => setDeathScenario(e.target.value as 'both-alive' | 'partner1-dies' | 'partner2-dies')}
                className="w-full p-2 border rounded"
              >
                <option value="both-alive">Both Partners Alive (Base Case)</option>
                <option value="partner1-dies">{partner1.name} Dies at Age {partner1.deathAge}</option>
                <option value="partner2-dies">{partner2.name} Dies at Age {partner2.deathAge}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Single Person Spending %
                <InfoTooltip text="What percentage of couple spending does a single person need? Research suggests 60-70%. Default is 65%." />
              </label>
              <input
                type="number"
                value={singleSpendingMultiplier * 100}
                onChange={(e) => setSingleSpendingMultiplier(Number(e.target.value) / 100)}
                className="w-full p-2 border rounded"
                min="50"
                max="100"
                step="5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Single spending: {formatCurrency(baseSpending * singleSpendingMultiplier)}/year
              </p>
            </div>
          </div>
          
          {deathScenario !== 'both-alive' && (
            <div className="mt-3 p-3 bg-white border border-amber-300 rounded text-sm">
              <p className="font-medium text-amber-900 mb-1">Scenario Effects:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {deathScenario === 'partner1-dies' && (
                  <>
                    <li>{partner1.name}'s super (${partner1.superBalance.toLocaleString()}) transfers to {partner2.name}</li>
                    <li>{partner1.name}'s pension reduces to {partner1.reversionaryRate}% reversionary rate</li>
                    <li>Spending reduces to {(singleSpendingMultiplier * 100).toFixed(0)}% ({formatCurrency(baseSpending * singleSpendingMultiplier)}/year)</li>
                    <li>Age Pension changes from couple to single rate</li>
                    <li>Projection continues from age {partner1.deathAge}</li>
                    {includeAgedCare && <li className="text-blue-700 font-medium">✓ {partner2.name} may enter aged care at age {deterministicAgedCareAge}</li>}
                  </>
                )}
                {deathScenario === 'partner2-dies' && (
                  <>
                    <li>{partner2.name}'s super (${partner2.superBalance.toLocaleString()}) transfers to {partner1.name}</li>
                    <li>{partner2.name}'s pension reduces to {partner2.reversionaryRate}% reversionary rate</li>
                    <li>Spending reduces to {(singleSpendingMultiplier * 100).toFixed(0)}% ({formatCurrency(baseSpending * singleSpendingMultiplier)}/year)</li>
                    <li>Age Pension changes from couple to single rate</li>
                    <li>Projection continues from age {partner2.deathAge}</li>
                    {includeAgedCare && <li className="text-blue-700 font-medium">✓ {partner1.name} may enter aged care at age {deterministicAgedCareAge}</li>}
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Age Pension Recipient Type
                <InfoTooltip text="Single or couple rates affect maximum payment and asset test thresholds." />
              </label>
              <select 
                value={pensionRecipientType} 
                onChange={(e) => setPensionRecipientType(e.target.value as 'single' | 'couple')} 
                className="w-full p-2 border rounded"
              >
                <option value="couple">Couple (combined rates)</option>
                <option value="single">Single person</option>
              </select>
            </div>
            <div>
              <label className="flex items-center pt-7">
                <input type="checkbox" checked={isHomeowner} onChange={(e) => setIsHomeowner(e.target.checked)} className="mr-2" />
                <span className="text-sm font-medium">
                  Own Home (affects Age Pension asset test)
                  <InfoTooltip text="Homeowners have lower Age Pension asset test thresholds than non-homeowners." />
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="flex items-center">
                <input type="checkbox" checked={includeAgePension} onChange={(e) => setIncludeAgePension(e.target.checked)} className="mr-2" />
                <span className="text-sm font-medium">
                  Include Age Pension
                  <InfoTooltip text="Government payment for retirees aged 67+. Asset and income tested - reduces as your wealth increases." />
                </span>
              </label>
            </div>
          </div>
          
          {includeAgePension && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-xs text-gray-700">
                <span className="font-semibold">ℹ️ Age Pension:</span> Using <strong>{pensionRecipientType}</strong> rates 
                (max ~{formatCurrency(agePensionParams.maxPensionPerYear)}/year{pensionRecipientType === 'couple' ? ' combined' : ''}).
              </div>
            </div>
          )}
          
          {/* Collapsible Pension Details Summary */}
          <div className="mt-4 border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowPensionDetails(!showPensionDetails)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 flex items-center justify-between font-semibold text-gray-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                📋 Pension Income Summary
                {enableCoupleTracking && pensionRecipientType === 'couple' && (
                  <span className="text-xs font-normal text-gray-600">(Both Partners)</span>
                )}
              </span>
              <span className="text-xl">{showPensionDetails ? '−' : '+'}</span>
            </button>
            
            {showPensionDetails && (
              <div className="p-4 bg-white border-t space-y-4">
                {/* Private Pension Section */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    💼 Private Pension Income
                    <InfoTooltip text="PSS/CSS or other defined benefit pensions. Set to $0 if you don't have one." />
                  </h4>
                  
                  {enableCoupleTracking && pensionRecipientType === 'couple' ? (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded">
                        <div>
                          <div className="font-medium text-blue-900">{partner1.name}</div>
                          <div className="text-gray-700">
                            <span className="font-semibold">{formatCurrency(partner1.pensionIncome)}/year</span>
                            {partner1.pensionIncome > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                Indexed to inflation annually
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-pink-900">{partner2.name}</div>
                          <div className="text-gray-700">
                            <span className="font-semibold">{formatCurrency(partner2.pensionIncome)}/year</span>
                            {partner2.pensionIncome > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                Indexed to inflation annually
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <strong>Note:</strong> Reversionary pensions ({(pensionReversionary * 100).toFixed(0)}%) continue to surviving partner at death
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm p-3 bg-blue-50 rounded">
                      <div className="font-semibold text-blue-900">{formatCurrency(totalPensionIncome)}/year</div>
                      {totalPensionIncome > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          Indexed to inflation annually
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Age Pension Section */}
                {includeAgePension && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      🏛️ Age Pension (Government)
                      <InfoTooltip text="Asset and income tested government payment. Reduces as wealth increases." />
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-green-50 rounded space-y-2">
                        <div>
                          <span className="font-medium">Eligibility Age:</span> {agePensionParams.eligibilityAge}
                        </div>
                        <div>
                          <span className="font-medium">Maximum Payment:</span> {formatCurrency(agePensionParams.maxPensionPerYear)}/year
                          {pensionRecipientType === 'couple' && <span className="text-gray-600"> (combined)</span>}
                        </div>
                        <div>
                          <span className="font-medium">Pension Type:</span> {pensionRecipientType === 'couple' ? 'Couple (combined)' : 'Single'}
                        </div>
                        
                        {enableCoupleTracking && pensionRecipientType === 'couple' && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="font-medium mb-1">Individual Eligibility:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 bg-white rounded">
                                <div className="font-medium text-blue-900">{partner1.name}</div>
                                <div>Eligible at age {agePensionParams.eligibilityAge}</div>
                                <div className="text-gray-600">
                                  (Year {Math.max(1, agePensionParams.eligibilityAge - partner1.currentAge - (Math.min(partner1.retirementAge - partner1.currentAge, partner2.retirementAge - partner2.currentAge)) + 1)})
                                </div>
                              </div>
                              <div className="p-2 bg-white rounded">
                                <div className="font-medium text-pink-900">{partner2.name}</div>
                                <div>Eligible at age {agePensionParams.eligibilityAge}</div>
                                <div className="text-gray-600">
                                  (Year {Math.max(1, agePensionParams.eligibilityAge - partner2.currentAge - (Math.min(partner1.retirementAge - partner1.currentAge, partner2.retirementAge - partner2.currentAge)) + 1)})
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 p-2 bg-green-100 rounded border border-green-300 text-xs">
                              <strong>✓ Accurate Modeling:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li><strong>Both under 67:</strong> No age pension</li>
                                <li><strong>One 67+, one under 67:</strong> Single rate (~$29.8k) for eligible partner only</li>
                                <li><strong>Both 67+:</strong> Couple rate (~$44.9k combined), split 50/50</li>
                                <li><strong>After death:</strong> Survivor gets single rate</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-600 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <strong>Asset Test:</strong> Pension reduces as total assets exceed {formatCurrency(isHomeowner ? agePensionParams.assetTestThresholdHomeowner : agePensionParams.assetTestThresholdNonHomeowner)} ({isHomeowner ? 'homeowner' : 'non-homeowner'})
                        <br />
                        <strong>Income Test:</strong> Pension reduces for income over {formatCurrency(agePensionParams.incomeTestFreeArea)}/year
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Pension Summary */}
                <div className="pt-3 border-t">
                  <h4 className="font-semibold text-gray-900 mb-2">📊 Total Pension Income</h4>
                  <div className="text-sm p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded">
                    {enableCoupleTracking && pensionRecipientType === 'couple' ? (
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium">{partner1.name}:</span> {formatCurrency(partner1.pensionIncome)}
                          {includeAgePension && <span className="text-gray-600"> + Age Pension (when eligible)</span>}
                        </div>
                        <div>
                          <span className="font-medium">{partner2.name}:</span> {formatCurrency(partner2.pensionIncome)}
                          {includeAgePension && <span className="text-gray-600"> + Age Pension (when eligible)</span>}
                        </div>
                        <div className="pt-2 mt-2 border-t border-purple-200 font-semibold">
                          Combined Private: {formatCurrency(partner1.pensionIncome + partner2.pensionIncome)}/year
                          {includeAgePension && <span className="text-gray-600 font-normal"> + Age Pension (varies by assets/income)</span>}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-semibold">{formatCurrency(totalPensionIncome)}/year</span>
                        {includeAgePension && <span className="text-gray-600"> + Age Pension (when eligible, varies by assets/income)</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {!(pensionRecipientType === 'couple' && enableCoupleTracking) && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Total Assets</div>
                <div className="text-xl font-bold text-green-700">{formatCurrency(mainSuperBalance + sequencingBuffer)}</div>
              </div>
              <div>
                <div className="text-gray-600">
                  Income Coverage
                  <InfoTooltip text="Pension income as % of base spending. Higher = less need to draw down assets." />
                </div>
                <div className="text-xl font-bold text-green-700">{((totalPensionIncome / baseSpending) * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
            <div className="font-semibold mb-1">Withdrawal Strategy</div>
            <div>1. Calculate spending need (base + splurge + one-offs)</div>
            <div>2. Subtract pension income and Age Pension</div>
            <div>3. Withdraw remainder: Cash → Buffer → Main Super</div>
            <div>4. Apply minimum drawdown (4-14% based on age), excess to Cash</div>
            <div>5. Apply returns: Main Super (variable), Buffer & Cash (3% real)</div>
          </div>
        </div>

        <div className="bg-white border p-4 rounded mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold">
              Pension Summary
              <InfoTooltip text="Your guaranteed lifetime income from PSS/CSS pension and Age Pension eligibility" />
            </h2>
            <button 
              onClick={() => setShowPensionSummary(!showPensionSummary)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showPensionSummary ? '▼ Hide' : '▶ Show'}
            </button>
          </div>
          
          {showPensionSummary && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <div className="text-sm text-gray-600 mb-1">
                    PSS/CSS Pension
                    {enableCoupleTracking && pensionRecipientType === 'couple' ? ' (Combined)' : ''}
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    {enableCoupleTracking && pensionRecipientType === 'couple' 
                      ? formatCurrency(partner1.pensionIncome + partner2.pensionIncome)
                      : formatCurrency(totalPensionIncome)}
                  </div>
                  {enableCoupleTracking && pensionRecipientType === 'couple' ? (
                    <div className="text-xs text-gray-600 mt-2">
                      {partner1.name}: {formatCurrency(partner1.pensionIncome)}<br/>
                      {partner2.name}: {formatCurrency(partner2.pensionIncome)}<br/>
                      ✓ Indexed to CPI ({inflationRate}%)
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 mt-2">
                      Starts: {getRetirementYear(retirementAge)}<br/>
                      ✓ Indexed to CPI ({inflationRate}%)<br/>
                      ✓ Tax-free in retirement
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Age Pension Eligibility</div>
                  <div className="text-2xl font-bold text-blue-700">
                    Age {agePensionParams.eligibilityAge}
                  </div>
                  {enableCoupleTracking && pensionRecipientType === 'couple' ? (
                    <div className="text-xs text-gray-600 mt-2">
                      {partner1.name} eligible: Year {Math.max(1, agePensionParams.eligibilityAge - partner1.currentAge - (Math.min(partner1.retirementAge - partner1.currentAge, partner2.retirementAge - partner2.currentAge)) + 1)}<br/>
                      {partner2.name} eligible: Year {Math.max(1, agePensionParams.eligibilityAge - partner2.currentAge - (Math.min(partner1.retirementAge - partner1.currentAge, partner2.retirementAge - partner2.currentAge)) + 1)}<br/>
                      <span className="text-blue-700 font-semibold">👥 Couple rates</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 mt-2">
                      Calendar year: {getRetirementYear(retirementAge) + (agePensionParams.eligibilityAge - retirementAge)}<br/>
                      Asset & income tested<br/>
                      <span className="text-blue-700 font-semibold">
                        {pensionRecipientType === 'couple' ? '👥 Couple rates' : '👤 Single rates'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-purple-50 rounded border border-purple-200">
                  <div className="text-sm text-gray-600 mb-1">
                    {enableCoupleTracking && pensionRecipientType === 'couple' ? 'Initial Income Coverage' : 'Income Coverage'}
                  </div>
                  <div className="text-2xl font-bold text-purple-700">
                    {enableCoupleTracking && pensionRecipientType === 'couple'
                      ? ((((partner1.currentAge >= partner1.retirementAge ? partner1.pensionIncome : 0) + 
                           (partner2.currentAge >= partner2.retirementAge ? partner2.pensionIncome : 0) + 
                           (partner1.currentAge < partner1.retirementAge ? partner1.preRetirementIncome : 0) + 
                           (partner2.currentAge < partner2.retirementAge ? partner2.preRetirementIncome : 0)) / baseSpending) * 100).toFixed(0)
                      : ((totalPensionIncome / baseSpending) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    {enableCoupleTracking && pensionRecipientType === 'couple' ? (
                      <>
                        of base spending<br/>
                        covered by all income<br/>
                        (pensions + pre-retirement)
                      </>
                    ) : (
                      <>
                        of base spending<br/>
                        covered by PSS/CSS pension
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Age Pension Over Time Chart */}
              {pensionChartData && pensionChartData.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Age Pension Over Time</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={pensionChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="calendarYear" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                      <YAxis tickFormatter={(val) => ((val as number)/1000).toFixed(0) + 'k'} />
                      <Tooltip content={<CustomChartTooltip enableCoupleTracking={enableCoupleTracking && pensionRecipientType === 'couple'} partner1Name={partner1.name} partner2Name={partner2.name} />} />
                      <Legend />
                      <Area type="monotone" dataKey="PSS/CSS Pension" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="Age Pension" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Line type="monotone" dataKey="Total Income" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-xs text-gray-600">
                    💡 Stacked areas show PSS/CSS pension (green) + Age Pension (blue). Purple line shows total income.
                    Age Pension reduces as assets grow due to asset test.
                  </div>
                </div>
              )}

              {/* Guardrail Protection Note */}
              {useGuardrails && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-600 text-lg">🛡️</span>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900 mb-1">Pension Floor Protection Active</div>
                      <div className="text-gray-700">
                        {enableCoupleTracking && pensionRecipientType === 'couple' ? (
                          <>
                            With guardrails enabled, your spending will never fall below your inflation-adjusted 
                            pension income (combined {formatCurrency(partner1.pensionIncome + partner2.pensionIncome)}), 
                            even in severe market downturns. This provides a guaranteed baseline standard of living.
                          </>
                        ) : (
                          <>
                            With guardrails enabled, your spending will never fall below your inflation-adjusted 
                            pension income ({formatCurrency(totalPensionIncome)}), even in severe market downturns. 
                            This provides a guaranteed baseline standard of living.
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white border p-4 rounded mb-6 mt-6">
          <h2 className="text-xl font-bold mb-3">
            Retirement Spending
            <InfoTooltip text="Configure your spending pattern and any additional splurge spending for specific years." />
          </h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Spending Pattern
              <InfoTooltip text="Level (CPI): Constant spending adjusted for inflation. Declining (JP Morgan): Decreases spending over time (go-go, slow-go, no-go years)." />
            </label>
            <div className="flex gap-2">
              <button onClick={() => setSpendingPattern('jpmorgan')} className={'px-4 py-2 rounded ' + (spendingPattern === 'jpmorgan' ? 'bg-purple-600 text-white' : 'bg-gray-200')}>JP Morgan (Declining)</button>
              <button onClick={() => setSpendingPattern('cpi')} className={'px-4 py-2 rounded ' + (spendingPattern === 'cpi' ? 'bg-purple-600 text-white' : 'bg-gray-200')}>CPI (Level)</button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">
              Additional Splurge Spending
              <InfoTooltip text="Extra spending for specific years (e.g., travel, home renovation). Added on top of regular spending." />
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Annual Splurge Amount: {formatCurrency(splurgeAmount)}
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="200000" 
                  step="5000"
                  value={splurgeAmount} 
                  onChange={(e) => setSplurgeAmount(Number(e.target.value))} 
                  className="w-full" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Age: {splurgeStartAge}
                </label>
                <input 
                  type="range" 
                  min={retirementAge} 
                  max="90" 
                  step="1"
                  value={splurgeStartAge} 
                  onChange={(e) => setSplurgeStartAge(Number(e.target.value))} 
                  className="w-full" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (years): {splurgeDuration}
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  step="1"
                  value={splurgeDuration} 
                  onChange={(e) => setSplurgeDuration(Number(e.target.value))} 
                  className="w-full" 
                />
              </div>

               <div>
                <label className="block text-sm font-medium mb-2">
                  Ramp-down Duration (years): {splurgeRampDownYears}
                  <InfoTooltip text="Gradually reduce splurge spending to $0 over this many years after main splurge period ends. Linear decline." />
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="15" 
                  step="1"
                  value={splurgeRampDownYears} 
                  onChange={(e) => setSplurgeRampDownYears(Number(e.target.value))} 
                  className="w-full" 
                />
                <p className="text-xs text-gray-600 mt-1">
                  {splurgeRampDownYears === 0 
                    ? 'No ramp-down - splurge stops immediately after main period' 
                    : `Spending declines from ${formatCurrency(splurgeAmount)} to $0 over ${splurgeRampDownYears} years`}
                </p>
              </div>

              
              <div className="mt-4 p-4 bg-gray-50 rounded">
                {splurgeSummary.enabled ? (
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold text-gray-900">Splurge Summary</div>
                    <div><strong>Main splurge total:</strong> {formatCurrency(splurgeSummary.totalSplurge)}</div>
                    <div><strong>Active period:</strong> {splurgeSummary.activePeriod}</div>
                    <div><strong>Peak annual impact:</strong> {splurgeSummary.annualImpact}</div>
                    {splurgeSummary.rampDownPeriod && (
                      <>
                        <div className="pt-2 border-t border-gray-300 mt-2">
                          <strong>Ramp-down period:</strong> {splurgeSummary.rampDownPeriod}
                        </div>
                        <div>
                          <strong>Ramp-down total:</strong> {formatCurrency(splurgeSummary.totalWithRampDown - splurgeSummary.totalSplurge)}
                        </div>
                        <div className="pt-2 border-t border-gray-300">
                          <strong>Combined total:</strong> {formatCurrency(splurgeSummary.totalWithRampDown)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 italic">
                          💡 Spending gradually decreases from {formatCurrency(splurgeAmount)} to $0 over {splurgeRampDownYears} years
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">{splurgeSummary.message}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border p-4 rounded mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">
                One-Off Expenses
                <InfoTooltip text="Single large expenses in specific years (e.g., car purchase, home repairs, wedding). Not recurring." />
              </h2>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOneOffExpenses}
                  onChange={(e) => setIncludeOneOffExpenses(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Include in calculations</span>
              </label>
            </div>
            <button 
              onClick={() => setShowOneOffExpenses(!showOneOffExpenses)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showOneOffExpenses ? '▼ Hide' : '▶ Show'}
            </button>
          </div>
          
          {showOneOffExpenses && (
            <div className="space-y-4">
              {[...oneOffExpenses].sort((a, b) => a.age - b.age).map((expense, sortedIndex) => {
                const actualIndex = oneOffExpenses.findIndex(e => e === expense);
                return (
                  <div key={actualIndex} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <input 
                        type="text"
                        placeholder="Description (e.g., New car)"
                        value={expense.description}
                        onChange={(e) => {
                          const newExpenses = [...oneOffExpenses];
                          newExpenses[actualIndex].description = e.target.value;
                          setOneOffExpenses(newExpenses);
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs text-gray-600">Age</label>
                      <input 
                        type="number"
                        placeholder="Age"
                        value={expense.age}
                        onChange={(e) => {
                          const newExpenses = [...oneOffExpenses];
                          newExpenses[actualIndex].age = Number(e.target.value);
                          setOneOffExpenses(newExpenses);
                        }}
                        className="w-full p-2 border rounded"
                        min={retirementAge}
                        max="100"
                      />
                    </div>
                    <div className="w-40">
                      <label className="text-xs text-gray-600">Amount</label>
                      <input 
                        type="number"
                        placeholder="Amount"
                        value={expense.amount}
                        onChange={(e) => {
                          const newExpenses = [...oneOffExpenses];
                          newExpenses[actualIndex].amount = Number(e.target.value);
                          setOneOffExpenses(newExpenses);
                        }}
                        className="w-full p-2 border rounded"
                        step="1000"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const newExpenses = oneOffExpenses.filter((_, i) => i !== actualIndex);
                        setOneOffExpenses(newExpenses);
                      }}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              
              <button 
                onClick={() => {
                  setOneOffExpenses([...oneOffExpenses, { description: '', age: retirementAge + 5, amount: 50000 }]);
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add One-Off Expense
              </button>
              
              {oneOffExpenses.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="font-semibold text-gray-900 mb-2">Summary</div>
                  <div className="text-sm space-y-1">
                    <div><strong>Total one-off expenses:</strong> {formatCurrency(oneOffExpenses.reduce((sum, e) => sum + e.amount, 0))}</div>
                    <div><strong>Number of expenses:</strong> {oneOffExpenses.length}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border p-4 rounded mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold">
              Aged Care Costs
              <InfoTooltip text="Model residential aged care costs including RAD (Refundable Accommodation Deposit) and ongoing fees. Australian data shows ~30% of retirees use residential aged care." />
            </h2>
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={includeAgedCare} 
                onChange={(e) => setIncludeAgedCare(e.target.checked)} 
                className="mr-2" 
              />
              <span className="text-sm font-medium">Include Aged Care</span>
            </label>
            {enableCoupleTracking && (
              <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                ℹ️ <strong>Couple Mode:</strong> Aged care costs apply to the surviving partner only. The model assumes both partners remain healthy while both are alive, and the survivor may enter aged care at the specified age.
              </div>
            )}
            {enableCoupleTracking && includeAgedCare && deathScenario === 'both-alive' && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                ⚠️ <strong>Action Required:</strong> To see aged care costs, you must select a death scenario below. Aged care only applies to the surviving partner after the first partner dies.
              </div>
            )}
          </div>
          
          {includeAgedCare && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Modeling Approach</label>
                
                {(useMonteCarlo || useHistoricalMonteCarlo) ? (
                  // Monte Carlo scenarios - allow both options
                  <>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input 
                          type="radio" 
                          checked={agedCareApproach === 'deterministic'} 
                          onChange={() => setAgedCareApproach('deterministic')} 
                          className="mr-2" 
                        />
                        <span className="text-sm">Deterministic (specify age)</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="radio" 
                          checked={agedCareApproach === 'probabilistic'} 
                          onChange={() => setAgedCareApproach('probabilistic')} 
                          className="mr-2" 
                        />
                        <span className="text-sm">Probabilistic (age-based risk)</span>
                      </label>
                    </div>
                    
                    {agedCareApproach === 'deterministic' ? (
                      <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500">
                        <p className="text-xs text-gray-700">
                          <strong>Deterministic:</strong> All {monteCarloRuns.toLocaleString()} simulations will enter aged care at exactly age {deterministicAgedCareAge}. 
                          Good for stress testing: "What if everyone needs aged care at 85?"
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 p-3 bg-green-50 border-l-4 border-green-500">
                        <p className="text-xs text-gray-700">
                          <strong>Probabilistic (Recommended):</strong> Each of the {monteCarloRuns.toLocaleString()} simulations uses age-based probabilities. 
                          Some will never need care, others will need it at different ages. This shows your true risk exposure.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  // Non-Monte Carlo scenarios - force deterministic
                  <>
                    <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
                      <p className="text-base font-semibold text-amber-900 mb-2">
                        ⚠️ Deterministic Mode Only
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        Probabilistic aged care modeling is only available with <strong>Monte Carlo</strong> or <strong>Historical Monte Carlo</strong> scenarios.
                      </p>
                      <p className="text-xs text-gray-600">
                        To use probabilistic aged care: Go to "Test Scenarios" section below and select either "Monte Carlo" or "Historical MC".
                      </p>
                    </div>
                  </>
                )}
              </div>

              {agedCareApproach === 'deterministic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Enter Aged Care at Age</label>
                    <input 
                      type="number" 
                      value={deterministicAgedCareAge} 
                      onChange={(e) => setDeterministicAgedCareAge(Number(e.target.value))} 
                      className="w-full p-2 border rounded"
                      min="70"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (years)</label>
                    <input 
                      type="number" 
                      value={agedCareDuration} 
                      onChange={(e) => setAgedCareDuration(Number(e.target.value))} 
                      className="w-full p-2 border rounded"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              )}

              {agedCareApproach === 'probabilistic' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Average Stay Duration: {agedCareDuration} years</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={agedCareDuration} 
                    onChange={(e) => setAgedCareDuration(Number(e.target.value))} 
                    className="w-full" 
                  />
                  <p className="text-xs text-gray-600">Australian average is ~3 years</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    RAD (Refundable Accommodation Deposit)
                    <InfoTooltip text="Lump sum paid on entry, refunded on exit. Typical range $300k-$600k. Can be paid as daily fee instead." />
                  </label>
                  <input 
                    type="number" 
                    value={agedCareRAD} 
                    onChange={(e) => setAgedCareRAD(Number(e.target.value))} 
                    className="w-full p-2 border rounded"
                    step="50000"
                  />
                  <p className="text-xs text-gray-600 mt-1">Withdrawn from super, refunded on exit</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Annual Ongoing Costs
                    <InfoTooltip text="Basic daily fee (~$22k/year) + means-tested care fee. Total typically $50k-$80k/year." />
                  </label>
                  <input 
                    type="number" 
                    value={agedCareAnnualCost} 
                    onChange={(e) => setAgedCareAnnualCost(Number(e.target.value))} 
                    className="w-full p-2 border rounded"
                    step="5000"
                  />
                  <p className="text-xs text-gray-600 mt-1">Not refundable, indexed to CPI</p>
                </div>
              </div>

              {pensionRecipientType === 'couple' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="font-semibold text-gray-900 mb-3">Couple Settings</div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Person at home needs: {(personAtHomeSpending * 100).toFixed(0)}% of couple spending
                        <InfoTooltip text="When one partner is in aged care, the other lives alone at home. Typically needs 70% of couple budget due to fixed costs (rates, insurance, utilities). This same percentage applies after partner dies." />
                      </label>
                      <input 
                        type="range" 
                        min="60" 
                        max="80" 
                        step="5"
                        value={personAtHomeSpending * 100} 
                        onChange={(e) => setPersonAtHomeSpending(Number(e.target.value) / 100)} 
                        className="w-full" 
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Couple: $120k → Person at home: ${(120000 * personAtHomeSpending / 1000).toFixed(0)}k while partner in care AND after partner dies
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white rounded border">
                      <input 
                        type="checkbox" 
                        checked={deathInCare} 
                        onChange={(e) => setDeathInCare(e.target.checked)} 
                        className="mt-1" 
                        id="deathInCare"
                      />
                      <label htmlFor="deathInCare" className="text-sm flex-1">
                        <span className="font-medium">Person dies in aged care (realistic default)</span>
                        <p className="text-xs text-gray-600 mt-1">
                          ✓ Checked: Partner dies in care, spending stays at {(personAtHomeSpending * 100).toFixed(0)}%, Age Pension switches to single rate, RAD refunded to estate.<br/>
                          ✗ Unchecked: Person recovers and returns home, couple spending resumes.
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="font-semibold text-gray-900 mb-2">Estimated Total Costs</div>
                <div className="text-sm space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div><strong>RAD (refundable):</strong></div>
                    <div className="text-right">{formatCurrency(agedCareRAD)}</div>
                    
                    <div><strong>Annual ongoing:</strong></div>
                    <div className="text-right">{formatCurrency(agedCareAnnualCost)}</div>
                    
                    <div><strong>{agedCareDuration}-year total cost:</strong></div>
                    <div className="text-right font-semibold">{formatCurrency(agedCareAnnualCost * agedCareDuration)}</div>
                  </div>
                  <div className="text-xs text-gray-600 mt-3 italic border-t pt-2">
                    Note: RAD is refunded when exiting care. Only ongoing costs reduce your portfolio permanently.
                    {pensionRecipientType === 'couple' && ' For couples, model each partner separately if needed.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border p-4 rounded mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold">
              Debt Repayment at Retirement
              <InfoTooltip text="Model mortgages, loans, or other debts carried into retirement. Includes interest and option to pay extra principal." />
            </h2>
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={includeDebt} 
                onChange={(e) => setIncludeDebt(e.target.checked)} 
                className="mr-2" 
              />
              <span className="text-sm font-medium">Include Debt Repayment</span>
            </label>
          </div>
          
          {includeDebt && (
            <div className="space-y-4">
              {debts.map((debt, idx) => (
                <div key={idx} className="p-4 border rounded bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <input
                      type="text"
                      value={debt.name}
                      onChange={(e) => {
                        const newDebts = [...debts];
                        newDebts[idx].name = e.target.value;
                        setDebts(newDebts);
                      }}
                      className="font-medium p-1 border rounded flex-1 mr-2"
                      placeholder="Debt name"
                    />
                    <button
                      onClick={() => setDebts(debts.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm mb-1">Principal Amount</label>
                      <input
                        type="number"
                        value={debt.amount}
                        onChange={(e) => {
                          const newDebts = [...debts];
                          newDebts[idx].amount = Number(e.target.value);
                          setDebts(newDebts);
                        }}
                        className="w-full p-2 border rounded"
                        step="10000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-1">Interest Rate (%)</label>
                      <input
                        type="number"
                        value={debt.interestRate}
                        onChange={(e) => {
                          const newDebts = [...debts];
                          newDebts[idx].interestRate = Number(e.target.value);
                          setDebts(newDebts);
                        }}
                        className="w-full p-2 border rounded"
                        step="0.1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-1">Repayment Period (years)</label>
                      <input
                        type="number"
                        value={debt.repaymentYears}
                        onChange={(e) => {
                          const newDebts = [...debts];
                          newDebts[idx].repaymentYears = Number(e.target.value);
                          setDebts(newDebts);
                        }}
                        className="w-full p-2 border rounded"
                        min="1"
                        max="30"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-1">Extra Payment ($/year)</label>
                      <input
                        type="number"
                        value={debt.extraPayment}
                        onChange={(e) => {
                          const newDebts = [...debts];
                          newDebts[idx].extraPayment = Number(e.target.value);
                          setDebts(newDebts);
                        }}
                        className="w-full p-2 border rounded"
                        step="1000"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                    <div><strong>Minimum Annual Payment:</strong> {formatCurrency(calculateMinimumDebtPayment(debt.amount, debt.interestRate, debt.repaymentYears))}</div>
                    <div><strong>Total Annual Payment:</strong> {formatCurrency(calculateMinimumDebtPayment(debt.amount, debt.interestRate, debt.repaymentYears) + debt.extraPayment)}</div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => setDebts([...debts, { name: 'New Debt', amount: 100000, interestRate: 5.0, repaymentYears: 10, extraPayment: 0 }])}
                className="w-full p-2 border-2 border-dashed border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 text-sm"
              >
                + Add Another Debt
              </button>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <div className="font-semibold mb-2">💡 Debt Strategy Notes:</div>
                <ul className="list-disc ml-5 space-y-1 text-gray-700">
                  <li>Debt payments are unavoidable - not subject to guardrails</li>
                  <li>Extra payments pay down principal faster, reducing total interest</li>
                  <li>Interest compounds annually in simulation</li>
                  <li>Debt withdrawals come from portfolio waterfall: Cash → Buffer → Super</li>
                  <li>Consider paying off high-interest debt before retirement if possible</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border p-4 rounded mb-6">
          <h2 className="text-xl font-bold mb-3">
            Dynamic Spending Guardrails
            <InfoTooltip text="Guyton-Klinger method: adjusts spending up/down based on portfolio performance to sustain withdrawals longer." />
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center">
              <input type="checkbox" checked={useGuardrails} onChange={(e) => setUseGuardrails(e.target.checked)} className="mr-2" />
              <span className="text-sm font-medium">Enable Guardrails</span>
            </label>
          </div>
          {useGuardrails && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Upper Guardrail: {upperGuardrail}%</label>
                <input type="range" min="10" max="30" step="5" value={upperGuardrail} onChange={(e) => setUpperGuardrail(Number(e.target.value))} className="w-full" />
                <p className="text-xs text-gray-600">Increase spending if withdrawal rate drops {upperGuardrail}% below initial</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Lower Guardrail: {lowerGuardrail}%</label>
                <input type="range" min="10" max="25" step="5" value={lowerGuardrail} onChange={(e) => setLowerGuardrail(Number(e.target.value))} className="w-full" />
                <p className="text-xs text-gray-600">Decrease spending if withdrawal rate rises {lowerGuardrail}% above initial</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Adjustment: {guardrailAdjustment}%</label>
                <input type="range" min="5" max="20" step="5" value={guardrailAdjustment} onChange={(e) => setGuardrailAdjustment(Number(e.target.value))} className="w-full" />
                <p className="text-xs text-gray-600">Spending adjustment when triggered</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border p-4 rounded mb-6">
          <h2 className="text-xl font-bold mb-3">Test Scenarios</h2>
          
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => { setUseHistoricalData(false); setUseMonteCarlo(false); setUseFormalTest(false); setUseHistoricalMonteCarlo(false); setUseComprehensive(false); }} className={'px-4 py-2 rounded ' + (!useHistoricalData && !useMonteCarlo && !useFormalTest && !useHistoricalMonteCarlo && !useComprehensive ? 'bg-blue-600 text-white' : 'bg-gray-200')}>Constant Return</button>
            <button onClick={() => { setUseHistoricalData(true); setUseMonteCarlo(false); setUseFormalTest(false); setUseHistoricalMonteCarlo(false); setUseComprehensive(false); }} className={'px-4 py-2 rounded ' + (useHistoricalData ? 'bg-orange-600 text-white' : 'bg-gray-200')}>Historical</button>
            <button onClick={() => { setUseMonteCarlo(true); setUseHistoricalData(false); setUseFormalTest(false); setUseHistoricalMonteCarlo(false); setUseComprehensive(false); setMonteCarloResults(null); }} className={'px-4 py-2 rounded ' + (useMonteCarlo ? 'bg-green-600 text-white' : 'bg-gray-200')}>Monte Carlo</button>
            <button onClick={() => { setUseHistoricalMonteCarlo(true); setUseHistoricalData(false); setUseMonteCarlo(false); setUseFormalTest(false); setUseComprehensive(false); setHistoricalMonteCarloResults(null); }} className={'px-4 py-2 rounded text-sm ' + (useHistoricalMonteCarlo ? 'bg-teal-600 text-white' : 'bg-gray-200')}>
              Historical MC
              <InfoTooltip text="Monte Carlo using 98 years of verified S&P 500 data from Shiller/Ibbotson (1928-2025)" />
            </button>
            <button onClick={() => { setUseFormalTest(true); setUseHistoricalData(false); setUseMonteCarlo(false); setUseHistoricalMonteCarlo(false); setUseComprehensive(false); setFormalTestResults(null); }} className={'px-4 py-2 rounded ' + (useFormalTest ? 'bg-purple-600 text-white' : 'bg-gray-200')}>Formal Tests</button>
          </div>
          
          {!useHistoricalData && !useMonteCarlo && !useFormalTest && !useHistoricalMonteCarlo && (
            <div>
              <label className="block text-sm font-medium mb-2">Expected Return: {selectedScenario}%</label>
              <input type="range" min="0" max="10" step="0.5" value={selectedScenario} onChange={(e) => setSelectedScenario(Number(e.target.value))} className="w-full" />
            </div>
          )}
          
          {useHistoricalData && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Select Historical Period</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(historicalReturns).map(period => (
                  <button key={period} onClick={() => setHistoricalPeriod(period)} className={'px-3 py-2 rounded text-sm ' + (historicalPeriod === period ? 'bg-orange-600 text-white' : 'bg-gray-200')}>
                    {historicalLabels[period as keyof typeof historicalLabels]}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {useMonteCarlo && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Simulations</label>
                <select value={monteCarloRuns} onChange={(e) => setMonteCarloRuns(Number(e.target.value))} className="w-full p-2 border rounded">
                  <option value={500}>500</option>
                  <option value={1000}>1,000</option>
                  <option value={2000}>2,000</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Expected Return (%)
                  <InfoTooltip text="Average annual return you expect from your investments over the long term." />
                </label>
                <input type="number" value={expectedReturn} onChange={(e) => setExpectedReturn(Number(e.target.value))} className="w-full p-2 border rounded" step="0.5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Volatility (%)
                  <InfoTooltip text="How much returns vary year-to-year. Higher = more uncertainty in annual returns." />
                </label>
                <input type="number" value={returnVolatility} onChange={(e) => setReturnVolatility(Number(e.target.value))} className="w-full p-2 border rounded" step="1" />
              </div>
              <button onClick={() => setMonteCarloResults(runMonteCarlo())} className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-bold">
                Run Monte Carlo
                <InfoTooltip text="Runs 1000 scenarios with randomized returns to show range of possible outcomes." />
              </button>
            </div>
          )}
          
          {useHistoricalMonteCarlo && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded">
                <div className="font-semibold text-teal-900 mb-2">📊 Historical Monte Carlo</div>
                <div className="text-sm text-gray-700">
                  Samples from <strong>98 years of verified S&P 500 data (1928-2025)</strong> from Robert Shiller and Ibbotson SBBI. Includes: Great Depression (-43%), 1974 stagflation (-27%), 1987 crash, 2000 dot-com, 2008 GFC (-37%), 2020 COVID. Real historical returns, not theoretical assumptions.
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Number of Simulations</label>
                <select value={monteCarloRuns} onChange={(e) => setMonteCarloRuns(Number(e.target.value))} className="w-full p-2 border rounded">
                  <option value={500}>500</option>
                  <option value={1000}>1,000</option>
                  <option value={2000}>2,000</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sampling Method
                  <InfoTooltip text="How to sample from 97 years of historical data. Block Bootstrap is recommended." />
                </label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setHistoricalMethod('overlapping')} 
                    className={'w-full px-3 py-3 rounded text-left text-sm ' + (historicalMethod === 'overlapping' ? 'bg-teal-600 text-white' : 'bg-gray-100 hover:bg-gray-200')}
                  >
                    <div className="font-semibold">Block Bootstrap (Recommended)</div>
                    <div className={'text-xs mt-1 ' + (historicalMethod === 'overlapping' ? 'text-teal-100' : 'text-gray-600')}>
                      Samples {blockSize}-year blocks preserving short-term correlations. Realistic sequences.
                    </div>
                  </button>
                  <button 
                    onClick={() => setHistoricalMethod('shuffle')} 
                    className={'w-full px-3 py-3 rounded text-left text-sm ' + (historicalMethod === 'shuffle' ? 'bg-teal-600 text-white' : 'bg-gray-100 hover:bg-gray-200')}
                  >
                    <div className="font-semibold">Shuffled Years</div>
                    <div className={'text-xs mt-1 ' + (historicalMethod === 'shuffle' ? 'text-teal-100' : 'text-gray-600')}>
                      Random individual years. Maximum diversity but loses correlations.
                    </div>
                  </button>
                  <button 
                    onClick={() => setHistoricalMethod('block')} 
                    className={'w-full px-3 py-3 rounded text-left text-sm ' + (historicalMethod === 'block' ? 'bg-teal-600 text-white' : 'bg-gray-100 hover:bg-gray-200')}
                  >
                    <div className="font-semibold">Complete 35-Year Blocks</div>
                    <div className={'text-xs mt-1 ' + (historicalMethod === 'block' ? 'text-teal-100' : 'text-gray-600')}>
                      Full historical 35-year periods. Only ~62 unique scenarios.
                    </div>
                  </button>
                </div>
              </div>
              
              {historicalMethod === 'overlapping' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Block Size: {blockSize} years</label>
                  <input 
                    type="range" 
                    min="3" 
                    max="10" 
                    step="1"
                    value={blockSize} 
                    onChange={(e) => setBlockSize(Number(e.target.value))} 
                    className="w-full" 
                  />
                  <p className="text-xs text-gray-600 mt-1">Larger blocks preserve more correlation, smaller blocks give more diversity. 5 years is typical.</p>
                </div>
              )}
              
              <button 
                onClick={() => setHistoricalMonteCarloResults(runHistoricalMonteCarlo())} 
                className="w-full px-4 py-3 bg-teal-600 text-white rounded hover:bg-teal-700 font-bold"
              >
                Run Historical Monte Carlo ({monteCarloRuns} simulations)
              </button>
            </div>
          )}
          
          {useFormalTest && (
            <div className="mt-4">
              <button onClick={() => setFormalTestResults(runFormalTests())} className="w-full px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">Run All Formal Tests</button>
            </div>
          )}
        </div>

        {useFormalTest && formalTestResults && (
          <div className="bg-white border p-4 rounded mb-6">
            <h2 className="text-xl font-bold mb-3">Formal Test Results</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm">Passed</div>
                <div className="text-3xl font-bold text-green-700">{Object.values(formalTestResults).filter((r: any) => r.passed).length}</div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="text-sm">Failed</div>
                <div className="text-3xl font-bold text-red-700">{Object.values(formalTestResults).filter((r: any) => !r.passed).length}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm">Success Rate</div>
                <div className="text-3xl font-bold text-blue-700">{((Object.values(formalTestResults).filter((r: any) => r.passed).length / Object.values(formalTestResults).length) * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left border">Test</th>
                    <th className="p-2 text-left border">Description</th>
                    <th className="p-2 text-right border">Years Lasted</th>
                    <th className="p-2 text-right border">Final Balance</th>
                    <th className="p-2 text-center border">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(formalTestResults).map((key) => {
                    const test: any = formalTestResults[key as keyof typeof formalTestResults];
                    return (
                      <tr key={key} className={test.passed ? 'bg-green-50 hover:bg-green-100 cursor-pointer' : 'bg-red-50 hover:bg-red-100 cursor-pointer'} onClick={() => setSelectedFormalTest(key)}>
                        <td className="p-2 font-bold border">{test.name}</td>
                        <td className="p-2 border">{test.desc}</td>
                        <td className="p-2 text-right border">{test.yearsLasted} / {test.targetYears} years</td>
                        <td className="p-2 text-right border">{formatCurrency(toDisplayValue(test.finalBalance, test.yearsLasted))}</td>
                        <td className="p-2 text-center text-2xl border">{test.passed ? '✅' : '❌'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-2">💡 Click any test row to view its detailed chart below</p>
          </div>
        )}

        {useFormalTest && selectedFormalTest && formalTestResults && formalTestResults[selectedFormalTest as keyof typeof formalTestResults] && (formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any).simulationData && (
          <div className="bg-white border p-4 rounded mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">Detailed View: {(formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any).name}</h2>
              <button onClick={() => setSelectedFormalTest(null)} className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">Close</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{(formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any).desc}</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={(formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any).simulationData.map((r: any) => ({
                year: r.year,
                calendarYear: getCalendarYear(r.year),
                age: r.age,
                balance: toDisplayValue(r.totalBalance, r.year, r.cpiRate),
                spending: toDisplayValue(r.spending, r.year, r.cpiRate),
                income: toDisplayValue(r.income, r.year, r.cpiRate)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="calendarYear" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                <YAxis tickFormatter={(val) => ((val as number)/1000).toFixed(0) + 'k'} />
                <Tooltip formatter={(val) => formatCurrency(val as number)} labelFormatter={(label) => `${label} (Year ${(formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any).simulationData.find((r: any) => getCalendarYear(r.year) === label)?.year || ''})`} />
                <Legend />
                <Line type="monotone" dataKey="balance" name="Total Balance" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={1} />
                <Line type="monotone" dataKey="spending" name="Spending" stroke="#ef4444" strokeWidth={1} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {useMonteCarlo && monteCarloResults && (
          <div className="bg-white border p-6 rounded mb-6">
            <h2 className="text-2xl font-bold mb-4">Monte Carlo Results</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-600">
                  Success Rate
                  <InfoTooltip text="Percentage of scenarios where money lasts to target age (35 years)." />
                </div>
                <div className="text-3xl font-bold text-green-700">{monteCarloResults.successRate.toFixed(1)}%</div>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-600">
                  10th Percentile
                  <InfoTooltip text="Pessimistic outcome - only 10% of scenarios do worse than this." />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(toDisplayValue(monteCarloResults.percentiles.p10, 35))}</div>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-600">
                  Median
                  <InfoTooltip text="Middle outcome - half of scenarios do better, half do worse." />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(toDisplayValue(monteCarloResults.percentiles.p50, 35))}</div>
              </div>
            </div>
            
            {/* Monte Carlo Guidance Panel */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm font-semibold text-blue-900 mb-2">📊 Understanding Your Results</div>
              <div className="text-sm text-gray-700 space-y-2">
                <div>
                  <strong>Success Rate {monteCarloResults.successRate.toFixed(1)}%:</strong>
                  {monteCarloResults.successRate >= 90 && " Excellent! Your plan has very high confidence."}
                  {monteCarloResults.successRate >= 80 && monteCarloResults.successRate < 90 && " Good. Most financial advisors recommend 80%+ success rate."}
                  {monteCarloResults.successRate >= 70 && monteCarloResults.successRate < 80 && " Moderate risk. Consider reducing spending or increasing buffer."}
                  {monteCarloResults.successRate < 70 && " High risk. Your plan may need significant adjustments."}
                </div>
                
                <div>
                  <strong>10th Percentile ({formatCurrency(toDisplayValue(monteCarloResults.percentiles.p10, 35))}):</strong> 
                  This is your "bad luck" scenario. Even in the worst 10% of outcomes, you'd have this much remaining.
                  {monteCarloResults.percentiles.p10 <= 0 && " ⚠️ Some scenarios run out of money."}
                </div>
                
                {monteCarloResults.failureStats && monteCarloResults.failureStats.totalFailures > 0 && (
                  <div>
                    <strong>Recommended Actions:</strong>
                    <ul className="list-disc ml-5 mt-1">
                      {monteCarloResults.failureStats.topCauses[0]?.cause === 'Early sequence risk' && (
                        <li>Increase sequencing buffer from ${(sequencingBuffer/1000).toFixed(0)}k to ${Math.max(300, sequencingBuffer/1000 + 100).toFixed(0)}k</li>
                      )}
                      {monteCarloResults.successRate < 80 && (
                        <li>Reduce base spending by 5-10% (from ${(baseSpending/1000).toFixed(0)}k to ${(baseSpending * 0.9 / 1000).toFixed(0)}k)</li>
                      )}
                      <li>Enable guardrails to allow dynamic spending adjustments</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            {/* Failure Analysis Section */}
            {monteCarloResults.failureStats && monteCarloResults.failureStats.totalFailures > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="text-lg font-semibold text-red-900 mb-3">
                  ⚠️ Failure Analysis ({monteCarloResults.failureStats.totalFailures} scenarios failed)
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-700 font-semibold mb-2">Average Failure Point</div>
                    <div className="text-xl font-bold text-red-700">
                      Year {monteCarloResults.failureStats.avgFailureYear} (Age {monteCarloResults.failureStats.avgFailureAge})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 font-semibold mb-2">Primary Failure Causes</div>
                    <div className="space-y-1">
                      {monteCarloResults.failureStats.topCauses.map((cause: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <span className="font-semibold">{cause.cause}:</span> {cause.count} scenarios ({cause.percentage.toFixed(0)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-white rounded border border-red-300">
                  <div className="text-sm font-semibold text-gray-700 mb-2">💡 What This Means:</div>
                  <div className="text-sm text-gray-700 space-y-1">
                    {monteCarloResults.failureStats.topCauses[0]?.cause === 'Early sequence risk' && (
                      <div>• <strong>Early sequence risk</strong> is the main threat. Poor returns in the first 5 years deplete your portfolio before it can recover. Consider a larger sequencing buffer or more conservative initial withdrawal rate.</div>
                    )}
                    {monteCarloResults.failureStats.topCauses[0]?.cause === 'Poor early returns' && (
                      <div>• <strong>Poor early returns</strong> damage your portfolio when it's largest. Consider increasing your sequencing buffer from ${(sequencingBuffer/1000).toFixed(0)}k or reducing initial spending.</div>
                    )}
                    {monteCarloResults.failureStats.topCauses[0]?.cause === 'Extended bear market' && (
                      <div>• <strong>Extended bear markets</strong> (4+ consecutive down years) are the main risk. Your plan may need more conservative assumptions or a larger safety buffer.</div>
                    )}
                    {monteCarloResults.failureStats.topCauses[0]?.cause === 'Gradual depletion' && (
                      <div>• <strong>Gradual depletion</strong> suggests spending may be too high relative to portfolio size. Consider reducing base spending or increasing initial portfolio.</div>
                    )}
                    <div>• On average, failures occur at Year {monteCarloResults.failureStats.avgFailureYear} (Age {monteCarloResults.failureStats.avgFailureAge}), giving you early warning signs to adjust spending if needed.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {useHistoricalMonteCarlo && historicalMonteCarloResults && (
          <div className="bg-white border p-6 rounded mb-6">
            <h2 className="text-2xl font-bold mb-4">Historical Monte Carlo Results</h2>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-600">Success Rate</div>
                <div className="text-3xl font-bold text-teal-700">{historicalMonteCarloResults.successRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">Based on real data</div>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-600">Worst Outcome</div>
                <div className="text-2xl font-bold">{formatCurrency(toDisplayValue(historicalMonteCarloResults.percentiles.p10, 35))}</div>
                <div className="text-xs text-gray-500 mt-1">10th percentile</div>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-600">Median</div>
                <div className="text-2xl font-bold">{formatCurrency(toDisplayValue(historicalMonteCarloResults.percentiles.p50, 35))}</div>
                <div className="text-xs text-gray-500 mt-1">Typical outcome</div>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-600">Best Outcome</div>
                <div className="text-2xl font-bold">{formatCurrency(toDisplayValue(historicalMonteCarloResults.percentiles.p90, 35))}</div>
                <div className="text-xs text-gray-500 mt-1">90th percentile</div>
              </div>
            </div>
            
            {/* Historical Monte Carlo Guidance Panel */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm font-semibold text-blue-900 mb-2">📊 Understanding Your Historical Results</div>
              <div className="text-sm text-gray-700 space-y-2">
                <div>
                  <strong>Success Rate {historicalMonteCarloResults.successRate.toFixed(1)}%:</strong>
                  {historicalMonteCarloResults.successRate >= 90 && " Excellent! Your plan survived 90%+ of actual historical market conditions."}
                  {historicalMonteCarloResults.successRate >= 80 && historicalMonteCarloResults.successRate < 90 && " Good. Your plan is robust against most historical crashes."}
                  {historicalMonteCarloResults.successRate >= 70 && historicalMonteCarloResults.successRate < 80 && " Moderate. Your plan struggles in some historical scenarios like 1929 or 2008."}
                  {historicalMonteCarloResults.successRate < 70 && " Concerning. Your plan would have failed in many actual historical periods."}
                </div>
                
                <div>
                  <strong>Worst Outcome ({formatCurrency(toDisplayValue(historicalMonteCarloResults.percentiles.p10, 35))}):</strong> 
                  Based on actual market history, this is what happened in the worst 10% of scenarios.
                  {historicalMonteCarloResults.percentiles.p10 <= 0 && " ⚠️ Your plan would have run out of money in some real historical periods."}
                </div>
                
                {historicalMonteCarloResults.failureStats && historicalMonteCarloResults.failureStats.totalFailures > 0 && (
                  <div>
                    <strong>Historical Insight:</strong> These failures represent <em>actual historical sequences</em> from 1928-2025. 
                    If you had retired at the wrong time (like 1929 or 2000), your plan would have struggled.
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded">
              <div className="text-sm font-semibold text-teal-900 mb-2">📊 Historical Context</div>
              <div className="text-sm text-gray-700 space-y-1">
                <div>• <strong>Data source:</strong> S&P 500 Total Return Index (Shiller/Ibbotson SBBI, 1928-2025)</div>
                <div>• <strong>Data period:</strong> {historicalMonteCarloResults.dataYears} years of verified historical returns</div>
                <div>• <strong>Includes:</strong> Great Depression (-43%), 1974 stagflation (-27%), 1987 crash, 2000 dot-com, 2008 GFC (-37%), 2020 COVID</div>
                <div>• <strong>Method:</strong> {
                  historicalMonteCarloResults.method === 'shuffle' ? 'Random year sampling' :
                  historicalMonteCarloResults.method === 'overlapping' ? `${blockSize}-year block bootstrap` :
                  'Complete 35-year sequences'
                }</div>
                <div>• <strong>Simulations:</strong> {
                  historicalMonteCarloResults.method === 'block' 
                    ? `${historicalMonteCarloResults.actualRuns} unique historical periods tested (all possible 35-year blocks from 1928-2025)`
                    : `${monteCarloRuns.toLocaleString()} scenarios sampled from actual market history`
                }</div>
                <div>• <strong>Advantage:</strong> Real crash patterns, real recoveries, real correlations - not theoretical assumptions</div>
              </div>
            </div>
            
            {/* Failure Analysis Section */}
            {historicalMonteCarloResults.failureStats && historicalMonteCarloResults.failureStats.totalFailures > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="text-lg font-semibold text-red-900 mb-3">
                  ⚠️ Failure Analysis ({historicalMonteCarloResults.failureStats.totalFailures} historical scenarios failed)
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-700 font-semibold mb-2">Average Failure Point</div>
                    <div className="text-xl font-bold text-red-700">
                      Year {historicalMonteCarloResults.failureStats.avgFailureYear} (Age {historicalMonteCarloResults.failureStats.avgFailureAge})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 font-semibold mb-2">Primary Failure Causes</div>
                    <div className="space-y-1">
                      {historicalMonteCarloResults.failureStats.topCauses.map((cause: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <span className="font-semibold">{cause.cause}:</span> {cause.count} scenarios ({cause.percentage.toFixed(0)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-white rounded border border-red-300">
                  <div className="text-sm font-semibold text-gray-700 mb-2">💡 What This Means (Based on Real History):</div>
                  <div className="text-sm text-gray-700 space-y-1">
                    {historicalMonteCarloResults.failureStats.topCauses[0]?.cause === 'Early sequence risk' && (
                      <div>• <strong>Early sequence risk</strong> from historical crashes (like 1929 or 2008 immediately after retirement) is the main threat. These real historical scenarios depleted portfolios before recovery. Consider a larger sequencing buffer or more conservative initial withdrawal rate.</div>
                    )}
                    {historicalMonteCarloResults.failureStats.topCauses[0]?.cause === 'Poor early returns' && (
                      <div>• <strong>Poor early returns</strong> (similar to retiring in 1929, 1973, or 2000) damage your portfolio when it's largest. Consider increasing your sequencing buffer from ${(sequencingBuffer/1000).toFixed(0)}k or reducing initial spending.</div>
                    )}
                    {historicalMonteCarloResults.failureStats.topCauses[0]?.cause === 'Extended bear market' && (
                      <div>• <strong>Extended bear markets</strong> (like 1929-1932, 1973-1974, or 2000-2002) are the main risk in actual history. Your plan may need more conservative assumptions or a larger safety buffer.</div>
                    )}
                    {historicalMonteCarloResults.failureStats.topCauses[0]?.cause === 'Gradual depletion' && (
                      <div>• <strong>Gradual depletion</strong> suggests spending may be too high even in moderate historical scenarios. Consider reducing base spending or increasing initial portfolio.</div>
                    )}
                    <div>• These failures represent <strong>real historical sequences</strong> from 1928-2025. On average, failures occurred at Year {historicalMonteCarloResults.failureStats.avgFailureYear} (Age {historicalMonteCarloResults.failureStats.avgFailureAge}), giving you early warning to adjust spending.</div>
                    
                    {/* Show specific failing periods for Complete Blocks method */}
                    {historicalMonteCarloResults.method === 'block' && historicalMonteCarloResults.failureStats.allFailures && historicalMonteCarloResults.failureStats.allFailures.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <div className="font-semibold mb-2">📅 Specific Historical Periods That Failed:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {historicalMonteCarloResults.failureStats.allFailures.map((failure: any, idx: number) => (
                            <div key={idx} className="bg-red-100 p-2 rounded">
                              <span className="font-semibold">{failure.historicalPeriod}</span>
                              <span className="text-gray-600"> - Failed at Year {failure.failureYear}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-600 mt-2 italic">
                          These are the actual retirement start years that would have resulted in portfolio depletion based on real historical market returns.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Executive Summary Dashboard */}
        {chartData.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowExecutiveSummary(!showExecutiveSummary)}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 rounded-lg flex items-center justify-between font-semibold text-gray-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                📊 Executive Summary
                <span className="text-xs font-normal text-gray-600">Key metrics and outcomes</span>
              </span>
              <span className="text-xl">{showExecutiveSummary ? '−' : '+'}</span>
            </button>
            
            {showExecutiveSummary && (() => {
              // Calculate summary metrics from simulation results (raw data)
              if (!simulationResults || simulationResults.length === 0) return null;
              
              const firstYear = simulationResults[0];
              const lastYear = simulationResults[simulationResults.length - 1];
              const startingBalance = firstYear.totalBalance;
              const endingBalance = lastYear.totalBalance;
              const yearsRun = simulationResults.length;
              const targetYears = useFormalTest && selectedFormalTest && formalTestResults 
                ? (formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any)?.targetYears || 35
                : 35;
              
              // Success determination
              // Success = made it to target years AND didn't go negative (0 is acceptable - just used last dollar)
              const success = yearsRun >= targetYears && endingBalance >= 0;
              const failureYear = success ? null : yearsRun;
              
              // Calculate total withdrawals
              const totalWithdrawn = simulationResults.reduce((sum: number, year: any) => sum + (year.withdrawn || 0), 0);
              
              // Calculate average return (weighted by balance)
              const avgReturn = simulationResults.length > 1 
                ? simulationResults.slice(1).reduce((sum: number, year: any) => sum + (year.yearReturn || 0), 0) / (simulationResults.length - 1)
                : 0;
              
              // Get pension info
              const firstPensionYear = simulationResults.find((y: any) => (y.pensionIncome || 0) > 0);
              const privatePensionTotal = firstPensionYear?.pensionIncome || totalPensionIncome;
              const agePensionStartYear = simulationResults.findIndex((y: any) => (y.agePension || 0) > 0);
              const maxAgePension = Math.max(...simulationResults.map((y: any) => y.agePension || 0));
              
              // Calculate average annual spending
              const avgSpending = simulationResults.reduce((sum: number, y: any) => sum + (y.spending || 0), 0) / simulationResults.length;
              const peakSpending = Math.max(...simulationResults.map((y: any) => y.spending || 0));
              const peakSpendingYear = simulationResults.findIndex((y: any) => y.spending === peakSpending) + 1;
              
              // Risk indicators
              const earlyNegativeReturns = simulationResults.slice(0, 5).some((y: any) => (y.yearReturn || 0) < -10);
              const runningLowLater = simulationResults.length > 20 && simulationResults.slice(-10).some((y: any) => {
                const balance = y.totalBalance || 0;
                const initialBalance = simulationResults[0].totalBalance || 1;
                return balance < initialBalance * 0.2; // Below 20% of starting
              });
              const highInflation = (useFormalTest && selectedFormalTest && 
                (formalTestResults?.[selectedFormalTest as keyof typeof formalTestResults] as any)?.desc?.includes('5% CPI')) || 
                inflationRate > 4;
              const hasAgedCare = simulationResults.some((y: any) => y.inAgedCare);
              
              // Monte Carlo metrics
              const mcSuccess = useMonteCarlo && monteCarloResults ? monteCarloResults.successRate : null;
              const mcP10 = useMonteCarlo && monteCarloResults?.percentiles ? 
                monteCarloResults.percentiles[monteCarloResults.percentiles.length - 1]?.p10 : null;
              const mcP50 = useMonteCarlo && monteCarloResults?.percentiles ? 
                monteCarloResults.percentiles[monteCarloResults.percentiles.length - 1]?.p50 : null;
              const mcP90 = useMonteCarlo && monteCarloResults?.percentiles ? 
                monteCarloResults.percentiles[monteCarloResults.percentiles.length - 1]?.p90 : null;
              
              const hmcSuccess = useHistoricalMonteCarlo && historicalMonteCarloResults ? historicalMonteCarloResults.successRate : null;
              const hmcP10 = useHistoricalMonteCarlo && historicalMonteCarloResults?.percentiles ? 
                historicalMonteCarloResults.percentiles[historicalMonteCarloResults.percentiles.length - 1]?.p10 : null;
              const hmcP50 = useHistoricalMonteCarlo && historicalMonteCarloResults?.percentiles ? 
                historicalMonteCarloResults.percentiles[historicalMonteCarloResults.percentiles.length - 1]?.p50 : null;
              const hmcP90 = useHistoricalMonteCarlo && historicalMonteCarloResults?.percentiles ? 
                historicalMonteCarloResults.percentiles[historicalMonteCarloResults.percentiles.length - 1]?.p90 : null;
              
              // Couple tracking metrics
              const partner1FinalSuper = enableCoupleTracking && lastYear.partner1Super !== undefined ? lastYear.partner1Super : null;
              const partner2FinalSuper = enableCoupleTracking && lastYear.partner2Super !== undefined ? lastYear.partner2Super : null;
              const partner1TotalPension = enableCoupleTracking && lastYear.partner1Pension !== undefined ? lastYear.partner1Pension : null;
              const partner2TotalPension = enableCoupleTracking && lastYear.partner2Pension !== undefined ? lastYear.partner2Pension : null;
              
              // Determine which scenario is active
              let scenarioName = '';
              let scenarioIcon = '';
              let scenarioContext = '';
              
              if (useComprehensive && monteCarloResults && formalTestResults) {
                scenarioName = 'Comprehensive Analysis';
                scenarioIcon = '🎯';
                const passedTests = Object.values(formalTestResults).filter((t: any) => t.passed).length;
                const totalTests = Object.keys(formalTestResults).length;
                scenarioContext = success 
                  ? `Median MC succeeded (${(mcSuccess || 0).toFixed(0)}% success rate) • Passed ${passedTests}/${totalTests} formal tests` 
                  : `Median MC failed (${(mcSuccess || 0).toFixed(0)}% success rate) • Passed ${passedTests}/${totalTests} formal tests`;
              } else if (useHistoricalMonteCarlo && historicalMonteCarloResults) {
                scenarioName = 'Historical Monte Carlo';
                scenarioIcon = '🎲';
                scenarioContext = success 
                  ? `Median scenario succeeded (${(hmcSuccess || 0).toFixed(0)}% of historical simulations succeeded)` 
                  : `Median scenario failed (only ${(hmcSuccess || 0).toFixed(0)}% of historical simulations succeeded)`;
              } else if (useMonteCarlo && monteCarloResults) {
                scenarioName = 'Monte Carlo Simulation';
                scenarioIcon = '🎲';
                scenarioContext = success 
                  ? `Median (P50) scenario succeeded (${(mcSuccess || 0).toFixed(0)}% of simulations succeeded)` 
                  : `Median (P50) scenario failed (only ${(mcSuccess || 0).toFixed(0)}% of simulations succeeded)`;
              } else if (useFormalTest && selectedFormalTest && formalTestResults) {
                const testData = formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any;
                scenarioName = testData?.name || 'Formal Test';
                scenarioIcon = '🧪';
                scenarioContext = success 
                  ? `Survived ${testData?.desc || 'stress test'}` 
                  : `Failed ${testData?.desc || 'stress test'}`;
              } else if (useHistoricalData) {
                const periodLabels: { [key: string]: string } = {
                  '1929': '1929-1931 Great Depression',
                  '1973': '1973-1975 Oil Crisis', 
                  '2000': '2000-2002 Dot-com Crash',
                  '2008': '2008-2010 GFC'
                };
                scenarioName = periodLabels[historicalPeriod] || `Historical ${historicalPeriod}`;
                scenarioIcon = '📊';
                scenarioContext = success ? 'Survived historical period' : 'Failed historical period';
              } else {
                scenarioName = `Constant ${selectedScenario}% Return`;
                scenarioIcon = '📈';
                scenarioContext = success ? 'Plan successful' : 'Plan failed';
              }
              
              return (
                <div className="mt-4 p-6 bg-white border border-indigo-200 rounded-lg">
                  {/* Scenario Indicator */}
                  <div className="mb-4 px-4 py-2 bg-indigo-100 border border-indigo-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{scenarioIcon}</span>
                        <span className="font-semibold text-indigo-900">Scenario Analysis:</span>
                        <span className="text-indigo-800">{scenarioName}</span>
                      </div>
                      {(useMonteCarlo || useHistoricalMonteCarlo) && (
                        <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                          Showing Median (P50) Outcome
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Banner */}
                  <div className={`mb-6 p-4 rounded-lg ${success ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{success ? '✅' : '❌'}</span>
                      <div>
                        <h3 className={`text-xl font-bold ${success ? 'text-green-900' : 'text-red-900'}`}>
                          {success ? 'Plan Successful' : 'Plan Failed'}
                        </h3>
                        <p className={`text-sm ${success ? 'text-green-800' : 'text-red-800'}`}>
                          {success 
                            ? `Portfolio lasted ${yearsRun} years with ${formatCurrency(toDisplayValue(endingBalance, yearsRun, simulationResults[yearsRun - 1]?.cpiRate))} remaining`
                            : `Portfolio depleted in year ${failureYear} (target: ${targetYears} years)`
                          }
                        </p>
                        {scenarioContext && (
                          <p className={`text-xs mt-1 ${success ? 'text-green-700' : 'text-red-700'}`}>
                            {scenarioContext}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Main Metrics Grid */}
                  <div className="mb-2 text-right">
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      All values in {showNominalDollars ? 'Nominal $' : `Real ${getRetirementYear(retirementAge)} $`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Portfolio Summary */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        💰 Portfolio Summary
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 flex items-center">
                            Starting Balance
                            <InfoTooltip text="Total portfolio value at the beginning of retirement (Year 1). Includes Main Super, Sequencing Buffer, and Cash Account." />
                          </span>
                          <span className="font-semibold">{formatCurrency(toDisplayValue(startingBalance, 1))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 flex items-center">
                            Ending Balance
                            <InfoTooltip text={`Total portfolio value at year ${yearsRun}. Green if >50% of starting, amber if >0%, red if depleted.`} />
                          </span>
                          <span className={`font-semibold ${endingBalance > startingBalance * 0.5 ? 'text-green-700' : endingBalance > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                            {formatCurrency(toDisplayValue(endingBalance, yearsRun, simulationResults[yearsRun - 1]?.cpiRate))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 flex items-center">
                            Total Withdrawn
                            <InfoTooltip text="Cumulative amount withdrawn from portfolio over entire retirement period for spending, aged care, and debt payments." />
                          </span>
                          <span className="font-semibold">{formatCurrency(totalWithdrawn)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 flex items-center">
                            Avg Return
                            <InfoTooltip text="Average annual investment return achieved on Main Super over the simulation period. Green ≥5%, amber ≥3%, red <3%." />
                          </span>
                          <span className={`font-semibold ${avgReturn >= 5 ? 'text-green-700' : avgReturn >= 3 ? 'text-amber-700' : 'text-red-700'}`}>
                            {avgReturn.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-300">
                          <span className="text-gray-700 flex items-center">
                            Safety Margin
                            <InfoTooltip text="Ending balance as percentage of starting balance. Shows how much cushion remains at the end of the plan period." />
                          </span>
                          <span className="font-semibold">
                            {((endingBalance / startingBalance) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Income Summary */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        💵 Income Summary
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 flex items-center">
                            Private Pension
                            <InfoTooltip text="Annual PSS/CSS/defined benefit pension income (Year 1 value). Automatically indexed to inflation each year." />
                          </span>
                          <span className="font-semibold">{formatCurrency(privatePensionTotal)}/yr</span>
                        </div>
                        {includeAgePension && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 flex items-center">
                                Age Pension Starts
                                <InfoTooltip text="Year when age pension first becomes payable (age 67 for first eligible partner in couple mode)." />
                              </span>
                              <span className="font-semibold">
                                {agePensionStartYear > 0 ? `Year ${agePensionStartYear}` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 flex items-center">
                                Max Age Pension
                                <InfoTooltip text="Maximum age pension received during retirement. Varies based on assets and income tests." />
                              </span>
                              <span className="font-semibold">{formatCurrency(maxAgePension)}/yr</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-purple-300">
                          <span className="text-gray-700 flex items-center">
                            Avg Spending
                            <InfoTooltip text="Average annual spending over the entire retirement period. Includes base spending, splurge, aged care, and debt payments." />
                          </span>
                          <span className="font-semibold">{formatCurrency(avgSpending)}/yr</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 flex items-center">
                            Peak Spending
                            <InfoTooltip text="Highest annual spending year. Typically occurs during splurge period or when aged care costs begin." />
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(peakSpending)} (Yr {peakSpendingYear})
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Risk Indicators */}
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                        ⚠️ Risk Assessment
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${earlyNegativeReturns ? 'text-red-600' : 'text-green-600'}`}>
                            {earlyNegativeReturns ? '🔴' : '🟢'}
                          </span>
                          <span className="text-gray-700 flex items-center">
                            Sequence Risk
                            <InfoTooltip text="Risk of poor returns in early retirement years. RED if any year in first 5 years had returns below -10%. Early losses are hardest to recover from." />
                          </span>
                          <span className="font-semibold text-xs ml-auto">
                            {earlyNegativeReturns ? 'HIGH' : 'LOW'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${runningLowLater ? 'text-red-600' : 'text-green-600'}`}>
                            {runningLowLater ? '🔴' : '🟢'}
                          </span>
                          <span className="text-gray-700 flex items-center">
                            Longevity Risk
                            <InfoTooltip text="Risk of outliving your money. RED if portfolio falls below 20% of starting balance in the final 10 years. May need to reduce spending or plan for shorter horizon." />
                          </span>
                          <span className="font-semibold text-xs ml-auto">
                            {runningLowLater ? 'HIGH' : 'LOW'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${highInflation ? 'text-amber-600' : 'text-green-600'}`}>
                            {highInflation ? '🟡' : '🟢'}
                          </span>
                          <span className="text-gray-700 flex items-center">
                            Inflation Risk
                            <InfoTooltip text="Risk from elevated inflation eroding purchasing power. ELEVATED if CPI >4%. High inflation reduces real returns and increases spending needs." />
                          </span>
                          <span className="font-semibold text-xs ml-auto">
                            {highInflation ? 'ELEVATED' : 'NORMAL'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${hasAgedCare ? 'text-amber-600' : 'text-green-600'}`}>
                            {hasAgedCare ? '🟡' : '🟢'}
                          </span>
                          <span className="text-gray-700 flex items-center">
                            Health Costs
                            <InfoTooltip text="Whether aged care costs are included in the simulation. INCLUDED means RAD and annual care costs are modeled. Can significantly impact portfolio." />
                          </span>
                          <span className="font-semibold text-xs ml-auto">
                            {hasAgedCare ? 'INCLUDED' : 'NONE'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Monte Carlo Results */}
                  {(useMonteCarlo || useHistoricalMonteCarlo) && (mcSuccess !== null || hmcSuccess !== null) && (
                    <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <h4 className="font-bold text-teal-900 mb-3 flex items-center gap-2">
                        🎲 Monte Carlo Analysis
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600 text-xs mb-1 flex items-center">
                            Success Rate
                            <InfoTooltip text="Percentage of simulations that reached target years with positive balance. Green ≥90%, amber ≥75%, red <75%." />
                          </div>
                          <div className={`text-2xl font-bold ${
                            (mcSuccess || hmcSuccess || 0) >= 90 ? 'text-green-700' : 
                            (mcSuccess || hmcSuccess || 0) >= 75 ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {(mcSuccess || hmcSuccess || 0).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs mb-1 flex items-center">
                            P10 (Worst 10%)
                            <InfoTooltip text="10th percentile ending balance. Only 10% of simulations ended worse than this. Represents pessimistic outcome." />
                          </div>
                          <div className="text-lg font-semibold text-red-700">
                            {formatCurrency(mcP10 || hmcP10 || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs mb-1 flex items-center">
                            P50 (Median)
                            <InfoTooltip text="50th percentile (median) ending balance. Half of simulations ended above this, half below. Most typical outcome." />
                          </div>
                          <div className="text-lg font-semibold text-blue-700">
                            {formatCurrency(mcP50 || hmcP50 || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs mb-1 flex items-center">
                            P90 (Best 10%)
                            <InfoTooltip text="90th percentile ending balance. Only 10% of simulations ended better than this. Represents optimistic outcome." />
                          </div>
                          <div className="text-lg font-semibold text-green-700">
                            {formatCurrency(mcP90 || hmcP90 || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Couple Tracking Summary */}
                  {enableCoupleTracking && pensionRecipientType === 'couple' && partner1FinalSuper !== null && (
                    <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                      <h4 className="font-bold text-pink-900 mb-3 flex items-center gap-2">
                        👥 Individual Partner Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-white rounded border border-blue-200">
                          <div className="font-semibold text-blue-900 mb-2">{partner1.name}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs items-center">
                              <span className="text-gray-600 flex items-center">
                                Final Super
                                <InfoTooltip text="Individual superannuation balance remaining at end of simulation. Includes any super transferred from deceased partner." />
                              </span>
                              <span className="font-semibold">{formatCurrency(partner1FinalSuper || 0)}</span>
                            </div>
                            {partner1TotalPension !== null && (
                              <div className="flex justify-between text-xs items-center">
                                <span className="text-gray-600 flex items-center">
                                  Total Pension
                                  <InfoTooltip text="Final year total pension: private pension + age pension allocation (or reversionary amount if deceased)." />
                                </span>
                                <span className="font-semibold">{formatCurrency(partner1TotalPension)}/yr</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded border border-pink-200">
                          <div className="font-semibold text-pink-900 mb-2">{partner2.name}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs items-center">
                              <span className="text-gray-600 flex items-center">
                                Final Super
                                <InfoTooltip text="Individual superannuation balance remaining at end of simulation. Includes any super transferred from deceased partner." />
                              </span>
                              <span className="font-semibold">{formatCurrency(partner2FinalSuper || 0)}</span>
                            </div>
                            {partner2TotalPension !== null && (
                              <div className="flex justify-between text-xs items-center">
                                <span className="text-gray-600 flex items-center">
                                  Total Pension
                                  <InfoTooltip text="Final year total pension: private pension + age pension allocation (or reversionary amount if deceased)." />
                                </span>
                                <span className="font-semibold">{formatCurrency(partner2TotalPension)}/yr</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* What-If Scenario Comparison */}
        {chartData.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWhatIfComparison(!showWhatIfComparison)}
                className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-lg flex items-center gap-2 font-semibold text-gray-800 transition-colors"
              >
                <span>🔄 What-If Comparison</span>
                <InfoTooltip text="Compare different scenarios side-by-side to understand how changes in parameters affect outcomes. Save up to 5 scenarios with different super balances, spending levels, retirement ages, or return assumptions. Use Comprehensive Analysis to run both Monte Carlo AND Formal Tests together for complete risk assessment." />
                <span className="text-xs font-normal text-gray-600">
                  ({savedScenarios.length} saved scenario{savedScenarios.length !== 1 ? 's' : ''})
                </span>
                <span className="text-xl ml-auto">{showWhatIfComparison ? '−' : '+'}</span>
              </button>
              
              <button
                onClick={() => {
                  // Run both Monte Carlo and Formal Tests, then save
                  const mcResults = runMonteCarlo();
                  const ftResults = runFormalTests();
                  setMonteCarloResults(mcResults);
                  setFormalTestResults(ftResults);
                  
                  // Wait a bit for state to update, then save
                  setTimeout(() => {
                    const saveSuper = enableCoupleTracking && pensionRecipientType === 'couple' 
                      ? partner1.superBalance + partner2.superBalance 
                      : mainSuperBalance;
                    const savePension = enableCoupleTracking && pensionRecipientType === 'couple'
                      ? partner1.pensionIncome + partner2.pensionIncome
                      : totalPensionIncome;
                    const saveRetirementAge = enableCoupleTracking && pensionRecipientType === 'couple'
                      ? Math.min(partner1.retirementAge, partner2.retirementAge)
                      : retirementAge;
                      
                    const newScenario = {
                      name: `Comprehensive ${savedScenarios.length + 1}`,
                      timestamp: Date.now(),
                      params: {
                        mainSuper: saveSuper,
                        pension: savePension,
                        retirementAge: saveRetirementAge,
                        baseSpending: baseSpending,
                        splurgeAmount: splurgeAmount,
                        splurgeDuration: splurgeDuration,
                        selectedScenario: selectedScenario,
                        useHistoricalData: false,
                        historicalPeriod: '',
                        useMonteCarlo: true,
                        useFormalTest: true,
                      },
                      results: {
                        endingBalance: simulationResults[simulationResults.length - 1]?.totalBalance || 0,
                        yearsLasted: simulationResults.length,
                        success: simulationResults.length >= 35 && (simulationResults[simulationResults.length - 1]?.totalBalance || 0) >= 0,
                        mcSuccessRate: mcResults?.successRate,
                        formalTestsPassed: ftResults ? Object.values(ftResults).filter((t: any) => t.passed).length : 0,
                        formalTestsTotal: ftResults ? Object.keys(ftResults).length : 0,
                      }
                    };
                    
                    if (savedScenarios.length >= 5) {
                      alert('Maximum 5 scenarios. Please delete one first.');
                    } else {
                      setSavedScenarios([...savedScenarios, newScenario]);
                      setShowWhatIfComparison(true);
                    }
                  }, 100);
                }}
                className="px-4 py-3 bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2"
                title="Run both Monte Carlo and All Formal Tests, then save for comparison"
              >
                🎯 Run Comprehensive Analysis
              </button>
              
              <button
                onClick={() => {
                  // Compute values that handle couple tracking mode
                  const saveSuper = enableCoupleTracking && pensionRecipientType === 'couple' 
                    ? partner1.superBalance + partner2.superBalance 
                    : mainSuperBalance;
                  const savePension = enableCoupleTracking && pensionRecipientType === 'couple'
                    ? partner1.pensionIncome + partner2.pensionIncome
                    : totalPensionIncome;
                  const saveRetirementAge = enableCoupleTracking && pensionRecipientType === 'couple'
                    ? Math.min(partner1.retirementAge, partner2.retirementAge)
                    : retirementAge;
                    
                  const currentScenario = {
                    name: `Scenario ${savedScenarios.length + 1}`,
                    timestamp: Date.now(),
                    params: {
                      mainSuper: saveSuper,
                      pension: savePension,
                      retirementAge: saveRetirementAge,
                      baseSpending: baseSpending,
                      splurgeAmount: splurgeAmount,
                      splurgeDuration: splurgeDuration,
                      selectedScenario: selectedScenario,
                      useHistoricalData: useHistoricalData,
                      historicalPeriod: historicalPeriod,
                      useMonteCarlo: useMonteCarlo,
                      useFormalTest: useFormalTest,
                    },
                    results: {
                      endingBalance: simulationResults[simulationResults.length - 1]?.totalBalance || 0,
                      yearsLasted: simulationResults.length,
                      success: simulationResults.length >= 35 && (simulationResults[simulationResults.length - 1]?.totalBalance || 0) >= 0,
                      mcSuccessRate: (useMonteCarlo || useComprehensive) ? monteCarloResults?.successRate : useHistoricalMonteCarlo ? historicalMonteCarloResults?.successRate : undefined,
                      formalTestsPassed: (useFormalTest || useComprehensive) && formalTestResults ? Object.values(formalTestResults).filter((t: any) => t.passed).length : undefined,
                      formalTestsTotal: (useFormalTest || useComprehensive) && formalTestResults ? Object.keys(formalTestResults).length : undefined,
                    }
                  };
                  
                  if (savedScenarios.length >= 5) {
                    alert('Maximum 5 scenarios. Please delete one first.');
                  } else {
                    setSavedScenarios([...savedScenarios, currentScenario]);
                    setShowWhatIfComparison(true);
                  }
                }}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                title="Save current scenario for comparison"
              >
                💾 Save Current Scenario
              </button>
            </div>
            
            {showWhatIfComparison && savedScenarios.length > 0 && simulationResults && simulationResults.length > 0 && (() => {
              // Compute current scenario stats for comparison
              const currentScenario = {
                endingBalance: simulationResults[simulationResults.length - 1]?.totalBalance || 0,
                yearsLasted: simulationResults.length,
                success: simulationResults.length >= 35 && (simulationResults[simulationResults.length - 1]?.totalBalance || 0) >= 0,
                mcSuccessRate: (useMonteCarlo || useComprehensive) ? monteCarloResults?.successRate : useHistoricalMonteCarlo ? historicalMonteCarloResults?.successRate : undefined,
                formalTestsPassed: (useFormalTest || useComprehensive) && formalTestResults ? Object.values(formalTestResults).filter((t: any) => t.passed).length : undefined,
                formalTestsTotal: (useFormalTest || useComprehensive) && formalTestResults ? Object.keys(formalTestResults).length : undefined,
              };
              
              // Compute current input parameters (handle couple tracking)
              const currentSuper = enableCoupleTracking && pensionRecipientType === 'couple' 
                ? partner1.superBalance + partner2.superBalance 
                : mainSuperBalance;
              const currentPension = enableCoupleTracking && pensionRecipientType === 'couple'
                ? partner1.pensionIncome + partner2.pensionIncome
                : totalPensionIncome;
              const currentRetirementAge = enableCoupleTracking && pensionRecipientType === 'couple'
                ? Math.min(partner1.retirementAge, partner2.retirementAge)
                : retirementAge;
              
              return (
              <div className="mt-4 p-6 bg-white border border-purple-200 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-purple-900">📊 Scenario Comparison</h3>
                  <button
                    onClick={() => {
                      if (confirm('Clear all saved scenarios?')) {
                        setSavedScenarios([]);
                      }
                    }}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
                  >
                    Clear All
                  </button>
                </div>
                
                {/* Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-purple-50 border-b-2 border-purple-200">
                        <th className="text-left p-3 font-bold text-purple-900">Metric</th>
                        <th className="text-center p-3 font-bold text-blue-900 bg-blue-50">Current</th>
                        {savedScenarios.map((scenario, idx) => (
                          <th key={idx} className="text-center p-3 font-bold text-gray-800">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="text"
                                value={scenario.name}
                                onChange={(e) => {
                                  const updated = [...savedScenarios];
                                  updated[idx].name = e.target.value;
                                  setSavedScenarios(updated);
                                }}
                                className="w-32 px-2 py-1 border rounded text-center font-semibold"
                              />
                              <button
                                onClick={() => {
                                  setSavedScenarios(savedScenarios.filter((_, i) => i !== idx));
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Key Results */}
                      <tr className="bg-gray-50">
                        <td colSpan={savedScenarios.length + 2} className="p-2 font-bold text-gray-700">
                          📈 Key Results
                        </td>
                      </tr>
                      
                      {/* Success/Fail */}
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Success/Fail</td>
                        <td className="p-3 text-center bg-blue-50">
                          <span className={`font-bold ${currentScenario.success ? 'text-green-700' : 'text-red-700'}`}>
                            {currentScenario.success ? '✅ Pass' : '❌ Fail'}
                          </span>
                        </td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center">
                            <span className={`font-bold ${scenario.results.success ? 'text-green-700' : 'text-red-700'}`}>
                              {scenario.results.success ? '✅ Pass' : '❌ Fail'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      
                      {/* Ending Balance */}
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Ending Balance</td>
                        <td className="p-3 text-center bg-blue-50 font-semibold">
                          {formatCurrency(currentScenario.endingBalance)}
                        </td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center font-semibold">
                            {formatCurrency(scenario.results.endingBalance)}
                            <div className={`text-xs mt-1 ${
                              scenario.results.endingBalance > currentScenario.endingBalance
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {scenario.results.endingBalance > currentScenario.endingBalance ? '▲' : '▼'}
                              {formatCurrency(Math.abs(scenario.results.endingBalance - currentScenario.endingBalance))}
                            </div>
                          </td>
                        ))}
                      </tr>
                      
                      {/* Years Lasted */}
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Years Lasted</td>
                        <td className="p-3 text-center bg-blue-50 font-semibold">
                          {currentScenario.yearsLasted}
                        </td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center font-semibold">
                            {scenario.results.yearsLasted}
                            <span className={`text-xs ml-2 ${
                              scenario.results.yearsLasted > currentScenario.yearsLasted ? 'text-green-600' : 
                              scenario.results.yearsLasted < currentScenario.yearsLasted ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {scenario.results.yearsLasted > currentScenario.yearsLasted ? '▲' : 
                               scenario.results.yearsLasted < currentScenario.yearsLasted ? '▼' : '═'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      
                      {/* Monte Carlo Success Rate */}
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">
                          Parametric MC Success Rate
                          <InfoTooltip text="Percentage of parametric Monte Carlo simulations that succeeded (uses Expected Return ± Volatility parameters). Different from Historical MC which samples real S&P 500 data." />
                        </td>
                        <td className="p-3 text-center bg-blue-50 font-semibold">
                          {currentScenario.mcSuccessRate !== undefined ? (
                            <span className={`${
                              currentScenario.mcSuccessRate >= 90 ? 'text-green-700' :
                              currentScenario.mcSuccessRate >= 75 ? 'text-amber-700' : 'text-red-700'
                            }`}>
                              {currentScenario.mcSuccessRate.toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                          {savedScenarios.map((scenario, idx) => (
                            <td key={idx} className="p-3 text-center font-semibold">
                              {scenario.results.mcSuccessRate !== undefined ? (
                                <span className={`${
                                  scenario.results.mcSuccessRate >= 90 ? 'text-green-700' :
                                  scenario.results.mcSuccessRate >= 75 ? 'text-amber-700' : 'text-red-700'
                                }`}>
                                  {scenario.results.mcSuccessRate.toFixed(1)}%
                                </span>
                              ) : '—'}
                            </td>
                          ))}
                        </tr>
                      
                      {/* Formal Tests Passed */}
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Formal Tests Passed</td>
                          <td className="p-3 text-center bg-blue-50 font-semibold">
                            {currentScenario.formalTestsPassed !== undefined ? (
                              <span>
                                {currentScenario.formalTestsPassed} / {currentScenario.formalTestsTotal}
                              </span>
                            ) : '—'}
                          </td>
                          {savedScenarios.map((scenario, idx) => (
                            <td key={idx} className="p-3 text-center font-semibold">
                              {scenario.results.formalTestsPassed !== undefined ? (
                                <span>
                                  {scenario.results.formalTestsPassed} / {scenario.results.formalTestsTotal}
                                </span>
                              ) : '—'}
                            </td>
                          ))}
                        </tr>
                      
                      {/* Input Parameters */}
                      <tr className="bg-gray-50">
                        <td colSpan={savedScenarios.length + 2} className="p-2 font-bold text-gray-700">
                          ⚙️ Input Parameters
                        </td>
                      </tr>
                      
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Main Super Balance</td>
                        <td className="p-3 text-center bg-blue-50">{formatCurrency(currentSuper)}</td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center">{formatCurrency(scenario.params.mainSuper)}</td>
                        ))}
                      </tr>
                      
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">PSS/CSS Pension</td>
                        <td className="p-3 text-center bg-blue-50">{formatCurrency(currentPension)}/yr</td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center">{formatCurrency(scenario.params.pension)}/yr</td>
                        ))}
                      </tr>
                      
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Retirement Age</td>
                        <td className="p-3 text-center bg-blue-50">{currentRetirementAge}</td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center">{scenario.params.retirementAge}</td>
                        ))}
                      </tr>
                      
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Base Annual Spending</td>
                        <td className="p-3 text-center bg-blue-50">{formatCurrency(baseSpending)}/yr</td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center">{formatCurrency(scenario.params.baseSpending)}/yr</td>
                        ))}
                      </tr>
                      
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Splurge Amount</td>
                        <td className="p-3 text-center bg-blue-50">
                          {splurgeAmount > 0 ? `${formatCurrency(splurgeAmount)}/yr × ${splurgeDuration}y` : 'None'}
                        </td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center">
                            {scenario.params.splurgeAmount > 0 
                              ? `${formatCurrency(scenario.params.splurgeAmount)}/yr × ${scenario.params.splurgeDuration}y` 
                              : 'None'}
                          </td>
                        ))}
                      </tr>
                      
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Return Scenario</td>
                        <td className="p-3 text-center bg-blue-50">
                          {useMonteCarlo ? 'Monte Carlo' : 
                           useHistoricalMonteCarlo ? 'Historical MC' :
                           useFormalTest ? 'Formal Tests' :
                           useHistoricalData ? `Historical ${historicalPeriod}` : 
                           `Constant ${selectedScenario}%`}
                        </td>
                        {savedScenarios.map((scenario, idx) => (
                          <td key={idx} className="p-3 text-center">
                            {scenario.params.useMonteCarlo ? 'Monte Carlo' :
                             scenario.params.useFormalTest ? 'Formal Tests' :
                             scenario.params.useHistoricalData ? `Historical ${scenario.params.historicalPeriod}` :
                             `Constant ${scenario.params.selectedScenario}%`}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 p-3 bg-purple-50 rounded text-sm text-gray-700">
                  <strong>💡 Tips:</strong> Change parameters above, then click "Save Current Scenario" to compare different what-if scenarios side-by-side.
                  Green ▲ indicates improvement over current, red ▼ indicates worse.
                </div>
                
                {/* Help Section */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-bold text-blue-900 mb-2">📖 How to Use What-If Comparison</h4>
                  
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <strong className="text-blue-800">Basic Workflow:</strong>
                      <ol className="list-decimal ml-5 mt-1 space-y-1">
                        <li>Set up your baseline scenario with initial parameters</li>
                        <li>Click "💾 Save Current Scenario" to capture baseline</li>
                        <li>Modify one or more parameters (e.g., reduce spending by $10k/year)</li>
                        <li>Click "💾 Save Current Scenario" again to save variant</li>
                        <li>Repeat for up to 5 total scenarios</li>
                        <li>Compare results side-by-side in the table</li>
                      </ol>
                    </div>
                    
                    <div>
                      <strong className="text-blue-800">Key Parameters to Vary:</strong>
                      <ul className="list-disc ml-5 mt-1 space-y-1">
                        <li><strong>Super Balance:</strong> Test lower/higher starting balances</li>
                        <li><strong>Base Spending:</strong> See impact of more frugal/generous lifestyle</li>
                        <li><strong>Retirement Age:</strong> Compare retiring at 60 vs 65</li>
                        <li><strong>PSS/CSS Pension:</strong> Model different pension amounts</li>
                        <li><strong>Splurge Spending:</strong> Test major expense scenarios</li>
                        <li><strong>Return Scenarios:</strong> Compare optimistic vs pessimistic returns</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 border border-green-300 rounded p-3">
                      <strong className="text-green-900">✅ Comprehensive Analysis (Above)</strong>
                      <p className="mt-1">
                        Use the <strong>🎯 Run Comprehensive Analysis</strong> button above to run both <strong>Parametric Monte Carlo</strong> AND 
                        all <strong>9 Formal Tests</strong> simultaneously! This automatically saves a scenario with both metrics filled in.
                      </p>
                      <div className="mt-2 text-sm">
                        <strong>What it does:</strong>
                        <ul className="list-disc ml-5 mt-1">
                          <li>Runs 1,000 parametric MC simulations (using your Expected Return & Volatility settings)</li>
                          <li>Runs all 9 Formal Stress Tests (crash scenarios, longevity, inflation, etc.)</li>
                          <li>Automatically saves scenario with <strong>both</strong> MC success rate and formal tests passed</li>
                          <li>Takes ~5-10 seconds total</li>
                        </ul>
                      </div>
                      <p className="mt-2 text-xs text-gray-700">
                        <strong>Note:</strong> Individual test scenario buttons (Monte Carlo, Historical MC, Formal Tests) run one test type at a time. 
                        Comprehensive Analysis is specifically for What-If comparisons requiring complete risk assessment.
                      </p>
                    </div>
                    
                    <div>
                      <strong className="text-blue-800">Understanding the Metrics:</strong>
                      <ul className="list-disc ml-5 mt-1 space-y-1">
                        <li><strong>Success/Fail:</strong> Portfolio lasts to target age with balance ≥ $0</li>
                        <li><strong>Ending Balance:</strong> Portfolio value at end of simulation (real or nominal $)</li>
                        <li><strong>Years Lasted:</strong> How many years portfolio sustained spending</li>
                        <li><strong>Parametric MC Success Rate:</strong> % of parametric Monte Carlo simulations that succeeded (uses Expected Return ± Volatility). Shows "—" if not MC or Comprehensive mode.</li>
                        <li><strong>Formal Tests Passed:</strong> X / Y tests passed (shown as "—" if not Formal Tests)</li>
                      </ul>
                    </div>
                    
                    <div>
                      <strong className="text-blue-800">Management:</strong>
                      <ul className="list-disc ml-5 mt-1">
                        <li>Click scenario names to rename them (e.g., "Conservative", "Aggressive", "Base Case")</li>
                        <li>🗑️ Delete individual scenarios you no longer need</li>
                        <li>"Clear All" removes all saved scenarios at once</li>
                        <li>Maximum 5 scenarios - delete one to add more</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}
            
            {showWhatIfComparison && savedScenarios.length === 0 && (
              <div className="mt-4 p-6 bg-purple-50 border border-purple-200 rounded-lg text-center">
                <p className="text-gray-700 mb-2">No scenarios saved yet.</p>
                <p className="text-sm text-gray-600">Click "Save Current Scenario" to start comparing different what-if scenarios.</p>
              </div>
            )}
          </div>
        )}

        {chartData.length > 0 && (
          <div>
            {/* Insufficient Funds Warning */}
            {enableCoupleTracking && pensionRecipientType === 'couple' && simulationResults && simulationResults.some((r: any) => r.insufficientFunds) && (
              <div className="bg-red-50 border border-red-300 rounded p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-900 mb-2">Insufficient Accessible Funds Warning</h3>
                    <p className="text-red-800 mb-2">
                      The simulation detected years where expenses could not be fully covered because:
                    </p>
                    <ul className="list-disc list-inside text-red-800 space-y-1 mb-3">
                      <li>One or more partners have not yet retired and cannot access their superannuation</li>
                      <li>The retired partner's super, sequencing buffer, and cash were insufficient</li>
                      <li>Pre-retirement income plus pension income was not enough to cover household expenses</li>
                    </ul>
                    <p className="text-red-800 font-semibold">
                      Consider: (1) Increase pre-retirement income, (2) Reduce spending until both partners retire, 
                      (3) Increase the retired partner's super balance, or (4) Adjust retirement ages.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Aged Care Active Banner */}
            {includeAgedCare && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-3 mb-4">
                <div className="text-sm">
                  <span className="font-semibold text-purple-800">🏥 Aged Care Modeling Active:</span>
                  <span className="text-gray-700">
                    {' '}{agedCareApproach === 'deterministic' 
                      ? `Deterministic - Entry at age ${deterministicAgedCareAge} for ${agedCareDuration} years` 
                      : `Probabilistic - Age-based risk with average ${agedCareDuration}-year duration`}. 
                    RAD: {formatCurrency(agedCareRAD)} (refundable), Annual: {formatCurrency(agedCareAnnualCost)}.
                    {agedCareApproach === 'probabilistic' && !useMonteCarlo && !useHistoricalMonteCarlo && 
                      ' ⚠️ Showing one random outcome - results will vary on each refresh. Use Monte Carlo to see full risk range.'}
                  </span>
                </div>
              </div>
            )}

            {/* Explanatory Banner for Monte Carlo */}
            {useMonteCarlo && monteCarloResults && (
              <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-4">
                <div className="text-sm">
                  <span className="font-semibold text-green-800">📊 Monte Carlo View:</span>
                  <span className="text-gray-700"> Charts below show the median (50th percentile) scenario from {monteCarloRuns.toLocaleString()} simulations. See Monte Carlo Results section above for success rate ({monteCarloResults.successRate.toFixed(1)}%) and percentile analysis.</span>
                </div>
              </div>
            )}

            {/* Explanatory Banner for Historical Monte Carlo */}
            {useHistoricalMonteCarlo && historicalMonteCarloResults && (
              <div className="bg-teal-50 border-l-4 border-teal-500 p-3 mb-4">
                <div className="text-sm">
                  <span className="font-semibold text-teal-800">📊 Historical Monte Carlo View:</span>
                  <span className="text-gray-700"> Charts below show the median scenario from {monteCarloRuns.toLocaleString()} simulations using 98 years of verified S&P 500 data (Shiller/Ibbotson, 1928-2025). Success rate: {historicalMonteCarloResults.successRate.toFixed(1)}%.</span>
                </div>
              </div>
            )}

            {/* Explanatory Banner for Formal Tests */}
            {useFormalTest && formalTestResults && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-3 mb-4">
                <div className="text-sm">
                  <span className="font-semibold text-purple-800">🧪 Formal Test View:</span>
                  <span className="text-gray-700"> Charts below show {selectedFormalTest ? (formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any).name : 'the base scenario'}. Click different tests in the table above to compare scenarios.</span>
                </div>
              </div>
            )}

            <div className="bg-white border rounded p-4 mb-6">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-xl font-bold">
                  Portfolio Balance
                  {useMonteCarlo && monteCarloResults && (
                    <span className="text-base font-normal text-gray-600"> - Median Scenario</span>
                  )}
                  {useHistoricalMonteCarlo && historicalMonteCarloResults && (
                    <span className="text-base font-normal text-gray-600"> - Historical Median</span>
                  )}
                  {useFormalTest && selectedFormalTest && formalTestResults && (
                    <span className="text-base font-normal text-gray-600"> - {(formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any).name}</span>
                  )}
                  {useMonteCarlo && (
                    <InfoTooltip text="This shows the median (50th percentile) outcome from your Monte Carlo simulation. Half of scenarios performed better, half performed worse." />
                  )}
                  {useHistoricalMonteCarlo && (
                    <InfoTooltip text="Median outcome from S&P 500 historical data sampling (Shiller/Ibbotson, 1928-2025). Real market behavior, not theoretical assumptions." />
                  )}
                  {useFormalTest && (
                    <InfoTooltip text="This shows the selected formal test scenario. Click different tests in the table above to update this chart." />
                  )}
                </h2>
                
                {/* Percentile Bands Toggle - only show for Monte Carlo */}
                {(useMonteCarlo && monteCarloResults || useHistoricalMonteCarlo && historicalMonteCarloResults) && (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => setShowPercentileBands(!showPercentileBands)}
                      className={'px-3 py-1 rounded text-sm font-medium ' + (showPercentileBands ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')}
                    >
                      {showPercentileBands ? '📊 Hide Bands' : '📊 Show Bands'}
                    </button>
                    {showPercentileBands && enrichedChartData[0]?.['Balance P90'] !== undefined && (
                      <span className="text-xs text-gray-500">Dashed lines show outcome ranges</span>
                    )}
                    {showPercentileBands && !enrichedChartData[0]?.['Balance P90'] && (
                      <span className="text-xs text-amber-600">⚠️ Run Monte Carlo first</span>
                    )}
                  </div>
                )}
                
                {/* Message when Monte Carlo not run yet */}
                {(useMonteCarlo && !monteCarloResults || useHistoricalMonteCarlo && !historicalMonteCarloResults) && (
                  <div className="text-sm text-gray-500 italic">
                    Run simulation below to see percentile bands
                  </div>
                )}
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={enrichedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="calendarYear" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(val) => ((val as number)/1000).toFixed(0) + 'k'} />
                  <Tooltip content={<CustomChartTooltip enableCoupleTracking={enableCoupleTracking && pensionRecipientType === 'couple'} partner1Name={partner1.name} partner2Name={partner2.name} />} />
                  <Legend />
                  
                  {/* Percentile boundary lines - 10th-90th percentile range */}
                  {showPercentileBands && enrichedChartData[0]?.['Balance P10'] !== undefined && (
                    <Line 
                      type="monotone" 
                      dataKey="Balance P10"
                      stroke="#93c5fd"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      name="10th percentile"
                    />
                  )}
                  
                  {showPercentileBands && enrichedChartData[0]?.['Balance P90'] !== undefined && (
                    <Line 
                      type="monotone" 
                      dataKey="Balance P90" 
                      stroke="#93c5fd"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      name="90th percentile"
                    />
                  )}
                  
                  {/* Percentile boundary lines - 25th-75th percentile range */}
                  {showPercentileBands && enrichedChartData[0]?.['Balance P25'] !== undefined && (
                    <Line 
                      type="monotone" 
                      dataKey="Balance P25"
                      stroke="#60a5fa"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="25th percentile"
                    />
                  )}
                  
                  {showPercentileBands && enrichedChartData[0]?.['Balance P75'] !== undefined && (
                    <Line 
                      type="monotone" 
                      dataKey="Balance P75"
                      stroke="#60a5fa"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="75th percentile"
                    />
                  )}
                  
                  {/* Median line - use actual P50 for Monte Carlo, Total Balance otherwise */}
                  {(useMonteCarlo || useHistoricalMonteCarlo) && enrichedChartData[0]?.['Balance P50'] !== undefined && (
                    <Line type="monotone" dataKey="Balance P50" stroke="#1e40af" strokeWidth={2.5} name="Median (50th)" />
                  )}
                  {!useMonteCarlo && !useHistoricalMonteCarlo && (
                    <Line type="monotone" dataKey="Total Balance" stroke="#1e40af" strokeWidth={3} name="Total Balance" />
                  )}
                  
                  {/* Component breakdown - only show for non-Monte Carlo scenarios */}
                  {!useMonteCarlo && !useHistoricalMonteCarlo && (
                    <Line type="monotone" dataKey="Main Super" stroke="#10b981" strokeWidth={2} />
                  )}
                  {!useMonteCarlo && !useHistoricalMonteCarlo && (
                    <Line type="monotone" dataKey="Buffer" stroke="#f59e0b" strokeWidth={2} />
                  )}
                  {!useMonteCarlo && !useHistoricalMonteCarlo && (
                    <Line type="monotone" dataKey="Cash" stroke="#8b5cf6" strokeWidth={2} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border rounded p-4 mb-6">
              <h2 className="text-xl font-bold mb-3">
                Income vs Spending
                {useMonteCarlo && monteCarloResults && (
                  <span className="text-base font-normal text-gray-600"> - Median Scenario</span>
                )}
                {useHistoricalMonteCarlo && historicalMonteCarloResults && (
                  <span className="text-base font-normal text-gray-600"> - Historical Median</span>
                )}
                {useFormalTest && selectedFormalTest && formalTestResults && (
                  <span className="text-base font-normal text-gray-600"> - {(formalTestResults[selectedFormalTest as keyof typeof formalTestResults] as any).name}</span>
                )}
                {useMonteCarlo && (
                  <InfoTooltip text="Median scenario income and spending trajectory. Individual simulations may vary significantly." />
                )}
                {useHistoricalMonteCarlo && (
                  <InfoTooltip text="Median income and spending from S&P 500 historical sampling. Based on 98 years of verified data (Shiller/Ibbotson)." />
                )}
                {useFormalTest && (
                  <InfoTooltip text="Income and spending for the selected test scenario. Click different tests above to compare." />
                )}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={enrichedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="calendarYear" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(val) => ((val as number)/1000).toFixed(0) + 'k'} />
                  <Tooltip content={<CustomChartTooltip enableCoupleTracking={enableCoupleTracking && pensionRecipientType === 'couple'} partner1Name={partner1.name} partner2Name={partner2.name} />} />
                  <Legend />
                  
                  {/* Income percentile boundary lines */}
                  {showPercentileBands && enrichedChartData[0]?.['Income P10'] !== undefined && (
                    <Line 
                      type="monotone" 
                      dataKey="Income P10"
                      stroke="#86efac"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Income 10th %ile"
                    />
                  )}
                  
                  {showPercentileBands && enrichedChartData[0]?.['Income P90'] !== undefined && (
                    <Line 
                      type="monotone" 
                      dataKey="Income P90"
                      stroke="#86efac"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Income 90th %ile"
                    />
                  )}
                  
                  {/* Spending percentile boundary lines */}
                  {showPercentileBands && enrichedChartData[0]?.['Spending P10'] !== undefined && (
                    <Line 
                      type="monotone" 
                      dataKey="Spending P10"
                      stroke="#fca5a5"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Spending 10th %ile"
                    />
                  )}
                  
                  {showPercentileBands && enrichedChartData[0]?.['Spending P90'] !== undefined && (
                    <Line 
                      type="monotone" 
                      dataKey="Spending P90"
                      stroke="#fca5a5"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Spending 90th %ile"
                    />
                  )}
                  
                  {/* Median lines - use actual P50 for Monte Carlo, regular data otherwise */}
                  {(useMonteCarlo || useHistoricalMonteCarlo) && enrichedChartData[0]?.['Income P50'] !== undefined && (
                    <Line type="monotone" dataKey="Income P50" stroke="#047857" strokeWidth={2} name="Median Income (50th)" />
                  )}
                  {!useMonteCarlo && !useHistoricalMonteCarlo && (
                    <Line type="monotone" dataKey="Income" stroke="#047857" strokeWidth={2} name="Income" />
                  )}
                  
                  {(useMonteCarlo || useHistoricalMonteCarlo) && enrichedChartData[0]?.['Spending P50'] !== undefined && (
                    <Line type="monotone" dataKey="Spending P50" stroke="#b91c1c" strokeWidth={2} name="Median Spending (50th)" />
                  )}
                  {!useMonteCarlo && !useHistoricalMonteCarlo && (
                    <Line type="monotone" dataKey="Spending" stroke="#b91c1c" strokeWidth={2} name="Spending" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Individual Partner Charts - only show when couple tracking enabled */}
        {enableCoupleTracking && pensionRecipientType === 'couple' && simulationResults && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mt-8">Individual Partner Analysis</h2>
            
            {/* Partner Super Balances Chart */}
            <div className="bg-white border rounded p-4">
              <h3 className="text-xl font-bold mb-3">Individual Super Balances</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="calendarYear" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(val) => ((val as number)/1000).toFixed(0) + 'k'} />
                  <Tooltip content={<CustomChartTooltip enableCoupleTracking={true} partner1Name={partner1.name} partner2Name={partner2.name} />} />
                  <Legend />
                  <Line type="monotone" dataKey="Partner 1 Super" stroke="#3b82f6" strokeWidth={2} name={`${partner1.name} Super`} />
                  <Line type="monotone" dataKey="Partner 2 Super" stroke="#ec4899" strokeWidth={2} name={`${partner2.name} Super`} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Partner Pension Income Chart */}
            <div className="bg-white border rounded p-4">
              <h3 className="text-xl font-bold mb-3">Individual Pension Income</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="calendarYear" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(val) => ((val as number)/1000).toFixed(0) + 'k'} />
                  <Tooltip content={<CustomChartTooltip enableCoupleTracking={true} partner1Name={partner1.name} partner2Name={partner2.name} />} />
                  <Legend />
                  <Line type="monotone" dataKey="Partner 1 Pension" stroke="#3b82f6" strokeWidth={2} name={`${partner1.name} Pension`} />
                  <Line type="monotone" dataKey="Partner 2 Pension" stroke="#ec4899" strokeWidth={2} name={`${partner2.name} Pension`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

       <div className="text-center text-sm text-gray-600 mt-6">
         Australian Retirement Planning Tool v15.2 ·{' '}
         <a
           href="mailto:aust-retirement-calculator@proton.me"
           className="underline"
          >
            Contact
          </a>
         {' · '}
          <button
            onClick={() => setShowTerms(true)}
            className="text-xs underline text-gray-500"
          >
            View Disclaimer & Terms
          </button>
        </div>
        
       
      </div>
    </div>
  );
};

export default RetirementCalculator;