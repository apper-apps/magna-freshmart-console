import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from '@/services/api/productService';
import { toast } from 'react-toastify';

const initialState = {
  items: [],
  total: 0,
  itemCount: 0,
  isLoading: false,
  error: null,
  priceValidationCache: {},
  lastValidated: null,
  dealsSummary: {
    totalSavings: 0,
    appliedDeals: []
  }
};

// Deal types enum
const DEAL_TYPES = {
  BOGO: 'BOGO',
  BUNDLE: 'Bundle'
};

// Async thunks for real-time validation
export const validateCartPrices = createAsyncThunk(
  'cart/validatePrices',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { cart } = getState();
      const validationResults = [];
      
      for (const item of cart.items) {
        try {
          const currentProduct = await productService.getById(item.id);
          const priceChanged = currentProduct.price !== item.price;
          const stockChanged = currentProduct.stock !== item.stock;
          
          validationResults.push({
            id: item.id,
            name: item.name,
            oldPrice: item.price,
            newPrice: currentProduct.price,
            oldStock: item.stock,
            newStock: currentProduct.stock,
            priceChanged,
            stockChanged,
            currentProduct
          });
        } catch (error) {
          // Product might be deleted or unavailable
          validationResults.push({
            id: item.id,
            name: item.name,
            error: 'Product no longer available',
            unavailable: true
          });
        }
      }
      
      return validationResults;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addToCartWithValidation = createAsyncThunk(
  'cart/addWithValidation',
  async (productId, { getState, rejectWithValue }) => {
    try {
      const product = await productService.getById(productId);
      
      if (!product.isActive) {
        throw new Error('Product is no longer available');
      }
      
      if (product.stock <= 0) {
        throw new Error('Product is out of stock');
      }
      
      const { cart } = getState();
      const existingItem = cart.items.find(item => item.id === productId);
      
      if (existingItem && existingItem.quantity >= product.stock) {
        throw new Error(`Only ${product.stock} ${product.unit || 'pieces'} available in stock`);
      }
      
      return product;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateQuantityWithValidation = createAsyncThunk(
  'cart/updateQuantityWithValidation',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const product = await productService.getById(productId);
      
      if (!product.isActive) {
        throw new Error('Product is no longer available');
      }
      
      if (quantity > product.stock) {
        throw new Error(`Only ${product.stock} ${product.unit || 'pieces'} available in stock`);
      }
      
      return { productId, quantity, currentProduct: product };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    addToCart: (state, action) => {
      const product = action.payload;
      const existingItem = state.items.find(item => item.id === product.id);
      
      if (existingItem) {
        // Respect stock limits
        const newQuantity = Math.min(existingItem.quantity + 1, product.stock);
        if (newQuantity > existingItem.quantity) {
          existingItem.quantity = newQuantity;
          existingItem.updatedAt = Date.now();
        }
      } else {
        // Add new item with proper field mapping
        const cartItem = {
          ...product,
          quantity: 1,
          addedAt: Date.now(),
          updatedAt: Date.now(),
          image: product.image || product.imageUrl || '/placeholder-image.jpg',
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          unit: product.unit || 'piece'
        };
        state.items.push(cartItem);
      }
      
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    removeFromCart: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter(item => item.id !== productId);
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    updateQuantity: (state, action) => {
const { productId, quantity } = action.payload;
      
      if (quantity <= 0) {
        state.items = state.items.filter(item => item.id !== productId);
      } else {
        const item = state.items.find(item => item.id === productId);
        if (item) {
          // Validate against stock
          const validQuantity = Math.min(quantity, item.stock);
          item.quantity = validQuantity;
          item.updatedAt = Date.now();
          // Note: isUpdating flag should be managed at component level
          // to avoid async operations in reducers
        }
      }
      
      cartSlice.caseReducers.calculateTotals(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.itemCount = 0;
    },
    
calculateTotals: (state) => {
      // First calculate deals and savings
      cartSlice.caseReducers.calculateDeals(state);
      
      // Calculate totals with deal adjustments
      const subtotal = state.items.reduce((total, item) => {
        const itemTotal = item.price * item.quantity;
        const itemDeals = state.dealsSummary.appliedDeals.filter(deal => deal.productId === item.id);
        const itemSavings = itemDeals.reduce((savings, deal) => savings + deal.savings, 0);
        return total + itemTotal - itemSavings;
      }, 0);
      
      state.total = subtotal;
      state.itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
    },
    
    calculateDeals: (state) => {
      const appliedDeals = [];
      let totalSavings = 0;
      
      state.items.forEach(item => {
        if (!item.dealType || !item.dealValue) return;
        
        let itemSavings = 0;
        
        if (item.dealType === DEAL_TYPES.BOGO && item.quantity >= 2) {
          // Buy One Get One - every 2nd item is free
          const freeItems = Math.floor(item.quantity / 2);
          itemSavings = freeItems * item.price;
          
          appliedDeals.push({
            id: `${item.id}-bogo`,
            productId: item.id,
            productName: item.name,
            type: DEAL_TYPES.BOGO,
            description: 'Buy 1 Get 1 Free',
            freeItems,
            savings: itemSavings,
            appliedQuantity: item.quantity
          });
        } else if (item.dealType === DEAL_TYPES.BUNDLE && item.dealValue && item.quantity >= 3) {
          // Bundle deals like "3 for 2"
          const [buyQty, payQty] = item.dealValue.split('for').map(x => parseInt(x.trim()));
          if (buyQty && payQty && item.quantity >= buyQty) {
            const bundleSets = Math.floor(item.quantity / buyQty);
            const freeItems = bundleSets * (buyQty - payQty);
            itemSavings = freeItems * item.price;
            
            appliedDeals.push({
              id: `${item.id}-bundle`,
              productId: item.id,
              productName: item.name,
              type: DEAL_TYPES.BUNDLE,
              description: `${item.dealValue} Deal`,
              freeItems,
              savings: itemSavings,
              appliedQuantity: item.quantity,
              bundleSets
            });
          }
        }
        
        totalSavings += itemSavings;
      });
      
      state.dealsSummary = {
        totalSavings,
        appliedDeals
      };
    },
    
    applyDeals: (state) => {
      cartSlice.caseReducers.calculateDeals(state);
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    updatePricesFromValidation: (state, action) => {
      const validationResults = action.payload;
      let hasChanges = false;
      
      validationResults.forEach(result => {
        if (result.unavailable) {
          // Remove unavailable products
          state.items = state.items.filter(item => item.id !== result.id);
          hasChanges = true;
          toast.error(`${result.name} is no longer available and was removed from cart`);
        } else if (result.priceChanged || result.stockChanged) {
          const item = state.items.find(item => item.id === result.id);
          if (item) {
            // Update price and stock information
            const oldPrice = item.price;
            item.price = result.newPrice;
            item.stock = result.newStock;
            
            // Adjust quantity if stock is insufficient
            if (item.quantity > result.newStock) {
              item.quantity = Math.max(1, result.newStock);
              toast.warning(`${result.name} quantity adjusted to ${item.quantity} due to stock availability`);
            }
            
            // Notify about price changes
            if (result.priceChanged) {
              const priceDirection = result.newPrice > oldPrice ? 'increased' : 'decreased';
              toast.info(`${result.name} price ${priceDirection} from Rs. ${oldPrice.toLocaleString()} to Rs. ${result.newPrice.toLocaleString()}`);
            }
            
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        cartSlice.caseReducers.calculateTotals(state);
        state.lastValidated = Date.now();
      }
    },
    
    setError: (state, action) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateCartPrices.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateCartPrices.fulfilled, (state, action) => {
        state.isLoading = false;
        cartSlice.caseReducers.updatePricesFromValidation(state, action);
      })
      .addCase(validateCartPrices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        toast.error('Failed to validate cart prices');
      })
      .addCase(addToCartWithValidation.fulfilled, (state, action) => {
        const product = action.payload;
        const existingItem = state.items.find(item => item.id === product.id);
        
        if (existingItem) {
          existingItem.quantity = Math.min(existingItem.quantity + 1, product.stock);
          existingItem.updatedAt = Date.now();
          // Update with current product data
          existingItem.price = product.price;
          existingItem.stock = product.stock;
        } else {
          const cartItem = {
            ...product,
            quantity: 1,
            addedAt: Date.now(),
            updatedAt: Date.now(),
            image: product.image || product.imageUrl || '/placeholder-image.jpg',
            unit: product.unit || 'piece'
          };
          state.items.push(cartItem);
        }
        
        cartSlice.caseReducers.calculateTotals(state);
        toast.success(`${product.name} added to cart`);
      })
      .addCase(addToCartWithValidation.rejected, (state, action) => {
        toast.error(action.payload);
      })
      .addCase(updateQuantityWithValidation.fulfilled, (state, action) => {
        const { productId, quantity, currentProduct } = action.payload;
        
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.id !== productId);
        } else {
          const item = state.items.find(item => item.id === productId);
          if (item) {
            item.quantity = quantity;
            item.updatedAt = Date.now();
            // Update with current product data
            item.price = currentProduct.price;
            item.stock = currentProduct.stock;
          }
        }
        
        cartSlice.caseReducers.calculateTotals(state);
      })
      .addCase(updateQuantityWithValidation.rejected, (state, action) => {
        toast.error(action.payload);
      });
  }
});

export const {
  setLoading,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  calculateTotals,
  setError,
  clearError,
  updatePricesFromValidation
} = cartSlice.actions;

// Export async thunks
// Selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartTotal = (state) => state.cart.total;
export const selectCartItemCount = (state) => state.cart.itemCount;
export const selectCartLoading = (state) => state.cart.isLoading;
export const selectCartError = (state) => state.cart.error;
export const selectCartDeals = (state) => state.cart.dealsSummary;
export const selectCartSavings = (state) => state.cart.dealsSummary.totalSavings;
export const selectIsProductInCart = (productId) => (state) => 
  state.cart.items.some(item => item.id === productId);
export const selectProductQuantityInCart = (productId) => (state) => {
  const item = state.cart.items.find(item => item.id === productId);
  return item ? item.quantity : 0;
};

export default cartSlice.reducer;