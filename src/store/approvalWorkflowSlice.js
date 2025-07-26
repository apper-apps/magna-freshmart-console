import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { approvalWorkflowService } from "@/services/api/approvalWorkflowService";
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
  },
walletIntegration: {
    holdingBalance: 0,
    pendingAdjustments: [],
    walletTransactions: [],
    autoAdjustEnabled: true,
    lastBalanceUpdate: null,
    // Enhanced payment approval integration
    paymentApprovalStatus: {},
    pendingPaymentApprovals: [],
    approvedPayments: [],
    rejectedPayments: []
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
      
      // Add wallet hold for price change requests
      if (action.payload.type === 'price_change' && action.payload.walletImpact) {
        state.walletIntegration.holdingBalance += action.payload.walletImpact.holdAmount || 0;
        state.walletIntegration.pendingAdjustments.push({
          requestId: action.payload.Id,
          holdAmount: action.payload.walletImpact.holdAmount,
          adjustmentType: action.payload.walletImpact.adjustmentType,
          createdAt: new Date().toISOString()
        });
      }
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
    },
    
    // Wallet integration reducers
    holdWalletBalance: (state, action) => {
      const { requestId, amount, reason } = action.payload;
      state.walletIntegration.holdingBalance += amount;
      state.walletIntegration.pendingAdjustments.push({
        requestId,
        holdAmount: amount,
        reason,
        createdAt: new Date().toISOString(),
        status: 'holding'
      });
      state.walletIntegration.lastBalanceUpdate = new Date().toISOString();
    },
    
    releaseWalletHold: (state, action) => {
      const { requestId } = action.payload;
      const adjustmentIndex = state.walletIntegration.pendingAdjustments.findIndex(
        adj => adj.requestId === requestId
      );
      
      if (adjustmentIndex !== -1) {
        const adjustment = state.walletIntegration.pendingAdjustments[adjustmentIndex];
        state.walletIntegration.holdingBalance -= adjustment.holdAmount;
        state.walletIntegration.pendingAdjustments.splice(adjustmentIndex, 1);
        state.walletIntegration.lastBalanceUpdate = new Date().toISOString();
      }
    },
    
adjustWalletBalance: (state, action) => {
      const { requestId, finalAdjustment, transactionId, paymentApprovalStatus } = action.payload;
      
      // Remove from pending adjustments
      const adjustmentIndex = state.walletIntegration.pendingAdjustments.findIndex(
        adj => adj.requestId === requestId
      );
      
      if (adjustmentIndex !== -1) {
        const adjustment = state.walletIntegration.pendingAdjustments[adjustmentIndex];
        state.walletIntegration.holdingBalance -= adjustment.holdAmount;
        state.walletIntegration.pendingAdjustments.splice(adjustmentIndex, 1);
}
      
      // Add transaction record with enhanced payment approval tracking
      state.walletIntegration.walletTransactions.unshift({
        requestId,
        transactionId,
        adjustmentAmount: finalAdjustment,
        processedAt: new Date().toISOString(),
        type: 'approval_adjustment',
        paymentApprovalStatus: paymentApprovalStatus || 'approved',
        approvedBy: 'admin',
        adminApproved: true
      });

      // Update payment approval status tracking
      if (paymentApprovalStatus === 'approved') {
        state.walletIntegration.approvedPayments.push({
          requestId,
          transactionId,
          approvedAt: new Date().toISOString(),
          amount: finalAdjustment
        });
      }
      
      state.walletIntegration.lastBalanceUpdate = new Date().toISOString();
    },
    
    recordWalletTransaction: (state, action) => {
      const { 
        type, 
        amount, 
        description, 
        reference, 
        requestId, 
        orderId, 
        transactionId, 
        status = 'completed',
        metadata = {} 
      } = action.payload;
      
      const transaction = {
        Id: state.walletIntegration.walletTransactions.length + 1,
        type, // 'approval_hold', 'price_adjustment', 'order_payment', 'deposit', 'withdraw', 'transfer', 'hold_release', 'rejection_release'
        amount,
        description,
        reference: reference || `TXN_${Date.now()}`,
        requestId: requestId || null,
        orderId: orderId || null,
        transactionId: transactionId || null,
        status,
        processedAt: new Date().toISOString(),
        metadata
      };
      
      state.walletIntegration.walletTransactions.unshift(transaction);
      state.walletIntegration.lastBalanceUpdate = new Date().toISOString();
    },
    
    updateWalletIntegrationSettings: (state, action) => {
      state.walletIntegration = { 
        ...state.walletIntegration, 
        ...action.payload,
        lastBalanceUpdate: new Date().toISOString()
      };
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
        
        // Process wallet adjustment for approved request with payment approval
        if (action.payload.walletAdjustment) {
          const adjustmentIndex = state.walletIntegration.pendingAdjustments.findIndex(
            adj => adj.requestId === requestId
          );
          
if (adjustmentIndex !== -1) {
            const adjustment = state.walletIntegration.pendingAdjustments[adjustmentIndex];
            state.walletIntegration.holdingBalance -= adjustment.holdAmount;
            state.walletIntegration.pendingAdjustments.splice(adjustmentIndex, 1);
            
            // Record wallet transaction with enhanced payment approval tracking
            const walletTransaction = {
              Id: state.walletIntegration.walletTransactions.length + 1,
              requestId,
              transactionId: action.payload.walletAdjustment.transactionId,
              amount: action.payload.walletAdjustment.amount,
              type: 'price_adjustment',
              description: `Price adjustment for approved request #${requestId}`,
              reference: action.payload.walletAdjustment.transactionId,
              orderId: null,
              processedAt: new Date().toISOString(),
              status: 'completed',
              // Enhanced payment approval fields
              paymentApprovalStatus: 'approved',
              adminApproved: true,
              approvedBy: 'admin',
              approvedAt: new Date().toISOString(),
              metadata: {
                approvalType: 'approved',
                adjustmentReason: 'price_change_approval',
                paymentVerified: true,
                vendorNotified: true
              }
            };

            state.walletIntegration.walletTransactions.unshift(walletTransaction);
            
            // Track approved payment
            state.walletIntegration.approvedPayments.push({
              requestId,
              transactionId: action.payload.walletAdjustment.transactionId,
              amount: action.payload.walletAdjustment.amount,
              approvedAt: new Date().toISOString(),
              type: 'approval_adjustment'
            });
            
            state.walletIntegration.lastBalanceUpdate = new Date().toISOString();
          }
        }
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
        
        // Release wallet hold for rejected request
        const adjustmentIndex = state.walletIntegration.pendingAdjustments.findIndex(
          adj => adj.requestId === requestId
        );
        
        if (adjustmentIndex !== -1) {
const adjustment = state.walletIntegration.pendingAdjustments[adjustmentIndex];
          state.walletIntegration.holdingBalance -= adjustment.holdAmount;
          state.walletIntegration.pendingAdjustments.splice(adjustmentIndex, 1);
          
          // Record wallet transaction for rejection
          state.walletIntegration.walletTransactions.unshift({
            Id: state.walletIntegration.walletTransactions.length + 1,
            requestId,
            transactionId: `REJ_${Date.now()}`,
            amount: 0,
            type: 'rejection_release',
            description: `Hold released for rejected request #${requestId}`,
            reference: `REJ_${Date.now()}`,
            orderId: null,
            processedAt: new Date().toISOString(),
            status: 'completed',
            metadata: {
              approvalType: 'rejected',
              originalHoldAmount: adjustment.holdAmount,
              releaseReason: 'approval_rejected'
            }
          });
          
          state.walletIntegration.lastBalanceUpdate = new Date().toISOString();
        }
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
  clearNotifications,
holdWalletBalance,
  releaseWalletHold,
  adjustWalletBalance,
  recordWalletTransaction,
  updateWalletIntegrationSettings
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

// Wallet integration selectors
export const selectWalletIntegration = (state) => state.approvalWorkflow.walletIntegration;
export const selectWalletHoldingBalance = (state) => state.approvalWorkflow.walletIntegration.holdingBalance;
export const selectPendingWalletAdjustments = (state) => state.approvalWorkflow.walletIntegration.pendingAdjustments;
export const selectWalletTransactionHistory = (state) => state.approvalWorkflow.walletIntegration.walletTransactions;

export default approvalWorkflowSlice.reducer;