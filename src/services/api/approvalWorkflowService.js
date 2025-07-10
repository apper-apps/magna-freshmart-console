import React from "react";
import { approveRequest, rejectRequest, submitForApproval } from "@/store/approvalWorkflowSlice";
import Error from "@/components/ui/Error";
// Mock data for approval workflow
const mockApprovalRequests = [
  {
    Id: 1,
    type: 'price_change',
    title: 'Price Update - Organic Tomatoes',
    description: 'Increase price from Rs. 120 to Rs. 150 due to seasonal shortage',
    submittedBy: 'vendor_1',
    submittedAt: '2024-01-15T10:30:00Z',
    status: 'pending',
    priority: 'medium',
    affectedEntity: {
      entityType: 'product',
      entityId: 1,
      entityName: 'Organic Tomatoes',
      currentValues: { price: 120, stock: 50 },
      proposedValues: { price: 150, stock: 50 }
    },
    businessImpact: {
      revenueImpact: 1500,
      marginImpact: 15,
      customerImpact: 'medium'
    },
    approvalRequired: ['manager', 'admin'],
    comments: [],
    attachments: []
  },
  {
    Id: 2,
    type: 'bulk_discount',
    title: 'Category-wide Discount - Fruits',
    description: 'Apply 20% discount on all fruits for weekend sale',
    submittedBy: 'admin_1',
    submittedAt: '2024-01-15T14:15:00Z',
    status: 'pending',
    priority: 'high',
    affectedEntity: {
      entityType: 'category',
      entityId: 'fruits',
      entityName: 'Fresh Fruits',
      currentValues: { products: 25, avgPrice: 180 },
      proposedValues: { discountPercent: 20, validUntil: '2024-01-21' }
    },
    businessImpact: {
      revenueImpact: -8000,
      marginImpact: -12,
      customerImpact: 'high'
    },
    approvalRequired: ['senior_manager'],
    comments: [
      {
        Id: 1,
        commentBy: 'manager_1',
        commentAt: '2024-01-15T15:00:00Z',
        comment: 'Revenue impact seems high. Can we limit to specific products?'
      }
    ],
    attachments: []
  },
  {
    Id: 3,
    type: 'product_removal',
    title: 'Remove Product - Expired Dairy Items',
    description: 'Remove 3 dairy products approaching expiry date',
    submittedBy: 'store_manager',
    submittedAt: '2024-01-14T09:45:00Z',
    status: 'approved',
    priority: 'urgent',
    approvedBy: 'admin_1',
    approvedAt: '2024-01-14T10:00:00Z',
    approvalComments: 'Approved for food safety compliance',
    affectedEntity: {
      entityType: 'products',
      entityId: [15, 16, 17],
      entityName: 'Dairy Products (3 items)',
      currentValues: { totalValue: 2400, stock: 45 },
      proposedValues: { action: 'remove', reason: 'expiry' }
    },
    businessImpact: {
      revenueImpact: -2400,
      marginImpact: 0,
      customerImpact: 'low'
    }
  }
];

class ApprovalWorkflowService {
  constructor() {
    this.requests = [...mockApprovalRequests];
    this.nextId = 4;
    this.wsConnection = null;
    this.wsListeners = new Set();
    this.walletHolds = new Map(); // Track wallet holds by request ID
    this.walletAdjustments = []; // Track completed wallet adjustments
  }

  // WebSocket Connection Management
  initializeWebSocket() {
    try {
      // Simulate WebSocket connection for demo
      // In production, this would connect to your MongoDB change streams via WebSocket
      this.wsConnection = {
        connected: true,
        lastHeartbeat: new Date().toISOString()
      };
      
      // Simulate real-time updates
      this.startMockRealtimeUpdates();
      
      return {
        success: true,
        connectionId: `ws_${Date.now()}`,
        features: ['approval_updates', 'real_time_notifications']
      };
    } catch (error) {
      console.error('WebSocket initialization failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  startMockRealtimeUpdates() {
    // Simulate periodic updates for demo
    setInterval(() => {
      if (Math.random() > 0.8) {
        this.notifyListeners({
          type: 'approval_update',
          data: {
            requestId: Math.floor(Math.random() * 3) + 1,
            status: 'pending',
            timestamp: new Date().toISOString()
          }
        });
      }
    }, 30000); // Every 30 seconds
  }

  subscribeToUpdates(callback) {
    this.wsListeners.add(callback);
    return () => this.wsListeners.delete(callback);
  }

  notifyListeners(update) {
    this.wsListeners.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in WebSocket listener:', error);
      }
    });
  }

  // Core CRUD Operations
  async getPendingApprovals(filters = {}) {
    await this.delay(300);
    
    let filteredRequests = this.requests.filter(req => req.status === 'pending');
    
    // Apply filters
    if (filters.type && filters.type !== 'all') {
      filteredRequests = filteredRequests.filter(req => req.type === filters.type);
    }
    
    if (filters.priority && filters.priority !== 'all') {
      filteredRequests = filteredRequests.filter(req => req.priority === filters.priority);
    }
    
    // Sort by priority and date
    filteredRequests.sort((a, b) => {
      const priorityOrder = { urgent: 3, high: 2, medium: 1, low: 0 };
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });
    
    return {
      requests: filteredRequests,
      totalCount: filteredRequests.length,
      pendingCount: filteredRequests.length,
      urgentCount: filteredRequests.filter(req => req.priority === 'urgent').length
    };
  }

  async getMySubmissions(userId) {
    await this.delay(200);
    
    const myRequests = this.requests.filter(req => req.submittedBy === userId);
    return {
      requests: myRequests,
      totalCount: myRequests.length,
      pendingCount: myRequests.filter(req => req.status === 'pending').length
    };
  }

  async getApprovalHistory(filters = {}) {
    await this.delay(250);
    
    let historyRequests = this.requests.filter(req => 
      req.status === 'approved' || req.status === 'rejected'
    );
    
    // Apply date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      historyRequests = historyRequests.filter(req => 
        new Date(req.approvedAt || req.submittedAt) >= startDate
      );
    }
    
    return {
      requests: historyRequests,
      totalCount: historyRequests.length
    };
  }

async submitForApproval(approvalData) {
    await this.delay(400);
    
    // Validate required fields
    if (!approvalData.type || !approvalData.title || !approvalData.description) {
      throw new Error('Type, title, and description are required');
    }
    
    // Determine sensitivity and required approvals
    const sensitivity = this.determineSensitivity(approvalData);
    const requiredApprovals = this.getRequiredApprovals(approvalData, sensitivity);
    
    const newRequest = {
      Id: this.nextId++,
      ...approvalData,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      priority: sensitivity.priority,
      approvalRequired: requiredApprovals,
      businessImpact: this.calculateBusinessImpact(approvalData),
      comments: [],
      attachments: approvalData.attachments || []
    };
    
    // Calculate wallet impact for price changes
    if (approvalData.type === 'price_change') {
      const walletImpact = await this.calculateWalletImpact(approvalData);
      newRequest.walletImpact = walletImpact;
      
      // Create wallet hold if significant impact
      if (walletImpact.requiresHold) {
        await this.createWalletHold(newRequest.Id, walletImpact);
      }
    }
    
    this.requests.unshift(newRequest);
    
    // Notify WebSocket listeners
    this.notifyListeners({
      type: 'new_approval_request',
      data: newRequest
    });
    
    return newRequest;
  }

async approveRequest(requestId, comments = '') {
    await this.delay(300);
    
    const request = this.requests.find(req => req.Id === parseInt(requestId));
    if (!request) {
      throw new Error('Approval request not found');
    }
    
    if (request.status !== 'pending') {
      throw new Error('Request is not in pending status');
    }
    
    // Process wallet adjustment for approved price change
    let walletAdjustment = null;
    if (request.type === 'price_change' && request.walletImpact) {
      walletAdjustment = await this.processWalletApproval(parseInt(requestId), request.walletImpact);
    }
    
    // Update request status
    const updatedRequest = {
      ...request,
      status: 'approved',
      approvedBy: 'current_user', // In production, get from auth context
      approvedAt: new Date().toISOString(),
      approvalComments: comments,
      walletAdjustment
    };
    
    const index = this.requests.findIndex(req => req.Id === parseInt(requestId));
    this.requests[index] = updatedRequest;
    
    // Notify WebSocket listeners
    this.notifyListeners({
      type: 'approval_status_change',
      data: {
        requestId: parseInt(requestId),
        status: 'approved',
        approvedBy: 'current_user',
        comments,
        walletAdjustment
      }
    });
    
    // Execute the approved changes (in production, this would trigger actual changes)
    await this.executeApprovedChanges(updatedRequest);
return updatedRequest;
  }

  async rejectRequest(requestId, comments = '') {
    await this.delay(300);
    
    const request = this.requests.find(req => req.Id === parseInt(requestId));
    if (!request) {
      throw new Error('Approval request not found');
    }
    
    if (request.status !== 'pending') {
      throw new Error('Request is not in pending status');
    }
    
    if (!comments.trim()) {
      throw new Error('Rejection comments are required');
    }
    
    // Release wallet hold for rejected price change
    if (request.type === 'price_change' && request.walletImpact) {
      await this.processWalletRejection(parseInt(requestId), request.walletImpact);
    }
    
    // Update request status
    const updatedRequest = {
      ...request,
      status: 'rejected',
      rejectedBy: 'current_user', // In production, get from auth context
      rejectedAt: new Date().toISOString(),
      rejectionComments: comments
    };
    
    const index = this.requests.findIndex(req => req.Id === parseInt(requestId));
    this.requests[index] = updatedRequest;
    
    // Notify WebSocket listeners
    this.notifyListeners({
      type: 'approval_status_change',
      data: {
        requestId: parseInt(requestId),
        status: 'rejected',
        rejectedBy: 'current_user',
        comments
      }
    });
return updatedRequest;
  }

  async addComment(requestId, comment) {
    await this.delay(200);
    
    const request = this.requests.find(req => req.Id === parseInt(requestId));
    if (!request) {
      throw new Error('Approval request not found');
    }
    
    const newComment = {
      Id: Date.now(),
      commentBy: 'current_user',
      commentAt: new Date().toISOString(),
      comment: comment.trim()
    };
    
    request.comments.push(newComment);
    
    // Notify WebSocket listeners
    this.notifyListeners({
      type: 'approval_comment_added',
      data: {
        requestId: parseInt(requestId),
        comment: newComment
      }
    });
    
    return newComment;
  }

  // Business Logic Helpers
  determineSensitivity(approvalData) {
    const { type, affectedEntity } = approvalData;
    
    // Define sensitivity rules
    const sensitivityRules = {
      price_change: (entity) => {
        const priceChange = Math.abs(
          (entity.proposedValues.price - entity.currentValues.price) / entity.currentValues.price * 100
        );
        
        if (priceChange > 50) return { level: 'high', priority: 'urgent' };
        if (priceChange > 20) return { level: 'medium', priority: 'high' };
        return { level: 'low', priority: 'medium' };
      },
      
      bulk_discount: (entity) => {
        const discountPercent = entity.proposedValues.discountPercent || 0;
        
        if (discountPercent > 30) return { level: 'high', priority: 'urgent' };
        if (discountPercent > 15) return { level: 'medium', priority: 'high' };
        return { level: 'low', priority: 'medium' };
      },
      
      product_removal: () => ({ level: 'medium', priority: 'high' }),
      
      inventory_write_off: (entity) => {
        const value = entity.currentValues.totalValue || 0;
        
        if (value > 10000) return { level: 'high', priority: 'urgent' };
        if (value > 5000) return { level: 'medium', priority: 'high' };
        return { level: 'low', priority: 'medium' };
      }
    };
    
    const rule = sensitivityRules[type];
    return rule ? rule(affectedEntity) : { level: 'low', priority: 'medium' };
  }

  getRequiredApprovals(approvalData, sensitivity) {
    const approvalMatrix = {
      low: ['manager'],
      medium: ['manager', 'admin'],
      high: ['manager', 'admin', 'senior_manager']
    };
    
    return approvalMatrix[sensitivity.level] || ['manager'];
  }

  calculateBusinessImpact(approvalData) {
    const { type, affectedEntity } = approvalData;
    
    switch (type) {
      case 'price_change':
        const priceDiff = affectedEntity.proposedValues.price - affectedEntity.currentValues.price;
        const revenueImpact = priceDiff * (affectedEntity.currentValues.stock || 0);
        const marginImpact = (priceDiff / affectedEntity.currentValues.price) * 100;
        
        return {
          revenueImpact: Math.round(revenueImpact),
          marginImpact: Math.round(marginImpact * 100) / 100,
          customerImpact: Math.abs(marginImpact) > 20 ? 'high' : 'medium'
        };
        
      case 'bulk_discount':
        const discountPercent = affectedEntity.proposedValues.discountPercent || 0;
        const avgPrice = affectedEntity.currentValues.avgPrice || 0;
        const productCount = affectedEntity.currentValues.products || 0;
        const estimatedSales = productCount * 10; // Estimate 10 units per product
        
        return {
          revenueImpact: Math.round(-1 * avgPrice * estimatedSales * discountPercent / 100),
          marginImpact: -discountPercent,
          customerImpact: discountPercent > 20 ? 'high' : 'medium'
        };
        
      default:
        return {
          revenueImpact: 0,
          marginImpact: 0,
          customerImpact: 'low'
        };
    }
  }

async executeApprovedChanges(approvedRequest) {
    // In production, this would integrate with your product/inventory services
    // to actually apply the approved changes
    
    try {
      const { type, affectedEntity, walletAdjustment } = approvedRequest;
      
      switch (type) {
        case 'price_change':
          console.log(`Executing price change for product ${affectedEntity.entityId}`);
          // productService.update(affectedEntity.entityId, affectedEntity.proposedValues);
          
          // Process wallet adjustment if present
          if (walletAdjustment) {
            console.log(`Processing wallet adjustment: ${walletAdjustment.amount}`);
            // In production, integrate with paymentService
            // await paymentService.processApprovalAdjustment(walletAdjustment);
          }
          break;
          
        case 'bulk_discount':
          console.log(`Applying bulk discount to category ${affectedEntity.entityId}`);
          // categoryService.applyBulkDiscount(affectedEntity.entityId, affectedEntity.proposedValues);
          break;
          
        case 'product_removal':
          console.log(`Removing products: ${affectedEntity.entityId}`);
          // productService.bulkRemove(affectedEntity.entityId);
          break;
      }
      
      return { success: true, executedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Error executing approved changes:', error);
      throw new Error('Failed to execute approved changes: ' + error.message);
    }
  }

  // Utility methods
  async getApprovalStatistics() {
    await this.delay(200);
    
    const total = this.requests.length;
    const pending = this.requests.filter(req => req.status === 'pending').length;
    const approved = this.requests.filter(req => req.status === 'approved').length;
    const rejected = this.requests.filter(req => req.status === 'rejected').length;
    
    const avgApprovalTime = this.calculateAverageApprovalTime();
    
    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: total > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0,
      avgApprovalTimeHours: avgApprovalTime
    };
  }

  calculateAverageApprovalTime() {
    const completedRequests = this.requests.filter(req => 
      req.status === 'approved' || req.status === 'rejected'
    );
    
    if (completedRequests.length === 0) return 0;
    
    const totalHours = completedRequests.reduce((sum, req) => {
      const submitted = new Date(req.submittedAt);
      const completed = new Date(req.approvedAt || req.rejectedAt);
      const hours = (completed - submitted) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);
    
    return Math.round(totalHours / completedRequests.length * 10) / 10;
  }

  async validateSensitiveChanges(changeData) {
    await this.delay(100);
    
    const sensitivityThresholds = {
      priceChangePercent: 20,
      bulkDiscountPercent: 15,
      inventoryValueThreshold: 5000,
      customerImpactThreshold: 'medium'
    };
    
    // Check if changes require approval
    const requiresApproval = this.checkIfRequiresApproval(changeData, sensitivityThresholds);
    
    if (requiresApproval.required) {
      return {
        requiresApproval: true,
        reason: requiresApproval.reason,
        suggestedType: requiresApproval.type,
        estimatedImpact: this.calculateBusinessImpact(changeData)
      };
    }
    
    return {
      requiresApproval: false,
      canProceed: true
    };
  }

  checkIfRequiresApproval(changeData, thresholds) {
    // Implement sensitivity detection logic
    const { type, currentValues, proposedValues } = changeData;
    
    switch (type) {
      case 'price_change':
        const priceChangePercent = Math.abs(
          (proposedValues.price - currentValues.price) / currentValues.price * 100
        );
        
        if (priceChangePercent > thresholds.priceChangePercent) {
          return {
            required: true,
            reason: `Price change of ${priceChangePercent.toFixed(1)}% exceeds threshold of ${thresholds.priceChangePercent}%`,
            type: 'price_change'
          };
        }
        break;
        
      case 'bulk_action':
        if (proposedValues.discountPercent > thresholds.bulkDiscountPercent) {
          return {
            required: true,
            reason: `Bulk discount of ${proposedValues.discountPercent}% exceeds threshold of ${thresholds.bulkDiscountPercent}%`,
            type: 'bulk_discount'
          };
        }
        break;
    }
    
    return { required: false };
  }
}

  delay(ms = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));

  // Wallet Integration Methods
  async calculateWalletImpact(approvalData) {
    try {
      const { type, affectedEntity } = approvalData;
      
      if (type !== 'price_change') {
        return { requiresHold: false, holdAmount: 0, adjustmentType: 'none' };
      }
      
      const priceChange = affectedEntity.proposedValues.price - affectedEntity.currentValues.price;
      const stock = affectedEntity.currentValues.stock || 0;
      const totalImpact = Math.abs(priceChange * stock);
      
      // Determine if wallet hold is required (for changes > Rs. 1000)
      const requiresHold = totalImpact > 1000;
      
      return {
        requiresHold,
        holdAmount: requiresHold ? totalImpact * 0.1 : 0, // Hold 10% of impact
        adjustmentType: priceChange > 0 ? 'increase' : 'decrease',
        totalImpact,
        priceChange,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating wallet impact:', error);
      return { requiresHold: false, holdAmount: 0, adjustmentType: 'error' };
    }
  }

  async createWalletHold(requestId, walletImpact) {
    try {
      // Store wallet hold information
      this.walletHolds.set(requestId, {
        requestId,
        holdAmount: walletImpact.holdAmount,
        adjustmentType: walletImpact.adjustmentType,
        totalImpact: walletImpact.totalImpact,
        createdAt: new Date().toISOString(),
        status: 'holding'
      });
      
      // In production, integrate with payment service
      // await paymentService.holdWalletBalance(walletImpact.holdAmount, `Approval hold for request ${requestId}`);
      
      console.log(`Created wallet hold: Rs. ${walletImpact.holdAmount} for request ${requestId}`);
      return true;
    } catch (error) {
      console.error('Error creating wallet hold:', error);
      return false;
    }
  }

  async processWalletApproval(requestId, walletImpact) {
    try {
      const hold = this.walletHolds.get(requestId);
      if (!hold) {
        return null;
      }
      
      // Calculate final adjustment based on approval
      const finalAdjustment = walletImpact.adjustmentType === 'increase' 
        ? walletImpact.totalImpact 
        : -walletImpact.totalImpact;
      
      // Create wallet adjustment record
      const adjustment = {
        requestId,
        transactionId: `APP_${Date.now()}`,
        holdAmount: hold.holdAmount,
        adjustmentAmount: finalAdjustment,
        adjustmentType: walletImpact.adjustmentType,
        processedAt: new Date().toISOString(),
        status: 'completed'
      };
      
      // Store adjustment
      this.walletAdjustments.push(adjustment);
      
      // Remove hold
      this.walletHolds.delete(requestId);
      
      // In production, integrate with payment service
      // await paymentService.processApprovalAdjustment(adjustment);
      
      console.log(`Processed wallet approval adjustment: Rs. ${finalAdjustment} for request ${requestId}`);
      return {
        transactionId: adjustment.transactionId,
        amount: finalAdjustment,
        type: 'approval_adjustment'
      };
    } catch (error) {
      console.error('Error processing wallet approval:', error);
      return null;
    }
  }

  async processWalletRejection(requestId, walletImpact) {
    try {
      const hold = this.walletHolds.get(requestId);
      if (!hold) {
        return;
      }
      
      // Simply release the hold without adjustment
      this.walletHolds.delete(requestId);
      
      // In production, integrate with payment service
      // await paymentService.releaseWalletHold(hold.holdAmount, `Hold released for rejected request ${requestId}`);
      
      console.log(`Released wallet hold for rejected request ${requestId}`);
    } catch (error) {
      console.error('Error processing wallet rejection:', error);
    }
  }

  async getWalletHoldSummary() {
    try {
      const activeHolds = Array.from(this.walletHolds.values());
      const totalHolding = activeHolds.reduce((sum, hold) => sum + hold.holdAmount, 0);
      
      return {
        activeHolds: activeHolds.length,
        totalHolding,
        holds: activeHolds,
        adjustmentHistory: this.walletAdjustments.slice(-10) // Last 10 adjustments
      };
    } catch (error) {
      console.error('Error getting wallet hold summary:', error);
      return { activeHolds: 0, totalHolding: 0, holds: [], adjustmentHistory: [] };
    }
  }
}

export const approvalWorkflowService = new ApprovalWorkflowService();