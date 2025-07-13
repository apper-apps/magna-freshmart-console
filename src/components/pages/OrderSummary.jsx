import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { formatCurrency } from "@/utils/currency";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import { orderService } from "@/services/api/orderService";

const OrderSummary = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorAvailability, setVendorAvailability] = useState({});

  useEffect(() => {
    loadOrderSummary();
  }, [orderId]);

const loadOrderSummary = async () => {
    // Enhanced validation for orderId
    if (!orderId || orderId.trim() === '') {
      setError('Order ID is required');
      setLoading(false);
      toast.error('No order ID provided');
      return;
    }

    // Validate orderId is numeric
    const numericOrderId = parseInt(orderId);
    if (isNaN(numericOrderId) || numericOrderId <= 0) {
      setError('Invalid order ID format');
      setLoading(false);
      toast.error('Invalid order ID format');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Enhanced service call with proper error handling
      const orderData = await orderService.getById(numericOrderId);
      
      if (!orderData) {
        throw new Error(`Order #${numericOrderId} not found`);
      }

      // Validate order data structure
      if (!orderData.id || !orderData.items) {
        throw new Error('Invalid order data received');
      }

      setOrder(orderData);
      
      // Load vendor availability data
      if (orderData.vendor_availability) {
        setVendorAvailability(orderData.vendor_availability);
      }

      // Check admin status (simplified - in real app would check user roles)
      const adminCheck = localStorage.getItem('userRole') === 'admin';
      setIsAdmin(adminCheck);

      toast.success('Order summary loaded successfully');

    } catch (error) {
      console.error('Error loading order summary:', error);
      const errorMessage = error.message || 'Failed to load order summary';
      setError(errorMessage);
      toast.error(errorMessage);
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
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/orders')} 
                  className="w-full"
                >
                  <ApperIcon name="ArrowLeft" size={16} className="mr-2" />
                  Back to Orders
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')} 
                  className="w-full"
                >
                  <ApperIcon name="Home" size={16} className="mr-2" />
                  Go Home
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
                          {/* Mobile: Swipeable vendor sections */}
                          <div className="md:hidden">
                            <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <ApperIcon name="Store" size={16} className="text-blue-600" />
                                <span className="font-medium text-blue-900">{vendorName}</span>
                              </div>
                              <div className="text-sm text-blue-700 font-medium">
                                Swipe to see items →
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <div className="flex space-x-4 p-4" style={{ width: `${vendorData.items.length * 280}px` }}>
                                {vendorData.items.map((item) => (
                                  <div key={item.productId} className="flex-shrink-0 w-64 bg-white border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                      <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                      {isAdmin && getAvailabilityBadge(getAvailabilityStatus(item.productId, vendorData.vendorId))}
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                      <p>Qty: {item.quantity} {item.unit}</p>
                                      <p>Price: {formatCurrency(item.price)}</p>
                                      <p className="font-medium text-gray-900">
                                        Total: {formatCurrency(item.price * item.quantity)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
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
      </div>
    </div>
  );
};

export default OrderSummary;