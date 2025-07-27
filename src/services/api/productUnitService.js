// Product Unit Mapping Service
// Maps products to appropriate units and determines form field types

// Unit mapping based on product categories and specific items
const unitLabels = {
  // Fruits - mostly by weight
  banana: 'Dozen',
  mango: 'Piece',
  apple: 'Piece', 
  grape: 'Bunch',
  orange: 'Piece',
  watermelon: 'Piece',
  
  // Vegetables - mixed units
  carrot: 'kg',
  potato: 'kg',
  onion: 'kg',
  tomato: 'kg',
  spinach: 'Bundle',
  mint: 'Bundle',
  coriander: 'Bundle',
  cauliflower: 'Piece',
  cabbage: 'Piece',
  
  // Liquids/Dairy - by volume
  milk: 'Liter',
  yogurt: 'Container',
  juice: 'Liter',
  
  // Packaged/Processed - by pack
  rice: 'Pack',
  flour: 'Pack',
  sugar: 'Pack',
  salt: 'Pack',
  oil: 'Bottle',
  
  // Spices - by weight (small quantities)
  ginger: 'kg',
  garlic: 'kg',
  chilli: 'kg',
  turmeric: 'Pack'
};

// Category-based unit mappings
const categoryUnits = {
  'Vegetables': {
    'Root': 'kg',
    'Leafy': 'Bundle', 
    'Fresh': 'kg',
    'Spice': 'kg',
    'Citrus': 'kg'
  },
  'Fruits': {
    'Tropical': 'Piece',
    'Seasonal': 'Piece',
    'Dried': 'Pack',
    'Citrus': 'Piece'
  },
  'Dairy': {
    default: 'Liter'
  },
  'Grains': {
    default: 'Pack'
  },
  'Spices': {
    default: 'Pack'
  }
};
// Dynamic unit mapping for product-specific units
const unitMap = {
  // Fruits - various units
  bananas: 'dozen',
  banana: 'dozen',
  apple: 'piece',
  mango: 'piece',
  orange: 'piece',
  grape: 'bunch',
  watermelon: 'piece',
  
  // Dairy and liquids - volume based
  milk: 'liter',
  yogurt: 'liter',
  ghee: 'liter',
  oil: 'liter',
  juice: 'liter',
  water: 'liter',
  soda: 'liter',
  
  // Grains and packaged items
  rice: 'pack',
  wheat: 'pack',
  flour: 'pack',
  sugar: 'pack',
  salt: 'pack',
  
  // Proteins
  eggs: 'dozen',
  chicken: 'kg',
  beef: 'kg',
  mutton: 'kg',
  fish: 'kg',
  
  // Bakery items
  bread: 'piece',
  biscuits: 'pack',
  cookies: 'pack',
  cake: 'piece',
  
  // Snacks and processed
  chips: 'pack',
  nuts: 'pack',
  cheese: 'pack',
  butter: 'pack',
  
  // Beverages
  tea: 'pack',
  coffee: 'pack',
  
  // Vegetables - mostly weight based
  potato: 'kg',
  onion: 'kg',
  tomato: 'kg',
  carrot: 'kg',
  
  // Leafy vegetables
  spinach: 'bundle',
  mint: 'bundle',
  coriander: 'bundle',
  
  // Large vegetables
  cauliflower: 'piece',
  cabbage: 'piece',
  pumpkin: 'piece',
  
  // Default fallback
  default: 'kg'
};
// Determine field type based on product category
const getFieldType = (product) => {
  const category = product.category?.toLowerCase();
  const subcategory = product.subcategory?.toLowerCase();
  const name = product.name?.toLowerCase();
  // Liquid products
  if (name.includes('milk') || name.includes('juice') || name.includes('oil')) {
    return 'liquid';
  }
  
  // Packaged goods
  if (category === 'grains' || category === 'spices' || 
      name.includes('rice') || name.includes('flour') || 
      name.includes('sugar') || name.includes('salt')) {
    return 'packaged';
  }
  
  // Default to weighted items
  return 'weighted';
};

// Get appropriate unit label for product
const getUnitLabel = (product) => {
  if (!product) return 'kg';
  
  const name = product.name?.toLowerCase() || '';
  const category = product.category;
  const subcategory = product.subcategory;
  
  // First, check the unitMap for direct product name matches
  for (const [key, unit] of Object.entries(unitMap)) {
    if (key !== 'default' && name.includes(key)) {
      return unit;
    }
  }
  
  // Then check specific product mappings from unitLabels
  for (const [key, label] of Object.entries(unitLabels)) {
    if (name.includes(key)) {
      return label;
    }
  }
  
  // Check category-based mappings
  if (categoryUnits[category]) {
    if (categoryUnits[category][subcategory]) {
      return categoryUnits[category][subcategory];
    }
    if (categoryUnits[category].default) {
      return categoryUnits[category].default;
    }
  }
  
  // Use product's existing unit if available
  if (product.unit && product.unit !== 'pcs' && product.unit !== 'piece') {
    return product.unit;
  }
  
  // Final fallback to default from unitMap
  return unitMap.default;
};

// Get field configuration based on product type
const getFieldConfig = (product) => {
  const fieldType = getFieldType(product);
  const unitLabel = getUnitLabel(product);
  
  switch (fieldType) {
    case 'liquid':
      return {
        type: 'liquid',
        label: `Volume (${unitLabel.toLowerCase()})`,
        placeholder: 'Enter volume',
        unit: unitLabel,
        icon: 'Droplets',
        requiredForQuality: false // Volume less critical for quality
      };
      
    case 'packaged':
      return {
        type: 'packaged', 
        label: `Units (${unitLabel.toLowerCase()})`,
        placeholder: 'Number of units',
        unit: unitLabel,
        icon: 'Package',
        requiredForQuality: false // Count-based, weight less important
      };
      
    case 'weighted':
    default:
      return {
        type: 'weighted',
        label: `Weight (${unitLabel.toLowerCase()})`, 
        placeholder: 'Enter weight',
        unit: unitLabel,
        icon: 'Scale',
        requiredForQuality: true // Weight critical for fresh produce
      };
  }
};

// Validate measurement input based on product type
const validateMeasurement = (value, product, isSkipped = false) => {
  if (isSkipped) return { valid: true };
  
  const fieldConfig = getFieldConfig(product);
  const numValue = parseFloat(value);
  
  if (isNaN(numValue) || numValue <= 0) {
    return {
      valid: false,
      error: `Please enter a valid ${fieldConfig.label.toLowerCase()}`
    };
  }
  
  // Type-specific validations
  switch (fieldConfig.type) {
    case 'packaged':
      if (!Number.isInteger(numValue)) {
        return {
          valid: false,
          error: 'Units must be a whole number'
        };
      }
      break;
      
    case 'liquid':
      if (numValue > 100) { // Reasonable limit for retail
        return {
          valid: false,
          error: 'Volume seems too large, please verify'
        };
      }
      break;
      
    case 'weighted':
      if (numValue > 50) { // Reasonable weight limit
        return {
          valid: false,
          error: 'Weight seems too large, please verify'
        };
      }
      break;
  }
  
  return { valid: true };
};

// Check if measurement is required for quality verification
const isMeasurementRequired = (product) => {
  const fieldConfig = getFieldConfig(product);
  return fieldConfig.requiredForQuality;
};

// Export individual functions for direct import
export { getUnitLabel, getFieldConfig, getFieldType, validateMeasurement, isMeasurementRequired };

// Export service functions
export const productUnitService = {
  getUnitLabel,
  getFieldConfig,
  getFieldType,
  validateMeasurement,
  isMeasurementRequired,
  
  // Helper methods
  isLiquid: (product) => getFieldType(product) === 'liquid',
  isPackaged: (product) => getFieldType(product) === 'packaged', 
  isWeighted: (product) => getFieldType(product) === 'weighted'
};