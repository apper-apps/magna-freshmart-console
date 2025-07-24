import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { notificationService } from "@/services/api/notificationService";

// Async thunk for fetching notification counts
export const fetchNotificationCounts = createAsyncThunk(
  'notifications/fetchCounts',
  async (_, { rejectWithValue }) => {
    try {
      const counts = await notificationService.getUnreadCounts();
      return counts;
    } catch (error) {
      console.error('Failed to fetch notification counts:', error);
      return rejectWithValue(error.message || 'Failed to fetch notification counts');
    }
  }
);

const initialState = {
  counts: {
    payments: 0,
    products: 0,
    pos: 0,
    financial: 0,
    ai: 0,
    verification: 0,
    management: 0,
    delivery: 0,
    analytics: 0,
    // Payment Flow Status Tracking
    paymentProcessed: 0,
    adminPaid: 0,
    paymentProofPending: 0,
    paymentVerification: 0,
    vendorPayments: 0,
    fulfillmentProgress: 0
  },
  // Real-time Payment Status Indicators
  paymentFlowStatus: {
    vendorProcessing: false,
    adminConfirmation: false,
    proofUploaded: false,
    amountMatched: false,
    vendorConfirmed: false
  },
  loading: false,
  error: null,
  lastUpdated: null
};
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    updateCounts: (state, action) => {
      state.counts = { ...state.counts, ...action.payload };
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    resetCount: (state, action) => {
      const { key } = action.payload;
      if (state.counts[key] !== undefined) {
        state.counts[key] = 0;
      }
    },
    resetAllCounts: (state) => {
      state.counts = {
        payments: 0,
        products: 0,
        pos: 0,
        financial: 0,
        ai: 0,
        verification: 0,
        management: 0,
        delivery: 0,
        analytics: 0,
        paymentProcessed: 0,
        adminPaid: 0,
        paymentProofPending: 0,
        paymentVerification: 0,
        vendorPayments: 0,
        fulfillmentProgress: 0
      };
      state.lastUpdated = new Date().toISOString();
    },
    // Payment Flow Status Management
    updatePaymentFlowStatus: (state, action) => {
      state.paymentFlowStatus = { ...state.paymentFlowStatus, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updatePaymentStage: (state, action) => {
      const { stage, status, metadata } = action.payload;
      if (state.paymentFlowStatus.hasOwnProperty(stage)) {
        state.paymentFlowStatus[stage] = status;
      }
      if (metadata) {
        state.paymentFlowStatus = { ...state.paymentFlowStatus, ...metadata };
      }
      state.lastUpdated = new Date().toISOString();
    },
    resetPaymentFlow: (state) => {
      state.paymentFlowStatus = {
        vendorProcessing: false,
        adminConfirmation: false,
        proofUploaded: false,
        amountMatched: false,
        vendorConfirmed: false
      };
      state.lastUpdated = new Date().toISOString();
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
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
      .addCase(fetchNotificationCounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationCounts.fulfilled, (state, action) => {
        state.loading = false;
        state.counts = { ...state.counts, ...action.payload };
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchNotificationCounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch notification counts';
      });
  }
});

export const {
  updateCounts,
  resetCount,
  resetAllCounts,
  updatePaymentFlowStatus,
  updatePaymentStage,
  resetPaymentFlow,
  setLoading,
  setError,
  clearError
} = notificationSlice.actions;

export default notificationSlice.reducer;