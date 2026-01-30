# Migration Checklist: Converting to Testable Architecture

## Overview
This checklist guides you through converting your 3,200-line monolithic component into a tested, modular architecture.

## Phase 1: Setup (1-2 hours)

- [ ] **1.1** Copy new directory structure to your project
  ```bash
  cp -r lib/ your-project/
  cp -r __tests__/ your-project/
  ```

- [ ] **1.2** Install test dependencies
  ```bash
  npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest
  ```

- [ ] **1.3** Copy configuration files
  - [ ] `jest.config.js`
  - [ ] `jest.setup.js`
  - [ ] `.github/workflows/test.yml`

- [ ] **1.4** Add test scripts to package.json
  ```json
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
  ```

- [ ] **1.5** Run tests to verify setup
  ```bash
  npm test
  ```
  Expected: All tests pass ✅

## Phase 2: Replace Age Pension Logic (2-3 hours)

- [ ] **2.1** Find age pension calculation in your `page.tsx`
  - Search for: "assetThreshold", "pension", "means test"

- [ ] **2.2** Replace with imported function
  ```typescript
  import { calculateAgePension } from '@/lib/calculations/agePension';
  
  // Replace inline calculation with:
  const agePension = calculateAgePension({
    totalBalance: mainSuper + buffer + cash,
    pensionIncome: currentPensionIncome,
    isHomeowner,
    pensionRecipientType,
  });
  ```

- [ ] **2.3** Remove old age pension code from component

- [ ] **2.4** Test locally
  - [ ] Run app: `npm run dev`
  - [ ] Verify age pension amounts match previous version
  - [ ] Test with different asset levels
  - [ ] Test homeowner vs non-homeowner

- [ ] **2.5** Run age pension tests
  ```bash
  npm test agePension
  ```

## Phase 3: Replace Spending Calculations (2-3 hours)

- [ ] **3.1** Find spending calculation logic
  - Search for: "baseSpending", "guardrail", "jpmorgan"

- [ ] **3.2** Import spending module
  ```typescript
  import { calculateAnnualSpending } from '@/lib/calculations/spending';
  ```

- [ ] **3.3** Replace spending calculation
  ```typescript
  const spending = calculateAnnualSpending({
    baseSpending,
    age,
    spendingPattern,
    guardrailParams: {
      useGuardrails,
      upperGuardrail,
      lowerGuardrail,
      guardrailAdjustment,
    },
    portfolioValue: totalBalance,
    initialPortfolioValue,
    splurgeParams,
    splurgeActive: age >= splurgeStartAge && age < splurgeStartAge + splurgeDuration,
  });
  ```

- [ ] **3.4** Test guardrails
  - [ ] Upper guardrail (portfolio > 120%)
  - [ ] Lower guardrail (portfolio < 85%)
  - [ ] Within guardrails (no change)

- [ ] **3.5** Test spending patterns
  - [ ] Constant
  - [ ] JP Morgan
  - [ ] Age-adjusted

- [ ] **3.6** Run spending tests
  ```bash
  npm test spending
  ```

## Phase 4: Replace Core Projection (4-6 hours)

This is the most complex migration step.

- [ ] **4.1** Identify your main projection `useMemo` hook
  - Usually contains the year-by-year loop
  - Calculates `chartData` array

- [ ] **4.2** Extract parameters into structured format
  ```typescript
  const retirementParams: RetirementParams = {
    currentAge,
    retirementAge,
    mainSuperBalance,
    sequencingBuffer,
    totalPensionIncome,
    baseSpending,
    inflationRate,
    selectedScenario,
    isHomeowner,
    includeAgePension,
    spendingPattern,
    showNominalDollars,
  };
  ```

- [ ] **4.3** Replace projection calculation
  ```typescript
  import { calculateRetirementProjection } from '@/lib/calculations/projection';
  
  const chartData = useMemo(() => {
    const result = calculateRetirementProjection({
      retirementParams,
      guardrailParams: {
        useGuardrails,
        upperGuardrail,
        lowerGuardrail,
        guardrailAdjustment,
      },
      splurgeParams: {
        splurgeAmount,
        splurgeStartAge,
        splurgeDuration,
        splurgeRampDownYears,
      },
      oneOffExpenses,
      showNominalDollars,
    });
    
    return result.chartData;
  }, [
    retirementParams,
    guardrailParams,
    splurgeParams,
    oneOffExpenses,
  ]);
  ```

- [ ] **4.4** Test projection thoroughly
  - [ ] Verify chart data structure matches
  - [ ] Check portfolio balance trajectory
  - [ ] Verify withdrawal sequencing (buffer first)
  - [ ] Test with different scenarios
  - [ ] Test real vs nominal dollars

- [ ] **4.5** Compare with old version
  - [ ] Run side-by-side comparison
  - [ ] Check ending balances match
  - [ ] Verify age pension amounts
  - [ ] Check withdrawal rates

- [ ] **4.6** Run projection tests
  ```bash
  npm test projection
  ```

## Phase 5: Monte Carlo Integration (2-3 hours)

- [ ] **5.1** Replace Monte Carlo logic
  ```typescript
  import { runMonteCarloSimulation } from '@/lib/calculations/monteCarlo';
  
  const mcResults = runMonteCarloSimulation(
    {
      retirementParams,
      guardrailParams,
      splurgeParams,
      oneOffExpenses,
    },
    {
      runs: monteCarloRuns,
      expectedReturn,
      volatility: returnVolatility,
      projectionYears: 100 - currentAge,
    }
  );
  ```

- [ ] **5.2** Update UI to use MC results
  - [ ] Success rate
  - [ ] Percentile charts
  - [ ] Median projection

- [ ] **5.3** Verify MC statistics
  - [ ] Success rate makes sense
  - [ ] Percentiles are ordered correctly
  - [ ] Distribution looks reasonable

## Phase 6: Clean Up Component (2-4 hours)

- [ ] **6.1** Remove old calculation code
  - [ ] Delete replaced useMemo hooks
  - [ ] Remove helper functions moved to lib/
  - [ ] Clean up unused imports

- [ ] **6.2** Break into smaller components
  - [ ] Create `ParameterInputs.tsx`
  - [ ] Create `ProjectionCharts.tsx`
  - [ ] Create `MonteCarloResults.tsx`
  - [ ] Create `PensionSummary.tsx`

- [ ] **6.3** Simplify state management
  - [ ] Group related state into objects
  - [ ] Consider useReducer for complex state

- [ ] **6.4** Final component should be < 500 lines

## Phase 7: Testing & Validation (2-3 hours)

- [ ] **7.1** Run full test suite
  ```bash
  npm test
  ```
  All tests should pass ✅

- [ ] **7.2** Run coverage report
  ```bash
  npm test -- --coverage
  ```
  Target: 80%+ coverage

- [ ] **7.3** Manual testing checklist
  - [ ] All input controls work
  - [ ] Charts render correctly
  - [ ] All scenarios produce results
  - [ ] Monte Carlo runs without errors
  - [ ] Historical periods work
  - [ ] Formal tests display correctly
  - [ ] One-off expenses apply
  - [ ] Aged care logic works
  - [ ] Debt repayment works

- [ ] **7.4** Test edge cases
  - [ ] Zero starting balance
  - [ ] Very high spending (runs out)
  - [ ] Very low spending (surplus)
  - [ ] Extreme ages (current age 90)
  - [ ] Negative returns

- [ ] **7.5** Performance testing
  - [ ] Monte Carlo with 10,000 runs
  - [ ] Multiple tabs open
  - [ ] Mobile device testing

## Phase 8: Deploy & Monitor (1-2 hours)

- [ ] **8.1** Push to GitHub
  ```bash
  git add .
  git commit -m "Refactor: Extract calculations and add automated testing"
  git push origin main
  ```

- [ ] **8.2** Verify GitHub Actions
  - [ ] Go to Actions tab
  - [ ] Check that tests run automatically
  - [ ] Verify all tests pass in CI

- [ ] **8.3** Deploy to Vercel
  - [ ] Vercel should auto-deploy on push
  - [ ] Check deployment logs
  - [ ] Verify production build succeeds

- [ ] **8.4** Test production deployment
  - [ ] Visit live URL
  - [ ] Run through main user flows
  - [ ] Check console for errors

- [ ] **8.5** Set up monitoring (optional)
  - [ ] Add Codecov for coverage tracking
  - [ ] Set up error tracking (Sentry)
  - [ ] Add analytics

## Success Criteria

Your migration is complete when:

✅ All tests pass locally
✅ All tests pass in CI
✅ Code coverage > 80%
✅ Main component < 500 lines
✅ App functionality unchanged (or improved)
✅ Production deployment successful
✅ No console errors

## Time Estimate

| Phase | Time | Difficulty |
|-------|------|------------|
| Setup | 1-2 hrs | Easy |
| Age Pension | 2-3 hrs | Medium |
| Spending | 2-3 hrs | Medium |
| Projection | 4-6 hrs | Hard |
| Monte Carlo | 2-3 hrs | Medium |
| Clean Up | 2-4 hrs | Medium |
| Testing | 2-3 hrs | Easy |
| Deploy | 1-2 hrs | Easy |
| **Total** | **16-26 hrs** | **Mixed** |

## Common Issues & Solutions

### Issue: Tests fail with "Cannot find module"
**Solution:** Check tsconfig.json paths configuration
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Issue: Results don't match old version
**Solution:** 
1. Add console.log to both versions
2. Compare intermediate values
3. Check for rounding differences
4. Verify inflation calculations

### Issue: GitHub Actions fails but local tests pass
**Solution:**
- Check Node version matches
- Clear cache: `npm ci` instead of `npm install`
- Check environment variables

### Issue: Coverage too low
**Solution:**
- Add tests for untested branches
- Remove dead code
- Focus on critical paths first

## Need Help?

If you get stuck:
1. Check the test files for examples
2. Review README.md for architecture overview
3. Run tests in watch mode to debug
4. Compare with working examples in lib/

## After Migration

Once complete, you'll have:
- ✅ Fully tested calculation engine
- ✅ Automated testing on every commit
- ✅ Confidence in financial calculations
- ✅ Maintainable codebase
- ✅ Easy to add new features
- ✅ Reduced risk of bugs

**Estimated effort:** 2-3 days of focused work
**Estimated value:** Prevents catastrophic financial calculation errors
