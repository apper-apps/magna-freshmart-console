import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from '@/services/api/productService';
import { toast } from 'react-toastify';
import { NetworkMonitor } from '@/utils/errorHandling';

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
  },
  // Offline support fields
  isOffline: !navigator.onLine,
  syncQueue: [],
  lastSyncAttempt: null,
  pendingSyncCount: 0,
  syncInProgress: false,
  offlineChanges: false
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
          // Update pricing hierarchy data if changed
          existingItem.basePrice = product.basePrice || product.price;
          existingItem.variationPrice = product.variationPrice;
          existingItem.seasonalDiscount = product.seasonalDiscount;
          existingItem.seasonalDiscountType = product.seasonalDiscountType;
          existingItem.seasonalDiscountActive = product.seasonalDiscountActive;
        }
      } else {
        // Add new item with pricing hierarchy mapping
        const cartItem = {
          ...product,
          quantity: 1,
          addedAt: Date.now(),
          updatedAt: Date.now(),
          image: product.image || product.imageUrl || '/placeholder-image.jpg',
          id: product.id,
          name: product.name,
          price: product.price,
          basePrice: product.basePrice || product.price,
          variationPrice: product.variationPrice || null,
          seasonalDiscount: product.seasonalDiscount || 0,
          seasonalDiscountType: product.seasonalDiscountType || 'Fixed Amount',
          seasonalDiscountActive: product.seasonalDiscountActive || false,
          stock: product.stock,
          unit: product.unit || 'piece'
        };
        state.items.push(cartItem);
      }
      
      // Handle offline mode
      if (state.isOffline) {
        state.syncQueue.push({
          id: Date.now(),
          type: 'ADD_TO_CART',
          payload: product,
          timestamp: Date.now(),
          retryCount: 0
        });
        state.pendingSyncCount = state.syncQueue.length;
        state.offlineChanges = true;
        cartSlice.caseReducers.saveToLocalStorage(state);
      }
      
      cartSlice.caseReducers.calculateTotals(state);
    },
    
removeFromCart: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter(item => item.id !== productId);
      
      // Handle offline mode
      if (state.isOffline) {
        state.syncQueue.push({
          id: Date.now(),
          type: 'REMOVE_FROM_CART',
          payload: productId,
          timestamp: Date.now(),
          retryCount: 0
        });
        state.pendingSyncCount = state.syncQueue.length;
        state.offlineChanges = true;
        cartSlice.caseReducers.saveToLocalStorage(state);
      }
      
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
      
      // Handle offline mode
      if (state.isOffline) {
        state.syncQueue.push({
          id: Date.now(),
          type: 'UPDATE_QUANTITY',
          payload: { productId, quantity },
          timestamp: Date.now(),
          retryCount: 0
        });
        state.pendingSyncCount = state.syncQueue.length;
        state.offlineChanges = true;
        cartSlice.caseReducers.saveToLocalStorage(state);
      }
      
      cartSlice.caseReducers.calculateTotals(state);
    },
clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.itemCount = 0;
      
      // Handle offline mode
      if (state.isOffline) {
        state.syncQueue.push({
          id: Date.now(),
          type: 'CLEAR_CART',
          payload: null,
          timestamp: Date.now(),
          retryCount: 0
        });
        state.pendingSyncCount = state.syncQueue.length;
        state.offlineChanges = true;
        cartSlice.caseReducers.saveToLocalStorage(state);
      }
    },
    
    // Offline support reducers
    setOfflineStatus: (state, action) => {
      const wasOffline = state.isOffline;
      state.isOffline = action.payload;
      
      if (wasOffline && !action.payload && state.syncQueue.length > 0) {
        // Coming back online with pending changes
        state.syncInProgress = true;
      }
    },
    
    addToSyncQueue: (state, action) => {
      state.syncQueue.push({
        ...action.payload,
        id: Date.now(),
        timestamp: Date.now(),
        retryCount: 0
      });
      state.pendingSyncCount = state.syncQueue.length;
      state.offlineChanges = true;
      cartSlice.caseReducers.saveToLocalStorage(state);
    },
    
    removeSyncQueueItem: (state, action) => {
      const itemId = action.payload;
      state.syncQueue = state.syncQueue.filter(item => item.id !== itemId);
      state.pendingSyncCount = state.syncQueue.length;
      if (state.syncQueue.length === 0) {
        state.offlineChanges = false;
        state.syncInProgress = false;
      }
      cartSlice.caseReducers.saveToLocalStorage(state);
    },
    
    setSyncInProgress: (state, action) => {
      state.syncInProgress = action.payload;
      if (action.payload) {
        state.lastSyncAttempt = Date.now();
      }
    },
    
    incrementSyncRetry: (state, action) => {
      const itemId = action.payload;
      const item = state.syncQueue.find(item => item.id === itemId);
      if (item) {
        item.retryCount++;
      }
    },
    
    saveToLocalStorage: (state) => {
      try {
        const cartData = {
          items: state.items,
          total: state.total,
          itemCount: state.itemCount,
          syncQueue: state.syncQueue,
          offlineChanges: state.offlineChanges,
          lastSyncAttempt: state.lastSyncAttempt,
          pendingSyncCount: state.pendingSyncCount
        };
        localStorage.setItem('freshmart_cart', JSON.stringify(cartData));
        localStorage.setItem('freshmart_cart_timestamp', Date.now().toString());
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
      }
    },
    
    loadFromLocalStorage: (state) => {
      try {
        const savedCart = localStorage.getItem('freshmart_cart');
        const timestamp = localStorage.getItem('freshmart_cart_timestamp');
        
        if (savedCart && timestamp) {
          const cartData = JSON.parse(savedCart);
          const saveTime = parseInt(timestamp);
          const now = Date.now();
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (now - saveTime < maxAge) {
            state.items = cartData.items || [];
            state.total = cartData.total || 0;
            state.itemCount = cartData.itemCount || 0;
            state.syncQueue = cartData.syncQueue || [];
            state.offlineChanges = cartData.offlineChanges || false;
            state.lastSyncAttempt = cartData.lastSyncAttempt;
            state.pendingSyncCount = cartData.pendingSyncCount || 0;
          } else {
            // Clear expired cart
            localStorage.removeItem('freshmart_cart');
            localStorage.removeItem('freshmart_cart_timestamp');
          }
        }
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
        localStorage.removeItem('freshmart_cart');
        localStorage.removeItem('freshmart_cart_timestamp');
      }
    },
    
calculateTotals: (state) => {
      // First calculate deals and savings
      cartSlice.caseReducers.calculateDeals(state);
      
      // Calculate totals with pricing hierarchy: Base Price > Variation Override > Seasonal Discount
      const subtotal = state.items.reduce((total, item) => {
        // Step 1: Start with base price
        let effectivePrice = item.basePrice || item.price;
        
        // Step 2: Apply variation override if exists (higher precedence than base)
        if (item.variationPrice && item.variationPrice > 0) {
          effectivePrice = item.variationPrice;
        }
        
        // Step 3: Apply seasonal discount (highest precedence)
        if (item.seasonalDiscount && item.seasonalDiscountActive) {
          if (item.seasonalDiscountType === 'Percentage') {
            effectivePrice = effectivePrice * (1 - item.seasonalDiscount / 100);
          } else {
            effectivePrice = Math.max(0, effectivePrice - item.seasonalDiscount);
          }
        }
        
        const itemTotal = effectivePrice * item.quantity;
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
        if (!state.isOffline) {
          state.isLoading = true;
        }
      })
      .addCase(validateCartPrices.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!state.isOffline) {
          cartSlice.caseReducers.updatePricesFromValidation(state, action);
        }
      })
      .addCase(validateCartPrices.rejected, (state, action) => {
        state.isLoading = false;
        if (!state.isOffline) {
          state.error = action.payload;
          toast.error('Failed to validate cart prices');
        }
      })
.addCase(addToCartWithValidation.fulfilled, (state, action) => {
        const product = action.payload;
        const existingItem = state.items.find(item => item.id === product.id);
        
        if (existingItem) {
          existingItem.quantity = Math.min(existingItem.quantity + 1, product.stock);
          existingItem.updatedAt = Date.now();
          // Update with current product data including pricing hierarchy
          existingItem.price = product.price;
          existingItem.basePrice = product.basePrice || product.price;
          existingItem.variationPrice = product.variationPrice;
          existingItem.seasonalDiscount = product.seasonalDiscount;
          existingItem.seasonalDiscountType = product.seasonalDiscountType;
          existingItem.seasonalDiscountActive = product.seasonalDiscountActive;
          existingItem.stock = product.stock;
        } else {
          const cartItem = {
            ...product,
            quantity: 1,
            addedAt: Date.now(),
            updatedAt: Date.now(),
            image: product.image || product.imageUrl || '/placeholder-image.jpg',
            basePrice: product.basePrice || product.price,
            variationPrice: product.variationPrice || null,
            seasonalDiscount: product.seasonalDiscount || 0,
            seasonalDiscountType: product.seasonalDiscountType || 'Fixed Amount',
            seasonalDiscountActive: product.seasonalDiscountActive || false,
            unit: product.unit || 'piece'
          };
          state.items.push(cartItem);
        }
        
        cartSlice.caseReducers.calculateTotals(state);
        if (!state.isOffline) {
          toast.success(`${product.name} added to cart`);
        }
      })
      .addCase(addToCartWithValidation.rejected, (state, action) => {
        if (!state.isOffline) {
          toast.error(action.payload);
        }
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
            // Update with current product data including pricing hierarchy
            item.price = currentProduct.price;
            item.basePrice = currentProduct.basePrice || currentProduct.price;
            item.variationPrice = currentProduct.variationPrice;
            item.seasonalDiscount = currentProduct.seasonalDiscount;
            item.seasonalDiscountType = currentProduct.seasonalDiscountType;
            item.seasonalDiscountActive = currentProduct.seasonalDiscountActive;
            item.stock = currentProduct.stock;
          }
        }
        
        cartSlice.caseReducers.calculateTotals(state);
      })
      .addCase(updateQuantityWithValidation.rejected, (state, action) => {
        if (!state.isOffline) {
          toast.error(action.payload);
        }
      })
      .addCase(syncCartChanges.pending, (state) => {
        state.syncInProgress = true;
      })
      .addCase(syncCartChanges.fulfilled, (state, action) => {
        state.syncInProgress = false;
        const { syncedItems } = action.payload;
        
        // Remove synced items from queue
        syncedItems.forEach(itemId => {
          state.syncQueue = state.syncQueue.filter(item => item.id !== itemId);
        });
        
        state.pendingSyncCount = state.syncQueue.length;
        if (state.syncQueue.length === 0) {
          state.offlineChanges = false;
        }
        
        cartSlice.caseReducers.saveToLocalStorage(state);
        toast.success(`Synced ${syncedItems.length} cart changes`);
      })
      .addCase(syncCartChanges.rejected, (state, action) => {
        state.syncInProgress = false;
        state.error = action.payload;
        toast.error('Failed to sync cart changes');
      });
  }
});

// Async thunks for offline support
export const syncCartChanges = createAsyncThunk(
  'cart/syncChanges',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState().cart;
    
    if (!NetworkMonitor.isOnline() || state.syncQueue.length === 0) {
      return { syncedItems: [] };
    }
    
    const syncedItems = [];
    const failedItems = [];
    
    for (const queueItem of state.syncQueue) {
      try {
        switch (queueItem.type) {
          case 'ADD_TO_CART':
            await productService.getById(queueItem.payload.id);
            syncedItems.push(queueItem.id);
            break;
          case 'UPDATE_QUANTITY':
            await productService.getById(queueItem.payload.productId);
            syncedItems.push(queueItem.id);
            break;
          case 'REMOVE_FROM_CART':
            syncedItems.push(queueItem.id);
            break;
          case 'CLEAR_CART':
            syncedItems.push(queueItem.id);
            break;
          default:
            failedItems.push(queueItem.id);
        }
      } catch (error) {
        if (queueItem.retryCount < 3) {
          dispatch(incrementSyncRetry(queueItem.id));
        } else {
          failedItems.push(queueItem.id);
        }
      }
    }
    
    if (failedItems.length > 0) {
      console.warn(`Failed to sync ${failedItems.length} cart items`);
    }
    
    return { syncedItems };
  }
);

export const {
  setLoading,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  calculateTotals,
  setError,
  clearError,
  updatePricesFromValidation,
  setOfflineStatus,
  addToSyncQueue,
  removeSyncQueueItem,
  setSyncInProgress,
  incrementSyncRetry,
  saveToLocalStorage,
  loadFromLocalStorage
} = cartSlice.actions;

// Export async thunks
// Selectors
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

// Offline selectors
export const selectIsOffline = (state) => state.cart.isOffline;
export const selectSyncQueue = (state) => state.cart.syncQueue;
export const selectPendingSyncCount = (state) => state.cart.pendingSyncCount;
export const selectSyncInProgress = (state) => state.cart.syncInProgress;
export const selectOfflineChanges = (state) => state.cart.offlineChanges;
export const selectLastSyncAttempt = (state) => state.cart.lastSyncAttempt;

export default cartSlice.reducer;

export default cartSlice.reducer;