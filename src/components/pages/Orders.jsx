import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "react-toastify";
import clipboardService from "@/services/ClipboardService";
import { orderService } from "@/services/api/orderService";
import ApperIcon from "@/components/ApperIcon";
import OrderStatusBadge from "@/components/molecules/OrderStatusBadge";
import Loading from "@/components/ui/Loading";
import Error from "@/components/ui/Error";
import Empty from "@/components/ui/Empty";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import { formatCurrency } from "@/utils/currency";
const Orders = () => {
const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsedOrders, setCollapsedOrders] = useState(new Set());
  
  // Lazy loading state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Performance optimization state
  const [retryCount, setRetryCount] = useState(0);
  const ordersPerPage = 10;

useEffect(() => {
    loadInitialOrders();
  }, []);
  
  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!hasMoreOrders || loadingMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreOrders();
        }
      },
      { threshold: 0.1 }
    );
    
    const sentinel = document.getElementById('orders-sentinel');
    if (sentinel) observer.observe(sentinel);
    
    return () => observer.disconnect();
  }, [hasMoreOrders, loadingMore]);

// Enhanced loading with caching and retry logic
  const loadInitialOrders = useCallback(async () => {
    const startTime = performance.now();
    
    try {
      setLoading(true);
      setError(null);
      setRetryCount(0);
      
      const data = await orderService.getAllPaginated(1, ordersPerPage);
      const sortedOrders = data.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setOrders(sortedOrders);
      setTotalOrders(data.total);
      setHasMoreOrders(data.hasMore);
      setCurrentPage(1);
      
      // Performance tracking
      const loadTime = performance.now() - startTime;
      console.log(`Initial orders loaded in ${loadTime.toFixed(2)}ms`);
      
    } catch (err) {
      console.error('Failed to load orders:', err);
      await handleOrderLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [ordersPerPage]);

  // Load more orders for lazy loading
  const loadMoreOrders = useCallback(async () => {
    if (loadingMore || !hasMoreOrders) return;
    
    const startTime = performance.now();
    
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      
      const data = await orderService.getAllPaginated(nextPage, ordersPerPage);
      const sortedNewOrders = data.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setOrders(prev => [...prev, ...sortedNewOrders]);
      setCurrentPage(nextPage);
      setHasMoreOrders(data.hasMore);
      
      // Performance tracking
      const loadTime = performance.now() - startTime;
      console.log(`Page ${nextPage} loaded in ${loadTime.toFixed(2)}ms`);
      
    } catch (err) {
      console.error('Failed to load more orders:', err);
      await handleOrderLoadError(err);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, ordersPerPage, loadingMore, hasMoreOrders]);

  // Enhanced error handling with retry logic
  const handleOrderLoadError = async (err) => {
    const maxRetries = 3;
    
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        if (orders.length === 0) {
          loadInitialOrders();
        } else {
          loadMoreOrders();
        }
      }, delay);
    } else {
      setError(err.message || 'Failed to load orders after multiple attempts');
    }
  };

  // Fallback for legacy loadOrders method
  const loadOrders = loadInitialOrders;

  const copyTxnId = async (transactionId) => {
    if (!transactionId) {
      toast.error('No transaction ID available to copy');
      return;
    }

    try {
      const success = await clipboardService.copyTransactionId(transactionId);
      if (!success) {
        // Additional fallback - show transaction ID in alert if clipboard fails
        const shouldShowAlert = window.confirm(
          'Clipboard copy failed. Would you like to see the transaction ID to copy manually?'
        );
        if (shouldShowAlert) {
          alert(`Transaction ID: ${transactionId}`);
        }
      }
    } catch (error) {
      console.error('Error copying transaction ID:', error);
      toast.error('Failed to copy transaction ID');
    }
  };

// Performance metrics display (development only)
  const performanceStats = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
        Orders: {orders.length}/{totalOrders} | Page: {currentPage} | 
        Cache: {orderService.getCacheStats?.() || 'N/A'}
      </div>
    );
  }, [orders.length, totalOrders, currentPage]);

  if (loading && orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {performanceStats}
        <Loading type="orders" />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {performanceStats}
        <Error 
          message={`${error} ${retryCount > 0 ? `(Retry ${retryCount})` : ''}`}
          onRetry={loadOrders} 
        />
      </div>
    );
  }

  if (orders.length === 0 && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {performanceStats}
        <Empty 
          type="orders" 
          onAction={() => window.location.href = '/category/All'}
        />
      </div>
    );
  }
const toggleOrderCollapse = (orderId) => {
    setCollapsedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getOrderPriority = (order) => {
    const now = new Date();
    const orderDate = new Date(order.createdAt);
    const hoursSinceOrder = (now - orderDate) / (1000 * 60 * 60);
    
    if (order.status === 'pending' && hoursSinceOrder > 24) return 'high';
    if (order.status === 'confirmed' && hoursSinceOrder > 48) return 'high';
    if (order.total > 5000) return 'medium';
    return 'low';
  };

  const getPriorityColors = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-500 bg-red-50';
      case 'medium':
        return 'border-l-4 border-orange-500 bg-orange-50';
      default:
        return 'border-l-4 border-green-500 bg-green-50';
    }
  };
return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {performanceStats}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-1">
            Track and manage your orders ({orders.length}{totalOrders > orders.length ? ` of ${totalOrders}` : ''})
          </p>
        </div>
      </div>
      {/* Mobile-first responsive order cards */}
      <div className="space-y-4 sm:space-y-6">
        {orders.map((order) => (
<div key={order.id} className={`card p-4 sm:p-6 hover:shadow-premium transition-all duration-300 mobile-order-card ${getPriorityColors(getOrderPriority(order))}`}>
            {/* Mobile-optimized header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
              <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                <div className="bg-gradient-to-r from-primary to-accent p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <ApperIcon name="Package" size={20} className="text-white sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Order #{order.id}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {format(new Date(order.createdAt), 'MMM dd, yyyy • hh:mm a')}
                  </p>
                  {order.transactionId && (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500 font-mono">
                        TXN: {order.transactionId}
                      </span>
                      <button
                        onClick={() => copyTxnId(order.transactionId)}
                        className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors duration-200 group touch-manipulation min-h-[48px] min-w-[48px] justify-center"
                        title="Copy transaction ID"
                      >
                        <ApperIcon 
                          name="Copy" 
                          size={12} 
                          className="group-hover:scale-110 transition-transform duration-200" 
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Mobile-responsive status and total */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <OrderStatusBadge status={order.status} />
                  {/* Approval Status Badge */}
                  {order.approvalStatus && (
                    <div className="flex items-center space-x-1">
                      {order.approvalStatus === 'approved' && (
                        <Badge variant="success" className="text-xs">
                          <ApperIcon name="CheckCircle" size={12} className="mr-1" />
                          Approved
</Badge>
                      )}
                      {order.approvalStatus === 'pending' && (
                        <Badge variant="warning" className="text-xs animate-pulse">
                          <ApperIcon name="Clock" size={12} className="mr-1" />
                          Pending Approval
                        </Badge>
                      )}
                      {order.approvalStatus === 'rejected' && (
                        <Badge variant="danger" className="text-xs">
                          <ApperIcon name="XCircle" size={12} className="mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
{(order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa' || order.paymentMethod === 'bank') && (
                  <div className="flex items-center space-x-1">
                    {order.verificationStatus === 'verified' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                        <ApperIcon name="CheckCircle" size={12} className="mr-1" />
                        Payment Verified
                      </span>
                    )}
                    {order.verificationStatus === 'rejected' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center">
                        <ApperIcon name="XCircle" size={12} className="mr-1" />
                        Payment Rejected
                      </span>
                    )}
                    {order.verificationStatus === 'pending' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center">
                        <ApperIcon name="Clock" size={12} className="mr-1" />
                        Pending Verification
                      </span>
                    )}
                  </div>
                )}
                <div className="text-right sm:text-left sm:mt-2">
                  <p className="text-lg sm:text-xl font-bold gradient-text">
                    {(() => {
                      // Calculate subtotal if order total is missing or zero
                      if (!order?.total || order.total === 0) {
                        const itemsSubtotal = order?.items?.reduce((sum, item) => {
                          return sum + ((item.price || 0) * (item.quantity || 0));
                        }, 0) || 0;
                        const deliveryCharge = order?.deliveryCharge || 0;
                        return formatCurrency(itemsSubtotal + deliveryCharge);
                      }
                      return formatCurrency(order.total);
                    })()}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {order?.items?.length || 0} items
                  </p>
                </div>
              </div>
            </div>
            {/* Mini Status Timeline for Mobile */}
            <div className="block sm:hidden mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Order Progress</span>
                <span className="text-xs text-gray-500">Swipe to view</span>
              </div>
              <div className="horizontal-timeline-container overflow-x-auto">
                <div className="horizontal-timeline-track flex space-x-4 pb-2">
                  {['pending', 'confirmed', 'packed', 'shipped', 'delivered'].map((status, index) => {
                    const statusIcons = {
                      pending: 'ShoppingCart',
                      confirmed: 'CheckCircle',
                      packed: 'Package',
                      shipped: 'Truck',
                      delivered: 'Home'
                    };
                    const statusLabels = {
                      pending: 'Placed',
                      confirmed: 'Confirmed',
                      packed: 'Packed',
                      shipped: 'Shipped',
                      delivered: 'Delivered'
                    };
                    const currentIndex = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'].findIndex(s => s === order.status?.toLowerCase());
                    const isCompleted = index <= currentIndex;
                    const isActive = index === currentIndex;
                    
                    return (
                      <div key={status} className="flex flex-col items-center min-w-[80px]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                          isCompleted ? 'bg-gradient-to-r from-primary to-accent text-white' : 'bg-gray-200 text-gray-400'
                        }`}>
                          <ApperIcon name={statusIcons[status]} size={16} />
                        </div>
<span className={`text-xs font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                          {statusLabels[status]}
                        </span>
                        {isActive && (
                          <div className="w-2 h-2 bg-primary rounded-full mt-1 animate-pulse"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Details Section */}
            <div>
              {/* Collapsible Payment Proof Display */}
              {order.paymentProof && (order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa' || order.paymentMethod === 'bank') && (
                <div className="payment-proof-section mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100 transition-colors duration-200 touch-manipulation"
                      onClick={(e) => {
                        const section = e.currentTarget.parentElement;
                        const content = section.querySelector('.payment-proof-content');
                        const icon = e.currentTarget.querySelector('.collapse-icon');
                        
                        if (content.style.maxHeight) {
                          content.style.maxHeight = null;
                          content.classList.remove('expanded');
                          icon.style.transform = 'rotate(0deg)';
                        } else {
                          content.style.maxHeight = content.scrollHeight + 'px';
                          content.classList.add('expanded');
                          icon.style.transform = 'rotate(180deg)';
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <ApperIcon name="FileImage" size={16} className="text-blue-600" />
                        <h4 className="text-sm font-medium text-blue-900">Payment Proof</h4>
                      </div>
                      <ApperIcon 
                        name="ChevronDown" 
                        size={16} 
                        className="text-blue-600 collapse-icon transition-transform duration-200" 
                      />
                    </button>
                    
                    <div className="payment-proof-content max-h-0 overflow-hidden transition-all duration-300 ease-in-out">
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700">File Name:</span>
                              <span className="font-medium text-blue-900">
                                {order.paymentProof.fileName || 'payment_proof.jpg'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700">Upload Date:</span>
                              <span className="font-medium text-blue-900">
                                {format(new Date(order.paymentProof.uploadedAt || order.createdAt), 'MMM dd, yyyy')}
                              </span>
</div>
                            {order.paymentProof.fileSize && (
                              <div className="flex justify-between text-sm">
                                <span className="text-blue-700">File Size:</span>
                                <span className="font-medium text-blue-900">
                                  {(order.paymentProof.fileSize / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <img
                              src={(() => {
                                // Validate and return payment proof image URL
                                const proofData = order.paymentProof?.dataUrl;
                                if (proofData && typeof proofData === 'string') {
                                  // Check if it's a valid base64 data URL
                                  if (proofData.startsWith('data:image/') && proofData.includes('base64,')) {
                                    return proofData;
                                  }
                                  // Handle other URL formats
                                  if (proofData.startsWith('http') || proofData.startsWith('/')) {
                                    return proofData;
                                  }
                                }
                                // Fallback to enhanced placeholder
                                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDE1MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRUZGNkZGIiBzdHJva2U9IiNENERBRjciIHN0cm9rZS13aWR0aD0iMSIvPgo8cGF0aCBkPSJNNjAgNDBMOTAgNzBMNjAgNDBaIiBzdHJva2U9IiM2MkM0NjIiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSI3MCIgY3k9IjMwIiByPSI1IiBmaWxsPSIjNjJDNDYyIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMzc0MTUxIj5QYXltZW50IFByb29mPC90ZXh0Pgo8dGV4dCB4PSI3NSIgeT0iNjgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjNjc3NDgwIj5DbGljayB0byBWaWV3PC90ZXh0Pgo8L3N2Zz4K';
                              })()}
                              alt="Payment proof"
                              className="w-24 h-16 sm:w-32 sm:h-20 object-cover rounded-lg border border-blue-200 cursor-pointer transition-transform group-hover:scale-105"
                              onError={(e) => {
                                // Only set fallback if not already a fallback
                                if (!e.target.src.includes('data:image/svg+xml')) {
                                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDE1MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRkVGMkYyIiBzdHJva2U9IiNGQ0E1QTUiIHN0cm9rZS13aWR0aD0iMSIvPgo8cGF0aCBkPSJNNTUgNDVMNzAgNjBMODUgNDVNNzAgNDBWNzAiIHN0cm9rZT0iI0VGNDQ0NCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTkxQjFCIj5JbWFnZSBFcnJvcjwvdGV4dD4KPHR4dCB4PSI3NSIgeT0iNjgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjOTkxQjFCIj5DbGljayB0byBWaWV3PC90ZXh0Pgo8L3N2Zz4K';
                                }
                              }}
                              onClick={() => {
                                // Enhanced modal display with better error handling
                                const proofData = order.paymentProof?.dataUrl;
                                let imageUrl = proofData;
                                
                                // Validate image URL before modal display
                                if (!imageUrl || typeof imageUrl !== 'string') {
                                  imageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjlGQUZCIiBzdHJva2U9IiNFNUU3RUIiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMTYwIDE0MEwyNDAgMjAwTDE2MCAxNDBaIiBzdHJva2U9IiM2MkM0NjIiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMDAiIGN5PSIxMjAiIHI9IjEwIiBmaWxsPSIjNjJDNDYyIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzNzQxNTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlBheW1lbnQgUHJvb2Y8L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMTkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2Nzc0ODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIGltYWdlIGF2YWlsYWJsZTwvdGV4dD4KPHR4dCB4PSIyMDAiIHk9IjIxMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOUI5Q0EwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DbGljayB0byBjbG9zZTwvdGV4dD4KPC9zdmc+Cg==';
                                }
                                
                                const modal = document.createElement('div');
                                modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
                                modal.innerHTML = `
                                  <div class="relative max-w-4xl max-h-full">
                                    <img src="${imageUrl}" alt="Payment proof" class="max-w-full max-h-full object-contain rounded-lg" />
                                    <button class="absolute top-2 right-2 bg-white text-black rounded-full p-2 hover:bg-gray-100 min-w-[48px] min-h-[48px] flex items-center justify-center">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </button>
                                  </div>
                                `;
                                modal.onclick = (e) => {
                                  if (e.target === modal || e.target.tagName === 'BUTTON' || e.target.tagName === 'svg' || e.target.tagName === 'line') {
                                    document.body.removeChild(modal);
                                  }
                                };
                                document.body.appendChild(modal);
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center rounded-lg transition-all">
                              <ApperIcon name="Eye" size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>
                      </div>
</div>
                  </div>
                </div>
              )}
{/* Order Items Preview */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Items ({order?.items?.length || 0})
                  </h4>
                  <button
                    onClick={() => toggleOrderCollapse(order.id)}
                    className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span>{collapsedOrders.has(order.id) ? 'Show' : 'Hide'}</span>
                    <ApperIcon 
                      name={collapsedOrders.has(order.id) ? 'ChevronDown' : 'ChevronUp'} 
                      size={16} 
                      className="transition-transform duration-200"
                    />
                  </button>
                </div>
                
                <div className={`order-items-section ${collapsedOrders.has(order.id) ? 'collapsed' : 'expanded'}`}>
                  <div className="space-y-2">
                    {(collapsedOrders.has(order.id) ? order?.items?.slice(0, 2) : order?.items)?.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{item.quantity}x</span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          Rs. {((item.quantity || 0) * (item.price || 0)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {collapsedOrders.has(order.id) && order?.items?.length > 2 && (
                      <div className="text-sm text-gray-500 italic">
                        +{order.items.length - 2} more items...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Mobile-responsive order actions with swipe actions */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <ApperIcon name="MapPin" size={14} />
                  <span>{order.deliveryAddress.city}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ApperIcon name="CreditCard" size={14} />
                  <span className="capitalize">{order.paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>
              
              {/* Mobile Swipe Actions */}
              <div className="block sm:hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Quick Actions</span>
                  <span className="text-xs text-gray-400">⟵ Swipe</span>
                </div>
                <div className="swipe-actions-container overflow-x-auto">
                  <div className="swipe-actions-track flex space-x-2 pb-2">
                    <Link 
                      to={`/orders/${order.id}`}
                      className="flex items-center space-x-1 text-primary hover:text-primary-dark transition-colors text-sm bg-primary/5 px-4 py-2 rounded-lg min-w-[120px] justify-center touch-manipulation"
                    >
                      <ApperIcon name="Eye" size={14} />
                      <span>View Details</span>
                    </Link>
                    
                    <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors text-sm bg-blue-50 px-4 py-2 rounded-lg min-w-[120px] justify-center touch-manipulation">
                      <ApperIcon name="MessageCircle" size={14} />
                      <span>Chat Support</span>
                    </button>
                    
                    {order.status === 'delivered' && (
                      <button className="flex items-center space-x-1 text-green-600 hover:text-green-700 transition-colors text-sm bg-green-50 px-4 py-2 rounded-lg min-w-[120px] justify-center touch-manipulation">
                        <ApperIcon name="RotateCcw" size={14} />
                        <span>Reorder</span>
                      </button>
                    )}
                    
                    <button className="flex items-center space-x-1 text-orange-600 hover:text-orange-700 transition-colors text-sm bg-orange-50 px-4 py-2 rounded-lg min-w-[120px] justify-center touch-manipulation">
                      <ApperIcon name="Share" size={14} />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Desktop Actions */}
              <div className="hidden sm:flex flex-wrap gap-2 sm:gap-3">
                <Link 
                  to={`/orders/${order.id}`}
                  className="flex items-center space-x-1 sm:space-x-2 text-primary hover:text-primary-dark transition-colors text-sm bg-primary/5 px-3 py-1.5 rounded-lg"
>
                  <ApperIcon name="Eye" size={14} />
                  <span>View Details</span>
                </Link>
                <button className="flex items-center space-x-1 sm:space-x-2 text-blue-600 hover:text-blue-700 transition-colors text-sm bg-blue-50 px-3 py-1.5 rounded-lg">
                  <ApperIcon name="MessageCircle" size={14} />
                  <span>Chat Support</span>
                </button>
                {order.status === 'delivered' && (
                  <button className="flex items-center space-x-1 sm:space-x-2 text-green-600 hover:text-green-700 transition-colors text-sm bg-green-50 px-3 py-1.5 rounded-lg">
                    <ApperIcon name="RotateCcw" size={14} />
                    <span>Reorder</span>
                  </button>
                )}
              </div>
              
              {/* Wallet Transaction Section */}
              {order.walletTransaction && (
                <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <ApperIcon name="Wallet" size={16} className="text-purple-600" />
                    <h4 className="text-sm font-medium text-purple-900">Wallet Transaction</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">Transaction ID:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-purple-900">{order.walletTransaction.transactionId}</span>
                        <button
                          onClick={() => copyTxnId(order.walletTransaction.transactionId)}
                          className="flex items-center text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded transition-colors duration-200 group"
                          title="Copy wallet transaction ID"
                        >
                          <ApperIcon 
                            name="Copy" 
                            size={10} 
                            className="group-hover:scale-110 transition-transform duration-200" 
                          />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">Type:</span>
                      <span className="font-medium text-purple-900 capitalize">
                        {order.walletTransaction.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">Amount:</span>
                      <span className="font-semibold text-purple-900">
                        {formatCurrency(order.walletTransaction.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
))}
      </div>

      {/* Lazy Loading Sentinel */}
      {hasMoreOrders && (
        <div id="orders-sentinel" className="flex justify-center py-8">
          {loadingMore ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Loading more orders...</span>
            </div>
          ) : (
            <button
              onClick={loadMoreOrders}
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Load More Orders
            </button>
          )}
        </div>
      )}

      {/* Load Complete Message */}
      {!hasMoreOrders && orders.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <ApperIcon name="CheckCircle" size={20} className="mx-auto mb-2" />
          <p>All orders loaded ({orders.length} total)</p>
        </div>
      )}

      {/* Network Status Indicator */}
      {error && orders.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg z-40">
          <div className="flex items-center space-x-2">
            <ApperIcon name="AlertTriangle" size={16} />
            <span className="text-sm">Network issue detected. Retrying...</span>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-50">
        <Link 
          to="/category/All"
          className="fab-primary flex items-center justify-center w-14 h-14 bg-gradient-to-r from-primary to-accent text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          title="Shop More"
        >
          <ApperIcon name="Plus" size={24} />
        </Link>
        
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fab-secondary flex items-center justify-center w-12 h-12 bg-white text-gray-600 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 border border-gray-200"
          title="Scroll to Top"
        >
          <ApperIcon name="ArrowUp" size={20} />
        </button>
      </div>
      </div>
    </div>
  );
};

export default Orders;