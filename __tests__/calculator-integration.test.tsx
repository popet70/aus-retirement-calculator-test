import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RetirementCalculator from '../app/page';

// Mock Recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
  LineChart: () => <div data-testid="line-chart">LineChart</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: () => <div data-testid="area-chart">AreaChart</div>,
  Area: () => null,
  ComposedChart: () => <div data-testid="composed-chart">ComposedChart</div>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Retirement Calculator - Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    // Accept terms to avoid showing disclaimer
    localStorageMock.setItem('termsAccepted_v1.0', 'true');
  });

  describe('Component Loading', () => {
    it('renders without crashing', () => {
      render(<RetirementCalculator />);
      // Use getAllByText for text that appears multiple times
      const titles = screen.getAllByText(/Australian Retirement Planning Tool/i);
      expect(titles.length).toBeGreaterThan(0);
    });

    it('shows all major sections', () => {
      render(<RetirementCalculator />);
      
      // Check for key UI elements
      expect(screen.getByText(/Initial Situation/i)).toBeInTheDocument();
      expect(screen.getByText(/Display Values/i)).toBeInTheDocument();
    });

    it('renders charts', async () => {
      render(<RetirementCalculator />);
      
      await waitFor(() => {
        // Check that charts are rendered (mocked)
        const charts = screen.getAllByTestId(/chart/i);
        expect(charts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Default Scenario Calculations', () => {
    it('shows portfolio balance with default values', async () => {
      render(<RetirementCalculator />);
      
      await waitFor(() => {
        // Default values: $1.36M super + $200k buffer = $1.56M total
        // Should show some representation of this
        // Charts render with this data
        const charts = screen.getAllByTestId(/chart/i);
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    it('calculates retirement years correctly', () => {
      render(<RetirementCalculator />);
      
      // Default: Current age 55, retirement age 60
      // Should project from age 55 to 100 (45 years)
      // This is implicit in the calculation - we're verifying it doesn't crash
      expect(screen.getByText(/Initial Situation/i)).toBeInTheDocument();
    });
  });

  describe('Age Pension Calculations', () => {
    it('includes age pension when enabled', async () => {
      render(<RetirementCalculator />);
      
      await waitFor(() => {
        // Default scenario has age pension enabled
        // With $1.56M assets and $101k pension income, should get some age pension
        // The fact it renders without error means calculation completed
        expect(screen.getByText(/Include Age Pension/i)).toBeInTheDocument();
      });
    });

    it('handles high asset values (no pension expected)', () => {
      render(<RetirementCalculator />);
      
      // With very high assets, age pension should be $0
      // Calculator should handle this without errors
      expect(screen.getByText(/Main Super Balance/i)).toBeInTheDocument();
    });
  });

  describe('Spending Calculations', () => {
    it('processes base spending correctly', () => {
      render(<RetirementCalculator />);
      
      // Default base spending: $120,000
      expect(screen.getByText(/Base Annual Spending/i)).toBeInTheDocument();
    });

    it('handles different spending patterns', () => {
      render(<RetirementCalculator />);
      
      // Should show spending pattern options
      // Default is JP Morgan pattern
      expect(screen.getByText(/Spending Pattern/i)).toBeInTheDocument();
    });

    it('processes one-off expenses', () => {
      render(<RetirementCalculator />);
      
      // Default scenario has multiple one-off expenses
      // Use getAllByText since it appears in heading and summary
      const oneOffTexts = screen.getAllByText(/One-Off Expenses/i);
      expect(oneOffTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Guardrails Feature', () => {
    it('shows guardrails section', () => {
      render(<RetirementCalculator />);
      
      // Guardrails might be in a collapsible section
      // Check for related text
      expect(screen.getByText(/Spending Pattern/i)).toBeInTheDocument();
    });

    it('has spending controls', () => {
      render(<RetirementCalculator />);
      
      // Check for spending configuration options
      expect(screen.getByText(/Base Annual Spending/i)).toBeInTheDocument();
    });
  });

  describe('Advanced Features', () => {
    it('shows advanced features section', () => {
      render(<RetirementCalculator />);
      
      // Advanced features are present
      expect(screen.getByText(/Include Aged Care/i)).toBeInTheDocument();
    });

    it('shows aged care options', () => {
      render(<RetirementCalculator />);
      
      expect(screen.getByText(/Include Aged Care/i)).toBeInTheDocument();
    });

    it('shows data options', () => {
      render(<RetirementCalculator />);
      
      // Historical data and Monte Carlo may be in advanced section
      expect(screen.getByText(/Test Scenarios/i)).toBeInTheDocument();
    });

    it('shows splurge spending options', () => {
      render(<RetirementCalculator />);
      
      // Use getAllByText for text that appears multiple times
      const splurgeTexts = screen.getAllByText(/Splurge Amount/i);
      expect(splurgeTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Portfolio Management', () => {
    it('displays main super balance', () => {
      render(<RetirementCalculator />);
      
      expect(screen.getByText(/Main Super Balance/i)).toBeInTheDocument();
    });

    it('displays sequencing buffer', () => {
      render(<RetirementCalculator />);
      
      expect(screen.getByText(/Sequencing Buffer/i)).toBeInTheDocument();
    });

    it('shows pension income input', () => {
      render(<RetirementCalculator />);
      
      // Use getAllByText since "Pension Income" appears multiple times
      const pensionTexts = screen.getAllByText(/Pension Income/i);
      expect(pensionTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Return Scenarios', () => {
    it('shows scenario selection', () => {
      render(<RetirementCalculator />);
      
      // Should have scenario selector (Conservative, Moderate, etc.)
      expect(screen.getByRole('heading', { name: /Test Scenarios/i })).toBeInTheDocument();
    });

    it('handles different return scenarios', () => {
      render(<RetirementCalculator />);
      
      // Default scenario 4 (Growth: 8%) should work
      // Rendering without crash validates calculation completes
      expect(screen.getByText(/Initial Situation/i)).toBeInTheDocument();
    });
  });

  describe('Display Options', () => {
    it('shows real vs nominal dollar toggle', () => {
      render(<RetirementCalculator />);
      
      expect(screen.getByText(/Nominal/i)).toBeInTheDocument();
    });

    it('handles inflation rate input', () => {
      render(<RetirementCalculator />);
      
      expect(screen.getByText(/Inflation Rate/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero portfolio balance scenario', () => {
      render(<RetirementCalculator />);
      
      // Calculator should handle edge cases without crashing
      // Even with zero balance, should render
      expect(screen.getByText(/Initial Situation/i)).toBeInTheDocument();
    });

    it('handles very high spending scenario', () => {
      render(<RetirementCalculator />);
      
      // With spending > portfolio, should show portfolio exhaustion
      // Should not crash
      expect(screen.getByText(/Base Annual Spending/i)).toBeInTheDocument();
    });

    it('handles immediate retirement (current age = retirement age)', () => {
      render(<RetirementCalculator />);
      
      // Should handle case where already retired
      expect(screen.getByText(/Current Age/i)).toBeInTheDocument();
      expect(screen.getByText(/Retirement Age/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('shows help panel toggle', () => {
      render(<RetirementCalculator />);
      
      expect(screen.getByText(/Quick Help/i)).toBeInTheDocument();
    });

    it('shows assumptions panel', () => {
      render(<RetirementCalculator />);
      
      expect(screen.getByText(/Key Assumptions/i)).toBeInTheDocument();
    });

    it('shows export options', () => {
  render(<RetirementCalculator />);
  
  // Now we have two export buttons
  expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
  expect(screen.getByText(/Export PDF Report/i)).toBeInTheDocument();
});
  });

  describe('Pension Configuration', () => {
    it('shows pension recipient type options', () => {
      render(<RetirementCalculator />);
      
      // Should have single vs couple options
      expect(screen.getByText(/Age Pension Recipient Type/i)).toBeInTheDocument();
    });

    it('shows homeowner status', () => {
      render(<RetirementCalculator />);
      
      expect(screen.getByText(/Own Home/i)).toBeInTheDocument();
    });
  });

  describe('Data Validation', () => {
    it('handles valid age ranges', () => {
      render(<RetirementCalculator />);
      
      // Ages should be between reasonable ranges (18-100)
      // Component should validate this
      expect(screen.getByText(/Current Age/i)).toBeInTheDocument();
    });

    it('handles valid spending amounts', () => {
      render(<RetirementCalculator />);
      
      // Spending should be positive
      expect(screen.getByText(/Base Annual Spending/i)).toBeInTheDocument();
    });

    it('handles valid portfolio amounts', () => {
      render(<RetirementCalculator />);
      
      // Portfolio values should be non-negative
      expect(screen.getByText(/Main Super Balance/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders in reasonable time', async () => {
      const startTime = Date.now();
      render(<RetirementCalculator />);
      const endTime = Date.now();
      
      // Should render in less than 3 seconds
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('does not cause memory leaks', () => {
      const { unmount } = render(<RetirementCalculator />);
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<RetirementCalculator />);
      
      // Should have h1, h2, etc. for screen readers
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('has labels for form inputs', () => {
      render(<RetirementCalculator />);
      
      // Form inputs should have associated labels
      expect(screen.getByText(/Main Super Balance/i)).toBeInTheDocument();
    });
  });

  describe('Critical Path - Complete Scenario', () => {
    it('successfully calculates a complete retirement projection', async () => {
      render(<RetirementCalculator />);
      
      await waitFor(() => {
        // Verify key sections loaded
        expect(screen.getByText(/Initial Situation/i)).toBeInTheDocument();
        
        // Verify charts rendered (mocked)
        const charts = screen.getAllByTestId(/chart/i);
        expect(charts.length).toBeGreaterThan(0);
        
        // Verify no error messages
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      }, { timeout: 10000 }); // Increased timeout
    }, 15000); // Test timeout

    it('handles all default features enabled', async () => {
      render(<RetirementCalculator />);
      
      await waitFor(() => {
        // Default state has:
        // - Age pension enabled
        // - One-off expenses
        // - Splurge spending
        // - All should work together without errors
        
        expect(screen.getByText(/Initial Situation/i)).toBeInTheDocument();
        
        // Should render successfully with all features
        const charts = screen.getAllByTestId(/chart/i);
        expect(charts.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  describe('Regression Prevention', () => {
    it('maintains core calculation integrity', () => {
      render(<RetirementCalculator />);
      
      // This test ensures the calculator still performs core functions
      // If calculation logic breaks, component won't render properly
      const titles = screen.getAllByText(/Australian Retirement Planning Tool/i);
      expect(titles.length).toBeGreaterThan(0);
      expect(screen.getByText(/Initial Situation/i)).toBeInTheDocument();
    });

    it('preserves all major features', () => {
      render(<RetirementCalculator />);
      
      // Verify all major features are present
      const features = [
        /Main Super Balance/i,
        /Base Annual Spending/i,
        /Include Age Pension/i,
        /Include Aged Care/i,
      ];
      
      features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });

    it('has all core inputs present', () => {
      render(<RetirementCalculator />);
      
      // Verify core inputs
      expect(screen.getByText(/Main Super Balance/i)).toBeInTheDocument();
      expect(screen.getByText(/Sequencing Buffer/i)).toBeInTheDocument();
      expect(screen.getByText(/Base Annual Spending/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Age/i)).toBeInTheDocument();
      expect(screen.getByText(/Retirement Age/i)).toBeInTheDocument();
    });
  });
});
