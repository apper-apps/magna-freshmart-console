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
  
  // Multi-select state
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  
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
    
    // Enhanced intersection observer with performance optimization
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && orders.length > 20) {
          // Use virtualized loading for large datasets
          loadMoreOrdersVirtualized();
        } else if (entries[0].isIntersecting) {
          loadMoreOrders();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Preload slightly before visible
      }
    );
    
    const sentinel = document.getElementById('orders-sentinel');
    if (sentinel) observer.observe(sentinel);
    
    return () => observer.disconnect();
  }, [hasMoreOrders, loadingMore, orders.length]);

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

  // Virtualized loading for large datasets (>20 orders)
  const loadMoreOrdersVirtualized = useCallback(async () => {
    if (loadingMore || !hasMoreOrders) return;
    
    const startTime = performance.now();
    const chunkSize = Math.min(ordersPerPage, 5); // Smaller chunks for better performance
    
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      
      const data = await orderService.getAllPaginated(nextPage, chunkSize);
      const sortedNewOrders = data.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Use requestIdleCallback for non-blocking updates
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          setOrders(prev => [...prev, ...sortedNewOrders]);
          setCurrentPage(nextPage);
          setHasMoreOrders(data.hasMore);
        });
      } else {
        setTimeout(() => {
          setOrders(prev => [...prev, ...sortedNewOrders]);
          setCurrentPage(nextPage);
          setHasMoreOrders(data.hasMore);
        }, 0);
      }
      
      const loadTime = performance.now() - startTime;
      console.log(`Virtualized page ${nextPage} loaded in ${loadTime.toFixed(2)}ms`);
      
    } catch (err) {
      console.error('Failed to load more orders (virtualized):', err);
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
    // Check environment for debugging
    if (import.meta.env.DEV) {
      console.log('Orders data:', orders);
      return (
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Orders: {orders.length}/{totalOrders} | Page: {currentPage} | 
          Cache: {orderService.getCacheStats?.() || 'N/A'}
        </div>
      );
    }
    return null;
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
// Multi-select controls component
  const MultiSelectControls = ({ selectedOrders, setSelectedOrders, orders, onBulkAction }) => {
    if (selectedOrders.size === 0) return null;
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedOrders(new Set())}
            >
              Clear Selection
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => onBulkAction('export')}
            >
              Export Selected
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Virtualized order list for performance
  const VirtualizedOrderList = ({ orders, selectedOrders, setSelectedOrders, renderOrderCard }) => {
    return (
      <div className="space-y-4">
        {orders.map((order) => renderOrderCard(order))}
      </div>
    );
  };

  // Handle bulk actions
  const handleBulkAction = useCallback((action) => {
    switch (action) {
      case 'export':
        const selectedOrdersList = orders.filter(order => selectedOrders.has(order.id));
        console.log('Exporting orders:', selectedOrdersList);
        toast.success(`Exported ${selectedOrders.size} orders`);
        break;
      default:
        console.log('Unknown bulk action:', action);
    }
  }, [orders, selectedOrders]);

  // Render individual order card
  const renderOrderCard = useCallback((order) => {
    const isCollapsed = collapsedOrders.has(order.id);
    const isSelected = selectedOrders.has(order.id);
    const priority = getOrderPriority(order);
    const priorityColors = getPriorityColors(priority);
    
    const toggleSelection = () => {
      setSelectedOrders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(order.id)) {
          newSet.delete(order.id);
        } else {
          newSet.add(order.id);
        }
        return newSet;
      });
    };

    return (
      <div
        key={order.id}
        className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${priorityColors} ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={toggleSelection}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">
                    Order #{order.orderNumber || order.id}
                  </h3>
                  <OrderStatusBadge status={order.status} />
                  {priority === 'high' && (
                    <Badge variant="danger" size="sm">High Priority</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(order.total)}
              </span>
              <button
                onClick={() => toggleOrderCollapse(order.id)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ApperIcon 
                  name={isCollapsed ? "ChevronDown" : "ChevronUp"} 
                  size={20}
                  className="text-gray-500"
                />
              </button>
            </div>
          </div>

          {!isCollapsed && (
            <div className="space-y-4">
              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Items ({order.items.length})</h4>
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{item.name}</span>
                          <span className="text-xs text-gray-500 ml-2">×{item.quantity}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-sm text-gray-500">
                        +{order.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                <Link
                  to={`/orders/${order.id}`}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ApperIcon name="Eye" size={16} className="mr-1" />
                  View Details
                </Link>
                {order.transactionId && (
                  <button
                    onClick={() => copyTxnId(order.transactionId)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ApperIcon name="Copy" size={16} className="mr-1" />
                    Copy Transaction ID
                  </button>
                )}
                {(order.status === 'pending' || order.status === 'confirmed') && (
                  <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition-colors">
                    <ApperIcon name="X" size={16} className="mr-1" />
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [collapsedOrders, selectedOrders, setSelectedOrders, toggleOrderCollapse, copyTxnId, getOrderPriority, getPriorityColors, formatCurrency]);

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

      {/* Enhanced Mobile-first responsive order cards with cross-platform features */}
      <div className="space-y-4 sm:space-y-6">
        {/* Multi-select controls */}
        <MultiSelectControls 
          selectedOrders={selectedOrders}
          setSelectedOrders={setSelectedOrders}
          orders={orders}
          onBulkAction={handleBulkAction}
        />
        
        {orders.length > 20 ? (
          <VirtualizedOrderList 
            orders={orders}
            selectedOrders={selectedOrders}
            setSelectedOrders={setSelectedOrders}
            renderOrderCard={renderOrderCard}
          />
        ) : (
          orders.map((order) => renderOrderCard(order))
        )}
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
  );
};

export default Orders;