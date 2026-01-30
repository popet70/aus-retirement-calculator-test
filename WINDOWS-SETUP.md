# Windows Installation Guide - Retirement Calculator Refactoring

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js installed (v18 or v20) - Download from https://nodejs.org/
- ✅ Git installed - Download from https://git-scm.com/
- ✅ VS Code (recommended) - Download from https://code.visualstudio.com/
- ✅ Your existing retirement calculator project

## Step 1: Download the Refactored Code

### Option A: Download the ZIP file from Claude
1. Click the download link for `retirement-calculator-refactored.zip`
2. Save it to your Downloads folder
3. Right-click the ZIP file → "Extract All..."
4. Extract to a temporary location (e.g., `C:\Temp\retirement-calculator`)

### Option B: If download fails, use individual files
I can provide the code in text format for you to copy-paste manually.

## Step 2: Open Your Project in VS Code

1. Open VS Code
2. File → Open Folder
3. Select your existing retirement calculator project folder
4. The folder should contain your `package.json` and current `page.tsx`

## Step 3: Copy the Refactored Files

### Using File Explorer:

1. Open two File Explorer windows:
   - Window 1: Navigate to extracted `retirement-calculator` folder
   - Window 2: Navigate to your project root folder

2. **Copy the library files:**
   - From Window 1, copy the `lib` folder
   - Paste into Window 2 (your project root)
   - You should now have `your-project/lib/`

3. **Copy the test files:**
   - From Window 1, copy the `__tests__` folder
   - Paste into Window 2
   - You should now have `your-project/__tests__/`

4. **Copy the GitHub Actions:**
   - From Window 1, copy the `.github` folder
   - Paste into Window 2
   - You should now have `your-project/.github/workflows/test.yml`

5. **Copy configuration files:**
   - Copy `jest.config.js` → paste to project root
   - Copy `jest.setup.js` → paste to project root
   - **DO NOT** overwrite your existing `package.json` yet

6. **Copy documentation:**
   - Copy `README.md` → rename to `README-REFACTORED.md` in your project
   - Copy `MIGRATION.md` → paste to project root
   - Copy `SUMMARY.md` → paste to project root

### Your project structure should now look like:
```
your-project/
├── .github/
│   └── workflows/
│       └── test.yml
├── __tests__/
│   ├── agePension.test.ts
│   ├── projection.test.ts
│   ├── spending.test.ts
│   └── utils.test.ts
├── lib/
│   ├── calculations/
│   │   ├── agePension.ts
│   │   ├── monteCarlo.ts
│   │   ├── projection.ts
│   │   └── spending.ts
│   ├── data/
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── helpers.ts
├── app/                    (your existing Next.js app)
├── jest.config.js          (NEW)
├── jest.setup.js           (NEW)
├── MIGRATION.md            (NEW)
├── package.json            (your existing file)
└── ... (your other files)
```

## Step 4: Install Test Dependencies

1. **Open PowerShell or Command Prompt:**
   - Press `Win + R`
   - Type `powershell` or `cmd`
   - Press Enter

2. **Navigate to your project:**
   ```powershell
   cd C:\path\to\your\project
   ```
   (Replace with your actual project path)

3. **Install test dependencies:**
   ```powershell
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest
   ```

4. **Wait for installation to complete** (may take 2-3 minutes)

## Step 5: Update package.json

1. **Open `package.json` in VS Code**

2. **Add test scripts to the "scripts" section:**
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint",
       "test": "jest",
       "test:watch": "jest --watch",
       "test:ci": "jest --ci --coverage --maxWorkers=2"
     }
   }
   ```

3. **Save the file** (Ctrl + S)

## Step 6: Verify Installation

1. **In PowerShell/Command Prompt, run:**
   ```powershell
   npm test
   ```

2. **Expected output:**
   ```
   PASS  __tests__/agePension.test.ts
   PASS  __tests__/spending.test.ts
   PASS  __tests__/projection.test.ts
   PASS  __tests__/utils.test.ts

   Test Suites: 4 passed, 4 total
   Tests:       80+ passed, 80+ total
   ```

3. **If tests pass:** ✅ Installation successful!

4. **If tests fail:** See troubleshooting below

## Step 7: Run Your Existing App

1. **Start the development server:**
   ```powershell
   npm run dev
   ```

2. **Open browser:** http://localhost:3000

3. **Verify your app still works** - nothing should be broken yet

## Troubleshooting

### Problem: "jest is not recognized"

**Solution:**
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Problem: Tests fail with "Cannot find module '@/lib/...'"

**Solution:** Check your `tsconfig.json` has:
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

### Problem: "SyntaxError: Unexpected token 'export'"

**Solution:** Your `jest.config.js` might be incorrect. Copy this exactly:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    '!lib/**/*.d.ts',
    '!**/node_modules/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### Problem: PowerShell script execution errors

**Solution:**
```powershell
# Run as Administrator, then:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Problem: Node version issues

**Solution:**
1. Check your Node version: `node --version`
2. Should be v18.x or v20.x
3. If not, download from https://nodejs.org/

## Step 8: Start Migration (Follow MIGRATION.md)

Now you're ready to begin the actual migration! Open `MIGRATION.md` and follow Phase 1.

### Quick Start - First Integration

Let's do a simple test to see how the extracted code works:

1. **Open your `page.tsx` or main component file**

2. **Add this import at the top:**
   ```typescript
   import { calculateAgePension } from '@/lib/calculations/agePension';
   ```

3. **Find where you calculate age pension** (search for "pension" or "means test")

4. **Replace it with:**
   ```typescript
   const agePension = calculateAgePension({
     totalBalance: mainSuper + buffer + cash,
     pensionIncome: totalPensionIncome,
     isHomeowner: isHomeowner,
     pensionRecipientType: 'couple', // or 'single'
   });
   ```

5. **Save and test:** Your age pension calculation now uses the tested function!

6. **Run tests to verify:**
   ```powershell
   npm test agePension
   ```

## Running Tests in Watch Mode

While developing, you can have tests auto-run:

```powershell
npm run test:watch
```

This will:
- Re-run tests when you save files
- Show only failed tests
- Very useful during development

Press `q` to quit watch mode.

## VS Code Tips

### Recommended Extensions:
1. **Jest** (by Orta) - Run tests directly in VS Code
2. **Jest Runner** - Run individual tests with a click
3. **TypeScript Error Translator** - Better error messages

### Install Extensions:
1. Press `Ctrl + Shift + X`
2. Search for "Jest"
3. Install "Jest" by Orta
4. Install "Jest Runner"

### Run Tests in VS Code:
- Open a test file (e.g., `agePension.test.ts`)
- You'll see "Run | Debug" above each test
- Click "Run" to run just that test
- See results inline!

## Git Setup (Push to GitHub)

1. **Initialize Git (if not already done):**
   ```powershell
   git init
   ```

2. **Add all files:**
   ```powershell
   git add .
   ```

3. **Commit:**
   ```powershell
   git commit -m "Add automated testing infrastructure"
   ```

4. **Push to GitHub:**
   ```powershell
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

5. **Check GitHub Actions:**
   - Go to your repo on GitHub
   - Click "Actions" tab
   - You should see tests running automatically!

## Vercel Deployment

If you use Vercel:

1. **Vercel will automatically detect the changes**
2. **Build will include test step**
3. **Deployment proceeds only if tests pass**

No configuration needed!

## Next Steps

You're now set up! Follow these in order:

1. ✅ **Verify tests run** - `npm test` should pass
2. ✅ **Read MIGRATION.md** - Understand the migration plan
3. ✅ **Phase 1: Age Pension** - Start with simplest migration
4. ✅ **Test after each phase** - Verify nothing breaks
5. ✅ **Continue through phases** - Follow the checklist

## Common Windows-Specific Issues

### Issue: Path too long errors
**Solution:**
```powershell
# Enable long paths
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Issue: File permission errors
**Solution:** Run PowerShell or Command Prompt as Administrator

### Issue: npm command not found
**Solution:** 
1. Restart PowerShell/Command Prompt
2. If still not working, add to PATH:
   - Search "Environment Variables" in Windows
   - Add `C:\Program Files\nodejs\` to PATH

### Issue: Git Bash vs PowerShell differences
**Solution:** Use PowerShell for consistency with these instructions

## Quick Reference

### Essential Commands
```powershell
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test agePension

# Generate coverage report
npm test -- --coverage

# Start dev server
npm run dev

# Build for production
npm run build
```

### File Locations
- Tests: `__tests__/*.test.ts`
- Library: `lib/calculations/*.ts`
- Config: `jest.config.js`, `jest.setup.js`
- CI/CD: `.github/workflows/test.yml`

## Getting Help

If you encounter issues:

1. **Check the test output** - Error messages are usually clear
2. **Read MIGRATION.md** - Detailed step-by-step guide
3. **Review the test files** - They show how to use the functions
4. **Check VS Code Problems panel** - Shows TypeScript errors

## Success Checklist

Before moving to migration:

- [ ] Downloaded and extracted files
- [ ] Copied files to project directory
- [ ] Installed test dependencies (`npm install`)
- [ ] Tests run and pass (`npm test`)
- [ ] Existing app still works (`npm run dev`)
- [ ] Git is set up (optional but recommended)
- [ ] Read MIGRATION.md

When all checked, you're ready to begin Phase 1 of the migration!

---

**Estimated Setup Time:** 30-60 minutes
**Next Step:** Open MIGRATION.md and start Phase 1
**Contact:** aust-retirement-calculator@proton.me
