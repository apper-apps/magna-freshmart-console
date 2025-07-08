import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  counts: {
    payments: 0,
    orders: 0,
    products: 0,
    pos: 0,
    financial: 0,
    ai: 0,
    verification: 0,
    management: 0,
    delivery: 0,
    analytics: 0
  },
  loading: false,
  error: null,
  lastUpdated: null
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    updateCounts: (state, action) => {
      state.counts = { ...state.counts, ...action.payload };
      state.lastUpdated = new Date().toISOString();
      state.loading = false;
      state.error = null;
    },
    resetCount: (state, action) => {
      const { key } = action.payload;
      if (state.counts[key] !== undefined) {
        state.counts[key] = 0;
      }
    },
    resetAllCounts: (state) => {
      Object.keys(state.counts).forEach(key => {
        state.counts[key] = 0;
      });
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const {
  setLoading,
  updateCounts,
  resetCount,
  resetAllCounts,
  setError,
  clearError
} = notificationSlice.actions;

export default notificationSlice.reducer;