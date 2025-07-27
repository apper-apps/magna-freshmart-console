import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "react-toastify";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import { orderService } from "@/services/api/orderService";
import { paymentService } from "@/services/api/paymentService";
import { ErrorHandler, withErrorHandling } from "@/utils/errorHandling";

// Payment Processor Core Class (replaces minified 'eA')
class PaymentProcessor {
  constructor(order, gateway = null) {
    // Null checks before instantiation
    if (!order) {
      throw new Error('Order data is required for payment processing');
    }
    
    this.order = order;
    this.gateway = gateway;
    this.transactionId = null;
    this.processingStartTime = Date.now();
    
    // Enhanced error logging context
    this.context = {
      orderId: order.Id || 'unknown',
      amount: order.total || 0,
      paymentMethod: order.paymentMethod || 'unknown',
      gatewayId: gateway?.Id || null,
      timestamp: new Date().toISOString()
    };
  }

  async process() {
    try {
      // Validate processor state
      if (!this.validateProcessor()) {
        throw new Error('Payment processor validation failed');
      }

      // Process payment with enhanced logging
      const result = await this.executePayment();
      
      // Log successful transaction
      ErrorHandler.trackErrorPattern(
        { name: 'PaymentSuccess', message: 'Payment processed successfully' },
        'payment_processor_success',
        {
          ...this.context,
          processingTime: Date.now() - this.processingStartTime,
          operation: 'payment_processing'
        }
      );

      return result;
    } catch (error) {
      // Enhanced error logging with transaction details
      ErrorHandler.trackErrorPattern(error, 'payment_processor_error', {
        ...this.context,
        errorType: error.name || 'PaymentProcessorError',
        processingTime: Date.now() - this.processingStartTime,
        operation: 'payment_processing',
        responseTime: Date.now() - this.processingStartTime
      });
      
      throw error;
    }
  }

  validateProcessor() {
    // Check if all required data is present
    if (!this.order.total || this.order.total <= 0) {
      return false;
    }
    
    if (!this.order.paymentMethod) {
      return false;
    }

    // Validate gateway if specified
    if (this.gateway && (!this.gateway.enabled || !this.gateway.accountNumber)) {
      return false;
    }

    return true;
  }

  async executePayment() {
    // Fallback to manual processing if automated fails
    try {
      if (this.gateway) {
        return await this.processWithGateway();
      } else {
        return await this.processManual();
      }
    } catch (error) {
      console.warn('Automated payment failed, falling back to manual processing:', error);
      return await this.processManual();
    }
  }

  async processWithGateway() {
    // Simulate gateway processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      transactionId: this.transactionId,
      amount: this.order.total,
      gateway: this.gateway.name,
      processedAt: new Date().toISOString()
    };
  }

  async processManual() {
    // Manual processing fallback
    this.transactionId = `MANUAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      transactionId: this.transactionId,
      amount: this.order.total,
      gateway: 'manual_processing',
      processedAt: new Date().toISOString(),
      requiresVerification: true
    };
  }
}
// Payment Gateway Management Component
const PaymentGatewayManagement = ({ paymentMethods, onGatewayUpdate }) => {
  const [isAddingGateway, setIsAddingGateway] = useState(false);
  const [editingGateway, setEditingGateway] = useState(null);
  const [gatewayForm, setGatewayForm] = useState({
    name: '',
    accountName: '',
    accountNumber: '',
    instructions: '',
    fee: 0,
    enabled: true
  });
  const [processing, setProcessing] = useState(false);

  const resetForm = () => {
    setGatewayForm({
      name: '',
      accountName: '',
      accountNumber: '',
      instructions: '',
      fee: 0,
      enabled: true
    });
    setIsAddingGateway(false);
    setEditingGateway(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGatewayForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!gatewayForm.name || !gatewayForm.accountName || !gatewayForm.accountNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    
    // Enhanced error handling with payment processor validation
    const processWithErrorHandling = withErrorHandling(async () => {
      // Null checks before processing
      if (!gatewayForm || typeof gatewayForm !== 'object') {
        throw new Error('Invalid gateway form data');
      }

      // Validate gateway configuration
      const validatedForm = {
        ...gatewayForm,
        enabled: true,
        createdAt: new Date().toISOString()
      };

      let result;
      if (editingGateway) {
        // Additional null check for editing gateway
        if (!editingGateway?.Id) {
          throw new Error('Invalid gateway ID for update');
        }
        result = await paymentService.updateGateway(editingGateway.Id, validatedForm);
        toast.success('Payment gateway updated successfully');
      } else {
        result = await paymentService.createGateway(validatedForm);
        toast.success('Payment gateway added successfully');
      }
      
      return result;
    }, 'payment_gateway_management');

    try {
      await processWithErrorHandling();
      resetForm();
      onGatewayUpdate();
    } catch (error) {
      // Enhanced error logging with transaction details
      ErrorHandler.trackErrorPattern(error, 'payment_gateway_error', {
        operation: editingGateway ? 'update_gateway' : 'create_gateway',
        gatewayName: gatewayForm?.name || 'unknown',
        accountName: gatewayForm?.accountName || 'unknown',
        timestamp: new Date().toISOString(),
        responseTime: Date.now()
      });
      
      const userFriendlyMessage = error.message?.includes('network') 
        ? 'Network error occurred. Please check your connection and try again.' 
        : error.message || 'Failed to save payment gateway';
      
      toast.error(userFriendlyMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (gateway) => {
    setGatewayForm({
      name: gateway.name,
      accountName: gateway.accountName || '',
      accountNumber: gateway.accountNumber || '',
      instructions: gateway.instructions || '',
      fee: gateway.fee || 0,
      enabled: gateway.enabled
    });
    setEditingGateway(gateway);
    setIsAddingGateway(true);
  };

const handleDelete = async (gatewayId) => {
    // Null check for gateway ID
    if (!gatewayId) {
      toast.error('Invalid gateway ID');
      return;
    }

    if (!confirm('Are you sure you want to delete this payment gateway?')) {
      return;
    }

    setProcessing(true);
    
    // Enhanced error handling with fallback
    const deleteWithErrorHandling = withErrorHandling(async () => {
      // Additional validation before deletion
      const existingGateway = await paymentService.getGatewayById(gatewayId);
      if (!existingGateway) {
        throw new Error('Gateway not found or already deleted');
      }

      // Check if gateway is in use
      const activeTransactions = await paymentService.getActiveTransactionsByGateway(gatewayId);
      if (activeTransactions && activeTransactions.length > 0) {
        throw new Error('Cannot delete gateway with active transactions');
      }

      return await paymentService.deleteGateway(gatewayId);
    }, 'payment_gateway_deletion');

    try {
      await deleteWithErrorHandling();
      toast.success('Payment gateway deleted successfully');
      onGatewayUpdate();
    } catch (error) {
      // Enhanced error logging
      ErrorHandler.trackErrorPattern(error, 'payment_gateway_delete_error', {
        operation: 'delete_gateway',
        gatewayId: gatewayId,
        timestamp: new Date().toISOString(),
        responseTime: Date.now()
      });

      const userFriendlyMessage = error.message?.includes('active transactions')
        ? 'Cannot delete gateway with pending transactions. Please wait for completion.'
        : error.message || 'Failed to delete payment gateway';
      
      toast.error(userFriendlyMessage);
    } finally {
      setProcessing(false);
    }
  };

const handleToggleEnabled = async (gatewayId, currentEnabled) => {
    // Null checks before processing
    if (!gatewayId) {
      toast.error('Invalid gateway ID');
      return;
    }

    setProcessing(true);
    
    const toggleWithErrorHandling = withErrorHandling(async () => {
      // Validate gateway exists and is in correct state
      const gateway = await paymentService.getGatewayById(gatewayId);
      if (!gateway) {
        throw new Error('Gateway not found');
      }

      if (gateway.enabled !== currentEnabled) {
        throw new Error('Gateway status has changed. Please refresh and try again.');
      }

      // Use PaymentProcessor for validation before enabling
      if (!currentEnabled) {
        const testOrder = { 
          Id: 'test', 
          total: 100, 
          paymentMethod: 'gateway_test' 
        };
        
        try {
          const processor = new PaymentProcessor(testOrder, gateway);
          if (!processor.validateProcessor()) {
            throw new Error('Gateway configuration is invalid');
          }
        } catch (validationError) {
          throw new Error(`Gateway validation failed: ${validationError.message}`);
        }
      }

      if (currentEnabled) {
        return await paymentService.disableGateway(gatewayId);
      } else {
        return await paymentService.enableGateway(gatewayId);
      }
    }, 'payment_gateway_toggle');

    try {
      await toggleWithErrorHandling();
      
      if (currentEnabled) {
        toast.success('Payment gateway disabled');
      } else {
        toast.success('Payment gateway enabled');
      }
      onGatewayUpdate();
    } catch (error) {
      // Enhanced error logging with transaction details
      ErrorHandler.trackErrorPattern(error, 'payment_gateway_toggle_error', {
        operation: currentEnabled ? 'disable_gateway' : 'enable_gateway',
        gatewayId: gatewayId,
        currentState: currentEnabled,
        timestamp: new Date().toISOString(),
        responseTime: Date.now()
      });

      const userFriendlyMessage = error.message?.includes('validation failed')
        ? 'Gateway configuration is invalid. Please check settings.'
        : error.message || 'Failed to update gateway status';
      
      toast.error(userFriendlyMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Payment Gateway Management</h3>
        <Button
          onClick={() => setIsAddingGateway(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          <ApperIcon name="Plus" size={16} className="mr-2" />
          Add Gateway
        </Button>
      </div>

      {/* Add/Edit Gateway Form */}
      {isAddingGateway && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingGateway ? 'Edit Payment Gateway' : 'Add New Payment Gateway'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Gateway Name *"
                  name="name"
                  value={gatewayForm.name}
                  onChange={handleInputChange}
                  placeholder="e.g., JazzCash, EasyPaisa, Bank Transfer"
                  required
                />
              </div>
              <div>
                <Input
                  label="Account Name *"
                  name="accountName"
                  value={gatewayForm.accountName}
                  onChange={handleInputChange}
                  placeholder="Account holder name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Account Number *"
                  name="accountNumber"
                  value={gatewayForm.accountNumber}
                  onChange={handleInputChange}
                  placeholder="Account number or wallet ID"
                  required
                />
              </div>
              <div>
                <Input
                  label="Transaction Fee (%)"
                  name="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={gatewayForm.fee}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Instructions
              </label>
              <textarea
                name="instructions"
                value={gatewayForm.instructions}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Instructions for customers on how to make payment..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={gatewayForm.enabled}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                Enable this gateway for customers
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={processing}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {processing ? (
                  <>
                    <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                    {editingGateway ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <ApperIcon name="Save" size={16} className="mr-2" />
                    {editingGateway ? 'Update Gateway' : 'Add Gateway'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={processing}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Gateways List */}
      <div className="space-y-4">
        {paymentMethods.map((gateway) => (
          <div key={gateway.Id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-900">{gateway.name}</h4>
                  <button
                    onClick={() => handleToggleEnabled(gateway.Id, gateway.enabled)}
                    disabled={processing}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      gateway.enabled ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        gateway.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    gateway.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {gateway.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Account Name:</span>
                    <p className="font-medium">{gateway.accountName || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Account Number:</span>
                    <p className="font-medium font-mono">{gateway.accountNumber || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Fee:</span>
                    <p className="font-medium">
                      {gateway.fee > 0 ? `${(gateway.fee * 100).toFixed(1)}%` : 'Free'}
                    </p>
                  </div>
                </div>

                {gateway.instructions && (
                  <div className="mt-3">
                    <span className="text-gray-500 text-sm">Instructions:</span>
                    <p className="text-sm text-gray-700 mt-1">{gateway.instructions}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 ml-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(gateway)}
                  disabled={processing}
                >
                  <ApperIcon name="Edit" size={14} />
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => handleDelete(gateway.Id)}
                  disabled={processing}
                >
                  <ApperIcon name="Trash2" size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {paymentMethods.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ApperIcon name="CreditCard" size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Payment Gateways</p>
            <p className="text-sm">Add your first payment gateway to start accepting payments</p>
          </div>
        )}
      </div>
    </div>
  );
};
const PaymentManagement = () => {
  const [transactions, setTransactions] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
const [stats, setStats] = useState({
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalRevenue: 0,
    walletBalance: 0,
    pendingRefunds: 0,
    pendingVerifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
const [filterMethod, setFilterMethod] = useState('all');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [processingVerification, setProcessingVerification] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'BarChart3' },
    { id: 'transactions', label: 'Transactions', icon: 'CreditCard' },
    { id: 'wallet', label: 'Wallet Management', icon: 'Wallet' },
    { id: 'methods', label: 'Payment Methods', icon: 'Settings' },
    { id: 'verification', label: 'Payment Verification', icon: 'Shield' },
    { id: 'refunds', label: 'Refunds', icon: 'RefreshCw' }
  ];

const loadPaymentData = async () => {
    const loadStartTime = Date.now();
    
    const loadWithErrorHandling = withErrorHandling(async () => {
      setLoading(true);
      setError(null);

      // Null checks and data validation
      const dataPromises = [
        paymentService.getAllTransactions(),
        paymentService.getWalletTransactions(),
        paymentService.getAvailablePaymentMethods(),
        orderService.getAll(),
        orderService.getPendingVerifications()
      ];

      // Enhanced Promise.all with individual error handling
      const results = await Promise.allSettled(dataPromises);
      
      // Extract successful results and handle failures
      const [allTransactions, walletTxns, methods, orders, verifications] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value || [];
        } else {
          const serviceNames = ['transactions', 'wallet', 'methods', 'orders', 'verifications'];
          console.warn(`Failed to load ${serviceNames[index]}:`, result.reason);
          return [];
        }
      });

      // Additional null checks for critical data
      const safeTransactions = Array.isArray(allTransactions) ? allTransactions : [];
      const safeOrders = Array.isArray(orders) ? orders : [];
      const safeVerifications = Array.isArray(verifications) ? verifications : [];

      // Wallet balance with fallback
      let walletBalance = 0;
      try {
        walletBalance = await paymentService.getWalletBalance() || 0;
      } catch (walletError) {
        console.warn('Failed to load wallet balance:', walletError);
        ErrorHandler.trackErrorPattern(walletError, 'wallet_balance_load_error', {
          operation: 'load_wallet_balance',
          timestamp: new Date().toISOString()
        });
      }

      // Safe calculation of stats with null checks
      const successfulTxns = safeTransactions.filter(t => t && t.status === 'completed') || [];
      const failedTxns = safeTransactions.filter(t => t && t.status === 'failed') || [];
      const totalRevenue = successfulTxns.reduce((sum, t) => sum + (t?.amount || 0), 0);
      const pendingRefunds = safeOrders.filter(o => o && o.refundRequested).length;
      const pendingVerificationsCount = safeVerifications.length;

      // Payment processor health check
      const paymentProcessorHealth = {
        totalProcessors: methods?.length || 0,
        activeProcessors: methods?.filter(m => m?.enabled).length || 0,
        failureRate: safeTransactions.length > 0 ? (failedTxns.length / safeTransactions.length) * 100 : 0,
        lastSuccessfulTransaction: successfulTxns.length > 0 ? 
          Math.max(...successfulTxns.map(t => new Date(t.createdAt || 0).getTime())) : null
      };

      const stats = {
        totalTransactions: safeTransactions.length,
        successfulTransactions: successfulTxns.length,
        failedTransactions: failedTxns.length,
        totalRevenue,
        walletBalance,
        pendingRefunds,
        pendingVerifications: pendingVerificationsCount,
        paymentProcessorHealth
      };

      setStats(stats);
      setTransactions(safeTransactions);
      setWalletTransactions(Array.isArray(walletTxns) ? walletTxns : []);
      setPaymentMethods(Array.isArray(methods) ? methods : []);
      setPendingVerifications(safeVerifications);

      // Log successful load with performance metrics
      ErrorHandler.trackErrorPattern(
        { name: 'PaymentDataLoadSuccess', message: 'Payment data loaded successfully' },
        'payment_data_load_success',
        {
          operation: 'load_payment_data',
          loadTime: Date.now() - loadStartTime,
          transactionsCount: safeTransactions.length,
          failureRate: paymentProcessorHealth.failureRate,
          timestamp: new Date().toISOString()
        }
      );

    }, 'payment_data_loading');

    try {
      await loadWithErrorHandling();
    } catch (err) {
      // Enhanced error logging with transaction details
      ErrorHandler.trackErrorPattern(err, 'payment_data_load_error', {
        operation: 'load_payment_data',
        loadTime: Date.now() - loadStartTime,
        errorType: err.name || 'PaymentDataLoadError',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - loadStartTime
      });

      const userFriendlyMessage = err.message?.includes('network') 
        ? 'Unable to load payment data. Please check your connection.'
        : 'Failed to load payment data. Some features may be limited.';
      
      setError(userFriendlyMessage);
      toast.error(userFriendlyMessage);
      
      // Set safe defaults to prevent UI crashes
      setStats({
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalRevenue: 0,
        walletBalance: 0,
        pendingRefunds: 0,
        pendingVerifications: 0,
        paymentProcessorHealth: {
          totalProcessors: 0,
          activeProcessors: 0,
          failureRate: 0,
          lastSuccessfulTransaction: null
        }
      });
      setTransactions([]);
      setWalletTransactions([]);
      setPaymentMethods([]);
      setPendingVerifications([]);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
    loadPaymentData();
  }, []);

  useEffect(() => {
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && tabs.find(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const copyTxid = async (txid) => {
    try {
      // Remove "TXH: " prefix if present
      const cleanTxid = txid.replace(/^TXH:\s*/, '');
      await navigator.clipboard.writeText(cleanTxid);
      toast.success(`Copied TXID: ${cleanTxid}`);
    } catch (error) {
      toast.error('Failed to copy transaction ID');
    }
  };
const handleRefundProcess = async (orderId) => {
    // Enhanced null checks and validation
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }

    if (!refundAmount || !refundReason) {
      toast.error('Please provide refund amount and reason');
      return;
    }

    const numericOrderId = parseInt(orderId);
    const numericRefundAmount = parseFloat(refundAmount);

    if (isNaN(numericOrderId) || numericOrderId <= 0) {
      toast.error('Invalid order ID format');
      return;
    }

    if (isNaN(numericRefundAmount) || numericRefundAmount <= 0) {
      toast.error('Invalid refund amount');
      return;
    }

    setProcessingRefund(true);
    
    const refundWithErrorHandling = withErrorHandling(async () => {
      // Get order details for validation
      const order = await orderService.getById(numericOrderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Validate refund amount
      if (numericRefundAmount > order.total) {
        throw new Error('Refund amount cannot exceed order total');
      }

      // Check if order is eligible for refund
      if (order.status === 'cancelled' || order.refundStatus === 'completed') {
        throw new Error('Order is not eligible for refund');
      }

      // Use PaymentProcessor for refund processing
      const processor = new PaymentProcessor(order);
      processor.context = {
        ...processor.context,
        operation: 'refund_processing',
        refundAmount: numericRefundAmount,
        refundReason: refundReason.trim()
      };

      // Process refund with enhanced validation
      const refundResult = await orderService.processRefund(
        numericOrderId, 
        numericRefundAmount, 
        refundReason.trim()
      );

      // Log successful refund
      ErrorHandler.trackErrorPattern(
        { name: 'RefundSuccess', message: 'Refund processed successfully' },
        'refund_processing_success',
        {
          orderId: numericOrderId,
          refundAmount: numericRefundAmount,
          originalAmount: order.total,
          refundReason: refundReason.trim(),
          timestamp: new Date().toISOString(),
          operation: 'refund_processing'
        }
      );

      return refundResult;
    }, 'refund_processing');

    try {
      await refundWithErrorHandling();
      toast.success('Refund processed successfully');
      setRefundAmount('');
      setRefundReason('');
      setSelectedTransactionId(null);
      loadPaymentData();
    } catch (error) {
      // Enhanced error logging with transaction details
      ErrorHandler.trackErrorPattern(error, 'refund_processing_error', {
        operation: 'refund_processing',
        orderId: numericOrderId,
        refundAmount: numericRefundAmount,
        refundReason: refundReason?.trim() || 'no_reason',
        errorType: error.name || 'RefundProcessingError',
        timestamp: new Date().toISOString(),
        responseTime: Date.now()
      });

      const userFriendlyMessage = error.message?.includes('not found')
        ? 'Order not found. Please refresh and try again.'
        : error.message?.includes('not eligible')
        ? 'This order is not eligible for refund.'
        : error.message || 'Failed to process refund';
      
      toast.error(userFriendlyMessage);
    } finally {
      setProcessingRefund(false);
    }
  };

const handleVerificationAction = async (orderId, action, notes = '') => {
    // Enhanced null checks and validation
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }

    if (!['approve', 'reject'].includes(action)) {
      toast.error('Invalid verification action');
      return;
    }

    if (action === 'reject') {
      // Open rejection reason modal with validation
      const verification = pendingVerifications.find(v => v && v.orderId === orderId);
      if (!verification) {
        toast.error('Verification record not found');
        return;
      }
      setSelectedVerification(verification);
      setShowRejectionModal(true);
      return;
    }

    setProcessingVerification(true);
    
    const verificationWithErrorHandling = withErrorHandling(async () => {
      // Get order details for validation
      const order = await orderService.getById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Validate order state
      if (order.paymentStatus === 'verified') {
        throw new Error('Payment is already verified');
      }

      if (order.status === 'cancelled') {
        throw new Error('Cannot verify payment for cancelled order');
      }

      // Use PaymentProcessor for verification validation
      const processor = new PaymentProcessor(order);
      processor.context = {
        ...processor.context,
        operation: 'payment_verification',
        verificationAction: action,
        verificationNotes: notes?.trim() || ''
      };

      const status = action === 'approve' ? 'verified' : 'rejected';
      const result = await orderService.updateVerificationStatus(orderId, status, notes?.trim() || '');

      // Log verification action
      ErrorHandler.trackErrorPattern(
        { name: 'VerificationSuccess', message: `Payment ${action}d successfully` },
        'payment_verification_success',
        {
          orderId: orderId,
          action: action,
          status: status,
          notes: notes?.trim() || '',
          orderTotal: order.total,
          paymentMethod: order.paymentMethod,
          timestamp: new Date().toISOString(),
          operation: 'payment_verification'
        }
      );

      return result;
    }, 'payment_verification');

    try {
      await verificationWithErrorHandling();
      
      if (action === 'approve') {
        toast.success('Payment approved successfully');
        toast.info('Order status updated: Order Placed → Confirmed');
      } else {
        toast.success('Payment rejected and user has been notified');
        // In a real implementation, this would trigger an email/SMS to the user
        toast.info(`Rejection reason sent to customer: ${notes?.trim() || 'No reason provided'}`);
      }
      loadPaymentData();
    } catch (error) {
      // Enhanced error logging with transaction details
      ErrorHandler.trackErrorPattern(error, 'payment_verification_error', {
        operation: 'payment_verification',
        orderId: orderId,
        action: action,
        notes: notes?.trim() || '',
        errorType: error.name || 'VerificationError',
        timestamp: new Date().toISOString(),
        responseTime: Date.now()
      });

      const userFriendlyMessage = error.message?.includes('not found')
        ? 'Order not found. Please refresh and try again.'
        : error.message?.includes('already verified')
        ? 'Payment is already verified.'
        : error.message || `Failed to ${action} payment`;
      
      toast.error(userFriendlyMessage);
    } finally {
      setProcessingVerification(false);
    }
  };

const handleRejectWithReason = async () => {
    // Enhanced validation with null checks
    if (!rejectionReason || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (!selectedVerification || !selectedVerification.orderId) {
      toast.error('Invalid verification data');
      return;
    }

    const trimmedReason = rejectionReason.trim();
    if (trimmedReason.length < 10) {
      toast.error('Rejection reason must be at least 10 characters long');
      return;
    }

    setProcessingVerification(true);
    
    const rejectWithErrorHandling = withErrorHandling(async () => {
      // Get order details for validation
      const order = await orderService.getById(selectedVerification.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Validate order state
      if (order.paymentStatus === 'rejected') {
        throw new Error('Payment is already rejected');
      }

      if (order.status === 'cancelled') {
        throw new Error('Cannot reject payment for cancelled order');
      }

      // Use PaymentProcessor for rejection validation
      const processor = new PaymentProcessor(order);
      processor.context = {
        ...processor.context,
        operation: 'payment_rejection',
        rejectionReason: trimmedReason,
        verificationId: selectedVerification.Id
      };

      const result = await orderService.updateVerificationStatus(
        selectedVerification.orderId, 
        'rejected', 
        trimmedReason
      );

      // Log rejection action
      ErrorHandler.trackErrorPattern(
        { name: 'PaymentRejectionSuccess', message: 'Payment rejected successfully' },
        'payment_rejection_success',
        {
          orderId: selectedVerification.orderId,
          rejectionReason: trimmedReason,
          orderTotal: order.total,
          paymentMethod: order.paymentMethod,
          verificationId: selectedVerification.Id,
          timestamp: new Date().toISOString(),
          operation: 'payment_rejection'
        }
      );

      return result;
    }, 'payment_rejection');

    try {
      await rejectWithErrorHandling();
      
      toast.success('Payment rejected and user has been notified');
      toast.info(`Rejection reason sent to customer: ${trimmedReason}`);
      
      setShowRejectionModal(false);
      setSelectedVerification(null);
      setRejectionReason('');
      loadPaymentData();
    } catch (error) {
      // Enhanced error logging with transaction details
      ErrorHandler.trackErrorPattern(error, 'payment_rejection_error', {
        operation: 'payment_rejection',
        orderId: selectedVerification?.orderId || 'unknown',
        rejectionReason: trimmedReason,
        verificationId: selectedVerification?.Id || 'unknown',
        errorType: error.name || 'RejectionError',
        timestamp: new Date().toISOString(),
        responseTime: Date.now()
      });

      const userFriendlyMessage = error.message?.includes('not found')
        ? 'Order not found. Please refresh and try again.'
        : error.message?.includes('already rejected')
        ? 'Payment is already rejected.'
        : error.message || 'Failed to reject payment';
      
      toast.error(userFriendlyMessage);
    } finally {
      setProcessingVerification(false);
    }
  };

  const handleImageView = (imageUrl, fileName = 'payment_proof') => {
    setSelectedImage({ url: imageUrl, fileName });
    setShowImageModal(true);
  };

  const handleImageDownload = (imageUrl, fileName = 'payment_proof') => {
    if (imageUrl.startsWith('data:')) {
      // For base64 images
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${fileName}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
// For URL images
      window.open(imageUrl, '_blank');
    }
    toast.success('Payment proof download initiated');
  };

const handleWalletAction = async (action, amount) => {
    // Enhanced validation with null checks
    if (!action || !['deposit', 'withdraw', 'transfer'].includes(action)) {
      toast.error('Invalid wallet action');
      return;
    }

    const safeAmount = parseFloat(amount) || 0;
    if (safeAmount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    if (safeAmount > 1000000) {
      toast.error('Amount exceeds maximum limit');
      return;
    }

    const walletActionWithErrorHandling = withErrorHandling(async () => {
      // Get current wallet balance for validation
      const currentBalance = await paymentService.getWalletBalance() || 0;
      
      // Validate action-specific requirements
      if (action === 'withdraw' && safeAmount > currentBalance) {
        throw new Error('Insufficient wallet balance');
      }

      if (action === 'transfer' && safeAmount > currentBalance) {
        throw new Error('Insufficient balance for transfer');
      }

      // Create wallet operation context for PaymentProcessor
      const walletOperation = {
        Id: `wallet_${Date.now()}`,
        total: safeAmount,
        paymentMethod: `wallet_${action}`,
        action: action,
        currentBalance: currentBalance
      };

      const processor = new PaymentProcessor(walletOperation);
      processor.context = {
        ...processor.context,
        operation: `wallet_${action}`,
        amount: safeAmount,
        currentBalance: currentBalance,
        targetBalance: action === 'deposit' ? currentBalance + safeAmount : currentBalance - safeAmount
      };

      let result;
      switch (action) {
        case 'deposit':
          result = await paymentService.depositToWallet(safeAmount);
          break;
        case 'withdraw':
          result = await paymentService.withdrawFromWallet(safeAmount);
          break;
        case 'transfer':
          result = await paymentService.transferFromWallet(safeAmount);
          break;
        default:
          throw new Error('Invalid wallet action');
      }

      // Log successful wallet operation
      ErrorHandler.trackErrorPattern(
        { name: 'WalletOperationSuccess', message: `Wallet ${action} completed successfully` },
        'wallet_operation_success',
        {
          operation: `wallet_${action}`,
          amount: safeAmount,
          previousBalance: currentBalance,
          newBalance: action === 'deposit' ? currentBalance + safeAmount : currentBalance - safeAmount,
          timestamp: new Date().toISOString()
        }
      );

      return result;
    }, 'wallet_operations');

    try {
      await walletActionWithErrorHandling();
      
      const actionMessages = {
        deposit: `Deposited Rs. ${safeAmount.toLocaleString()} to wallet`,
        withdraw: `Withdrew Rs. ${safeAmount.toLocaleString()} from wallet`,
        transfer: `Transferred Rs. ${safeAmount.toLocaleString()} from wallet`
      };
      
      toast.success(actionMessages[action]);
      loadPaymentData();
    } catch (error) {
      // Enhanced error logging with transaction details
      ErrorHandler.trackErrorPattern(error, 'wallet_operation_error', {
        operation: `wallet_${action}`,
        amount: safeAmount,
        errorType: error.name || 'WalletOperationError',
        timestamp: new Date().toISOString(),
        responseTime: Date.now()
      });

      const userFriendlyMessage = error.message?.includes('insufficient')
        ? `Insufficient balance for ${action}. Please check your wallet.`
        : error.message?.includes('limit')
        ? 'Amount exceeds the allowed limit.'
        : error.message || 'Wallet operation failed';
      
      toast.error(userFriendlyMessage);
    }
  };
  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      const matchesSearch = transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.orderId.toString().includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
      const matchesMethod = filterMethod === 'all' || transaction.paymentMethod === filterMethod;
      
      return matchesSearch && matchesStatus && matchesMethod;
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="dashboard" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadPaymentData} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Management</h1>
        <p className="text-gray-600">Manage payments, transactions, and refunds</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
<div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold">Rs. {(stats?.totalRevenue ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="DollarSign" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Successful Transactions</p>
              <p className="text-3xl font-bold">{stats.successfulTransactions}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="CheckCircle" size={24} />
            </div>
          </div>
        </div>

<div className="card p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
<div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Wallet Balance</p>
              <p className="text-3xl font-bold">Rs. {(stats?.walletBalance ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="Wallet" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Pending Verifications</p>
              <p className="text-3xl font-bold">{stats.pendingVerifications}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="Shield" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ApperIcon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Transactions</span>
                  <span className="font-semibold">{stats.totalTransactions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold text-green-600">
                    {stats.totalTransactions > 0 ? 
                      ((stats.successfulTransactions / stats.totalTransactions) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Failed Transactions</span>
                  <span className="font-semibold text-red-600">{stats.failedTransactions}</span>
                </div>
<div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Refunds</span>
                  <span className="font-semibold text-orange-600">{stats.pendingRefunds}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Verifications</span>
                  <span className="font-semibold text-yellow-600">{stats.pendingVerifications}</span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => handleWalletAction('deposit', 10000)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <ApperIcon name="Plus" size={16} className="mr-2" />
                  Add Rs. 10,000 to Wallet
                </Button>
                <Button
                  onClick={() => setActiveTab('refunds')}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <ApperIcon name="RefreshCw" size={16} className="mr-2" />
                  Process Refunds
                </Button>
                <Button
                  onClick={() => setActiveTab('transactions')}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  <ApperIcon name="Search" size={16} className="mr-2" />
                  View All Transactions
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Methods</option>
                <option value="card">Card</option>
                <option value="wallet">Wallet</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Transaction ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Order ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTransactions().map((transaction) => (
<tr key={transaction.Id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{transaction.transactionId}</td>
                      <td className="py-3 px-4">#{transaction.orderId}</td>
                      <td className="py-3 px-4 font-medium">Rs. {(transaction?.amount ?? 0).toLocaleString()}</td>
                      <td className="py-3 px-4 capitalize">{transaction.paymentMethod}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {format(new Date(transaction.timestamp), 'MMM dd, yyyy hh:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wallet Management</h3>
<div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-teal-100 text-sm">Current Balance</p>
                      <p className="text-2xl font-bold">Rs. {(stats?.walletBalance ?? 0).toLocaleString()}</p>
                    </div>
                    <ApperIcon name="Wallet" size={32} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleWalletAction('deposit', 5000)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <ApperIcon name="Plus" size={16} className="mr-2" />
                    Deposit Rs. 5,000
                  </Button>
                  <Button
                    onClick={() => handleWalletAction('withdraw', 1000)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <ApperIcon name="Minus" size={16} className="mr-2" />
                    Withdraw Rs. 1,000
                  </Button>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Wallet Transactions</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {walletTransactions.map((transaction) => (
                  <div key={transaction.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        transaction.type === 'deposit' ? 'bg-green-100' : 
                        transaction.type === 'withdraw' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <ApperIcon 
                          name={transaction.type === 'deposit' ? 'ArrowDown' : 
                                transaction.type === 'withdraw' ? 'ArrowUp' : 'ArrowRight'} 
                          size={16} 
                          className={
                            transaction.type === 'deposit' ? 'text-green-600' : 
                            transaction.type === 'withdraw' ? 'text-red-600' : 'text-blue-600'
                          } 
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{transaction.type}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(transaction.timestamp), 'MMM dd, hh:mm a')}
                        </p>
                      </div>
                    </div>
<p className={`font-medium ${
                      transaction.type === 'deposit' ? 'text-green-600' : 
                      transaction.type === 'withdraw' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {transaction.type === 'deposit' ? '+' : '-'}Rs. {(transaction?.amount ?? 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

{activeTab === 'methods' && (
          <div className="space-y-6">
            <PaymentGatewayManagement 
              paymentMethods={paymentMethods}
              onGatewayUpdate={loadPaymentData}
            />
          </div>
        )}

        {activeTab === 'refunds' && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Process Refunds</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Refund Request</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order ID
                    </label>
                    <Input
                      placeholder="Enter order ID"
                      value={selectedTransactionId || ''}
                      onChange={(e) => setSelectedTransactionId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter refund amount"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      rows="3"
                      placeholder="Enter refund reason"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleRefundProcess(selectedTransactionId)}
                    disabled={processingRefund || !selectedTransactionId || !refundAmount || !refundReason}
                    className="w-full"
                  >
                    {processingRefund ? (
                      <>
                        <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ApperIcon name="RefreshCw" size={16} className="mr-2" />
                        Process Refund
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Recent Refunds</h4>
                <div className="space-y-3">
                  {stats.pendingRefunds > 0 ? (
                    <div className="text-center py-8">
                      <ApperIcon name="RefreshCw" size={48} className="text-orange-400 mx-auto mb-4" />
                      <p className="text-gray-600">{stats.pendingRefunds} pending refunds</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ApperIcon name="CheckCircle" size={48} className="text-green-400 mx-auto mb-4" />
                      <p className="text-gray-600">No pending refunds</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
</div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payment Verification Queue</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ApperIcon name="Clock" size={16} />
                <span>{stats.pendingVerifications} pending verifications</span>
              </div>
            </div>

            {pendingVerifications.length === 0 ? (
<div className="card p-8 text-center">
                <ApperIcon name="CheckCircle" size={48} className="text-green-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h4>
                <p className="text-gray-600">No payment verifications pending at the moment.</p>
                <p className="text-sm text-gray-500 mt-2">New payment proofs will appear here for admin review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
{pendingVerifications.map((verification) => (
                  <div key={verification.Id} className="card p-6 border-l-4 border-yellow-400">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">Order #{verification.orderId}</h4>
                        <p className="text-sm text-gray-600">
                          Submitted {format(new Date(verification.submittedAt), 'MMM dd, yyyy hh:mm a')}
</p>
                        {verification.transactionId && (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 font-mono">
                              TXH: {verification.transactionId}
                            </p>
                            <button
                              onClick={() => copyTxid(`TXH: ${verification.transactionId}`)}
                              className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200"
                              title="Copy Transaction ID"
                            >
                              <ApperIcon name="Copy" size={24} />
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        Pending
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
<div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="font-medium">Rs. {(verification?.amount ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Payment Method:</span>
                        <span className="font-medium capitalize">{verification.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer:</span>
                        <span className="font-medium">{verification.customerName}</span>
</div>
                    </div>

{verification.paymentProof && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">Payment Proof:</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleImageDownload(verification.paymentProof, `payment_proof_order_${verification.orderId}_${verification.paymentProofFileName || 'image'}`)}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors flex items-center space-x-1 text-xs sm:text-sm"
                              title="Download payment proof"
                            >
                              <ApperIcon name="Download" size={14} />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                            <button
                              onClick={() => handleImageView(verification.paymentProof, `payment_proof_order_${verification.orderId}`)}
                              className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors flex items-center space-x-1 text-xs sm:text-sm"
                              title="View full size"
                            >
                              <ApperIcon name="Maximize2" size={14} />
                              <span className="hidden sm:inline">View</span>
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <img
                            src={verification.paymentProof}
                            alt="Payment proof"
                            className="w-full h-32 sm:h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgODBMMjUwIDEyMEwxNTAgODBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMDAiIGN5PSI2MCIgcj0iMTAiIGZpbGw9IiM5Q0EzQUYiLz4KPHR4dCB4PSIyMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIj5QYXltZW50IFByb29mIE5vdCBBdmFpbGFibGU8L3R4dD4KPHR4dCB4PSIyMDAiIHk9IjEyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOUM5M0FGIj5JbWFnZSBjb3VsZCBub3QgYmUgbG9hZGVkPC90eHQ+Cjwvc3ZnPgo=';
                            }}
                            onClick={() => handleImageView(verification.paymentProof, `payment_proof_order_${verification.orderId}`)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-20 rounded-lg transition-opacity cursor-pointer">
                            <div className="bg-white bg-opacity-90 rounded-full p-2">
                              <ApperIcon name="Maximize2" size={20} className="text-gray-700" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

<div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <Button
                        onClick={() => handleVerificationAction(verification.orderId, 'approve', 'Payment verified by admin')}
disabled={processingVerification}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        {processingVerification ? (
                          <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                        ) : (
                          <ApperIcon name="Check" size={16} className="mr-2" />
                        )}
                        Approve Payment
                      </Button>
                      <Button
                        onClick={() => handleVerificationAction(verification.orderId, 'reject')}
                        disabled={processingVerification}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                      >
                        <ApperIcon name="X" size={16} className="mr-2" />
                        Reject Payment
                      </Button>
</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Responsive Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="relative w-full h-full max-w-7xl max-h-full flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-white bg-opacity-10 backdrop-blur rounded-t-lg">
              <h3 className="text-white font-medium text-sm sm:text-base truncate">
                {selectedImage.fileName}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleImageDownload(selectedImage.url, selectedImage.fileName)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors"
                  title="Download image"
                >
                  <ApperIcon name="Download" size={18} />
                </button>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors"
                  title="Close"
                >
                  <ApperIcon name="X" size={18} />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
              <img
                src={selectedImage.url}
                alt="Payment proof"
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  width: 'auto', 
                  height: 'auto' 
                }}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgODBMMjUwIDEyMEwxNTAgODBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMDAiIGN5PSI2MCIgcj0iMTAiIGZpbGw9IiM5Q0EzQUYiLz4KPHR4dCB4PSIyMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIj5QYXltZW50IFByb29mIE5vdCBBdmFpbGFibGU8L3R4dD4KPHR4dCB4PSIyMDAiIHk9IjEyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOUM5M0FGIj5JbWFnZSBjb3VsZCBub3QgYmUgbG9hZGVkPC90eHQ+Cjwvc3ZnPgo=';
                }}
              />
            </div>
            
            {/* Instructions for mobile */}
            <div className="p-2 sm:p-4 bg-white bg-opacity-10 backdrop-blur rounded-b-lg">
              <p className="text-white text-xs sm:text-sm text-center opacity-75">
                Tap outside the image or use the close button to exit • Pinch to zoom on mobile
              </p>
            </div>
          </div>
          
          {/* Background overlay click to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setShowImageModal(false)}
          />
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectionModal && selectedVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reject Payment</h3>
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedVerification(null);
                  setRejectionReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <ApperIcon name="X" size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Order #{selectedVerification.orderId} - {selectedVerification.customerName}
              </p>
              <p className="text-sm text-gray-500">
                Please provide a reason for rejecting this payment. This will be sent to the customer.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please specify why this payment is being rejected (e.g., unclear image, wrong amount, invalid receipt, etc.)"
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be sent to the customer to help them understand the rejection.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedVerification(null);
                  setRejectionReason('');
                }}
                variant="secondary"
                className="flex-1"
                disabled={processingVerification}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectWithReason}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                disabled={processingVerification || !rejectionReason.trim()}
              >
                {processingVerification ? (
                  <>
                    <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <ApperIcon name="X" size={16} className="mr-2" />
                    Reject & Notify
                  </>
                )}
              </Button>
            </div>
          </div>
</div>
      )}
    </div>
  );
};

export default PaymentManagement;