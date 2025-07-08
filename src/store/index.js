import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage/session';
import cartReducer from './cartSlice';
import notificationReducer from './notificationSlice';

const persistConfig = {
  key: 'freshmart_cart',
  storage,
  whitelist: ['items', 'total', 'itemCount'] // Only persist cart data
};

const persistedCartReducer = persistReducer(persistConfig, cartReducer);

export const store = configureStore({
  reducer: {
    cart: persistedCartReducer,
    notifications: notificationReducer
  },
middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['cart.items.updatedAt']
      }
    })
});

export const persistor = persistStore(store);