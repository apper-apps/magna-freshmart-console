/**
 * Currency formatting utility for Pakistani Rupees (Rs.) standardization
 * Ensures consistent "Rs. XX,XXX" display format across vendor dashboard and order management
 * Replaces all legacy ¥/₹ symbols with standardized "Rs." prefix
 */

/**
 * Format currency value to standardized "Rs. XX,XXX" format with comma separators
 * @param {number} value - The numeric value to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string in Pakistani Rupees
 */
export const formatCurrency = (value, options = {}) => {
  const {
    prefix = 'Rs. ',
    decimals = 0,
    fallback = 'Rs. 0'
  } = options;

  // Handle invalid or null values
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }

  // Convert to number if string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return fallback;
  }

  // Format with comma separators
  const formatted = numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return `${prefix}${formatted}`;
};

/**
 * Format currency for display in tables and lists
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted currency string
 */
export const formatCurrencyCompact = (value) => {
  if (value >= 1000000) {
    return formatCurrency(value / 1000000, { decimals: 1 }) + 'M';
  } else if (value >= 1000) {
    return formatCurrency(value / 1000, { decimals: 1 }) + 'K';
  }
  return formatCurrency(value);
};

/**
 * Parse currency string to numeric value
 * @param {string} currencyString - Currency string like "Rs. 1,234"
 * @returns {number} Numeric value
 */
export const parseCurrency = (currencyString) => {
  if (!currencyString || typeof currencyString !== 'string') {
    return 0;
  }

  // Remove prefix and commas, then parse
  const cleaned = currencyString.replace(/Rs\.\s?|,/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculate percentage change and format for display
 * @param {number} oldValue - Previous value
 * @param {number} newValue - Current value
 * @returns {object} Object with percentage, formatted string, and trend
 */
export const formatCurrencyChange = (oldValue, newValue) => {
  if (!oldValue || !newValue || oldValue === 0) {
    return {
      percentage: 0,
      formatted: '0%',
      trend: 'neutral',
      amount: formatCurrency(0)
    };
  }

  const change = newValue - oldValue;
  const percentage = (change / oldValue) * 100;
  const trend = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral';

  return {
    percentage,
    formatted: `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`,
    trend,
    amount: formatCurrency(Math.abs(change))
  };
};

export default formatCurrency;