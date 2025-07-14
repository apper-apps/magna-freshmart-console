import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import formatCurrency from "@/utils/currency";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Orders from "@/components/pages/Orders";
import Home from "@/components/pages/Home";
import { orderService } from "@/services/api/orderService";

const OrderSummary = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('order-summary');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [userRole, setUserRole] = useState('customer');
  const [vendorAvailability, setVendorAvailability] = useState({});
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [vendorItemsLoading, setVendorItemsLoading] = useState(false);
  const [vendorItems, setVendorItems] = useState({});
  const [priceVisibility, setPriceVisibility] = useState({
    showCostPrices: false,
    showSellingPrices: true
  });
const [priceSummaryData, setPriceSummaryData] = useState(null);
  const [priceSummaryLoading, setPriceSummaryLoading] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [priceSummary, setPriceSummary] = useState(null);

  useEffect(() => {
    loadOrderSummary();
    loadUserRole();
    loadPriceVisibilityPreferences();
  }, [orderId]);

  const loadUserRole = () => {
    try {
      const role = localStorage.getItem('userRole') || 'customer';
      const vendorId = localStorage.getItem('vendorId');
      
      setUserRole(role);
      setIsAdmin(role === 'admin');
      setIsVendor(role === 'vendor' && vendorId);
      
      // Set default price visibility based on role
      if (role === 'customer') {
        setPriceVisibility({
          showCostPrices: false,
          showSellingPrices: true
        });
      } else if (role === 'vendor') {
        setPriceVisibility({
          showCostPrices: true,
          showSellingPrices: true
        });
      } else if (role === 'admin') {
        setPriceVisibility({
          showCostPrices: true,
          showSellingPrices: true
        });
      }
    } catch (error) {
      console.warn('Failed to load user role:', error);
      setUserRole('customer');
      setIsAdmin(false);
      setIsVendor(false);
    }
  };

  const loadPriceVisibilityPreferences = () => {
    try {
      const saved = localStorage.getItem('priceVisibilityPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        setPriceVisibility(prev => ({ ...prev, ...preferences }));
      }
    } catch (error) {
      console.warn('Failed to load price visibility preferences:', error);
    }
  };

  const savePriceVisibilityPreferences = (preferences) => {
    try {
      localStorage.setItem('priceVisibilityPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save price visibility preferences:', error);
    }
  };

  const handlePriceVisibilityChange = (type, value) => {
    // Prevent customers from viewing cost prices
    if (type === 'showCostPrices' && value && userRole === 'customer') {
      toast.error('Cost prices are not available for customers');
      return;
    }

    const newVisibility = {
      ...priceVisibility,
      [type]: value
    };

    setPriceVisibility(newVisibility);
    savePriceVisibilityPreferences(newVisibility);
    
    toast.success(`${type === 'showCostPrices' ? 'Cost' : 'Selling'} prices ${value ? 'shown' : 'hidden'}`);
  };

  const loadPriceSummary = async () => {
    if (!order) return;
    
    try {
      setPriceSummaryLoading(true);
      const priceData = await orderService.getPriceSummaryData(order.id, {
        userRole,
        vendorId: isVendor ? localStorage.getItem('vendorId') : null,
        includeCategories: true,
        includeVendorBreakdown: true
      });
      
      setPriceSummaryData(priceData);
      toast.success('Price summary loaded successfully');
    } catch (error) {
      console.error('Failed to load price summary:', error);
      toast.error('Failed to load price summary: ' + error.message);
    } finally {
      setPriceSummaryLoading(false);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    
    if (tab === 'price-summary' && !priceSummaryData) {
      await loadPriceSummary();
    }
  };

const loadOrderSummary = async () => {
    // Enhanced validation for orderId with comprehensive error recovery
    if (!orderId || orderId.trim() === '') {
      const errorMsg = 'Order ID is required to view order summary';
      setError(errorMsg);
      setLoading(false);
      toast.error(errorMsg);
      console.error('OrderSummary: Missing orderId parameter');
      return;
    }

    // Validate orderId is numeric with detailed logging
    const numericOrderId = parseInt(orderId);
    if (isNaN(numericOrderId) || numericOrderId <= 0) {
      const errorMsg = `Invalid order ID format: "${orderId}" - must be a positive integer`;
      setError(errorMsg);
      setLoading(false);
      toast.error('Invalid order ID format');
      console.error('OrderSummary: Invalid orderId format:', { orderId, numericOrderId });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('OrderSummary: Loading order data for ID:', numericOrderId);

      // Enhanced service call with comprehensive error handling and logging
      const orderData = await orderService.getById(numericOrderId);
      
      // Multiple validation layers to prevent blank screen
      if (!orderData) {
        throw new Error(`Order #${numericOrderId} not found in database`);
      }

      // Validate critical order data structure with detailed checks
      if (typeof orderData !== 'object') {
        throw new Error(`Invalid order data type received: ${typeof orderData}`);
      }

      if (!orderData.hasOwnProperty('id') || orderData.id !== numericOrderId) {
        throw new Error(`Order ID mismatch: expected ${numericOrderId}, received ${orderData.id}`);
      }

      if (!orderData.items || !Array.isArray(orderData.items)) {
        console.warn(`Order ${numericOrderId} has invalid items data, initializing empty array`);
        orderData.items = [];
      }

// Validate order totals and set defaults if missing
      if (!orderData.total || orderData.total <= 0) {
        console.warn(`Order ${numericOrderId} has invalid total, calculating from items`);
        orderData.total = orderData.items.reduce((sum, item) => 
          sum + ((item.price || 0) * (item.quantity || 0)), 0) + (orderData.deliveryCharge || 0);
      }

      // Set order data with validated structure
      setOrder(orderData);
      console.log('OrderSummary: Order data loaded successfully:', {
        orderId: orderData.id,
        itemCount: orderData.items?.length || 0,
        total: orderData.total
      });

      // Load vendor availability data if available
      try {
        if (orderData.vendor_availability) {
          setVendorAvailability(orderData.vendor_availability);
        }
      } catch (vendorError) {
        console.warn('Failed to load vendor availability data:', vendorError);
        // Don't fail the entire load for vendor data
      }

      // Load price summary data if on price summary tab
      if (activeTab === 'price-summary') {
        await loadPriceSummary();
      }

      toast.success('Order summary loaded successfully');

    } catch (error) {
      console.error('OrderSummary: Critical error loading order summary:', {
        orderId: numericOrderId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = error.message || 'Failed to load order summary';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Additional error reporting for debugging
      if (error.name === 'TypeError') {
        console.error('OrderSummary: Possible service or data structure issue');
      }
      if (error.message.includes('fetch') || error.message.includes('network')) {
        console.error('OrderSummary: Network or API issue detected');
      }
    } finally {
      setLoading(false);
    }
  };
  const groupItemsByVendor = (items) => {
    const grouped = {};
    
    items.forEach(item => {
      // Mock vendor assignment - in real app would come from product-vendor mapping
      const vendorId = item.productId % 3 + 1; // Simple assignment for demo
      const vendorName = getVendorName(vendorId);
      const category = getItemCategory(item.name);
      
      if (!grouped[category]) {
        grouped[category] = {};
      }
      
      if (!grouped[category][vendorName]) {
        grouped[category][vendorName] = {
          vendorId,
          items: [],
          total: 0
        };
      }
      
      grouped[category][vendorName].items.push(item);
      grouped[category][vendorName].total += item.price * item.quantity;
    });
    
    return grouped;
  };

  const getVendorName = (vendorId) => {
    const vendors = {
      1: 'Fresh Foods Co.',
      2: 'Premium Grocers',
      3: 'Organic Market'
    };
    return vendors[vendorId] || 'Unknown Vendor';
  };

  const getItemCategory = (itemName) => {
    if (itemName.toLowerCase().includes('rice') || itemName.toLowerCase().includes('flour')) {
      return 'Grains & Cereals';
    }
    if (itemName.toLowerCase().includes('meat') || itemName.toLowerCase().includes('chicken') || itemName.toLowerCase().includes('mutton')) {
      return 'Meat & Poultry';
    }
    if (itemName.toLowerCase().includes('apple') || itemName.toLowerCase().includes('mango') || itemName.toLowerCase().includes('banana') || itemName.toLowerCase().includes('orange')) {
      return 'Fruits';
    }
    if (itemName.toLowerCase().includes('tomato') || itemName.toLowerCase().includes('vegetable')) {
      return 'Vegetables';
    }
    return 'Other Items';
  };

  const getAvailabilityStatus = (productId, vendorId) => {
    const key = `${productId}_${vendorId}`;
    const availability = vendorAvailability[key];
    
    if (!availability) return 'pending';
    return availability.available ? 'available' : 'unavailable';
  };
const getAvailabilityBadge = (status) => {
    const statusConfig = {
      available: { variant: 'success', label: 'Available', icon: 'CheckCircle' },
      unavailable: { variant: 'danger', label: 'Unavailable', icon: 'XCircle' },
      pending: { variant: 'warning', label: 'Pending Response', icon: 'Clock' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} size="small" className="flex items-center space-x-1">
        <ApperIcon name={config.icon} size={12} />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const handleVendorSwipe = async (vendorName, vendorData) => {
    try {
      setVendorItemsLoading(true);
      
      // Toggle expansion
      if (expandedVendor === vendorName) {
        setExpandedVendor(null);
        return;
      }

      setExpandedVendor(vendorName);
      
      // Load vendor items if not already loaded
      if (!vendorItems[vendorName]) {
        const vendorItemsData = await orderService.getVendorItems(orderId, vendorData.vendorId);
        setVendorItems(prev => ({
          ...prev,
          [vendorName]: vendorItemsData
        }));
        toast.success(`Loaded ${vendorItemsData.totalItems} items from ${vendorName}`);
      }
      
    } catch (error) {
      console.error('Failed to load vendor items:', error);
      toast.error('Failed to load vendor items: ' + error.message);
      setExpandedVendor(null);
    } finally {
      setVendorItemsLoading(false);
    }
  };

if (loading) {
    return <Loading type="page" />;
  }

  if (error) {
    return <Error message={error} />;
  }

if (!order) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="card p-8">
              <ApperIcon name="Package" size={48} className="mx-auto text-gray-400 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
              <p className="text-gray-600 mb-6">
                {orderId ? `Order #${orderId} could not be found.` : 'No order ID was provided.'}
              </p>
              
              {/* Enhanced error details for debugging */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <h3 className="text-sm font-medium text-red-800 mb-2">Error Details:</h3>
                  <p className="text-sm text-red-700 break-words">{error}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    console.log('OrderSummary: User navigating back to orders');
                    navigate('/orders');
                  }} 
                  className="w-full"
                >
                  <ApperIcon name="ArrowLeft" size={16} className="mr-2" />
                  Back to Orders
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    console.log('OrderSummary: User navigating to home');
                    navigate('/');
                  }} 
                  className="w-full"
                >
                  <ApperIcon name="Home" size={16} className="mr-2" />
                  Go Home
                </Button>
                
                {/* Retry button for debugging */}
                <Button 
                  variant="outline"
                  onClick={() => {
                    console.log('OrderSummary: User retrying order load');
                    loadOrderSummary();
                  }} 
                  className="w-full"
                  size="sm"
                >
                  <ApperIcon name="RefreshCw" size={16} className="mr-2" />
                  Retry Loading
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupedItems = groupItemsByVendor(order.items || []);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/orders')}
              className="flex items-center space-x-2"
            >
              <ApperIcon name="ArrowLeft" size={16} />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Summary</h1>
              <p className="text-gray-600">Order #{order.id}</p>
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <Badge variant="info" size="medium">
                <ApperIcon name="Shield" size={14} className="mr-1" />
                Admin View
              </Badge>
            </div>
          )}
</div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleTabChange('order-summary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'order-summary'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ApperIcon name="Package" size={16} />
                  <span>Order Summary</span>
                </div>
              </button>
              <button
                onClick={() => handleTabChange('price-summary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'price-summary'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ApperIcon name="DollarSign" size={16} />
                  <span>Price Summary</span>
                  {priceSummaryLoading && (
                    <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </button>
            </nav>
          </div>
        </div>
{/* Tab Content */}
        {activeTab === 'order-summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Hierarchical Order Display */}
            <div className="lg:col-span-2">
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <ApperIcon name="Package" size={20} className="mr-2" />
                  Order Items by Vendor
                </h2>
                
                <div className="space-y-6">
                  {Object.entries(groupedItems).map(([category, vendors]) => (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Category Header */}
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-semibold text-gray-900 flex items-center">
                          <ApperIcon name="Grid3x3" size={16} className="mr-2" />
                          {category}
                        </h3>
                      </div>
                      
                      {/* Vendors for this category */}
                      <div className="divide-y divide-gray-200">
{Object.entries(vendors).map(([vendorName, vendorData]) => (
                          <div key={vendorName} className="vendor-section">
                            {/* Mobile: Enhanced Swipeable vendor sections */}
                            <div className="md:hidden">
                              <div 
                                className="bg-blue-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => handleVendorSwipe(vendorName, vendorData)}
                              >
                                <div className="flex items-center space-x-2">
                                  <ApperIcon name="Store" size={16} className="text-blue-600" />
                                  <span className="font-medium text-blue-900">{vendorName}</span>
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                    {vendorData.items.length} items
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {vendorItemsLoading && expandedVendor === vendorName ? (
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <ApperIcon 
                                      name={expandedVendor === vendorName ? "ChevronUp" : "ChevronRight"} 
                                      size={16} 
                                      className="text-blue-600 transition-transform duration-200" 
                                    />
                                  )}
                                  <span className="text-sm text-blue-700 font-medium">
                                    {expandedVendor === vendorName ? "Hide items" : "Swipe to see items"}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Enhanced Mobile Item Display */}
                              {expandedVendor === vendorName && (
                                <div className="overflow-x-auto bg-gray-50">
                                  <div className="flex space-x-4 p-4" style={{ width: `${vendorData.items.length * 280}px` }}>
                                    {vendorData.items.map((item) => (
                                      <div key={item.productId} className="flex-shrink-0 w-64 bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                          <h4 className="font-medium text-gray-900 text-sm leading-tight">{item.name}</h4>
                                          {isAdmin && getAvailabilityBadge(getAvailabilityStatus(item.productId, vendorData.vendorId))}
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                          <p className="flex justify-between">
                                            <span>Qty:</span>
                                            <span className="font-medium">{item.quantity} {item.unit}</span>
                                          </p>
                                          <p className="flex justify-between">
                                            <span>Price:</span>
                                            <span className="font-medium">{formatCurrency(item.price)}</span>
                                          </p>
                                          <div className="border-t pt-1 mt-2">
                                            <p className="flex justify-between font-medium text-gray-900">
                                              <span>Total:</span>
                                              <span className="text-primary">{formatCurrency(item.price * item.quantity)}</span>
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="px-4 pb-3">
                                    <div className="bg-white rounded-lg p-3 border">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Vendor Total:</span>
                                        <span className="font-semibold text-primary">{formatCurrency(vendorData.total)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Desktop: Standard layout */}
                            <div className="hidden md:block">
                              <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <ApperIcon name="Store" size={16} className="text-blue-600" />
                                  <span className="font-medium text-blue-900">{vendorName}</span>
                                </div>
                                <div className="text-sm text-blue-700 font-medium">
                                  Vendor Total: {formatCurrency(vendorData.total)}
                                </div>
                              </div>
                              
                              <div className="p-4 space-y-3">
                                {vendorData.items.map((item) => (
                                  <div key={item.productId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                                      <p className="text-sm text-gray-600">
                                        Qty: {item.quantity} {item.unit} × {formatCurrency(item.price)}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className="font-medium text-gray-900">
                                        {formatCurrency(item.price * item.quantity)}
                                      </span>
                                      {isAdmin && getAvailabilityBadge(getAvailabilityStatus(item.productId, vendorData.vendorId))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Totals & Status */}
            <div className="space-y-6">
              {/* Order Status */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <ApperIcon name="Info" size={18} className="mr-2" />
                  Order Status
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Order Status:</span>
                    <Badge variant="info">{order.status}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment:</span>
                    <Badge variant={order.paymentStatus === 'completed' ? 'success' : 'warning'}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Totals */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <ApperIcon name="Calculator" size={18} className="mr-2" />
                  Order Totals
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency((order.total || 0) - (order.deliveryCharge || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Charge:</span>
                    <span className="font-medium">{formatCurrency(order.deliveryCharge || 0)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span className="gradient-text">{formatCurrency(order.total || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              {order.deliveryAddress && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <ApperIcon name="MapPin" size={18} className="mr-2" />
                    Delivery Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{order.deliveryAddress.name}</p>
                    <p className="text-gray-600">{order.deliveryAddress.phone}</p>
                    <p className="text-gray-600">{order.deliveryAddress.address}</p>
                    <p className="text-gray-600">
                      {order.deliveryAddress.city}, {order.deliveryAddress.postalCode}
                    </p>
                    {order.deliveryAddress.instructions && (
                      <p className="text-gray-600 italic">
                        Instructions: {order.deliveryAddress.instructions}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <ApperIcon name="Settings" size={18} className="mr-2" />
                    Admin Actions
                  </h3>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate(`/admin/orders/${order.id}/edit`)}
                    >
                      <ApperIcon name="Edit" size={16} className="mr-2" />
                      Edit Order
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate(`/admin/vendors/availability/${order.id}`)}
                    >
                      <ApperIcon name="Eye" size={16} className="mr-2" />
                      View Vendor Responses
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Price Summary Tab */}
        {activeTab === 'price-summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Price Summary Content */}
            <div className="lg:col-span-2">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center">
                    <ApperIcon name="DollarSign" size={20} className="mr-2" />
                    Price Summary
                  </h2>
                  
                  {/* Price Visibility Controls */}
                  <div className="flex items-center space-x-4">
                    {(userRole === 'admin' || userRole === 'vendor') && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="show-cost-prices"
                          checked={priceVisibility.showCostPrices}
                          onChange={(e) => handlePriceVisibilityChange('showCostPrices', e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="show-cost-prices" className="text-sm text-gray-700">
                          Show Cost Prices
                        </label>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="show-selling-prices"
                        checked={priceVisibility.showSellingPrices}
                        onChange={(e) => handlePriceVisibilityChange('showSellingPrices', e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="show-selling-prices" className="text-sm text-gray-700">
                        Show Selling Prices
                      </label>
                    </div>
                  </div>
                </div>

                {priceSummaryLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading price summary...</p>
                    </div>
                  </div>
                ) : priceSummaryData ? (
                  <div className="space-y-6">
                    {Object.entries(priceSummaryData.categories || {}).map(([category, vendors]) => (
                      <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Category Header with Price Summary */}
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                              <ApperIcon name="Grid3x3" size={16} className="mr-2" />
                              {category}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm">
                              {priceVisibility.showCostPrices && (userRole === 'admin' || userRole === 'vendor') && (
                                <span className="text-orange-600 font-medium">
                                  Cost: {formatCurrency(vendors.totalCost || 0)}
                                </span>
                              )}
                              {priceVisibility.showSellingPrices && (
                                <span className="text-primary font-medium">
                                  Selling: {formatCurrency(vendors.totalSelling || 0)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Vendor Price Details */}
                        <div className="divide-y divide-gray-200">
                          {Object.entries(vendors.vendorData || {}).map(([vendorName, vendorInfo]) => (
                            <div key={vendorName} className="p-4">
                              {/* Vendor Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <ApperIcon name="Store" size={16} className="text-blue-600" />
                                  <span className="font-medium text-blue-900">{vendorName}</span>
                                </div>
                                <div className="flex items-center space-x-4 text-sm">
                                  {priceVisibility.showCostPrices && (userRole === 'admin' || userRole === 'vendor') && (
                                    <span className="text-orange-600 font-medium">
                                      Cost: {formatCurrency(vendorInfo.totalCost || 0)}
                                    </span>
                                  )}
                                  {priceVisibility.showSellingPrices && (
                                    <span className="text-primary font-medium">
                                      Selling: {formatCurrency(vendorInfo.totalSelling || 0)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Price Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="text-left py-2 px-3 font-medium text-gray-700">Item</th>
                                      <th className="text-center py-2 px-3 font-medium text-gray-700">Qty</th>
                                      {priceVisibility.showCostPrices && (userRole === 'admin' || userRole === 'vendor') && (
                                        <th className="text-right py-2 px-3 font-medium text-orange-600">Cost Price</th>
                                      )}
                                      {priceVisibility.showSellingPrices && (
                                        <th className="text-right py-2 px-3 font-medium text-primary">Selling Price</th>
                                      )}
                                      <th className="text-right py-2 px-3 font-medium text-gray-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {vendorInfo.items?.map((item) => (
                                      <tr key={item.productId} className="hover:bg-gray-50">
                                        <td className="py-2 px-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="py-2 px-3 text-center text-gray-600">
                                          {item.quantity} {item.unit}
                                        </td>
                                        {priceVisibility.showCostPrices && (userRole === 'admin' || userRole === 'vendor') && (
                                          <td className="py-2 px-3 text-right text-orange-600">
                                            {item.costPrice ? formatCurrency(item.costPrice) : 
                                              <span className="text-gray-400 italic">Hidden</span>
                                            }
                                          </td>
                                        )}
                                        {priceVisibility.showSellingPrices && (
                                          <td className="py-2 px-3 text-right text-primary">
                                            {formatCurrency(item.price)}
                                          </td>
                                        )}
                                        <td className="py-2 px-3 text-right font-medium text-gray-900">
                                          {formatCurrency(item.price * item.quantity)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Price Summary Totals */}
                    <div className="card p-6 bg-gradient-to-r from-primary/5 to-accent/5">
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <ApperIcon name="Calculator" size={18} className="mr-2" />
                        Price Summary Totals
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {priceVisibility.showCostPrices && (userRole === 'admin' || userRole === 'vendor') && (
                          <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="text-sm text-orange-600 font-medium mb-1">Total Cost Price</div>
                            <div className="text-2xl font-bold text-orange-700">
                              {formatCurrency(priceSummaryData.totalCost || 0)}
                            </div>
                            {userRole === 'admin' && (
                              <div className="text-xs text-orange-600 mt-1">
                                Margin: {formatCurrency((priceSummaryData.totalSelling || 0) - (priceSummaryData.totalCost || 0))}
                              </div>
                            )}
                          </div>
                        )}
                        {priceVisibility.showSellingPrices && (
                          <div className="bg-primary/10 p-4 rounded-lg">
                            <div className="text-sm text-primary font-medium mb-1">Total Selling Price</div>
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(priceSummaryData.totalSelling || 0)}
                            </div>
                            <div className="text-xs text-primary/70 mt-1">
                              Items: {priceSummaryData.totalItems || 0}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ApperIcon name="AlertCircle" size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Price Data Available</h3>
                    <p className="text-gray-600 mb-4">Unable to load price summary for this order.</p>
                    <Button onClick={loadPriceSummary} variant="outline">
                      <ApperIcon name="RefreshCw" size={16} className="mr-2" />
                      Retry Loading
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Price Summary Sidebar */}
            <div className="space-y-6">
              {/* Role Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <ApperIcon name="User" size={18} className="mr-2" />
                  Price Access Level
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Role:</span>
                    <Badge variant={userRole === 'admin' ? 'success' : userRole === 'vendor' ? 'info' : 'secondary'}>
                      {userRole}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Cost Prices:</span>
                    <span className={`text-sm font-medium ${
                      userRole === 'customer' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {userRole === 'customer' ? 'Restricted' : 'Accessible'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Selling Prices:</span>
                    <span className="text-sm font-medium text-green-600">Accessible</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <ApperIcon name="Zap" size={18} className="mr-2" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab('order-summary')}
                  >
                    <ApperIcon name="Package" size={16} className="mr-2" />
                    Back to Order Summary
                  </Button>
                  
                  {(userRole === 'admin' || userRole === 'vendor') && (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setPriceVisibility({
                            showCostPrices: true,
                            showSellingPrices: true
                          });
                          toast.success('All prices shown');
                        }}
                      >
                        <ApperIcon name="Eye" size={16} className="mr-2" />
                        Show All Prices
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setPriceVisibility({
                            showCostPrices: false,
                            showSellingPrices: true
                          });
                          toast.success('Cost prices hidden');
                        }}
                      >
                        <ApperIcon name="EyeOff" size={16} className="mr-2" />
                        Hide Cost Prices
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => loadPriceSummary()}
                  >
                    <ApperIcon name="RefreshCw" size={16} className="mr-2" />
                    Refresh Price Data
                  </Button>
                </div>
              </div>
            </div>
</div>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;