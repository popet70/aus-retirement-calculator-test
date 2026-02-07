/**
 * Couple Tracking Panel Component
 * 
 * Allows individual tracking of each partner's:
 * - Super balance
 * - Retirement age  
 * - Pension income
 * - Death age (scenario modeling)
 */

import React from 'react';
import { PartnerDetails, getLifeExpectancy } from '@/lib/utils/coupleTracking';

interface CoupleTrackingPanelProps {
  partner1: PartnerDetails;
  partner2: PartnerDetails;
  onPartner1Change: (partner: PartnerDetails) => void;
  onPartner2Change: (partner: PartnerDetails) => void;
}

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

export function CoupleTrackingPanel({
  partner1,
  partner2,
  onPartner1Change,
  onPartner2Change,
}: CoupleTrackingPanelProps) {
  
  const renderPartnerInputs = (
    partner: PartnerDetails,
    onChange: (partner: PartnerDetails) => void,
    label: string
  ) => {
    // Auto-update death age when current age or gender changes
    const handleAgeChange = (newAge: number) => {
      const newDeathAge = Math.round(getLifeExpectancy(newAge, partner.gender));
      onChange({ ...partner, currentAge: newAge, deathAge: newDeathAge });
    };
    
    const handleGenderChange = (newGender: 'male' | 'female') => {
      const newDeathAge = Math.round(getLifeExpectancy(partner.currentAge, newGender));
      onChange({ ...partner, gender: newGender, deathAge: newDeathAge });
    };
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="font-bold text-lg mb-3 text-blue-900">{label}</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Name
              <InfoTooltip text="Partner's name for identification" />
            </label>
            <input
              type="text"
              value={partner.name}
              onChange={(e) => onChange({ ...partner, name: e.target.value })}
              className="w-full p-2 border rounded text-sm"
              placeholder="e.g., Tim"
            />
          </div>
          
          {/* Age turning this year */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Age turning this year
              <InfoTooltip text="The age this partner will turn (or has turned) this calendar year. Year 1 of simulation starts when first partner retires." />
            </label>
            <input
              type="number"
              value={partner.currentAge}
              onChange={(e) => handleAgeChange(Number(e.target.value))}
              className="w-full p-2 border rounded text-sm"
              min="18"
              max="100"
            />
          </div>
          
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Gender
              <InfoTooltip text="Used for life expectancy calculations" />
            </label>
            <select
              value={partner.gender}
              onChange={(e) => handleGenderChange(e.target.value as 'male' | 'female')}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          
          {/* Super Balance */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Super Balance
              <InfoTooltip text="This partner's superannuation balance at their retirement age (not current balance if still working)" />
            </label>
            <input
              type="number"
              value={partner.superBalance}
              onChange={(e) => onChange({ ...partner, superBalance: Number(e.target.value) })}
              className="w-full p-2 border rounded text-sm"
              step="10000"
              min="0"
            />
          </div>
          
          {/* Retirement Age */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Retirement Age
              <InfoTooltip text="Age when this partner retires and starts drawing super. Year 1 of the simulation starts when the first partner retires." />
            </label>
            <input
              type="number"
              value={partner.retirementAge}
              onChange={(e) => onChange({ ...partner, retirementAge: Number(e.target.value) })}
              className="w-full p-2 border rounded text-sm"
              min={partner.currentAge}
              max="100"
            />
          </div>
          
          {/* Pension Income */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Defined Benefit/Annuity (net annual)
              <InfoTooltip text="Annual defined benefit pension or superannuation annuity for this partner (after tax) starting from their retirement age. Includes PSS, CSS, DFRDB, or commercial lifetime annuities. Automatically indexed to inflation." />
            </label>
            <input
              type="number"
              value={partner.pensionIncome}
              onChange={(e) => onChange({ ...partner, pensionIncome: Number(e.target.value) })}
              className="w-full p-2 border rounded text-sm"
              step="1000"
              min="0"
            />
          </div>
          
          {/* Pre-Retirement Income */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Pre-Retirement Income (net annual)
              <InfoTooltip text="Net income (after tax) while working before retirement. Stops when this partner retires." />
            </label>
            <input
              type="number"
              value={partner.preRetirementIncome}
              onChange={(e) => onChange({ ...partner, preRetirementIncome: Number(e.target.value) })}
              className="w-full p-2 border rounded text-sm"
              step="5000"
              min="0"
            />
            {partner.preRetirementIncome > 0 && partner.currentAge < partner.retirementAge && (
              <p className="text-xs text-gray-500 mt-1">
                Will earn for {partner.retirementAge - partner.currentAge} years until retirement
              </p>
            )}
          </div>
          
          {/* Reversionary Rate */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Reversionary Rate (%)
              <InfoTooltip text="Percentage of pension that continues to survivor. Typical rates: PSS 67%, CSS 67%, DFRDB 67%." />
            </label>
            <input
              type="number"
              value={partner.reversionaryRate}
              onChange={(e) => onChange({ ...partner, reversionaryRate: Number(e.target.value) })}
              className="w-full p-2 border rounded text-sm"
              min="0"
              max="100"
              step="1"
            />
          </div>
          
          {/* Death Age for Modeling */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Death Age (for scenario modeling)
              <InfoTooltip text={`Default based on Australian life expectancy tables. Current life expectancy: ${Math.round(getLifeExpectancy(partner.currentAge, partner.gender))} years.`} />
            </label>
            <input
              type="number"
              value={partner.deathAge}
              onChange={(e) => onChange({ ...partner, deathAge: Number(e.target.value) })}
              className="w-full p-2 border rounded text-sm"
              min={partner.currentAge}
              max="120"
            />
            <p className="text-xs text-gray-500 mt-1">
              Life expectancy: {Math.round(getLifeExpectancy(partner.currentAge, partner.gender))} years
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <h2 className="text-xl font-bold mb-4">Individual Partner Tracking</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderPartnerInputs(partner1, onPartner1Change, 'Partner 1')}
        {renderPartnerInputs(partner2, onPartner2Change, 'Partner 2')}
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> When individual tracking is enabled, super balances are tracked separately 
          for each partner. On death, the deceased partner's super is transferred to the survivor. 
          Defined benefit pensions continue at the reversionary rate specified above.
        </p>
      </div>
    </div>
  );
}
