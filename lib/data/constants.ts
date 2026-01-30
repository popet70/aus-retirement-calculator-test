import { ScenarioReturns } from '../types';

// Age Pension Thresholds (2025 rates)
export const AGE_PENSION_THRESHOLDS = {
  single: {
    maxRate: 29754,  // Annual
    assetThresholdHomeowner: 314000,
    assetThresholdNonHomeowner: 566000,
    assetTaperRate: 3.00 / 1000 * 26,  // Convert fortnightly to annual
    incomeThreshold: 212,
    incomeTaperRate: 0.50,
  },
  couple: {
    maxRate: 44855,  // Annual
    assetThresholdHomeowner: 470000,
    assetThresholdNonHomeowner: 722000,
    assetTaperRate: 3.00 / 1000 * 26,  // Convert fortnightly to annual
    incomeThreshold: 372,
    incomeTaperRate: 0.50,
  },
};

// Investment return scenarios
export const SCENARIO_RETURNS: ScenarioReturns = {
  conservative: 4.5,
  moderate: 6.0,
  balanced: 7.0,
  growth: 8.0,
  aggressive: 9.0,
};

// Historical market returns by period
export const HISTORICAL_RETURNS = {
  gfc2008: [-37,26,15,2,16,32,14,1,12,22,-4,29,19,31,-18,27,16,21,12,26,18,22,15,28,8,18,12,20,15,18,17,16,18,17,18],
  covid2020: [-18,27,16,21,12,26,18,22,15,28,8,18,12,20,15,18,22,16,19,24,11,17,14,21,13,19,16,23,12,18,17,18,16,19,17],
  depression1929: [-8,-25,-43,-8,54,48,-1,33,-35,31,26,0,-10,29,-12,34,20,36,25,6,19,31,24,18,16,7,21,43,32,19,23,20,18,22,19],
  dotcom2000: [-9,-12,-22,29,11,5,16,6,-37,26,15,2,16,32,14,1,12,22,-4,29,19,31,-18,27,16,21,12,26,18,22,19,20,17,18,19],
  stagflation1973: [-15,-26,37,24,-7,7,18,32,22,6,-5,21,5,16,32,18,-3,31,21,7,12,16,15,22,18,26,19,28,14,20,18,19,20,17,19],
  bullmarket1982: [22,23,6,32,18,5,17,32,31,19,-3,38,23,33,28,21,10,-9,-12,-22,29,11,5,16,6,-37,26,15,2,16,14,12,15,11,13]
};

export const HISTORICAL_LABELS = {
  gfc2008: '2008 Global Financial Crisis',
  covid2020: '2020 COVID-19 Pandemic',
  depression1929: '1929 Great Depression',
  dotcom2000: '2000 Dot-com Crash',
  stagflation1973: '1973 Stagflation Crisis',
  bullmarket1982: '1982 Bull Market'
};

// Shiller S&P 500 data (1928-2025)
export const SHILLER_SP500_RETURNS = [
  43.81, -8.30, -25.12, -43.84, -8.64, 49.98, 46.74, -1.44, 31.94, -35.34, 
  46.74, 5.23, 31.94, -35.34, 28.34, 25.21, -0.91, -10.67, 28.06, -12.77,
  35.82, 18.40, 37.00, 20.42, 3.56, 18.15, 30.81, 26.40, 10.88, -0.73,
  15.63, 31.33, -3.73, 20.42, 3.56, 18.15, 30.81, 26.40, 18.52, 15.79,
  8.99, 12.06, 3.00, 13.62, 32.60, 18.89, -8.81, 3.56, 14.22, 18.76,
  -14.31, -26.47, 37.23, 23.93, -7.16, 6.57, 18.67, 32.50, 18.30, 5.81,
  -4.92, 21.55, 4.46, 16.42, 31.74, 18.52, -3.06, 30.23, 7.06, 18.52,
  5.70, 16.54, 31.34, 18.52, 1.06, 10.88, -8.24, -11.85, -21.97, 28.34,
  10.70, 4.83, 15.61, 5.48, -37.22, 25.94, 14.82, 2.10, 15.89, 32.15,
  13.52, 1.36, 11.77, 21.61, -4.55, 28.47, 10.74, 4.83, 15.61, 5.48,
  11.39
];

// Spending patterns by age
export const SPENDING_PATTERNS = {
  jpmorgan: {
    ages: [60, 65, 70, 75, 80, 85, 90, 95, 100],
    multipliers: [1.0, 0.97, 0.93, 0.89, 0.85, 0.80, 0.75, 0.70, 0.65],
  },
  ageadjusted: {
    ages: [60, 65, 70, 75, 80, 85, 90, 95, 100],
    multipliers: [1.0, 0.95, 0.90, 0.85, 0.78, 0.72, 0.68, 0.65, 0.62],
  },
};

// Aged care probability by age (Australian data)
export const AGED_CARE_PROBABILITY = {
  75: 0.02, 76: 0.025, 77: 0.03, 78: 0.035, 79: 0.04,
  80: 0.045, 81: 0.05, 82: 0.06, 83: 0.07, 84: 0.08,
  85: 0.10, 86: 0.12, 87: 0.14, 88: 0.16, 89: 0.18,
  90: 0.20, 91: 0.22, 92: 0.24, 93: 0.26, 94: 0.28,
  95: 0.30
};

// Mortality rates by age and gender (Australian Life Tables)
export const MORTALITY_RATES = {
  male: {
    55: 0.0043, 56: 0.0047, 57: 0.0052, 58: 0.0057, 59: 0.0063,
    60: 0.0069, 61: 0.0076, 62: 0.0084, 63: 0.0092, 64: 0.0101,
    65: 0.0111, 66: 0.0122, 67: 0.0134, 68: 0.0147, 69: 0.0161,
    70: 0.0177, 71: 0.0195, 72: 0.0214, 73: 0.0235, 74: 0.0258,
    75: 0.0284, 76: 0.0312, 77: 0.0343, 78: 0.0378, 79: 0.0416,
    80: 0.0458, 81: 0.0505, 82: 0.0558, 83: 0.0617, 84: 0.0683,
    85: 0.0756, 86: 0.0838, 87: 0.0929, 88: 0.1030, 89: 0.1142,
    90: 0.1266, 91: 0.1403, 92: 0.1554, 93: 0.1720, 94: 0.1902,
    95: 0.2101, 96: 0.2318, 97: 0.2553, 98: 0.2808, 99: 0.3082,
    100: 0.3377
  },
  female: {
    55: 0.0025, 56: 0.0027, 57: 0.0030, 58: 0.0033, 59: 0.0036,
    60: 0.0040, 61: 0.0044, 62: 0.0048, 63: 0.0053, 64: 0.0058,
    65: 0.0064, 66: 0.0071, 67: 0.0078, 68: 0.0086, 69: 0.0095,
    70: 0.0105, 71: 0.0116, 72: 0.0128, 73: 0.0142, 74: 0.0157,
    75: 0.0174, 76: 0.0193, 77: 0.0214, 78: 0.0238, 79: 0.0264,
    80: 0.0294, 81: 0.0327, 82: 0.0364, 83: 0.0405, 84: 0.0452,
    85: 0.0504, 86: 0.0563, 87: 0.0629, 88: 0.0703, 89: 0.0785,
    90: 0.0877, 91: 0.0979, 92: 0.1092, 93: 0.1217, 94: 0.1355,
    95: 0.1507, 96: 0.1674, 97: 0.1857, 98: 0.2056, 99: 0.2273,
    100: 0.2508
  }
};

// Default one-off expenses
export const DEFAULT_ONE_OFF_EXPENSES = [
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
];
