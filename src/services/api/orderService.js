import ordersData from "@/services/mockData/orders.json";
import { webSocketService } from "@/services/api/websocketService";
import { paymentService } from "@/services/api/paymentService";
import { productService } from "@/services/api/productService";
class OrderService {
  constructor() {
    this.orders = [...ordersData];
    
    // Performance optimization: Response caching
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes default TTL
    
    // Performance monitoring
    this.performanceMetrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorCount: 0
    };
    
    // Cleanup expired cache entries periodically
    setInterval(() => this.cleanupExpiredCache(), 60000); // Every minute
  }

// Enhanced getAll with caching
// Enhanced getAll with caching and auto-retry
  async getAll() {
    const cacheKey = 'all_orders';
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      this.performanceMetrics.cacheHits++;
      return cached;
    }
    
    const startTime = performance.now();
    let attemptCount = 0;
    const maxRetries = 3;
    
    while (attemptCount < maxRetries) {
      try {
        await this.delay();
        
        const result = [...this.orders];
        this.setCache(cacheKey, result, this.cacheTTL);
        
        this.updatePerformanceMetrics(startTime);
        this.performanceMetrics.cacheMisses++;
        
        return result;
      } catch (error) {
        attemptCount++;
        console.warn(`Orders getAll failed (attempt ${attemptCount}/${maxRetries}):`, error);
        
        if (attemptCount >= maxRetries) {
          this.performanceMetrics.errorCount++;
          throw new Error(`Failed to load orders after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff delay
        const retryDelay = Math.pow(2, attemptCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

// Enhanced paginated method with auto-retry for lazy loading
  async getAllPaginated(page = 1, limit = 10) {
    const cacheKey = `orders_page_${page}_limit_${limit}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      this.performanceMetrics.cacheHits++;
      return cached;
    }
    
    const startTime = performance.now();
    let attemptCount = 0;
    const maxRetries = 3;
    
    while (attemptCount < maxRetries) {
      try {
        await this.delay();
        
        const sortedOrders = [...this.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const orders = sortedOrders.slice(startIndex, endIndex);
        
        const result = {
          orders,
          page,
          limit,
          total: this.orders.length,
          hasMore: endIndex < this.orders.length,
          totalPages: Math.ceil(this.orders.length / limit)
        };
        
        // Cache paginated results with shorter TTL for real-time data
        this.setCache(cacheKey, result, this.cacheTTL / 2);
        
        this.updatePerformanceMetrics(startTime);
        this.performanceMetrics.cacheMisses++;
        
        return result;
      } catch (error) {
        attemptCount++;
        console.warn(`Orders getAllPaginated failed (attempt ${attemptCount}/${maxRetries}):`, error);
        
        if (attemptCount >= maxRetries) {
          this.performanceMetrics.errorCount++;
          throw new Error(`Failed to load paginated orders after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff delay
        const retryDelay = Math.pow(2, attemptCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

// Enhanced getById with caching and performance monitoring
  async getById(id) {
    const startTime = performance.now();
    
    try {
      const cacheKey = `order_${id}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        this.performanceMetrics.cacheHits++;
        return cached;
      }
      
      await this.delay();
      
      console.log('OrderService.getById: Called with ID:', id, 'Type:', typeof id);
      
      // Enhanced ID validation with comprehensive checks
      if (id === null || id === undefined) {
        const error = new Error('Order ID is required - cannot be null or undefined');
        console.error('OrderService.getById: Missing ID parameter');
        this.performanceMetrics.errorCount++;
        throw error;
      }
      
      // Ensure ID is an integer with detailed validation
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        const error = new Error(`Invalid order ID format - must be a positive integer. Received: "${id}" (${typeof id})`);
        console.error('OrderService.getById: Invalid ID format:', { id, numericId, type: typeof id });
        this.performanceMetrics.errorCount++;
        throw error;
      }
      
      console.log('OrderService.getById: Searching for order with numeric ID:', numericId);
      console.log('OrderService.getById: Available order IDs:', this.orders.map(o => o.id));
      
      const order = this.orders.find(o => o.id === numericId);
      if (!order) {
        const error = new Error(`Order with ID ${numericId} not found in database`);
        console.error('OrderService.getById: Order not found:', {
          searchId: numericId,
          availableIds: this.orders.map(o => o.id),
          totalOrders: this.orders.length
        });
        this.performanceMetrics.errorCount++;
        throw error;
      }
      
      console.log('OrderService.getById: Found order:', {
        id: order.id,
        hasItems: !!order.items,
        itemCount: order.items?.length || 0,
        status: order.status
      });
      
      // Comprehensive order data integrity validation before returning
      if (!order.items || !Array.isArray(order.items)) {
        console.warn(`OrderService.getById: Order ${numericId} has invalid items data, initializing empty array`);
        order.items = [];
      }
      
      // Validate essential order properties
      if (!Object.prototype.hasOwnProperty.call(order, 'status')) {
        console.warn(`OrderService.getById: Order ${numericId} missing status, setting default`);
        order.status = 'pending';
      }
      
      if (!Object.prototype.hasOwnProperty.call(order, 'total') || order.total <= 0) {
        console.warn(`OrderService.getById: Order ${numericId} has invalid total, calculating from items`);
        order.total = order.items.reduce((sum, item) => 
          sum + ((item.price || 0) * (item.quantity || 0)), 0) + (order.deliveryCharge || 0);
      }
      
      // Ensure critical timestamps exist
      if (!order.createdAt) {
        console.warn(`OrderService.getById: Order ${numericId} missing createdAt, using current time`);
        order.createdAt = new Date().toISOString();
      }
      
      console.log('OrderService.getById: Returning validated order data for ID:', numericId);
      
      const result = { ...order };
      
      // Cache the validated order with appropriate TTL
      this.setCache(cacheKey, result, this.cacheTTL);
      this.updatePerformanceMetrics(startTime);
      this.performanceMetrics.cacheMisses++;
      
      return result;
      
    } catch (error) {
      this.updatePerformanceMetrics(startTime);
      console.error('OrderService.getById: Comprehensive error handling:', error);
      
      // Classify error type for better handling
      if (error.message.includes('not found')) {
        throw new Error(`Order #${id} not found. It may have been deleted or the ID is incorrect.`);
      } else if (error.message.includes('Invalid') || error.message.includes('required')) {
        throw error; // Re-throw validation errors as-is
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error('Network error occurred while fetching order. Please check your connection and try again.');
      } else {
        throw new Error('Unable to fetch order details. Please try again later.');
      }
    }
  }

// Enhanced create with caching invalidation and performance tracking
// Enhanced create with caching invalidation and performance tracking
  async create(orderData) {
    const startTime = performance.now();
    
    try {
      await this.delay();
      
      // Enhanced payment data validation
      if (orderData.paymentMethod && orderData.paymentMethod !== 'cash') {
        if (!orderData.paymentResult && orderData.paymentMethod !== 'wallet') {
          const error = new Error('Payment result is required for non-cash payments');
          error.code = 'PAYMENT_RESULT_MISSING';
          this.performanceMetrics.errorCount++;
          throw error;
        }
        
        // Validate payment result structure for digital wallets
        if (['jazzcash', 'easypaisa'].includes(orderData.paymentMethod) && orderData.paymentResult) {
          if (!orderData.paymentResult.transactionId) {
            const error = new Error('Transaction ID is missing from payment result');
            error.code = 'TRANSACTION_ID_MISSING';
            this.performanceMetrics.errorCount++;
            throw error;
          }
        }
      }

      // Initialize vendor availability tracking
const vendorAvailability = orderData.vendor_availability || {};
      
      const newOrder = {
        id: this.getNextId(),
        ...orderData,
        // Preserve user-provided transaction ID over payment result transaction ID
        transactionId: orderData.transactionId || orderData.paymentResult?.transactionId || null,
        paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'cash' ? 'pending' : 'completed'),
        // Ensure both total and totalAmount fields are set for compatibility
        total: orderData.total || orderData.totalAmount || 0,
        totalAmount: orderData.totalAmount || orderData.total || 0,
        // Enhanced approval workflow integration
        approvalStatus: orderData.approvalStatus || 'pending',
        approvalRequestId: orderData.approvalRequestId || null,
        priceApprovalRequired: orderData.priceApprovalRequired || false,
        // Enhanced payment verification tracking with new status system
        verificationStatus: orderData.verificationStatus || null,
        paymentVerificationRequired: orderData.paymentProof ? true : false,
        adminPaymentApproval: orderData.adminPaymentApproval || 'pending',
        // Backend schema alignment - payment_verified boolean field for Phase 1
        payment_verified: orderData.payment_verified || false,
        // Enhanced payment approval tracking for vendor portal workflow
        paymentApprovalStatus: orderData.paymentApprovalStatus || 'pending_approval',
        adminApprovalTimestamp: null,
        vendorNotified: false,
        // Vendor availability tracking (JSONB structure)
        vendor_availability: vendorAvailability,
        // Real-time vendor visibility for Phase 1 implementation
        vendor_visibility: orderData.vendor_visibility || 'immediate',
        // Initial status for vendor portal display
        status: orderData.status || 'awaiting_payment_verification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        // Performance tracking metadata
        processingTime: 0 // Will be updated at the end
      };
// Handle wallet payments
if (orderData.paymentMethod === 'wallet') {
        try {
          const walletTransaction = await paymentService.processWalletPayment(orderData.total, newOrder.id);
          newOrder.paymentResult = walletTransaction;
          newOrder.paymentStatus = 'completed';
          newOrder.adminPaymentApproval = 'approved';
          newOrder.payment_verified = true;
          // Enhanced payment approval for wallet payments - instant approval
          newOrder.paymentApprovalStatus = 'approved';
          newOrder.adminApprovalTimestamp = new Date().toISOString();
          newOrder.vendorNotified = true;
        } catch (walletError) {
          // Enhanced wallet error handling
          const error = new Error('Wallet payment failed: ' + walletError.message);
          error.code = walletError.code || 'WALLET_PAYMENT_FAILED';
          error.originalError = walletError;
          throw error;
        }
      }
      
      // Handle bank transfer verification
      if (orderData.paymentMethod === 'bank' && orderData.paymentResult?.requiresVerification) {
        newOrder.paymentStatus = 'pending_verification';
        newOrder.status = 'payment_pending';
        newOrder.adminPaymentApproval = 'pending';
      }
      
      // Handle payment proof submissions with enhanced validation
      if (orderData.paymentProof && (orderData.paymentMethod === 'bank' || orderData.paymentMethod === 'jazzcash' || orderData.paymentMethod === 'easypaisa')) {
        newOrder.verificationStatus = 'pending';
        newOrder.paymentProofSubmittedAt = new Date().toISOString();
        newOrder.adminPaymentApproval = 'pending';
        
        // Enhanced payment proof data validation and storage
        const proofData = orderData.paymentProof;
        
        // Validate base64 data URL format
        if (proofData.dataUrl && typeof proofData.dataUrl === 'string') {
          if (!proofData.dataUrl.startsWith('data:image/') || !proofData.dataUrl.includes('base64,')) {
            console.warn('Invalid payment proof data URL format, storing as-is');
          }
        }
        
        // Store the complete payment proof data with validation
        newOrder.paymentProof = {
          fileName: proofData.fileName || 'payment_proof.jpg',
          fileSize: proofData.fileSize || 0,
          uploadedAt: proofData.uploadedAt || new Date().toISOString(),
          dataUrl: proofData.dataUrl || null,
          storedAt: new Date().toISOString()
        };
        
        // Validate proof data before adding backup reference
        if (proofData && Object.prototype.hasOwnProperty.call(proofData, 'fileName')) {
          newOrder.paymentProof.backupRef = `/uploads/${proofData.fileName}`;
        } else {
          newOrder.paymentProof.backupRef = null;
        }
      }
      
      this.orders.push(newOrder);
      
      // Real-time order sync - broadcast to vendors immediately
if (typeof window !== 'undefined' && window.webSocketService) {
        try {
          window.webSocketService.send({
            type: 'order_created_immediate',
            data: {
              orderId: newOrder.id,
              status: newOrder.status,
              vendor_visibility: newOrder.vendor_visibility,
              paymentStatus: newOrder.paymentStatus,
              adminPaymentApproval: newOrder.adminPaymentApproval,
              payment_verified: newOrder.payment_verified,
              paymentApprovalStatus: newOrder.paymentApprovalStatus,
              vendorNotified: newOrder.vendorNotified,
              timestamp: newOrder.createdAt,
              items: newOrder.items,
              totalAmount: newOrder.totalAmount,
              customerInfo: {
                name: newOrder.deliveryAddress?.name,
                phone: newOrder.deliveryAddress?.phone
              },
              // Enhanced payment status indicators for vendor portal
              statusSymbol: this.getPaymentStatusSymbol(newOrder),
              statusVariant: this.getPaymentStatusVariant(newOrder),
              canProcessPayment: this.canProcessPayment(newOrder)
            },
            timestamp: new Date().toISOString()
          });
        } catch (wsError) {
          console.warn('WebSocket order broadcast failed:', wsError);
        }
      }
      
      this.updatePerformanceMetrics(startTime);
      
      return { ...newOrder };
      
    } catch (error) {
      this.updatePerformanceMetrics(startTime);
      this.performanceMetrics.errorCount++;
      console.error('OrderService.create: Error creating order:', error);
throw error;
    }
  }

  // Enhanced update with cache invalidation
  async update(id, orderData) {
    const startTime = performance.now();
    
    try {
      await this.delay();
      
      const orderIndex = this.orders.findIndex(o => o.id === parseInt(id));
      if (orderIndex === -1) {
        this.performanceMetrics.errorCount++;
        throw new Error('Order not found');
      }
      
      this.orders[orderIndex] = {
        ...this.orders[orderIndex],
        ...orderData,
        updatedAt: new Date().toISOString()
      };
      
      // Invalidate related cache entries
      this.invalidateOrderCache(parseInt(id));
      
      this.updatePerformanceMetrics(startTime);
      return { ...this.orders[orderIndex] };
      
    } catch (error) {
      this.updatePerformanceMetrics(startTime);
      throw error;
    }
  }

  // Update order status - CRITICAL METHOD IMPLEMENTATION
  async updateOrderStatus(orderId, newStatus, additionalData = {}) {
    try {
      const orderIndex = ordersData.findIndex(order => order.id === orderId);
      
      if (orderIndex === -1) {
        return { 
          success: false, 
          error: 'Order not found',
          message: `Order with ID ${orderId} does not exist`
        };
      }

      const validStatuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(newStatus)) {
        return { 
          success: false, 
          error: 'Invalid status',
          message: `Status '${newStatus}' is not valid. Valid statuses: ${validStatuses.join(', ')}`
        };
      }

      const order = ordersData[orderIndex];
      const previousStatus = order.status;

      // Update the order status
      ordersData[orderIndex] = {
        ...order,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            previousStatus,
            ...additionalData
          }
        ]
      };

      // Handle status-specific logic
      if (newStatus === 'confirmed') {
        // Auto-assign delivery personnel if not already assigned
        if (!order.deliveryPersonnelId) {
          try {
            const assignmentResult = await this.autoAssignDeliveryPersonnel(ordersData[orderIndex]);
            if (assignmentResult.success) {
              ordersData[orderIndex].deliveryPersonnelId = assignmentResult.deliveryPersonnelId;
            }
          } catch (assignError) {
            console.warn('Could not auto-assign delivery personnel:', assignError);
          }
        }
      }

      return { 
        success: true, 
        data: ordersData[orderIndex],
        message: `Order status updated from '${previousStatus}' to '${newStatus}' successfully`
      };

    } catch (error) {
      console.error('Error updating order status:', error);
      return { 
        success: false, 
        error: 'Update failed',
        message: `Failed to update order status: ${error.message}`
      };
    }
  }

  // Get vendor orders
async getVendorOrdersBasic(vendorId) {
    try {
      const orders = ordersData.filter(order => 
        order.items.some(item => item.vendorId === vendorId)
      );
      return { success: true, data: orders };
    } catch (error) {
console.error('Error fetching vendor orders:', error);
      return { success: false, error: error.message };
    }
  }

  async delete(id) {
    await this.delay();
    const index = this.orders.findIndex(o => o.id === parseInt(id));
    if (index === -1) {
      throw new Error('Order not found');
    }
    this.orders.splice(index, 1);
    return true;
  }

  getNextId() {
    const maxId = this.orders.reduce((max, order) => 
      order.id > max ? order.id : max, 0);
    return maxId + 1;
  }
  async assignDeliveryPersonnel(orderId, deliveryPersonId) {
    await this.delay();
    const order = await this.getById(orderId);
    const updatedOrder = {
      ...order,
      deliveryPersonId: deliveryPersonId,
      deliveryStatus: 'assigned'
    };
    return await this.update(orderId, updatedOrder);
  }
async updateDeliveryStatus(orderId, deliveryStatus, actualDelivery = null) {
    await this.delay();
    const order = await this.getById(orderId);
    
    // Map delivery status to order status for user-facing display synchronization
    const deliveryToOrderStatusMap = {
      'pending': 'pending',
      'assigned': 'confirmed', 
      'picked_up': 'packed',        // Critical mapping: picked_up -> packed
      'in_transit': 'shipped',
      'delivered': 'delivered',
      'failed': 'cancelled'
    };
    
    // Get corresponding order status for the delivery status
    const correspondingOrderStatus = deliveryToOrderStatusMap[deliveryStatus];
    
    const updatedOrder = {
      ...order,
      deliveryStatus: deliveryStatus,
      status: correspondingOrderStatus || order.status,
      updatedAt: new Date().toISOString()
    };
    
    if (actualDelivery) {
      updatedOrder.actualDelivery = actualDelivery;
    }
    
    return await this.update(orderId, updatedOrder);
  }

  async verifyOrderPayment(orderId, verificationData) {
    try {
      await this.delay();
      const order = await this.getById(orderId);
      
      if (order.paymentStatus !== 'pending_verification') {
        throw new Error('Order payment does not require verification');
      }
      
      if (!order.paymentResult || !order.paymentResult.transactionId) {
        throw new Error('Order missing payment transaction information');
      }
      
      try {
        const verificationResult = await paymentService.verifyPayment(
          order.paymentResult.transactionId, 
          verificationData
        );
        
        if (verificationResult.verified) {
          const updatedOrder = await this.updatePaymentStatus(orderId, 'completed', verificationResult.transaction);
          return updatedOrder;
        } else {
          throw new Error('Payment verification failed: ' + (verificationResult.reason || 'Unknown verification error'));
        }
      } catch (verificationError) {
        console.error('Payment verification error:', verificationError);
        
        if (verificationError.message.includes('network') || verificationError.message.includes('timeout')) {
          throw new Error('Network error during payment verification. Please try again.');
        } else if (verificationError.message.includes('invalid') || verificationError.message.includes('not found')) {
          throw new Error('Payment transaction could not be verified. Please contact support.');
        } else {
          throw new Error('Payment verification error: ' + verificationError.message);
        }
      }
    } catch (error) {
      console.error('Order payment verification failed:', error);
      
      if (error.message.includes('require verification') || error.message.includes('missing payment')) {
        throw error;
      }
      
      throw new Error('Unable to verify payment. Please try again or contact support.');
}
  }

  async getMonthlyRevenue() {
    await this.delay();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyOrders = this.orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    return monthlyOrders.reduce((sum, order) => sum + (order?.total || order?.totalAmount || 0), 0);
  }
  async getRevenueByPaymentMethod() {
    await this.delay();
    const revenueByMethod = {};
    
this.orders.forEach(order => {
      const method = order?.paymentMethod || 'unknown';
      revenueByMethod[method] = (revenueByMethod[method] || 0) + (order?.total || order?.totalAmount || 0);
    });
    
    return revenueByMethod;
  }
// Enhanced Payment Verification Methods with New Status System
async getPendingVerifications() {
  await this.delay();
  return this.orders
    .filter(order => {
      // Include orders with payment proof requiring verification
      const hasPaymentProof = order.paymentProof && (order.paymentProof.fileName || order.paymentProofFileName);
      const isPendingVerification = order.verificationStatus === 'pending' || 
                                  (!order.verificationStatus && hasPaymentProof &&
                                   (order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa' || order.paymentMethod === 'bank'));
      return hasPaymentProof && isPendingVerification;
    })
    .map(order => ({
      Id: order?.id,
      orderId: order?.id,
      transactionId: order?.transactionId || `TXN${order?.id}${Date.now().toString().slice(-4)}`,
      customerName: order?.deliveryAddress?.name || 'Unknown',
      amount: order?.total || order?.totalAmount || 0,
      paymentMethod: order?.paymentMethod || 'unknown',
      paymentProof: order?.paymentProof?.dataUrl || `/api/uploads/${order?.paymentProof?.fileName || order?.paymentProofFileName || 'default.jpg'}`,
      paymentProofFileName: order?.paymentProof?.fileName || order?.paymentProofFileName || 'unknown',
      submittedAt: order?.paymentProof?.uploadedAt || order?.paymentProofSubmittedAt || order?.createdAt,
      verificationStatus: order?.verificationStatus || 'pending',
      // Enhanced Payment Status System with New Four-State Approval
      adminPaymentApproval: order?.adminPaymentApproval || 'pending',
      payment_verified: order?.payment_verified || false,
      paymentStatusSymbol: this.getPaymentStatusSymbol(order),
      statusVariant: this.getPaymentStatusVariant(order),
      canProcessPayment: this.canProcessPayment(order),
      // New payment approval status tracking for vendor workflow
      paymentApprovalStatus: order?.paymentApprovalStatus || 'pending_approval',
      adminApprovalTimestamp: order?.adminApprovalTimestamp || null,
      vendorNotified: order?.vendorNotified || false,
      // Enhanced Payment Flow Status Tracking
      flowStage: order?.paymentFlowStage || 'pending_approval',
      vendorProcessed: order?.vendorProcessed || false,
      adminConfirmed: order?.adminConfirmed || false,
      proofStatus: order?.proofStatus || 'pending',
      amountMatched: order?.amountMatched || false,
      vendorConfirmed: order?.vendorConfirmed || false,
      timestamp: order?.paymentTimestamp || order?.createdAt,
      // Enhanced approval workflow fields
      approvalStatus: order?.approvalStatus || 'pending',
      approvalRequestId: order?.approvalRequestId || null,
      priceApprovalRequired: order?.priceApprovalRequired || false
    }));
  }

// Helper methods for payment status system
getPaymentStatusSymbol(order) {
  if (order.payment_verified || order.adminPaymentApproval === 'approved') {
    return '✅';
  }
  if (order.adminPaymentApproval === 'rejected') {
    return '❌';
  }
  if (order.paymentProof && order.adminPaymentApproval === 'pending') {
    return '⚠️';
  }
  return '◻️';
}

getPaymentStatusVariant(order) {
  if (order.payment_verified || order.adminPaymentApproval === 'approved') {
    return 'success';
  }
  if (order.adminPaymentApproval === 'rejected') {
    return 'danger';
  }
  if (order.paymentProof && order.adminPaymentApproval === 'pending') {
    return 'warning';
  }
  return 'info';
}

canProcessPayment(order) {
  return order.payment_verified || order.adminPaymentApproval === 'approved';
}

async updateVerificationStatus(orderId, status, notes = '') {
  await this.delay();
  const orderIndex = this.orders.findIndex(o => o.id === parseInt(orderId));
  
  if (orderIndex === -1) {
    throw new Error('Order not found');
  }

  const order = this.orders[orderIndex];
  
  if (order.verificationStatus && order.verificationStatus !== 'pending') {
    throw new Error('Order verification is not pending');
  }

  const updatedOrder = {
    ...order,
    verificationStatus: status,
    verificationNotes: notes,
    verifiedAt: new Date().toISOString(),
    verifiedBy: 'admin',
    paymentStatus: status === 'verified' ? 'completed' : 'verification_failed',
    // Enhanced admin payment approval tracking with new four-state system
    adminPaymentApproval: status === 'verified' ? 'approved' : 'rejected',
    // Backend schema alignment - payment_verified boolean for Phase 1
    payment_verified: status === 'verified',
    adminPaymentApprovalAt: new Date().toISOString(),
    // New payment approval status for vendor portal workflow
    paymentApprovalStatus: status === 'verified' ? 'approved' : 'declined',
    adminApprovalTimestamp: new Date().toISOString(),
    vendorNotified: true,
    updatedAt: new Date().toISOString()
  };

  // Update order status based on verification result - aligned with delivery tracking
  if (status === 'verified') {
    // When payment is verified by admin, set to pending first, then confirmed
    updatedOrder.status = 'pending'; // Order Placed
    updatedOrder.paymentVerifiedAt = new Date().toISOString();
    updatedOrder.approvalStatus = 'approved'; // Update approval status
    
    // Immediately update to confirmed status
    setTimeout(async () => {
      try {
        await this.update(orderId, { status: 'confirmed' });
      } catch (error) {
        console.error('Failed to update order to confirmed:', error);
      }
    }, 100);

    // Enhanced real-time broadcast for payment approval with new status indicators
    if (typeof window !== 'undefined' && window.webSocketService) {
      try {
        window.webSocketService.send({
          type: 'admin_payment_approved',
          data: {
            orderId: updatedOrder.id,
            adminPaymentApproval: 'approved',
            verificationStatus: 'verified',
            payment_verified: true,
            paymentApprovalStatus: 'approved',
            statusSymbol: '✅',
            statusVariant: 'success',
            canProcessPayment: true,
            notificationText: 'Payment approved - Ready to process',
            timestamp: updatedOrder.adminPaymentApprovalAt,
            vendorNotified: true
          }
        });
      } catch (wsError) {
        console.warn('WebSocket payment approval broadcast failed:', wsError);
      }
    }
  } else {
    updatedOrder.status = 'payment_rejected';
    updatedOrder.paymentRejectedAt = new Date().toISOString();
    updatedOrder.approvalStatus = 'rejected'; // Update approval status

    // Enhanced real-time broadcast for payment rejection with new status indicators
    if (typeof window !== 'undefined' && window.webSocketService) {
      try {
        window.webSocketService.send({
          type: 'admin_payment_rejected',
          data: {
            orderId: updatedOrder.id,
            adminPaymentApproval: 'rejected',
            verificationStatus: 'rejected',
            payment_verified: false,
            paymentApprovalStatus: 'declined',
            statusSymbol: '❌',
            statusVariant: 'danger',
            rejectionReason: notes,
            requiresAction: true,
            timestamp: updatedOrder.adminPaymentApprovalAt,
            vendorNotified: true
          }
        });
      } catch (wsError) {
        console.warn('WebSocket payment rejection broadcast failed:', wsError);
      }
    }
  }

  this.orders[orderIndex] = updatedOrder;
  return { ...updatedOrder };
}

  async getVerificationHistory(orderId) {
    await this.delay();
    const order = await this.getById(orderId);
    
    if (!order.paymentProof) {
      return null;
    }

return {
      orderId: order?.id,
      submittedAt: order?.paymentProofSubmittedAt,
      verifiedAt: order?.verifiedAt,
      status: order?.verificationStatus || 'pending',
      notes: order?.verificationNotes || '',
      paymentProof: order?.paymentProof || null,
      paymentProofFileName: order?.paymentProofFileName || 'unknown'
    };
  }

// Order Calculation Methods
  calculateOrderSubtotal(items) {
    if (!items || !Array.isArray(items)) {
      return 0;
    }
    
    return items.reduce((subtotal, item) => {
      const itemPrice = parseFloat(item.price) || 0;
      const itemQuantity = parseInt(item.quantity) || 0;
      return subtotal + (itemPrice * itemQuantity);
    }, 0);
  }

  calculateOrderTotal(items, deliveryCharge = 0) {
    const subtotal = this.calculateOrderSubtotal(items);
    const delivery = parseFloat(deliveryCharge) || 0;
    return subtotal + delivery;
  }

  validateOrderAmount(order) {
    const calculatedSubtotal = this.calculateOrderSubtotal(order.items);
    const calculatedTotal = this.calculateOrderTotal(order.items, order.deliveryCharge);
    
    // Return calculated values if order total is missing or zero
    if (!order.total || order.total === 0) {
      return {
        subtotal: calculatedSubtotal,
        total: calculatedTotal,
        isCalculated: true
      };
    }
    
    return {
      subtotal: calculatedSubtotal,
      total: order.total,
      isCalculated: false
    };
  }

// Enhanced Vendor Availability Methods with Real-time Tracking
  async updateVendorAvailability(orderId, vendorId, productId, availabilityData) {
    await this.delay();
    
    const orderIndex = this.orders.findIndex(o => o.id === parseInt(orderId));
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const order = this.orders[orderIndex];
    
    // Initialize vendor_availability if not exists
    if (!order.vendor_availability) {
      order.vendor_availability = {};
    }

    // Store availability data with composite key: productId_vendorId
    const availabilityKey = `${productId}_${vendorId}`;
    order.vendor_availability[availabilityKey] = {
      available: availabilityData.available,
      notes: availabilityData.notes || '',
      timestamp: availabilityData.timestamp || new Date().toISOString(),
      vendorId: parseInt(vendorId),
      productId: parseInt(productId),
      // Enhanced real-time response tracking
      responseDeadline: availabilityData.responseDeadline || this.calculateResponseDeadline(order.createdAt),
      responseTime: this.calculateResponseTime(order.createdAt),
      notificationSent: true,
      escalationLevel: this.calculateEscalationLevel(order.createdAt)
    };

    order.updatedAt = new Date().toISOString();
    
    // Update payment flow stage if all items confirmed
    if (this.areAllItemsConfirmed(order)) {
      order.paymentFlowStage = 'availability_confirmed';
      order.fulfillment_stage = 'availability_confirmed';
    }
    
    this.orders[orderIndex] = order;
    
    return { ...order };
  }

  // Helper method to check if all items are confirmed
  areAllItemsConfirmed(order) {
    if (!order.items || !order.vendor_availability) return false;
    
    return order.items.every(item => {
      const vendorId = item.productId % 3 + 1; // Simplified vendor assignment
      const availabilityKey = `${item.productId}_${vendorId}`;
      const availability = order.vendor_availability[availabilityKey];
      return availability && availability.available === true;
    });
  }

  // Calculate response time for vendor availability
  calculateResponseTime(orderCreatedAt) {
    const created = new Date(orderCreatedAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now - created) / (1000 * 60));
    return `${diffInMinutes} minutes`;
  }

  // Calculate escalation level based on response time
  calculateEscalationLevel(orderCreatedAt) {
    const created = new Date(orderCreatedAt);
    const now = new Date();
    const diffInHours = (now - created) / (1000 * 60 * 60);
    
    if (diffInHours > 2) return 'overdue';
    if (diffInHours > 1.5) return 'urgent';
    if (diffInHours > 1) return 'high';
    return 'normal';
  }

  async getVendorOrders(vendorId) {
    await this.delay();
    
    // Filter orders that contain products assigned to this vendor
    // In a real system, this would be based on product-vendor mappings
    return this.orders.filter(order => {
      if (!order.items) return false;
      
      // Simplified vendor assignment logic for demo
      const hasVendorProducts = order.items.some(item => 
        (item.productId % 3 + 1) === parseInt(vendorId)
      );
      
      return hasVendorProducts;
    }).map(order => ({ ...order }));
  }

async getPendingAvailabilityRequests() {
    await this.delay();
    
    return this.orders.filter(order => {
      if (!order.items) return false;
      
      // Only include orders that haven't reached availability_confirmed stage
      if (order.fulfillment_stage && order.fulfillment_stage !== 'pending') {
        return false;
      }
      
      // Check if any products still need vendor availability response
      const hasPendingAvailability = order.items.some(item => {
        const vendorId = item.productId % 3 + 1; // Simplified assignment
        const availabilityKey = `${item.productId}_${vendorId}`;
        return !order.vendor_availability || !order.vendor_availability[availabilityKey];
      });
      
      return hasPendingAvailability;
    }).map(order => ({ 
      ...order,
      responseDeadline: this.calculateResponseDeadline(order.createdAt)
    }));
  }

  calculateResponseDeadline(createdAt) {
    const created = new Date(createdAt);
    const deadline = new Date(created.getTime() + 2 * 60 * 60 * 1000); // 2 hours from creation
    return deadline.toISOString();
  }

  async updateVendorAvailabilityBulk(vendorId, updates) {
    await this.delay();
    
    const results = [];
    for (const update of updates) {
      try {
        const result = await this.updateVendorAvailability(
          update.orderId, 
          vendorId, 
          update.productId, 
          update.availabilityData
        );
        results.push({ orderId: update.orderId, success: true, data: result });
      } catch (error) {
        results.push({ orderId: update.orderId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  async getVendorAvailabilityStatus(orderId) {
    await this.delay();
    
    const order = await this.getById(parseInt(orderId));
    if (!order) {
      throw new Error('Order not found');
    }

    return order.vendor_availability || {};
  }

// Enhanced Vendor Item Management for Order Summary Display
  async getVendorItems(orderId, vendorId) {
    try {
      await this.delay();
      
      console.log('OrderService.getVendorItems: Loading items for order:', orderId, 'vendor:', vendorId);
      
      const order = await this.getById(parseInt(orderId));
      if (!order || !order.items) {
        throw new Error(`Order #${orderId} not found or has no items`);
      }

      // Filter items for the specific vendor
      const vendorItems = order.items.filter(item => {
        const itemVendorId = item.productId % 3 + 1; // Simplified vendor assignment
        return itemVendorId === parseInt(vendorId);
      });

      // Enhance items with vendor-specific data
      const enhancedItems = vendorItems.map(item => ({
        ...item,
        vendorId: parseInt(vendorId),
        vendor: this.getVendorName(parseInt(vendorId)),
        status: this.getItemAvailabilityStatus(order, item.productId, parseInt(vendorId)),
        estimatedPreparationTime: this.calculatePreparationTime(item),
        qualityGrade: this.getQualityGrade(item),
        lastUpdated: new Date().toISOString()
      }));

      console.log('OrderService.getVendorItems: Found', enhancedItems.length, 'items for vendor', vendorId);
      
      return {
        vendor: this.getVendorName(parseInt(vendorId)),
        vendorId: parseInt(vendorId),
        items: enhancedItems,
        totalItems: enhancedItems.length,
        vendorTotal: enhancedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('OrderService.getVendorItems: Error loading vendor items:', error);
      
      if (error.message.includes('not found')) {
        throw new Error(`Order #${orderId} not found`);
      } else if (error.message.includes('network')) {
        throw new Error('Network error loading vendor items. Please try again.');
      } else {
        throw new Error('Unable to load vendor items. Please try again later.');
      }
    }
  }

  getVendorName(vendorId) {
    const vendors = {
      1: 'Fresh Foods Co.',
      2: 'Premium Grocers', 
      3: 'Organic Market'
    };
    return vendors[vendorId] || 'Unknown Vendor';
  }

  getItemAvailabilityStatus(order, productId, vendorId) {
    if (!order.vendor_availability) return 'pending';
    
    const availabilityKey = `${productId}_${vendorId}`;
    const availability = order.vendor_availability[availabilityKey];
    
    if (!availability) return 'pending';
    return availability.available ? 'available' : 'unavailable';
  }

  calculatePreparationTime(item) {
    // Simple preparation time calculation based on item type
    const baseTime = 15; // 15 minutes base
    const quantityFactor = Math.ceil(item.quantity / 5) * 5; // 5 min per 5 units
    return `${baseTime + quantityFactor} mins`;
  }

  getQualityGrade(item) {
    // Mock quality grades
    const grades = ['Premium', 'Standard', 'Economy'];
    const gradeIndex = item.productId % 3;
    return grades[gradeIndex];
  }

// Performance optimization helper methods
  getFromCache(key) {
    if (!this.cache.has(key)) return null;
    
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  setCache(key, value, ttl = this.cacheTTL) {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  invalidateOrderCache(orderId) {
    // Remove specific order cache
    this.cache.delete(`order_${orderId}`);
    this.cacheExpiry.delete(`order_${orderId}`);
    
    // Remove paginated cache entries
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.startsWith('orders_page_') || key === 'all_orders') {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    });
  }

  cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry && now > expiry) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  updatePerformanceMetrics(startTime) {
    this.performanceMetrics.requests++;
    const responseTime = performance.now() - startTime;
    
    // Calculate running average
    const total = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.requests - 1);
    this.performanceMetrics.averageResponseTime = (total + responseTime) / this.performanceMetrics.requests;
  }

  getCacheStats() {
    const hitRate = this.performanceMetrics.requests > 0 
      ? ((this.performanceMetrics.cacheHits / this.performanceMetrics.requests) * 100).toFixed(1)
      : '0.0';
    
    return {
      entries: this.cache.size,
      hitRate: `${hitRate}%`,
      hits: this.performanceMetrics.cacheHits,
      misses: this.performanceMetrics.cacheMisses,
      averageResponseTime: `${this.performanceMetrics.averageResponseTime.toFixed(2)}ms`,
      errorCount: this.performanceMetrics.errorCount
    };
  }

  // Enhanced delay with performance variability simulation
  delay() {
    // Simulate network variability: base 400ms ± 200ms
    const baseDelay = 400;
    const variance = Math.random() * 400 - 200; // -200 to +200ms
    const finalDelay = Math.max(100, baseDelay + variance); // Minimum 100ms
    
    return new Promise(resolve => setTimeout(resolve, finalDelay));
}

  // Enhanced Fulfillment Workflow Methods with Payment Flow Integration
// Enhanced Fulfillment Workflow Methods with New Payment Approval System
  async updateFulfillmentStage(orderId, stage, additionalData = {}) {
  await this.delay();
  
  const validStages = [
    'availability_confirmed',
    'packed', 
    'payment_processed',
    'admin_paid',
    'handed_over'
  ];
  
  if (!validStages.includes(stage)) {
    throw new Error(`Invalid fulfillment stage: ${stage}`);
  }
  
  const orderIndex = this.orders.findIndex(o => o.id === parseInt(orderId));
  if (orderIndex === -1) {
    throw new Error('Order not found');
  }

  const order = this.orders[orderIndex];
  
  // Initialize order_status_timestamps if not exists
  if (!order.order_status_timestamps) {
    order.order_status_timestamps = {};
  }
  
  // Enhanced Payment Flow Integration with New Four-State Approval System
  if (stage === 'payment_processed') {
    // Enhanced payment approval check with new status system - requires admin approval
    if (!order.payment_verified && order.adminPaymentApproval !== 'approved' && order.paymentApprovalStatus !== 'approved') {
      throw new Error('Payment must be approved by admin before processing. Current status: ' + (order.adminPaymentApproval || 'pending'));
    }
    order.vendorProcessed = true;
    order.paymentFlowStage = 'vendor_processed';
    order.paymentTimestamp = new Date().toISOString();
    order.paymentProcessedBy = additionalData.vendorId || 'vendor';
    
    // Real-time notification for payment processing with enhanced status tracking
    if (typeof window !== 'undefined' && window.webSocketService) {
      try {
        window.webSocketService.send({
          type: 'vendor_payment_processed',
          data: {
            orderId: orderId,
            vendorId: additionalData.vendorId,
            adminPaymentApproval: 'approved',
            paymentApprovalStatus: 'approved',
            statusSymbol: '✅',
            statusVariant: 'success',
            timestamp: order.paymentTimestamp,
            status: 'processed',
            notificationText: 'Payment processed by vendor - Admin notified'
          }
        });
      } catch (wsError) {
        console.warn('WebSocket payment processing broadcast failed:', wsError);
      }
    }
  }
  
  if (stage === 'admin_paid') {
    order.adminConfirmed = true;
    order.paymentFlowStage = 'admin_paid';
    order.adminPaymentTimestamp = new Date().toISOString();
    order.adminPaymentProof = additionalData.proofData || null;
    order.amountMatched = this.checkAmountMatch(order, additionalData.paymentAmount);
    // Ensure payment approval is set when admin pays
    order.adminPaymentApproval = 'approved';
    order.payment_verified = true;
    order.paymentApprovalStatus = 'approved';
    order.adminApprovalTimestamp = new Date().toISOString();
  }
  
  // Auto-assign delivery personnel when moving to packed stage
  if (stage === 'packed' && !order.assignedDelivery) {
    const deliveryAssignment = await this.autoAssignDeliveryPersonnel(order);
    order.assignedDelivery = deliveryAssignment;
  }
  
  // Store stage-specific data with payment flow tracking
  if (stage === 'packed' && additionalData) {
    order.packingInfo = {
      ...additionalData,
      completedAt: new Date().toISOString(),
      qualityVerified: additionalData.qualityChecked || false,
      packedBy: additionalData.vendorId || 'vendor'
    };
  }
  
  // Update fulfillment stage and timestamp
  order.fulfillment_stage = stage;
  order.order_status_timestamps[stage] = new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  
  // Enhanced order status mapping with payment flow
  const stageToStatusMap = {
    'availability_confirmed': 'confirmed',
    'packed': 'packed',
    'payment_processed': 'payment_processed',
    'admin_paid': 'ready_for_delivery',
    'handed_over': 'shipped'
  };
  
  if (stageToStatusMap[stage]) {
    order.status = stageToStatusMap[stage];
    order.order_status_timestamps[stageToStatusMap[stage]] = new Date().toISOString();
  }
  
  // Vendor confirmation check for payment flow completion
  if (stage === 'admin_paid' && order.amountMatched) {
    order.vendorConfirmed = true;
    order.paymentFlowStage = 'vendor_confirmed';
    order.vendorConfirmationTimestamp = new Date().toISOString();
  }
this.orders[orderIndex] = order;
  return { ...order };
}

// Check if payment amounts match between vendor and admin
checkAmountMatch(order, adminPaymentAmount) {
  if (!adminPaymentAmount || !order.total) return false;
  const tolerance = 0.01; // 1 cent tolerance
  return Math.abs(adminPaymentAmount - order.total) <= tolerance;
}

async autoAssignDeliveryPersonnel(order) {
    await this.delay(200);
    
    // Simulate delivery personnel assignment
    const availablePersonnel = [
      {
        name: "Ali Raza",
        phone: "+923001234567",
        eta: "13:30-14:00",
        vehicle: "Bike-15"
      },
      {
        name: "Hassan Ahmed", 
        phone: "+923009876543",
        eta: "14:00-14:30",
        vehicle: "Car-08"
      },
      {
        name: "Usman Khan",
        phone: "+923005555666",
        eta: "12:45-13:15", 
        vehicle: "Bike-22"
      }
    ];
    
    // Simple assignment based on order location/city
    const cityToPersonnelMap = {
      'Lahore': 0,
      'Karachi': 1,
      'Islamabad': 2
    };
    
    const city = order.deliveryAddress?.city || 'Lahore';
    const personnelIndex = cityToPersonnelMap[city] || 0;
    
    return availablePersonnel[personnelIndex];
  }

  async getFulfillmentOrders(vendorId) {
    await this.delay();
    
    // Get orders that have vendor products and need fulfillment
    return this.orders.filter(order => {
      if (!order.items) return false;
      
      // Check if order has products assigned to this vendor
      const hasVendorProducts = order.items.some(item => 
        (item.productId % 3 + 1) === parseInt(vendorId)
      );
      
      // Only include orders that have confirmed availability
      const hasConfirmedAvailability = order.vendor_availability && 
        Object.values(order.vendor_availability).some(avail => 
          avail.vendorId === parseInt(vendorId) && avail.available === true
        );
      
      return hasVendorProducts && hasConfirmedAvailability;
    }).map(order => {
      // Ensure fulfillment_stage is set
      if (!order.fulfillment_stage) {
        order.fulfillment_stage = 'availability_confirmed';
      }
      return { ...order };
    });
  }

  async confirmHandover(orderId, handoverData) {
    await this.delay();
    
    const orderIndex = this.orders.findIndex(o => o.id === parseInt(orderId));
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const order = this.orders[orderIndex];
    
    order.fulfillment_stage = 'handed_over';
    order.handoverSignature = handoverData.signature;
    order.handoverTimestamp = handoverData.timestamp;
    order.handoverVendorId = handoverData.vendorId;
    order.status = 'shipped';
    order.deliveryStatus = 'picked_up';
    order.updatedAt = new Date().toISOString();
    
this.orders[orderIndex] = order;
    return { ...order };
  }
  // Enhanced Price Summary Data Retrieval with Role-Based Filtering
  async getPriceSummaryData(orderId, options = {}) {
    try {
      await this.delay();
      
      const order = await this.getById(parseInt(orderId));
      if (!order || !order.items) {
        throw new Error(`Order #${orderId} not found or has no items`);
      }

      const { userRole = 'customer', vendorId = null, includeCategories = true, includeVendorBreakdown = true } = options;
      
      // Security: Customers cannot access cost prices
      const canViewCostPrices = userRole === 'admin' || userRole === 'vendor';
      
      console.log('OrderService.getPriceSummaryData: Loading price data for order:', orderId, 'Role:', userRole);

      // Enhanced price data with mock cost prices
      const enhancedItems = order.items.map(item => {
        const costPrice = canViewCostPrices ? this.generateCostPrice(item.price) : null;
        const margin = canViewCostPrices ? item.price - costPrice : null;
        const marginPercentage = canViewCostPrices && costPrice > 0 ? ((margin / costPrice) * 100).toFixed(1) : null;

        return {
          ...item,
          costPrice: costPrice,
          sellingPrice: item.price,
          margin: margin,
          marginPercentage: marginPercentage,
          profitPerUnit: margin,
          totalCost: canViewCostPrices ? costPrice * item.quantity : null,
          totalSelling: item.price * item.quantity,
          totalProfit: canViewCostPrices ? margin * item.quantity : null,
          vendorId: item.productId % 3 + 1, // Simplified vendor assignment
          vendor: this.getVendorName(item.productId % 3 + 1),
          category: this.getItemCategory(item.name)
        };
      });

      // Filter items for vendor users
      const filteredItems = userRole === 'vendor' && vendorId 
        ? enhancedItems.filter(item => item.vendorId === parseInt(vendorId))
        : enhancedItems;

      // Group by categories if requested
      const categories = includeCategories ? this.groupPricesByCategory(filteredItems) : {};
      
      // Calculate totals
      const totalCost = canViewCostPrices ? filteredItems.reduce((sum, item) => sum + (item.totalCost || 0), 0) : null;
      const totalSelling = filteredItems.reduce((sum, item) => sum + item.totalSelling, 0);
      const totalProfit = canViewCostPrices ? filteredItems.reduce((sum, item) => sum + (item.totalProfit || 0), 0) : null;
      const totalItems = filteredItems.length;
      const averageMargin = canViewCostPrices && totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(1) : null;

      const priceSummaryData = {
        orderId: order.id,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        userRole: userRole,
        canViewCostPrices: canViewCostPrices,
        totalCost: totalCost,
        totalSelling: totalSelling,
        totalProfit: totalProfit,
        totalItems: totalItems,
        averageMargin: averageMargin,
        deliveryCharge: order.deliveryCharge || 0,
        grandTotal: totalSelling + (order.deliveryCharge || 0),
        categories: categories,
        items: filteredItems,
        generatedAt: new Date().toISOString()
      };

      console.log('OrderService.getPriceSummaryData: Generated price summary:', {
        orderId: orderId,
        totalItems: totalItems,
        canViewCostPrices: canViewCostPrices,
        totalSelling: totalSelling,
        categoriesCount: Object.keys(categories).length
      });

      return priceSummaryData;

    } catch (error) {
      console.error('OrderService.getPriceSummaryData: Error loading price summary:', error);
      
      if (error.message.includes('not found')) {
        throw new Error(`Order #${orderId} not found`);
      } else if (error.message.includes('network')) {
        throw new Error('Network error loading price summary. Please try again.');
      } else {
        throw new Error('Unable to load price summary. Please try again later.');
      }
    }
  }

  // Generate realistic cost prices (typically 60-80% of selling price)
  generateCostPrice(sellingPrice) {
    const costRatio = 0.65 + (Math.random() * 0.15); // 65-80% cost ratio
    return Math.round(sellingPrice * costRatio * 100) / 100;
  }

  // Group enhanced price data by categories
  groupPricesByCategory(items) {
    const grouped = {};
    
    items.forEach(item => {
      const category = item.category;
      
      if (!grouped[category]) {
        grouped[category] = {
          totalCost: 0,
          totalSelling: 0,
          totalProfit: 0,
          totalItems: 0,
          vendorData: {}
        };
      }
      
      const categoryData = grouped[category];
      const vendorName = item.vendor;
      
      // Initialize vendor data if not exists
      if (!categoryData.vendorData[vendorName]) {
        categoryData.vendorData[vendorName] = {
          vendorId: item.vendorId,
          totalCost: 0,
          totalSelling: 0,
          totalProfit: 0,
          items: []
        };
      }
      
      const vendorData = categoryData.vendorData[vendorName];
      
      // Add item to vendor
      vendorData.items.push(item);
      vendorData.totalCost += item.totalCost || 0;
      vendorData.totalSelling += item.totalSelling;
      vendorData.totalProfit += item.totalProfit || 0;
      
      // Add to category totals
      categoryData.totalCost += item.totalCost || 0;
      categoryData.totalSelling += item.totalSelling;
      categoryData.totalProfit += item.totalProfit || 0;
      categoryData.totalItems += 1;
    });
    
    return grouped;
  }

  // Get item category for price grouping
  getItemCategory(itemName) {
    const name = itemName.toLowerCase();
    if (name.includes('rice') || name.includes('flour') || name.includes('wheat')) {
      return 'Grains & Cereals';
    }
    if (name.includes('meat') || name.includes('chicken') || name.includes('mutton') || name.includes('beef')) {
      return 'Meat & Poultry';
    }
    if (name.includes('apple') || name.includes('mango') || name.includes('banana') || name.includes('orange') || name.includes('fruit')) {
      return 'Fruits';
    }
    if (name.includes('tomato') || name.includes('potato') || name.includes('onion') || name.includes('vegetable')) {
      return 'Vegetables';
    }
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('dairy')) {
      return 'Dairy Products';
    }
    return 'Other Items';
  }
}
export const orderService = new OrderService();