# Retirement Calculator v14.6 - Complete Pseudocode Flow

## INITIALIZATION (Before Simulation Loop)

```
SET mainSuper = mainSuperBalance (e.g., $1,360,000)
SET seqBuffer = sequencingBuffer (e.g., $200,000)
SET cashAccount = 0
SET results = []
SET startAge = retirementAge (e.g., 60)
SET initialPortfolio = mainSuper + seqBuffer
SET currentSpendingBase = baseSpending (e.g., $40,000)
SET initialWithdrawalRate = baseSpending / initialPortfolio
SET yearsToRun = maxYears OR 35

// Aged Care Tracking
SET inAgedCare = FALSE
SET yearsInAgedCare = 0
SET radPaid = 0
SET agedCareRandomValue = RANDOM(0,1) // Single random for probabilistic approach

// Debt Tracking (if enabled)
SET debtBalances[] = COPY OF debts WITH calculated minimum payments

// Partner Tracking
SET partnerAlive = (pensionRecipientType === 'couple')
SET spendingAdjustedForSingle = FALSE
SET spendingBaseBeforeAgedCare = 0
SET partnerMortalityRandomValue = RANDOM(0,1)
SET cumulativeMortalityProbability = 0
```

---

## MAIN SIMULATION LOOP (Years 1-35)

```
FOR year = 1 TO yearsToRun:
    
    age = startAge + year - 1
    guardrailStatus = 'normal'
    startingMainSuper = mainSuper  // Save for minimum drawdown calculation
    
    // ========================================
    // SECTION 1: AGED CARE STATUS CHECK
    // (Must happen BEFORE guardrails)
    // ========================================
    
    agedCareCosts = getAgedCareCosts(age, year, cpiRate, agedCareRandomValue, inAgedCare, yearsInAgedCare)
    
    wasInCare = inAgedCare
    inAgedCare = agedCareCosts.inAgedCare
    yearsInAgedCare = agedCareCosts.yearsInCare
    
    // ========================================
    // SECTION 2: AGED CARE SPENDING ADJUSTMENT
    // (Couples only - adjust spending when partner enters care)
    // ========================================
    
    IF (inAgedCare AND NOT spendingAdjustedForSingle AND pensionRecipientType === 'couple'):
        // Entering aged care - reduce spending to "person at home alone" level
        spendingBaseBeforeAgedCare = currentSpendingBase  // Save for restoration later
        currentSpendingBase = baseSpending × personAtHomeSpending  // e.g., $40k × 0.70 = $28k
        spendingAdjustedForSingle = TRUE
    
    // ========================================
    // SECTION 3: DEATH IN AGED CARE
    // (Handle partner death when exiting care)
    // ========================================
    
    IF (wasInCare AND NOT inAgedCare AND deathInCare AND partnerAlive AND pensionRecipientType === 'couple'):
        // Partner died in aged care - survivor continues at single level
        partnerAlive = FALSE
        
        IF (spendingBaseBeforeAgedCare > 0):
            // Restore to pre-aged-care base, then apply single ratio
            currentSpendingBase = spendingBaseBeforeAgedCare × personAtHomeSpending
        ELSE:
            currentSpendingBase = baseSpending × personAtHomeSpending
    
    ELSE IF (wasInCare AND NOT inAgedCare AND NOT deathInCare AND spendingAdjustedForSingle):
        // Person recovered and exited care - restore couple spending
        IF (spendingBaseBeforeAgedCare > 0):
            currentSpendingBase = spendingBaseBeforeAgedCare
        ELSE:
            currentSpendingBase = baseSpending
        spendingAdjustedForSingle = FALSE
    
    // ========================================
    // SECTION 4: PARTNER MORTALITY (Independent of Aged Care)
    // (Only if enabled and couple and partner still alive)
    // ========================================
    
    IF (includePartnerMortality AND pensionRecipientType === 'couple' AND partnerAlive AND NOT inAgedCare):
        partnerCurrentAge = partnerAge + year - 1
        yearlyMortalityRate = getMortalityProbability(partnerCurrentAge, partnerGender)
        
        cumulativeMortalityProbability += yearlyMortalityRate
        
        IF (partnerMortalityRandomValue < cumulativeMortalityProbability):
            // Partner dies this year
            partnerAlive = FALSE
            
            IF (NOT spendingAdjustedForSingle):
                currentSpendingBase = currentSpendingBase × personAtHomeSpending
                spendingAdjustedForSingle = TRUE
    
    // ========================================
    // SECTION 5: GUARDRAILS (Dynamic Spending Adjustment)
    // (Only if enabled and after year 1)
    // ========================================
    
    IF (useGuardrails AND year > 1):
        
        currentPortfolio = mainSuper + seqBuffer + cashAccount
        realPortfolio = currentPortfolio / (1 + cpiRate/100)^(year-1)
        
        // Calculate total planned spending in REAL TERMS
        totalPlannedSpending = currentSpendingBase
        
        // Add splurge if applicable
        IF (splurgeAmount > 0 AND age >= splurgeStartAge AND age <= splurgeStartAge + splurgeDuration - 1):
            totalPlannedSpending += splurgeAmount
        
        // Add aged care annual costs (convert to real terms)
        IF (agedCareCosts.annualCost > 0):
            realAgedCareCost = agedCareCosts.annualCost / (1 + cpiRate/100)^(year-1)
            totalPlannedSpending += realAgedCareCost
        
        // Calculate current income to determine NET spending need
        adjustedPensionIncome = (pensionRecipientType === 'couple' AND NOT partnerAlive) 
            ? totalPensionIncome × pensionReversionary
            : totalPensionIncome
        
        // Convert pension to REAL TERMS
        realPensionIncome = adjustedPensionIncome / (1 + cpiRate/100)^(year-1)
        
        // Estimate current Age Pension (if enabled)
        estimatedAgePension = 0
        IF (includeAgePension AND age >= agePensionParams.eligibilityAge):
            totalAssets = mainSuper + seqBuffer + cashAccount
            realAssets = totalAssets / (1 + cpiRate/100)^(year-1)
            indexedMaxPension = agePensionParams.maxPensionPerYear
            indexedThreshold = isHomeowner ? assetTestThresholdHomeowner : assetTestThresholdNonHomeowner
            indexedCutoff = isHomeowner ? assetTestCutoffHomeowner : assetTestCutoffNonHomeowner
            
            assetTestPension = indexedMaxPension
            IF (realAssets > indexedThreshold):
                excess = realAssets - indexedThreshold
                reduction = FLOOR(excess / 1000) × assetTaperPerYear
                assetTestPension = MAX(0, indexedMaxPension - reduction)
            IF (realAssets >= indexedCutoff):
                assetTestPension = 0
            
            estimatedAgePension = assetTestPension
        
        // Calculate NET spending need (ALL IN REAL TERMS)
        totalEstimatedIncome = realPensionIncome + estimatedAgePension
        netSpendingNeed = MAX(0, totalPlannedSpending - totalEstimatedIncome)
        
        // Compare NET withdrawal rates
        currentWithdrawalRate = (realPortfolio > 0) ? netSpendingNeed / realPortfolio : 0
        safeWithdrawalRate = initialWithdrawalRate
        withdrawalRateRatio = (safeWithdrawalRate > 0) ? (currentWithdrawalRate / safeWithdrawalRate) × 100 : 100
        
        // Apply guardrail adjustments
        IF (withdrawalRateRatio <= 100 - upperGuardrail):
            // Portfolio doing well - INCREASE spending
            guardrailStatus = 'increase'
            currentSpendingBase = currentSpendingBase × (1 + guardrailAdjustment/100)
        
        ELSE IF (withdrawalRateRatio >= 100 + lowerGuardrail):
            // Portfolio struggling - DECREASE spending
            guardrailStatus = 'decrease'
            proposedSpending = currentSpendingBase × (1 - guardrailAdjustment/100)
            spendingMultiplier = getSpendingMultiplier(year)
            
            // Floor = PSS/CSS pension + Age Pension (if enabled)
            maxAgePension = includeAgePension 
                ? ((pensionRecipientType === 'couple' AND NOT partnerAlive) 
                    ? 29754  // Single rate
                    : agePensionParams.maxPensionPerYear)
                : 0
            
            adjustedPSS = (pensionRecipientType === 'couple' AND NOT partnerAlive)
                ? totalPensionIncome × pensionReversionary
                : totalPensionIncome
            
            indexedPensionFloor = (adjustedPSS + maxAgePension) / spendingMultiplier
            
            // Never drop below pension floor
            currentSpendingBase = MAX(proposedSpending, indexedPensionFloor)
    
    // ========================================
    // SECTION 6: CALCULATE SPENDING
    // ========================================
    
    spendingMultiplier = getSpendingMultiplier(year)
    // Returns 1.0 if CPI pattern, or declining multiplier if JP Morgan pattern
    
    // Calculate base spending in REAL TERMS
    realBaseSpending = currentSpendingBase
    
    // Add splurge if applicable (in real terms)
    IF (splurgeAmount > 0 AND age >= splurgeStartAge AND age <= splurgeStartAge + splurgeDuration - 1):
        realBaseSpending += splurgeAmount
    
    // Inflate to NOMINAL terms
    inflationAdjustedSpending = realBaseSpending × (1 + cpiRate/100)^(year-1)
    
    // Additional costs (not subject to guardrails)
    additionalCosts = 0
    
    IF (healthShock AND year >= 15):
        additionalCosts += 30000
    
    // Aged care annual fees (ALREADY IN NOMINAL TERMS from getAgedCareCosts)
    additionalCosts += agedCareCosts.annualCost
    
    // Debt repayment (if enabled)
    totalDebtPayment = 0
    IF (includeDebt):
        FOR EACH debt IN debtBalances:
            IF (debt.balance > 0):
                interestPaid = debt.balance × (debt.interestRate / 100)
                payment = debt.minimumPayment + debt.extraPayment
                actualPayment = MIN(payment, debt.balance + interestPaid)
                principalPaid = actualPayment - interestPaid
                debt.balance = MAX(0, debt.balance + interestPaid - actualPayment)
                totalDebtPayment += actualPayment
        additionalCosts += totalDebtPayment
    
    // RAD withdrawal (separate from spending)
    radWithdrawn = 0
    IF (agedCareCosts.radRequired > 0):
        radWithdrawn = agedCareCosts.radRequired
    
    // RAD refund (when exiting care)
    radRefund = 0
    IF (radPaid > 0 AND NOT inAgedCare):
        radRefund = radPaid
        radPaid = 0
    
    // One-off expenses
    oneOffAddition = 0
    FOR EACH expense IN oneOffExpenses:
        IF (expense.age === age):
            oneOffAddition += expense.amount
    
    // TOTAL SPENDING (NOMINAL)
    totalSpending = inflationAdjustedSpending × spendingMultiplier + additionalCosts + oneOffAddition
    
    // ========================================
    // SECTION 7: CALCULATE INCOME
    // ========================================
    
    // Adjust pension for partner death
    adjustedPensionIncome = totalPensionIncome
    IF (pensionRecipientType === 'couple' AND NOT partnerAlive):
        adjustedPensionIncome = totalPensionIncome × pensionReversionary
    
    totalAssets = mainSuper + seqBuffer
    
    // Inflate pension and Age Pension parameters to NOMINAL
    indexedMaxPension = currentPensionParams.maxPensionPerYear × (1 + cpiRate/100)^(year-1)
    indexedThreshold = (isHomeowner ? assetTestThresholdHomeowner : assetTestThresholdNonHomeowner) × (1 + cpiRate/100)^(year-1)
    indexedCutoff = (isHomeowner ? assetTestCutoffHomeowner : assetTestCutoffNonHomeowner) × (1 + cpiRate/100)^(year-1)
    indexedTaper = assetTaperPerYear × (1 + cpiRate/100)^(year-1)
    indexedPensionIncome = adjustedPensionIncome × (1 + cpiRate/100)^(year-1)
    
    // Calculate Age Pension (if enabled)
    agePension = 0
    IF (includeAgePension AND age >= currentPensionParams.eligibilityAge):
        
        // Asset Test
        assetTestPension = indexedMaxPension
        IF (totalAssets > indexedThreshold):
            excess = totalAssets - indexedThreshold
            reduction = FLOOR(excess / 1000) × (indexedTaper / (1 + cpiRate/100)^(year-1)) × (1 + cpiRate/100)^(year-1)
            assetTestPension = MAX(0, indexedMaxPension - reduction)
        IF (totalAssets >= indexedCutoff):
            assetTestPension = 0
        
        // Income Test
        indexedIncomeTestFreeArea = incomeTestFreeArea × (1 + cpiRate/100)^(year-1)
        incomeTestPension = indexedMaxPension
        IF (indexedPensionIncome > indexedIncomeTestFreeArea):
            excessIncome = indexedPensionIncome - indexedIncomeTestFreeArea
            reduction = excessIncome × incomeTaperRate
            incomeTestPension = MAX(0, indexedMaxPension - reduction)
        
        agePension = MIN(assetTestPension, incomeTestPension)
    
    totalIncome = indexedPensionIncome + agePension
    netSpendingNeed = MAX(0, totalSpending - totalIncome)
    
    // ========================================
    // SECTION 8: WITHDRAWALS
    // ========================================
    
    // STEP 1: MINIMUM DRAWDOWN (Required by law)
    // Withdraw minimum % from Main Super based on age, deposit to Cash
    minDrawdown = getMinimumDrawdown(age, startingMainSuper)
    // Returns: 4% if age<65, 5% if 65-74, 6% if 75-79, 7% if 80-84, 9% if 85-89, 11% if 90-94, 14% if 95+
    
    superDrawnForMinimum = 0
    IF (minDrawdown > 0 AND mainSuper >= minDrawdown):
        mainSuper -= minDrawdown
        cashAccount += minDrawdown
        superDrawnForMinimum = minDrawdown
    
    // STEP 2: SPENDING WITHDRAWAL LOGIC
    // Waterfall: Cash → Buffer → Super
    withdrawn = 0
    IF (netSpendingNeed > 0):
        
        // Try Cash Account first
        IF (cashAccount >= netSpendingNeed):
            cashAccount -= netSpendingNeed
            withdrawn = netSpendingNeed
        ELSE:
            withdrawn = cashAccount
            cashAccount = 0
            remaining = netSpendingNeed - withdrawn
            
            // Try Sequencing Buffer
            IF (seqBuffer >= remaining):
                seqBuffer -= remaining
                withdrawn += remaining
            ELSE:
                withdrawn += seqBuffer
                remaining = remaining - seqBuffer
                seqBuffer = 0
                
                // Withdraw from Main Super
                IF (mainSuper >= remaining):
                    mainSuper -= remaining
                    withdrawn += remaining
                ELSE:
                    withdrawn += mainSuper
                    mainSuper = 0
    
    // STEP 3: RAD PAYMENT (if entering aged care)
    // Waterfall: Main Super → Buffer → Cash
    IF (radWithdrawn > 0):
        radRemaining = radWithdrawn
        
        // Try Main Super first
        IF (mainSuper >= radRemaining):
            mainSuper -= radRemaining
            radRemaining = 0
        ELSE:
            radRemaining -= mainSuper
            mainSuper = 0
            
            // Try Buffer
            IF (seqBuffer >= radRemaining):
                seqBuffer -= radRemaining
                radRemaining = 0
            ELSE:
                radRemaining -= seqBuffer
                seqBuffer = 0
                
                // Try Cash
                IF (cashAccount >= radRemaining):
                    cashAccount -= radRemaining
                    radRemaining = 0
                ELSE:
                    radRemaining -= cashAccount
                    cashAccount = 0
        
        // Track actual amount paid (for future refund)
        IF (radRemaining > 0):
            radWithdrawn -= radRemaining  // Partial payment
        radPaid = radWithdrawn
    
    // STEP 4: RAD REFUND (if exiting aged care)
    // Refund goes to Cash
    IF (radRefund > 0):
        cashAccount += radRefund
    
    // ========================================
    // SECTION 9: APPLY RETURNS
    // ========================================
    
    yearReturn = returnSequence[year - 1] OR 0
    
    mainSuper = mainSuper × (1 + yearReturn/100)
    seqBuffer = seqBuffer × 1.03  // 3% real return on defensive assets
    cashAccount = cashAccount × 1.03  // 3% real return
    
    totalBalance = mainSuper + seqBuffer + cashAccount
    
    // ========================================
    // SECTION 10: STORE RESULTS
    // ========================================
    
    results.PUSH({
        year, age, mainSuper, seqBuffer, cashAccount, totalBalance,
        spending: totalSpending, 
        income: totalIncome, 
        agePension, 
        pensionIncome: indexedPensionIncome,
        withdrawn, 
        minDrawdown, 
        superDrawnForMinimum,
        yearReturn, 
        cpiRate, 
        guardrailStatus, 
        currentSpendingBase,
        inAgedCare, 
        agedCareAnnualCost: agedCareCosts.annualCost, 
        radWithdrawn, 
        radRefund,
        partnerAlive,
        debtBalance: totalDebtBalance,
        debtPayment: totalDebtPayment
    })
    
    // ========================================
    // SECTION 11: CHECK FOR BANKRUPTCY
    // ========================================
    
    IF (totalBalance <= 0):
        BREAK  // End simulation
    
END FOR

RETURN results
```

---

## KEY HELPER FUNCTIONS

### getAgedCareCosts(age, year, cpiRate, randomValue, currentlyInCare, yearsInCare)

```
IF (NOT includeAgedCare):
    RETURN {radRequired: 0, annualCost: 0, inAgedCare: FALSE, yearsInCare: 0}

inAgedCare = currentlyInCare
newYearsInCare = yearsInCare

IF (agedCareApproach === 'deterministic'):
    // Enter at specified age, stay for specified duration
    IF (age >= deterministicAgedCareAge AND age < deterministicAgedCareAge + agedCareDuration):
        inAgedCare = TRUE
        newYearsInCare = age - deterministicAgedCareAge + 1
    ELSE IF (age >= deterministicAgedCareAge + agedCareDuration):
        inAgedCare = FALSE
        newYearsInCare = 0

ELSE:  // Probabilistic approach
    IF (NOT currentlyInCare):
        probability = getAgedCareProbability(age)  
        // Returns: 2% at 75, 5% at 80, 15% at 85, 30% at 90, 45% at 95, 55% at 100
        IF (randomValue < probability / 100):
            inAgedCare = TRUE
            newYearsInCare = 1
    ELSE:
        newYearsInCare = yearsInCare + 1
        IF (newYearsInCare <= agedCareDuration):
            inAgedCare = TRUE
        ELSE:
            inAgedCare = FALSE
            newYearsInCare = 0

IF (NOT inAgedCare):
    RETURN {radRequired: 0, annualCost: 0, inAgedCare: FALSE, yearsInCare: newYearsInCare}

// RAD required in first year only
inflationAdjustedRAD = (newYearsInCare === 1) 
    ? agedCareRAD × (1 + cpiRate/100)^(year-1)
    : 0

// Annual costs increase with CPI
inflationAdjustedAnnualCost = agedCareAnnualCost × (1 + cpiRate/100)^(year-1)

RETURN {
    radRequired: inflationAdjustedRAD,
    annualCost: inflationAdjustedAnnualCost,
    inAgedCare: TRUE,
    yearsInCare: newYearsInCare
}
```

### getSpendingMultiplier(year)

```
IF (spendingPattern === 'cpi'):
    RETURN 1.0
ELSE:  // JP Morgan declining pattern
    IF (year <= 10):
        RETURN 0.982^(year-1)
    ELSE IF (year <= 20):
        year10Multiplier = 0.982^9
        RETURN year10Multiplier × 0.986^(year-10)
    ELSE:
        year10Multiplier = 0.982^9
        year20Multiplier = year10Multiplier × 0.986^10
        RETURN year20Multiplier × 0.999^(year-20)
```

### getMinimumDrawdown(age, balance)

```
IF (balance <= 0):
    RETURN 0

IF (age < 65):
    rate = 0.04
ELSE IF (age < 75):
    rate = 0.05
ELSE IF (age < 80):
    rate = 0.06
ELSE IF (age < 85):
    rate = 0.07
ELSE IF (age < 90):
    rate = 0.09
ELSE IF (age < 95):
    rate = 0.11
ELSE:
    rate = 0.14

RETURN balance × rate
```

---

## CRITICAL LOGIC POINTS

### 1. Aged Care Spending Adjustment (Couples Only)
```
When partner enters aged care:
    currentSpendingBase = $40,000 × 0.70 = $28,000 (person at home alone)
    THEN aged care fees ($65k) are ADDED to this
    TOTAL = $28,000 + $65,000 = $93,000
```

### 2. Real vs Nominal Values
```
SIMULATION USES NOMINAL DOLLARS (inflated forward from retirement year)
- All spending: inflated by (1 + CPI)^(year-1)
- All income: inflated by (1 + CPI)^(year-1)
- Returns applied to NOMINAL balances

DISPLAY TO USER:
- If "Real 2031 $": divide by (1 + CPI)^(year-1)
- If "Nominal $": show as-is
```

### 3. Guardrails Compare NET Withdrawal Rates
```
Initial: $40,000 spending - $0 Age Pension = $40,000 net / $1,560,000 = 2.56%
Year N: (spending - pension - Age Pension) / portfolio
Ratio = Current / Initial × 100

If ratio < 80% (doing well): INCREASE spending by 10%
If ratio > 115% (struggling): DECREASE spending by 10%, but never below pension floor
```

### 4. Withdrawal Waterfall Order
```
SPENDING: Cash → Buffer → Main Super
RAD: Main Super → Buffer → Cash
MINIMUM DRAWDOWN: Main Super → Cash (builds up cash reserve)
```

### 5. Partner Death Transitions
```
Via Aged Care:
    Enter care → Spending drops to 70%
    Exit via death → Spending stays at 70%, Age Pension switches to single

Via Partner Mortality (independent):
    Death occurs → Spending drops to 70%, Age Pension switches to single
    PSS/CSS pension reduces to reversionary % (e.g., 67%)
```

---

## EXAMPLE YEAR WALKTHROUGH (Year 26, Age 85, Couple with Aged Care)

```
START:
    mainSuper = $664k
    seqBuffer = $419k
    cashAccount = $1,530k
    currentSpendingBase = $40,000
    partnerAlive = TRUE
    inAgedCare = FALSE

SECTION 1: Aged Care Check
    age 85 >= deterministicAgedCareAge (85) → Enter care
    agedCareCosts = {radRequired: $746k, annualCost: $121k, inAgedCare: TRUE}

SECTION 2: Spending Adjustment
    inAgedCare = TRUE AND spendingAdjustedForSingle = FALSE
    → currentSpendingBase = $40,000 × 0.70 = $28,000

SECTION 5: Guardrails
    SKIP (portfolio still healthy)

SECTION 6: Calculate Spending
    realBaseSpending = $28,000
    inflationAdjustedSpending = $28,000 × 1.8539 = $51,910 (nominal)
    spendingMultiplier = 0.7331 (JP Morgan year 26)
    additionalCosts = $121,000 (aged care annual, nominal)
    totalSpending = $51,910 × 0.7331 + $121,000 = $159,064 (nominal)

SECTION 7: Calculate Income
    indexedPensionIncome = $40,000 × 1.8539 = $74,158
    agePension = $0 (disabled)
    totalIncome = $74,158
    netSpendingNeed = $159,064 - $74,158 = $84,906

SECTION 8: Withdrawals
    Step 1: Minimum drawdown = $664k × 9% = $59,740
        mainSuper = $604k, cashAccount = $1,590k
    Step 2: Spending withdrawal from cashAccount = $84,906
        cashAccount = $1,505k
    Step 3: RAD payment = $746k
        mainSuper = $0 (use all $604k)
        seqBuffer = $277k (use $142k)
        radPaid = $746k

SECTION 9: Apply Returns (assume 5%)
    mainSuper = $0 × 1.05 = $0
    seqBuffer = $277k × 1.03 = $285k
    cashAccount = $1,505k × 1.03 = $1,550k
    totalBalance = $1,835k

DISPLAY (Real 2031 $):
    totalSpending = $159,064 / 1.8539 = $85,802
    BUT this includes: $28k base × 0.7331 = $20.5k base + $65k aged care = $85.5k ✓
    
    Actually in REAL terms:
    - Base spending: $28,000 (already real)
    - Aged care: $121,000 / 1.8539 = $65,000 (real)
    - Total: $28k + $65k = $93k ✓
```
