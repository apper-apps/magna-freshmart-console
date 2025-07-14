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

/**
 * Calculate profit margin percentage from cost and selling prices
 * @param {number} costPrice - The cost/purchase price
 * @param {number} sellingPrice - The selling price
 * @returns {number} Profit margin as percentage
 */
export const calculateMargin = (costPrice, sellingPrice) => {
  if (!costPrice || !sellingPrice || costPrice <= 0 || sellingPrice <= 0) {
    return 0;
  }
  
  const cost = typeof costPrice === 'string' ? parseCurrency(costPrice) : costPrice;
  const selling = typeof sellingPrice === 'string' ? parseCurrency(sellingPrice) : sellingPrice;
  
  if (cost <= 0) return 0;
  
  return ((selling - cost) / cost) * 100;
};

/**
 * Format margin percentage for display
 * @param {number} margin - Margin percentage
 * @param {object} options - Formatting options
 * @returns {string} Formatted margin string
 */
export const formatMargin = (margin, options = {}) => {
  const {
    decimals = 1,
    showSign = false,
    fallback = '0%'
  } = options;
  
  if (margin === null || margin === undefined || isNaN(margin)) {
    return fallback;
  }
  
  const numMargin = typeof margin === 'string' ? parseFloat(margin) : margin;
  
  if (isNaN(numMargin)) {
    return fallback;
  }
  
  const sign = showSign && numMargin > 0 ? '+' : '';
  return `${sign}${numMargin.toFixed(decimals)}%`;
};

/**
 * Calculate totals for cost prices, selling prices, and margins
 * @param {Array} items - Array of items with cost and selling prices
 * @param {object} options - Calculation options
 * @returns {object} Totals breakdown
 */
export const calculateTotals = (items, options = {}) => {
  const {
    costField = 'purchasePrice',
    sellingField = 'price',
    quantityField = 'stock'
  } = options;
  
  if (!Array.isArray(items) || items.length === 0) {
    return {
      totalCost: 0,
      totalSelling: 0,
      totalMargin: 0,
      averageMargin: 0,
      formattedTotalCost: formatCurrency(0),
      formattedTotalSelling: formatCurrency(0),
      formattedTotalMargin: formatCurrency(0),
      formattedAverageMargin: formatMargin(0)
    };
  }
  
  let totalCost = 0;
  let totalSelling = 0;
  let validItemsCount = 0;
  
  items.forEach(item => {
    if (!item) return;
    
    const costPrice = parseFloat(item[costField]) || 0;
    const sellingPrice = parseFloat(item[sellingField]) || 0;
    const quantity = parseFloat(item[quantityField]) || 1;
    
    if (costPrice > 0 && sellingPrice > 0) {
      totalCost += costPrice * quantity;
      totalSelling += sellingPrice * quantity;
      validItemsCount++;
    }
  });
  
  const totalMargin = totalSelling - totalCost;
  const averageMargin = totalCost > 0 ? (totalMargin / totalCost) * 100 : 0;
  
  return {
    totalCost,
    totalSelling,
    totalMargin,
    averageMargin,
    formattedTotalCost: formatCurrency(totalCost),
    formattedTotalSelling: formatCurrency(totalSelling),
    formattedTotalMargin: formatCurrency(totalMargin),
    formattedAverageMargin: formatMargin(averageMargin),
    validItemsCount
  };
};

export default formatCurrency;