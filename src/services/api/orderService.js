import ordersData from "../mockData/orders.json";
import React from "react";
import Error from "@/components/ui/Error";
import { paymentService } from "@/services/api/paymentService";

class OrderService {
  constructor() {
    this.orders = [...ordersData];
  }

  async getAll() {
    await this.delay();
    return [...this.orders];
  }

async getById(id) {
    await this.delay();
    const order = this.orders.find(o => o.id === id);
    if (!order) {
      throw new Error('Order not found');
    }
    return { ...order };
  }

async create(orderData) {
    await this.delay();
    
    // Enhanced payment data validation
    if (orderData.paymentMethod && orderData.paymentMethod !== 'cash') {
      if (!orderData.paymentResult && orderData.paymentMethod !== 'wallet') {
        const error = new Error('Payment result is required for non-cash payments');
        error.code = 'PAYMENT_RESULT_MISSING';
        throw error;
      }
      
      // Validate payment result structure for digital wallets
      if (['jazzcash', 'easypaisa'].includes(orderData.paymentMethod) && orderData.paymentResult) {
        if (!orderData.paymentResult.transactionId) {
          const error = new Error('Transaction ID is missing from payment result');
          error.code = 'TRANSACTION_ID_MISSING';
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
      // Vendor availability tracking (JSONB structure)
      vendor_availability: vendorAvailability,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Handle wallet payments
if (orderData.paymentMethod === 'wallet') {
      try {
        const walletTransaction = await paymentService.processWalletPayment(orderData.total, newOrder.id);
        newOrder.paymentResult = walletTransaction;
        newOrder.paymentStatus = 'completed';
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
    }
    
// Handle payment proof submissions with enhanced validation
    if (orderData.paymentProof && (orderData.paymentMethod === 'bank' || orderData.paymentMethod === 'jazzcash' || orderData.paymentMethod === 'easypaisa')) {
      newOrder.verificationStatus = 'pending';
      newOrder.paymentProofSubmittedAt = new Date().toISOString();
      
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
        storedAt: new Date().toISOString(),
        validated: Boolean(proofData.dataUrl && proofData.dataUrl.startsWith('data:image/')),
        // Backup storage reference if dataUrl fails
        backupRef: proofData.fileName ? `/uploads/${proofData.fileName}` : null
      };
    }
    this.orders.push(newOrder);
    return { ...newOrder };
  }

  async update(id, orderData) {
    await this.delay();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) {
      throw new Error('Order not found');
    }
    this.orders[index] = { ...this.orders[index], ...orderData };
    return { ...this.orders[index] };
  }

  async delete(id) {
    await this.delay();
    const index = this.orders.findIndex(o => o.id === id);
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
      deliveryStatus,
      // Automatically sync order status when delivery status changes
      ...(correspondingOrderStatus && { status: correspondingOrderStatus }),
      ...(actualDelivery && { actualDelivery }),
      updatedAt: new Date().toISOString(),
      // Track when delivery status was last updated for audit purposes
      deliveryStatusUpdatedAt: new Date().toISOString()
    };
    
    return await this.update(orderId, updatedOrder);
  }

  async updateOrderStatus(orderId, orderStatus) {
    await this.delay();
    const order = await this.getById(orderId);
    const updatedOrder = {
      ...order,
      status: orderStatus,
      updatedAt: new Date().toISOString()
    };
    return await this.update(orderId, updatedOrder);
  }

  async getOrdersByDeliveryPerson(deliveryPersonId) {
    await this.delay();
    return this.orders.filter(order => order.deliveryPersonId === deliveryPersonId);
  }

  async getOrdersByDeliveryStatus(deliveryStatus) {
return this.orders.filter(order => order.deliveryStatus === deliveryStatus);
  }

// Payment Integration Methods
  async updatePaymentStatus(orderId, paymentStatus, paymentResult = null) {
    await this.delay();
    const order = await this.getById(orderId);
    const updatedOrder = {
      ...order,
      paymentStatus,
      paymentResult,
      updatedAt: new Date().toISOString(),
      ...(paymentStatus === 'completed' && { paidAt: new Date().toISOString() }),
      ...(paymentStatus === 'completed' && order.status === 'payment_pending' && { status: 'confirmed' })
    };
    return await this.update(orderId, updatedOrder);
  }

  async getOrdersByPaymentStatus(paymentStatus) {
    await this.delay();
    return this.orders.filter(order => order.paymentStatus === paymentStatus);
  }

  async getOrdersByPaymentMethod(paymentMethod) {
    await this.delay();
    return this.orders.filter(order => order.paymentMethod === paymentMethod);
  }

  async verifyOrderPayment(orderId, verificationData) {
    await this.delay();
    const order = await this.getById(orderId);
    
    if (order.paymentStatus !== 'pending_verification') {
      throw new Error('Order payment does not require verification');
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
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      throw new Error('Payment verification error: ' + error.message);
    }
  }

async retryPayment(orderId, newPaymentData) {
    await this.delay();
    const order = await this.getById(orderId);
    
    if (order.paymentStatus === 'completed') {
      throw new Error('Payment already completed');
    }
    
    const updatedOrder = {
      ...order,
      ...newPaymentData,
      paymentStatus: 'completed',
      paymentRetries: (order.paymentRetries || 0) + 1,
      updatedAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    };
    
    return await this.update(orderId, updatedOrder);
  }
  async processRefund(orderId, refundAmount, reason) {
    await this.delay();
const order = await this.getById(orderId);
    const refund = {
      id: Date.now(), // Use timestamp for refund ID
      orderId,
      amount: refundAmount,
      reason,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    
    const updatedOrder = {
      ...order,
      refundRequested: true,
      refund,
      status: 'refund_requested'
    };
return await this.update(orderId, updatedOrder);
  }

async getMonthlyRevenue() {
    await this.delay();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyOrders = this.orders.filter(order => {
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
  // Payment Verification Methods
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
        paymentProof: order?.paymentProof?.dataUrl || `/api/uploads/${order?.paymentProof?.fileName || order?.paymentProofFileName || 'default.jpg'}`,
        paymentProofFileName: order?.paymentProof?.fileName || order?.paymentProofFileName || 'unknown',
        submittedAt: order?.paymentProof?.uploadedAt || order?.paymentProofSubmittedAt || order?.createdAt,
        verificationStatus: order?.verificationStatus || 'pending',
        // Enhanced approval workflow fields
        approvalStatus: order?.approvalStatus || 'pending',
        approvalRequestId: order?.approvalRequestId || null,
        priceApprovalRequired: order?.priceApprovalRequired || false
}));
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
          await this.updateOrderStatus(orderId, 'confirmed');
        } catch (error) {
          console.error('Failed to update order to confirmed:', error);
        }
      }, 100);
    } else {
      updatedOrder.status = 'payment_rejected';
      updatedOrder.paymentRejectedAt = new Date().toISOString();
      updatedOrder.approvalStatus = 'rejected'; // Update approval status
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

// Vendor Availability Methods
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
      productId: parseInt(productId)
    };

    order.updatedAt = new Date().toISOString();
    this.orders[orderIndex] = order;
    
    return { ...order };
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
      
      // Check if any products still need vendor availability response
      const hasPendingAvailability = order.items.some(item => {
        const vendorId = item.productId % 3 + 1; // Simplified assignment
        const availabilityKey = `${item.productId}_${vendorId}`;
        return !order.vendor_availability || !order.vendor_availability[availabilityKey];
      });
      
      return hasPendingAvailability;
    }).map(order => ({ ...order }));
  }

  async getVendorAvailabilityStatus(orderId) {
    await this.delay();
    
    const order = await this.getById(parseInt(orderId));
    if (!order) {
      throw new Error('Order not found');
    }

    return order.vendor_availability || {};
  }

  delay() {
    return new Promise(resolve => setTimeout(resolve, 400));
  }
// Fulfillment Workflow Methods
  async updateFulfillmentStage(orderId, stage) {
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
    
    // Auto-assign delivery personnel when moving to packed stage
    if (stage === 'packed' && !order.assignedDelivery) {
      const deliveryAssignment = await this.autoAssignDeliveryPersonnel(order);
      order.assignedDelivery = deliveryAssignment;
    }
    
    order.fulfillment_stage = stage;
    order.updatedAt = new Date().toISOString();
    
    // Update order status based on fulfillment stage
    const stageToStatusMap = {
      'availability_confirmed': 'confirmed',
      'packed': 'packed',
      'payment_processed': 'payment_processed',
      'admin_paid': 'ready_for_delivery',
      'handed_over': 'shipped'
    };
    
    if (stageToStatusMap[stage]) {
      order.status = stageToStatusMap[stage];
    }
    
    this.orders[orderIndex] = order;
    return { ...order };
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
}

export const orderService = new OrderService();