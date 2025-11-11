// COMMENTED OUT 11-Nov-2025: This file's functionality has been moved to components/utils/currencyUtils.js for better organization.
// All imports should now use: import { formatCurrency } from '../utils/currencyUtils';

/*
export const formatCurrency = (amount, settings) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return settings.currencyPosition === 'before' 
      ? `${settings.currencySymbol}0${settings.decimalSeparator}00`
      : `0${settings.decimalSeparator}00${settings.currencySymbol}`;
  }

  const fixedAmount = Math.abs(amount).toFixed(settings.decimalPlaces || 2);
  const [integerPart, decimalPart] = fixedAmount.split('.');
  
  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    settings.thousandSeparator || ','
  );
  
  let formattedDecimal = decimalPart || '';
  
  // Hide trailing zeros if setting is enabled
  if (settings.hideTrailingZeros && formattedDecimal) {
    formattedDecimal = formattedDecimal.replace(/0+$/, '');
  }
  
  const formattedAmount = formattedDecimal && formattedDecimal.length > 0
    ? `${formattedInteger}${settings.decimalSeparator || '.'}${formattedDecimal}`
    : formattedInteger;
  
  const withSign = amount < 0 ? `-${formattedAmount}` : formattedAmount;
  
  return settings.currencyPosition === 'before'
    ? `${settings.currencySymbol}${withSign}`
    : `${withSign}${settings.currencySymbol}`;
};
*/