import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks for approval workflow operations
export const fetchPendingApprovals = createAsyncThunk(
  'approvalWorkflow/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const { approvalWorkflowService } = await import('@/services/api/approvalWorkflowService');
      return await approvalWorkflowService.getPendingApprovals();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitForApproval = createAsyncThunk(
  'approvalWorkflow/submit',
  async (approvalData, { rejectWithValue }) => {
    try {
      const { approvalWorkflowService } = await import('@/services/api/approvalWorkflowService');
      return await approvalWorkflowService.submitForApproval(approvalData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const approveRequest = createAsyncThunk(
  'approvalWorkflow/approve',
  async ({ requestId, comments }, { rejectWithValue }) => {
    try {
      const { approvalWorkflowService } = await import('@/services/api/approvalWorkflowService');
      return await approvalWorkflowService.approveRequest(requestId, comments);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const rejectRequest = createAsyncThunk(
  'approvalWorkflow/reject',
  async ({ requestId, comments }, { rejectWithValue }) => {
    try {
      const { approvalWorkflowService } = await import('@/services/api/approvalWorkflowService');
      return await approvalWorkflowService.rejectRequest(requestId, comments);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  pendingApprovals: [],
  mySubmissions: [],
  approvalHistory: [],
  loading: false,
  error: null,
  selectedRequest: null,
  realTimeUpdates: {
    connected: false,
    lastUpdate: null,
    notifications: []
  },
  filters: {
    status: 'all',
    type: 'all',
    dateRange: 'all'
  },
  pagination: {
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  }
};

// Approval workflow slice
const approvalWorkflowSlice = createSlice({
  name: 'approvalWorkflow',
  initialState,
  reducers: {
    // Real-time WebSocket updates
    setConnectionStatus: (state, action) => {
      state.realTimeUpdates.connected = action.payload;
      state.realTimeUpdates.lastUpdate = new Date().toISOString();
    },
    
    addRealTimeNotification: (state, action) => {
      state.realTimeUpdates.notifications.unshift(action.payload);
      state.realTimeUpdates.lastUpdate = new Date().toISOString();
      
      // Keep only last 50 notifications
      if (state.realTimeUpdates.notifications.length > 50) {
        state.realTimeUpdates.notifications = state.realTimeUpdates.notifications.slice(0, 50);
      }
    },
    
    updateApprovalStatus: (state, action) => {
      const { requestId, status, approvedBy, comments } = action.payload;
      
      // Update in pending approvals
      const pendingIndex = state.pendingApprovals.findIndex(req => req.Id === requestId);
      if (pendingIndex !== -1) {
        state.pendingApprovals[pendingIndex] = {
          ...state.pendingApprovals[pendingIndex],
          status,
          approvedBy,
          approvalComments: comments,
          approvedAt: new Date().toISOString()
        };
        
        // Remove from pending if approved/rejected
        if (status !== 'pending') {
          state.pendingApprovals.splice(pendingIndex, 1);
        }
      }
      
      // Update in my submissions
      const submissionIndex = state.mySubmissions.findIndex(req => req.Id === requestId);
      if (submissionIndex !== -1) {
        state.mySubmissions[submissionIndex] = {
          ...state.mySubmissions[submissionIndex],
          status,
          approvedBy,
          approvalComments: comments,
          approvedAt: new Date().toISOString()
        };
      }
      
      state.realTimeUpdates.lastUpdate = new Date().toISOString();
    },
    
    addNewApprovalRequest: (state, action) => {
      state.pendingApprovals.unshift(action.payload);
      state.realTimeUpdates.lastUpdate = new Date().toISOString();
    },
    
    setSelectedRequest: (state, action) => {
      state.selectedRequest = action.payload;
    },
    
    clearSelectedRequest: (state) => {
      state.selectedRequest = null;
    },
    
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    updatePagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearNotifications: (state) => {
      state.realTimeUpdates.notifications = [];
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch pending approvals
      .addCase(fetchPendingApprovals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPendingApprovals.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingApprovals = action.payload.requests || [];
        state.pagination.totalItems = action.payload.totalCount || 0;
      })
      .addCase(fetchPendingApprovals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Submit for approval
      .addCase(submitForApproval.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitForApproval.fulfilled, (state, action) => {
        state.loading = false;
        state.mySubmissions.unshift(action.payload);
      })
      .addCase(submitForApproval.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Approve request
      .addCase(approveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveRequest.fulfilled, (state, action) => {
        state.loading = false;
        const requestId = action.payload.Id;
        
        // Remove from pending approvals
        state.pendingApprovals = state.pendingApprovals.filter(req => req.Id !== requestId);
        
        // Add to history
        state.approvalHistory.unshift(action.payload);
      })
      .addCase(approveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Reject request
      .addCase(rejectRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectRequest.fulfilled, (state, action) => {
        state.loading = false;
        const requestId = action.payload.Id;
        
        // Remove from pending approvals
        state.pendingApprovals = state.pendingApprovals.filter(req => req.Id !== requestId);
        
        // Add to history
        state.approvalHistory.unshift(action.payload);
      })
      .addCase(rejectRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const {
  setConnectionStatus,
  addRealTimeNotification,
  updateApprovalStatus,
  addNewApprovalRequest,
  setSelectedRequest,
  clearSelectedRequest,
  updateFilters,
  updatePagination,
  clearError,
  clearNotifications
} = approvalWorkflowSlice.actions;

// Selectors
export const selectPendingApprovals = (state) => state.approvalWorkflow.pendingApprovals;
export const selectMySubmissions = (state) => state.approvalWorkflow.mySubmissions;
export const selectApprovalHistory = (state) => state.approvalWorkflow.approvalHistory;
export const selectApprovalLoading = (state) => state.approvalWorkflow.loading;
export const selectApprovalError = (state) => state.approvalWorkflow.error;
export const selectSelectedRequest = (state) => state.approvalWorkflow.selectedRequest;
export const selectRealTimeUpdates = (state) => state.approvalWorkflow.realTimeUpdates;
export const selectApprovalFilters = (state) => state.approvalWorkflow.filters;
export const selectApprovalPagination = (state) => state.approvalWorkflow.pagination;

// Computed selectors
export const selectPendingApprovalCount = (state) => state.approvalWorkflow.pendingApprovals.length;
export const selectFilteredApprovals = (state) => {
  const { pendingApprovals, filters } = state.approvalWorkflow;
  
  return pendingApprovals.filter(request => {
    if (filters.status !== 'all' && request.status !== filters.status) return false;
    if (filters.type !== 'all' && request.type !== filters.type) return false;
    // Add date range filtering logic here if needed
    return true;
  });
};

export default approvalWorkflowSlice.reducer;