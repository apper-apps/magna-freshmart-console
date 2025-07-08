import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage/session";
import cartReducer from "./cartSlice";
import notificationReducer from "./notificationSlice";
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
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          'notifications/fetchCounts/pending',
          'notifications/fetchCounts/fulfilled',
          'notifications/fetchCounts/rejected'
        ],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['cart.items.updatedAt', 'notifications.lastUpdated']
      },
      // Redux Thunk is included by default in RTK, but making it explicit
      thunk: {
        extraArgument: {
          // Add any extra arguments for thunks if needed
        }
}
    }),
  devTools: typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true
});

export const persistor = persistStore(store);