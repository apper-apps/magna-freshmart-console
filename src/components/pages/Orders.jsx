import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Empty from "@/components/ui/Empty";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import OrderStatusBadge from "@/components/molecules/OrderStatusBadge";
import { formatCurrency } from "@/utils/currency";
import { orderService } from "@/services/api/orderService";
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getAll();
      // Sort by most recent first
      const sortedOrders = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(sortedOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="orders" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadOrders} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Empty 
          type="orders" 
          onAction={() => window.location.href = '/category/All'}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <Link 
          to="/category/All"
          className="flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors"
        >
          <ApperIcon name="Plus" size={20} />
          <span>Shop More</span>
        </Link>
      </div>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="card p-6 hover:shadow-premium transition-shadow duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                <div className="bg-gradient-to-r from-primary to-accent p-3 rounded-lg">
                  <ApperIcon name="Package" size={24} className="text-white" />
<div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.id}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {format(new Date(order.createdAt), 'MMM dd, yyyy • hh:mm a')}
                  </p>
                  {order.transactionId && (
                    <p className="text-xs text-gray-500 font-mono">
                      TXN: {order.transactionId}
                    </p>
                  )}
                </div>
</div>
</div>
              <div className="flex items-center space-x-4">
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
<div className="text-right">
                  <p className="text-xl font-bold gradient-text">
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
                  <p className="text-sm text-gray-600">
                    {order?.items?.length || 0} items
                  </p>
                </div>
              </div>
              </div>

            {/* Payment Proof Display */}
            {order.paymentProof && (order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa' || order.paymentMethod === 'bank') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <ApperIcon name="FileImage" size={16} className="text-blue-600" />
                      <h4 className="text-sm font-medium text-blue-900">Payment Proof Uploaded</h4>
                    </div>
                    
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
                      
<div className="flex justify-center">
                        <div className="relative group">
                          <img
                            src={order.paymentProof.dataUrl || "/api/placeholder/150/100"}
                            alt="Payment proof"
                            className="w-32 h-20 object-cover rounded-lg border border-blue-200 cursor-pointer transition-transform group-hover:scale-105"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDE1MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02MCA0MEw5MCA3MEw2MCA0MFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjcwIiBjeT0iMzAiIHI9IjUiIGZpbGw9IiM5Q0EzQUYiLz4KPHR4dCB4PSI3NSIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzZCNzI4MCI+UGF5bWVudCBQcm9vZjwvdGV4dD4KPC9zdmc+Cg==';
                            }}
                            onClick={() => {
                              // Show the actual uploaded image in a modal
                              const imageUrl = order.paymentProof.dataUrl || "/api/placeholder/150/100";
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
                              modal.innerHTML = `
                                <div class="relative max-w-4xl max-h-full">
                                  <img src="${imageUrl}" alt="Payment proof" class="max-w-full max-h-full object-contain rounded-lg" />
                                  <button class="absolute top-2 right-2 bg-white text-black rounded-full p-2 hover:bg-gray-100">
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
                            <ApperIcon name="Eye" size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items Preview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {order.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{item.quantity}x</span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-sm text-gray-600">
                    +{order.items.length - 3} more items
                  </div>
                )}
              </div>
            </div>

            {/* Order Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <ApperIcon name="MapPin" size={16} />
                  <span>{order.deliveryAddress.city}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ApperIcon name="CreditCard" size={16} />
                  <span className="capitalize">{order.paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Link 
                  to={`/orders/${order.id}`}
                  className="flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors"
                >
                  <ApperIcon name="Eye" size={16} />
                  <span>View Details</span>
                </Link>
                
<button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
                  <ApperIcon name="MessageCircle" size={16} />
                  <span>Chat Support</span>
                </button>
                
                {order.status === 'delivered' && (
                  <button className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors">
                    <ApperIcon name="RotateCcw" size={16} />
                    <span>Reorder</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;