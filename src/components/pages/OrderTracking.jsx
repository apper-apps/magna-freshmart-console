import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import ApperIcon from "@/components/ApperIcon";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Orders from "@/components/pages/Orders";
import OrderStatusBadge from "@/components/molecules/OrderStatusBadge";
import { orderService } from "@/services/api/orderService";

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getById(parseInt(orderId));
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: 'ShoppingCart' },
      { key: 'confirmed', label: 'Confirmed', icon: 'CheckCircle' },
      { key: 'packed', label: 'Packed', icon: 'Package' },
      { key: 'shipped', label: 'Shipped', icon: 'Truck' },
      { key: 'delivered', label: 'Delivered', icon: 'Home' }
    ];

    const currentIndex = steps.findIndex(step => step.key === order?.status?.toLowerCase());
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex
    }));
  };

if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gray-200 rounded shimmer"></div>
            <div className="w-24 h-6 bg-gray-200 rounded shimmer"></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-6 bg-gray-200 rounded shimmer"></div>
            <div className="w-16 h-6 bg-gray-200 rounded-full shimmer"></div>
          </div>
        </div>

        {/* Order Header Skeleton */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="w-32 h-8 bg-gray-200 rounded shimmer mb-2"></div>
              <div className="w-48 h-5 bg-gray-200 rounded shimmer"></div>
            </div>
            <div className="text-right">
              <div className="w-24 h-8 bg-gray-200 rounded shimmer mb-2"></div>
              <div className="w-16 h-5 bg-gray-200 rounded shimmer"></div>
            </div>
          </div>
        </div>

        {/* Order Status Timeline Skeleton */}
        <div className="card p-6 mb-6">
          <div className="w-32 h-6 bg-gray-200 rounded shimmer mb-6"></div>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full shimmer"></div>
                <div className="ml-4 flex-1">
                  <div className="w-24 h-5 bg-gray-200 rounded shimmer mb-1"></div>
                  {item === 2 && <div className="w-20 h-4 bg-gray-200 rounded shimmer"></div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Items Skeleton */}
          <div className="card p-6">
            <div className="w-24 h-6 bg-gray-200 rounded shimmer mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="w-32 h-5 bg-gray-200 rounded shimmer mb-1"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded shimmer"></div>
                  </div>
                  <div className="w-16 h-5 bg-gray-200 rounded shimmer"></div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
              <div className="flex justify-between">
                <div className="w-16 h-5 bg-gray-200 rounded shimmer"></div>
                <div className="w-20 h-5 bg-gray-200 rounded shimmer"></div>
              </div>
              <div className="flex justify-between">
                <div className="w-24 h-5 bg-gray-200 rounded shimmer"></div>
                <div className="w-16 h-5 bg-gray-200 rounded shimmer"></div>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                <div className="w-12 h-6 bg-gray-200 rounded shimmer"></div>
                <div className="w-24 h-6 bg-gray-200 rounded shimmer"></div>
              </div>
            </div>
          </div>

          {/* Delivery & Payment Information Skeleton */}
          <div className="space-y-6">
            {/* Delivery Info Skeleton */}
            <div className="card p-6">
              <div className="w-36 h-6 bg-gray-200 rounded shimmer mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-gray-200 rounded shimmer"></div>
                    <div className="w-32 h-5 bg-gray-200 rounded shimmer"></div>
                  </div>
                ))}
                <div className="flex items-start space-x-3">
                  <div className="w-4 h-4 bg-gray-200 rounded shimmer mt-1"></div>
                  <div className="flex-1">
                    <div className="w-full h-5 bg-gray-200 rounded shimmer mb-1"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded shimmer"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info Skeleton */}
            <div className="card p-6">
              <div className="w-32 h-6 bg-gray-200 rounded shimmer mb-4"></div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-200 rounded shimmer"></div>
                  <div className="w-20 h-5 bg-gray-200 rounded shimmer"></div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-200 rounded shimmer"></div>
                  <div className="w-28 h-5 bg-gray-200 rounded shimmer"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadOrder} type="not-found" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message="Order not found" onRetry={() => navigate('/orders')} type="not-found" />
      </div>
    );
  }

  const statusSteps = getStatusSteps();

return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header */}
    <div className="flex items-center justify-between mb-8">
        <button
            onClick={() => navigate("/orders")}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ApperIcon name="ArrowLeft" size={20} />
            <span>Back to Orders</span>
        </button>
        <div className="flex items-center space-x-4">
            <button
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
                <ApperIcon name="MessageCircle" size={16} />
                <span>Chat Support</span>
            </button>
            <OrderStatusBadge status={order.status} />
        </div>
    </div>
    {/* Order Header */}
    <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
                <p className="text-gray-600">Placed on {format(new Date(order.createdAt), "MMMM dd, yyyy • hh:mm a")}
                </p>
            </div>
            <div className="text-right">
                <p className="text-2xl font-bold gradient-text">Rs. {(order?.total || 0).toLocaleString()}
                </p>
                <p className="text-gray-600">{(order?.items || []).length}items</p>
            </div>
        </div>
    </div>
{/* Order Status Timeline */}
    <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Order Status</h2>
            <div className="block sm:hidden text-xs text-gray-500">⟵ Swipe to navigate</div>
        </div>
        
        {/* Mobile Horizontal Timeline */}
        <div className="block sm:hidden">
            <div className="horizontal-timeline-container overflow-x-auto">
                <div className="horizontal-timeline-track flex space-x-8 pb-4 min-w-max">
                    {statusSteps.map((step, index) => (
                        <div key={step.key} className="flex flex-col items-center relative min-w-[100px]">
                            <div
                                className={`
                                    w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                                    ${step.completed ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg" : "bg-gray-200 text-gray-400"}
                                    ${step.active ? "ring-4 ring-primary/20 scale-110" : ""}
                                `}>
                                <ApperIcon name={step.icon} size={20} />
                            </div>
                            <p className={`text-sm font-medium text-center ${step.completed ? "text-gray-900" : "text-gray-400"}`}>
                                {step.label}
                            </p>
                            {step.active && (
                                <div className="mt-1 flex flex-col items-center">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                    <p className="text-xs text-primary mt-1">Current</p>
                                </div>
                            )}
                            
                            {/* Connecting line */}
                            {index < statusSteps.length - 1 && (
                                <div className={`
                                    absolute top-6 left-12 w-8 h-0.5 
                                    ${step.completed ? "bg-primary" : "bg-gray-200"}
                                `} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        {/* Desktop Vertical Timeline */}
        <div className="hidden sm:block relative">
            {statusSteps.map((step, index) => (
                <div key={step.key} className="flex items-center mb-6 last:mb-0">
                    <div
                        className={`
                            relative z-10 flex items-center justify-center w-10 h-10 rounded-full
                            ${step.completed ? "bg-gradient-to-r from-primary to-accent text-white" : "bg-gray-200 text-gray-400"}
                        `}>
                        <ApperIcon name={step.icon} size={20} />
                    </div>
                    <div className="ml-4 flex-1">
                        <p className={`font-medium ${step.completed ? "text-gray-900" : "text-gray-400"}`}>
                            {step.label}
                        </p>
                        {step.active && <p className="text-sm text-primary">Current status</p>}
                    </div>
                    {index < statusSteps.length - 1 && (
                        <div className={`
                            absolute left-5 top-10 w-0.5 h-6 -ml-px
                            ${step.completed ? "bg-primary" : "bg-gray-200"}
                        `} />
                    )}
                </div>
            ))}
        </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Items */}
        <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
                {(order?.items || []).map(
                    (item, index) => <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">{item?.name || "Unknown Item"}</p>
                            <p className="text-sm text-gray-600">
                                {item?.quantity || 0}x Rs. {(item?.price || 0).toLocaleString()}
                            </p>
                        </div>
                        <p className="font-medium">Rs. {((item?.quantity || 0) * (item?.price || 0)).toLocaleString()}
                        </p>
                    </div>
                )}
            </div>
            <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">Rs. {((order?.total || 0) - (order?.deliveryCharge || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className="font-medium">Rs. {(order?.deliveryCharge || 0).toLocaleString()}</span>
                </div>
                <div
                    className="flex justify-between items-center border-t border-gray-200 pt-2">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold gradient-text">Rs. {(order?.total || 0).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
        {/* Delivery Information */}
        <div className="space-y-6">
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h2>
                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        <ApperIcon name="User" size={16} className="text-gray-500" />
                        <span className="text-gray-900">{order.deliveryAddress.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ApperIcon name="Phone" size={16} className="text-gray-500" />
                        <span className="text-gray-900">{order.deliveryAddress.phone}</span>
                    </div>
                    {order.deliveryAddress.email && <div className="flex items-center space-x-3">
                        <ApperIcon name="Mail" size={16} className="text-gray-500" />
                        <span className="text-gray-900">{order.deliveryAddress.email}</span>
                    </div>}
                    <div className="flex items-start space-x-3">
                        <ApperIcon name="MapPin" size={16} className="text-gray-500 mt-1" />
                        <div>
                            <p className="text-gray-900">{order.deliveryAddress.address}</p>
                            <p className="text-gray-600">
                                {order.deliveryAddress.city}
                                {order.deliveryAddress.postalCode && `, ${order.deliveryAddress.postalCode}`}
                            </p>
                        </div>
                    </div>
                    {order.deliveryAddress.instructions && <div className="flex items-start space-x-3">
                        <ApperIcon name="MessageSquare" size={16} className="text-gray-500 mt-1" />
                        <p className="text-gray-900">{order.deliveryAddress.instructions}</p>
                    </div>}
                </div>
            </div>
            {/* Payment Information */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        <ApperIcon name="CreditCard" size={16} className="text-gray-500" />
                        <span className="text-gray-900 capitalize">
                            {order.paymentMethod.replace("_", " ")}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ApperIcon name="CheckCircle" size={16} className="text-gray-500" />
                        <span
                            className={`text-gray-900 capitalize ${order.paymentStatus === "completed" ? "text-green-600" : order.paymentStatus === "pending" ? "text-orange-600" : "text-red-600"}`}>Payment {order.paymentStatus}
                        </span>
                    </div>
                </div>
                {/* Admin Rejection Message */}
                {(order.status === "payment_rejected" || order.paymentStatus === "verification_failed") && order.verificationNotes && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                        <ApperIcon
                            name="AlertCircle"
                            size={20}
                            className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-medium text-red-800 mb-1">Payment Rejected</h4>
                            <p className="text-red-700 text-sm leading-relaxed">
                                {order.verificationNotes}
                            </p>
                            {order.verifiedAt && <p className="text-red-600 text-xs mt-2">Reviewed on {format(new Date(order.verifiedAt), "MMMM dd, yyyy • hh:mm a")}
                            </p>}
                        </div>
                    </div>
                </div>}
                {order.paymentResult && <div className="flex items-center space-x-3">
                    <ApperIcon name="Hash" size={16} className="text-gray-500" />
                    <span className="text-gray-900 font-mono text-sm">
                        {order.paymentResult.transactionId}
                    </span>
                </div>}
                {order.paymentResult?.gatewayResponse && <div className="flex items-center space-x-3">
                    <ApperIcon name="ExternalLink" size={16} className="text-gray-500" />
                    <span className="text-gray-900 text-sm">Gateway Ref: {order.paymentResult.gatewayResponse.reference}
                    </span>
                </div>}
                {order.paymentProof && <div className="flex items-center space-x-3">
                    <ApperIcon name="FileText" size={16} className="text-gray-500" />
                    <span className="text-gray-900">Payment proof uploaded</span>
                </div>}
            </div>
        </div>
    </div>
</div>
  );
};

export default OrderTracking;