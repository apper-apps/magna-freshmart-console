import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ApperIcon from '@/components/ApperIcon';
import Button from '@/components/atoms/Button';
import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import { orderService } from '@/services/api/orderService';
import { deliveryPersonnelService } from '@/services/api/deliveryPersonnelService';

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 31.5204, lng: 74.3587 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ordersData, personnelData] = await Promise.all([
        orderService.getAll(),
        deliveryPersonnelService.getAll()
      ]);

      setOrders(ordersData.filter(order => order.deliveryStatus !== 'delivered'));
      setPersonnel(personnelData);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDelivery = async (orderId, personnelId) => {
    try {
      await orderService.assignDeliveryPersonnel(orderId, personnelId);
      await deliveryPersonnelService.updateStatus(personnelId, 'on_delivery');
      
      toast.success('Delivery personnel assigned successfully');
      setAssignModalOpen(false);
      setSelectedOrder(null);
      loadData();
    } catch (err) {
      toast.error('Failed to assign delivery personnel');
    }
  };

const handleStatusUpdate = async (orderId, status) => {
    try {
      const actualDelivery = status === 'delivered' ? new Date().toISOString() : null;
      await orderService.updateDeliveryStatus(orderId, status, actualDelivery);
      
      // Update order status to align with delivery status
      let orderStatus = null;
      switch (status) {
        case 'picked_up':
          orderStatus = 'packed';
          break;
        case 'out_for_delivery':
          orderStatus = 'shipped';
          break;
        case 'delivered':
          orderStatus = 'delivered';
          break;
        default:
          // For assigned and pending_assignment, maintain current order status
          break;
      }
      
      if (orderStatus) {
        await orderService.updateOrderStatus(orderId, orderStatus);
      }
      
      if (status === 'delivered') {
        const order = orders.find(o => o.id === orderId);
        if (order?.deliveryPersonId) {
          await deliveryPersonnelService.updateStatus(order.deliveryPersonId, 'available');
        }
      }
      
      toast.success('Delivery status updated successfully');
      loadData();
    } catch (err) {
      toast.error('Failed to update delivery status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending_assignment': 'bg-yellow-100 text-yellow-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'picked_up': 'bg-purple-100 text-purple-800',
      'out_for_delivery': 'bg-orange-100 text-orange-800',
      'delivered': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPersonnelStatusColor = (status) => {
    const colors = {
      'available': 'bg-green-100 text-green-800',
      'on_delivery': 'bg-blue-100 text-blue-800',
      'off_duty': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
        <Error message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Dashboard</h1>
        <p className="text-gray-600">Track and manage deliveries in real-time</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Pending Assignment</p>
              <p className="text-3xl font-bold">
                {orders.filter(o => o.deliveryStatus === 'pending_assignment').length}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="Clock" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Out for Delivery</p>
              <p className="text-3xl font-bold">
                {orders.filter(o => o.deliveryStatus === 'out_for_delivery').length}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="Truck" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Available Personnel</p>
              <p className="text-3xl font-bold">
                {personnel.filter(p => p.status === 'available').length}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="Users" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Active Deliveries</p>
              <p className="text-3xl font-bold">
                {personnel.filter(p => p.status === 'on_delivery').length}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="MapPin" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Delivery Map */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Map</h2>
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center mb-4">
            <div className="text-center">
              <ApperIcon name="Map" size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Interactive map showing delivery locations</p>
              <p className="text-sm text-gray-500 mt-2">
                Map integration would display real-time delivery tracking
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setMapCenter({ lat: 31.5204, lng: 74.3587 })}
              className="flex items-center space-x-2"
            >
              <ApperIcon name="RotateCcw" size={16} />
              <span>Reset View</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ApperIcon name="Maximize" size={16} />
              <span>Fullscreen</span>
            </Button>
          </div>
        </div>

        {/* Personnel Status */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Personnel</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {personnel.map((person) => (
              <div key={person.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary p-2 rounded-lg">
                    <ApperIcon name="User" size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{person.name}</p>
                    <p className="text-sm text-gray-600">{person.zone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPersonnelStatusColor(person.status)}`}>
                    {person.status.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {person.totalDeliveries} deliveries
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="card p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personnel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const assignedPersonnel = personnel.find(p => p.Id === order.deliveryPersonId);
                return (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-primary p-2 rounded-lg">
                          <ApperIcon name="Package" size={16} className="text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">Order #{order.id}</p>
                          <p className="text-sm text-gray-500">Rs. {order.total.toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.deliveryAddress.name}</p>
                        <p className="text-sm text-gray-500">{order.deliveryAddress.city}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.deliveryStatus)}`}>
                        {order.deliveryStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assignedPersonnel ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{assignedPersonnel.name}</p>
                          <p className="text-sm text-gray-500">{assignedPersonnel.phone}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {!order.deliveryPersonId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setAssignModalOpen(true);
                            }}
                          >
                            Assign
                          </Button>
                        )}
                        {order.deliveryStatus === 'assigned' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, 'picked_up')}
                          >
                            Picked Up
                          </Button>
                        )}
                        {order.deliveryStatus === 'picked_up' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')}
                          >
                            Out for Delivery
                          </Button>
                        )}
                        {order.deliveryStatus === 'out_for_delivery' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, 'delivered')}
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {assignModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Delivery Personnel
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Order #{selectedOrder.id} to {selectedOrder.deliveryAddress.city}
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {personnel.filter(p => p.status === 'available').map((person) => (
                <div
                  key={person.Id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAssignDelivery(selectedOrder.id, person.Id)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{person.name}</p>
                    <p className="text-sm text-gray-600">{person.zone} • {person.vehicleType}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <ApperIcon name="Star" size={14} className="text-yellow-400" />
                      <span className="text-sm text-gray-600">{person.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedOrder(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;