import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { store } from "@/store/index";
import { addRealTimeNotification, approveRequest, fetchPendingApprovals, rejectRequest, selectApprovalLoading, selectPendingApprovals, selectRealTimeUpdates, setConnectionStatus, updateApprovalStatus } from "@/store/approvalWorkflowSlice";
import { fetchNotificationCounts, resetCount, setError, setLoading, updateCounts } from "@/store/notificationSlice";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Orders from "@/components/pages/Orders";
import { orderService } from "@/services/api/orderService";
import { approvalWorkflowService } from "@/services/api/approvalWorkflowService";
import webSocketService from "@/services/api/websocketService";
import { productService } from "@/services/api/productService";
import { notificationService } from "@/services/api/notificationService";
import { paymentService } from "@/services/api/paymentService";

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const notificationCounts = useSelector(state => state.notifications.counts);
  const pendingApprovals = useSelector(selectPendingApprovals);
  const approvalLoading = useSelector(selectApprovalLoading);
  const realTimeUpdates = useSelector(selectRealTimeUpdates);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    walletBalance: 0,
    totalTransactions: 0,
    monthlyRevenue: 0,
    pendingVerifications: 0,
    todayRevenue: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [revenueByMethod, setRevenueByMethod] = useState({});
  const [sortedOrders, setSortedOrders] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [wsConnectionStatus, setWsConnectionStatus] = useState({ connected: false });
  const pollingRef = useRef(null);
  const wsUnsubscribeRef = useRef(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load products and check for low stock
      const products = await productService.getAll()
      const orders = await orderService.getAll()
      
      // Calculate low stock products (stock < 10)
      const lowStock = products.filter(product => (product?.stock || 0) < 10)
      setLowStockProducts(lowStock || [])

      // Get today's orders
      const today = new Date()
      const todayOrdersData = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate.toDateString() === today.toDateString()
      })
      setTodayOrders(todayOrdersData || [])

      // Calculate today's revenue with safe defaults
      const todayRevenueAmount = todayOrdersData.reduce((sum, order) => {
        return sum + (order?.totalAmount || 0)
      }, 0)
      setTodayRevenue(todayRevenueAmount || 0)

      // Get wallet data with safe defaults
      const walletBalance = await paymentService.getWalletBalance()
      const walletTransactionsData = await paymentService.getWalletTransactions()
      setWalletTransactions(walletTransactionsData || [])

      // Get monthly revenue with safe defaults
      const monthlyRevenue = await orderService.getMonthlyRevenue()
      const pendingVerifications = await orderService.getPendingVerifications()
      const revenueByMethodData = await orderService.getRevenueByPaymentMethod()
      setRevenueByMethod(revenueByMethodData || {})

      // Calculate revenue breakdown with safe defaults
      const breakdown = Object.entries(revenueByMethodData || {}).map(([method, amount]) => ({
        method,
        amount: amount || 0
      }))
      setRevenueBreakdown(breakdown || [])

      // Sort orders by date (newest first)
      const sortedOrdersData = [...(orders || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setSortedOrders(sortedOrdersData || [])
      setRecentOrders(sortedOrdersData.slice(0, 5) || [])

      setStats({
        walletBalance: walletBalance || 0,
        totalTransactions: (walletTransactionsData || []).length,
        monthlyRevenue: monthlyRevenue || 0,
        pendingVerifications: (pendingVerifications || []).length,
        todayRevenue: todayRevenueAmount || 0
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
};

// Notification polling functionality
  const fetchNotificationCountsData = useCallback(async () => {
    try {
      const result = await dispatch(fetchNotificationCounts());
      if (fetchNotificationCounts.rejected.match(result)) {
        console.error('Failed to fetch notification counts:', result.payload);
      }
    } catch (error) {
      console.error('Failed to fetch notification counts:', error);
      dispatch(setError('Failed to load notification counts'));
    }
  }, [dispatch]);

  const handleTabClick = useCallback((path) => {
    const notificationKey = notificationService.getNotificationKey(path);
    if (notificationKey && notificationCounts[notificationKey] > 0) {
      dispatch(resetCount({ key: notificationKey }));
      notificationService.markAsRead(notificationKey);
    }
  }, [dispatch, notificationCounts]);

  // Setup polling for notification counts
// Setup polling for notification counts
  useEffect(() => {
    // Initial fetch
    fetchNotificationCountsData();

    // Setup 30-second polling
    pollingRef.current = setInterval(fetchNotificationCountsData, 30000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
}, [fetchNotificationCountsData]);
useEffect(() => {
    loadDashboardData();
  }, []);

  // Initialize WebSocket connection and approval workflows
  useEffect(() => {
    const initializeApprovalWorkflow = async () => {
      try {
        // Initialize WebSocket connection
        const wsConnection = await webSocketService.connect();
        setWsConnectionStatus(webSocketService.getConnectionStatus());
        
        // Subscribe to approval workflow updates
        wsUnsubscribeRef.current = webSocketService.subscribeToApprovalUpdates((update) => {
          dispatch(addRealTimeNotification({
            id: `notif_${Date.now()}`,
            type: update.type,
            data: update.data,
            timestamp: new Date().toISOString()
          }));
          
          // Handle specific approval events
          if (update.type === 'approval_status_changed') {
            dispatch(updateApprovalStatus(update.data));
            toast.info(`Approval request ${update.data.status}`);
          }
        });
        
        // Set connection status in Redux
        dispatch(setConnectionStatus(wsConnection.connected));
        
        // Load pending approvals
        dispatch(fetchPendingApprovals());
        
      } catch (error) {
        console.error('Failed to initialize approval workflow:', error);
        toast.warning('Real-time updates may be limited');
      }
    };
    
    initializeApprovalWorkflow();
    
    return () => {
      if (wsUnsubscribeRef.current) {
        wsUnsubscribeRef.current();
      }
    };
  }, [dispatch]);

  // Handle approval actions
  const handleApprovalAction = async (action, requestId, comments = '') => {
    try {
      if (action === 'approve') {
        await dispatch(approveRequest({ requestId, comments })).unwrap();
        toast.success('Approval request approved successfully');
      } else if (action === 'reject') {
        if (!comments.trim()) {
          toast.error('Rejection comments are required');
          return;
        }
        await dispatch(rejectRequest({ requestId, comments })).unwrap();
        toast.success('Approval request rejected');
      }
      
      setSelectedApproval(null);
      setApprovalComments('');
      setShowApprovalModal(false);
      
      // Refresh approvals list
      dispatch(fetchPendingApprovals());
      
    } catch (error) {
      toast.error(`Failed to ${action} request: ${error.message}`);
    }
  };

  const openApprovalModal = (approval, action) => {
    setSelectedApproval({ ...approval, action });
    setApprovalComments('');
    setShowApprovalModal(true);
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
        <Error message={error} onRetry={loadDashboardData} />
      </div>
    );
  }

const handleWalletAction = async (action, amount = 0) => {
    setWalletLoading(true);
    try {
      let result;
      switch (action) {
        case 'deposit':
          result = await paymentService.depositToWallet(amount);
          toast.success(`Deposited Rs. ${amount.toLocaleString()} to wallet`);
          break;
        case 'withdraw':
          result = await paymentService.withdrawFromWallet(amount);
          toast.success(`Withdrew Rs. ${amount.toLocaleString()} from wallet`);
          break;
        case 'transfer':
          result = await paymentService.transferFromWallet(amount);
          toast.success(`Transferred Rs. ${amount.toLocaleString()} from wallet`);
          break;
        default:
          break;
      }
      loadDashboardData();
    } catch (error) {
      toast.error(error.message || 'Wallet operation failed');
    } finally {
      setWalletLoading(false);
    }
  };

const quickActions = [
    { label: 'Manage Products', path: '/admin/products', icon: 'Package', color: 'from-blue-500 to-cyan-500', notificationKey: 'products' },
    { label: 'Vendor Portal', path: '/vendor-portal', icon: 'Store', color: 'from-purple-500 to-violet-500', notificationKey: 'vendor', role: ['admin', 'moderator'] },
    { label: 'Role Assignment', path: '/role-management', icon: 'Settings', color: 'from-amber-500 to-yellow-500', notificationKey: 'roles', role: ['admin'] },
    { label: 'POS Terminal', path: '/admin/pos', icon: 'Calculator', color: 'from-green-500 to-emerald-500', notificationKey: 'pos' },
    { label: 'View Orders', path: '/orders', icon: 'ShoppingCart', color: 'from-purple-500 to-pink-500', notificationKey: 'orders' },
    { label: 'Financial Dashboard', path: '/admin/financial-dashboard', icon: 'DollarSign', color: 'from-emerald-500 to-teal-500', notificationKey: 'financial' },
    { label: 'AI Generate', path: '/admin/ai-generate', icon: 'Brain', color: 'from-purple-500 to-indigo-500', notificationKey: 'ai' },
    { label: 'Payment Verification', path: '/admin/payments?tab=verification', icon: 'Shield', color: 'from-orange-500 to-red-500', notificationKey: 'verification' },
    { label: 'Payment Management', path: '/admin/payments', icon: 'CreditCard', color: 'from-teal-500 to-cyan-500', notificationKey: 'payments' },
    { label: 'Delivery Tracking', path: '/admin/delivery-dashboard', icon: 'MapPin', color: 'from-indigo-500 to-purple-500', notificationKey: 'delivery' },
    { label: 'Analytics', path: '/admin/analytics', icon: 'TrendingUp', color: 'from-amber-500 to-orange-500', notificationKey: 'analytics' }
];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your FreshMart store</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl">
<div className="flex items-center justify-between">
<div>
              <p className="text-green-100 text-sm">Wallet Balance</p>
              <p className="text-2xl font-bold">Rs. {(stats?.walletBalance || 0).toLocaleString()}</p>
            </div>
            <ApperIcon name="Wallet" size={32} className="text-green-100" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Transactions</p>
              <p className="text-2xl font-bold">{(stats?.totalTransactions || 0).toLocaleString()}</p>
            </div>
            <ApperIcon name="CreditCard" size={32} className="text-blue-100" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
<div>
              <p className="text-purple-100 text-sm">Monthly Revenue</p>
              <p className="text-2xl font-bold">Rs. {(stats?.monthlyRevenue || 0).toLocaleString()}</p>
            </div>
            <ApperIcon name="TrendingUp" size={32} className="text-purple-100" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Pending Verifications</p>
              <p className="text-2xl font-bold">{(stats?.pendingVerifications || 0).toLocaleString()}</p>
            </div>
            <ApperIcon name="Clock" size={32} className="text-orange-100" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
<div>
              <p className="text-emerald-100 text-sm">Today's Revenue</p>
              <p className="text-2xl font-bold">Rs. {(stats?.todayRevenue || 0).toLocaleString()}</p>
            </div>
            <ApperIcon name="DollarSign" size={32} className="text-emerald-100" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm">Today's Orders</p>
              <p className="text-2xl font-bold">{(todayOrders?.length || 0).toLocaleString()}</p>
            </div>
            <ApperIcon name="ShoppingCart" size={32} className="text-violet-100" />
          </div>
        </div>
      </div>

      {/* Quick Actions and Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
{/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const badgeCount = notificationCounts[action.notificationKey] || 0;
              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className="group"
                  onClick={() => handleTabClick(action.path)}
                >
                  <div className="relative p-4 rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <div className={`relative bg-gradient-to-r ${action.color} p-2 rounded-lg`}>
                        <ApperIcon name={action.icon} size={20} className="text-white" />
                        {badgeCount > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[20px] shadow-lg">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                        {action.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-primary hover:text-primary-dark transition-colors">
              View All
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ApperIcon name="Package" size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary p-2 rounded-lg">
                      <ApperIcon name="Package" size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Order #{order?.id || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{format(new Date(order?.createdAt || new Date()), 'MMM dd, yyyy')}</p>
                    </div>
</div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">Rs. {(order?.total || 0).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{order?.status || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
{/* Wallet Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Wallet Actions */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Wallet Management</h2>
          <div className="space-y-3">
            <Button
              onClick={() => handleWalletAction('deposit', 5000)}
              disabled={walletLoading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <ApperIcon name="Plus" size={16} className="mr-2" />
              Deposit Rs. 5,000
            </Button>
            <Button
              onClick={() => handleWalletAction('withdraw', 1000)}
              disabled={walletLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <ApperIcon name="Minus" size={16} className="mr-2" />
              Withdraw Rs. 1,000
            </Button>
            <Button
              onClick={() => handleWalletAction('transfer', 2000)}
              disabled={walletLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <ApperIcon name="Send" size={16} className="mr-2" />
              Transfer Rs. 2,000
            </Button>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Payment Method</h2>
          {revenueBreakdown.length === 0 ? (
            <div className="text-center py-8">
              <ApperIcon name="PieChart" size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No revenue data</p>
            </div>
          ) : (
<div className="space-y-3">
              {revenueBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary p-2 rounded-lg">
                      <ApperIcon name="CreditCard" size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{item?.method || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">Payment method</p>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900">Rs. {(item?.amount || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wallet Transactions */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Wallet Transactions</h2>
          {walletTransactions.length === 0 ? (
            <div className="text-center py-8">
              <ApperIcon name="Wallet" size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No wallet transactions</p>
            </div>
          ) : (
            <div className="space-y-3">
{walletTransactions.map((transaction) => (
                <div key={transaction?.id || transaction?.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                      <p className="font-medium text-gray-900 capitalize">{transaction?.type || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(transaction?.timestamp || new Date()), 'MMM dd, hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <p className={`font-medium ${
                    transaction?.type === 'deposit' ? 'text-green-600' : 
                    transaction?.type === 'withdraw' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {transaction?.type === 'deposit' ? '+' : '-'}Rs. {(transaction?.amount || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
</div>
      </div>

      {/* Approval Workflow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pending Approvals */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ApperIcon name="Clock" size={20} className="text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Pending Approvals</h2>
              {realTimeUpdates.connected && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">Live</span>
                </div>
              )}
            </div>
            <Badge variant="warning" className="text-sm">
              {pendingApprovals.length} pending
            </Badge>
          </div>
          
          {approvalLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loading type="spinner" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8">
              <ApperIcon name="CheckCircle" size={48} className="text-green-400 mx-auto mb-4" />
              <p className="text-gray-600">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {pendingApprovals.slice(0, 5).map((approval) => (
                <div key={approval.Id} className="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{approval.title}</h3>
                        <Badge 
                          variant={approval.priority === 'urgent' ? 'error' : approval.priority === 'high' ? 'warning' : 'info'}
                          className="text-xs"
                        >
                          {approval.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{approval.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>By: {approval.submittedBy}</span>
                        <span>{format(new Date(approval.submittedAt), 'MMM dd, HH:mm')}</span>
                        {approval.businessImpact?.revenueImpact && (
                          <span className={approval.businessImpact.revenueImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                            Rs. {Math.abs(approval.businessImpact.revenueImpact).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="Check"
                        onClick={() => openApprovalModal(approval, 'approve')}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="X"
                        onClick={() => openApprovalModal(approval, 'reject')}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time System Status */}
        <div className="card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ApperIcon name="Activity" size={20} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
          </div>
          
          <div className="space-y-4">
            {/* WebSocket Connection */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${realTimeUpdates.connected ? 'bg-green-100' : 'bg-red-100'}`}>
                  <ApperIcon 
                    name={realTimeUpdates.connected ? "Wifi" : "WifiOff"} 
                    size={20} 
                    className={realTimeUpdates.connected ? "text-green-600" : "text-red-600"} 
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Real-time Updates</p>
                  <p className={`text-sm ${realTimeUpdates.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {realTimeUpdates.connected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
              <Badge variant={realTimeUpdates.connected ? "success" : "error"} className="text-xs">
                {realTimeUpdates.connected ? 'Live' : 'Offline'}
              </Badge>
            </div>

            {/* Database Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ApperIcon name="Database" size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">MongoDB Database</p>
                  <p className="text-sm text-green-600">Connected</p>
                </div>
              </div>
              <Badge variant="success" className="text-xs">Active</Badge>
            </div>

            {/* Approval Workflow Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <ApperIcon name="GitBranch" size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Approval Workflow</p>
                  <p className="text-sm text-blue-600">
                    {pendingApprovals.length} pending, {realTimeUpdates.notifications.length} updates
                  </p>
                </div>
              </div>
              <Badge variant="info" className="text-xs">Active</Badge>
            </div>

            {/* Last Update */}
            {realTimeUpdates.lastUpdate && (
              <div className="text-center text-xs text-gray-500 pt-2 border-t">
                Last update: {format(new Date(realTimeUpdates.lastUpdate), 'HH:mm:ss')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Infrastructure Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <ApperIcon name="CheckCircle" size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Payment Gateway</p>
              <p className="text-sm text-green-600">Active</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <ApperIcon name="CheckCircle" size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Inventory Sync</p>
              <p className="text-sm text-green-600">Up to date</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${realTimeUpdates.connected ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <ApperIcon 
                name="Server" 
                size={20} 
                className={realTimeUpdates.connected ? "text-green-600" : "text-yellow-600"} 
              />
            </div>
            <div>
              <p className="font-medium text-gray-900">Node.js Backend</p>
              <p className={`text-sm ${realTimeUpdates.connected ? 'text-green-600' : 'text-yellow-600'}`}>
                {realTimeUpdates.connected ? 'Connected' : 'Connecting...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Action Modal */}
      {showApprovalModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedApproval.action === 'approve' ? 'Approve' : 'Reject'} Request
                </h2>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ApperIcon name="X" size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Request Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">{selectedApproval.title}</h3>
                <p className="text-gray-600 mb-4">{selectedApproval.description}</p>
                
                {/* Business Impact */}
                {selectedApproval.businessImpact && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Business Impact</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Revenue Impact:</span>
                        <p className={`font-medium ${selectedApproval.businessImpact.revenueImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Rs. {Math.abs(selectedApproval.businessImpact.revenueImpact).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Margin Impact:</span>
                        <p className={`font-medium ${selectedApproval.businessImpact.marginImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedApproval.businessImpact.marginImpact}%
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Customer Impact:</span>
                        <p className="font-medium text-gray-900 capitalize">
                          {selectedApproval.businessImpact.customerImpact}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedApproval.action === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder={selectedApproval.action === 'approve' 
                    ? 'Add any comments about this approval...' 
                    : 'Please provide a reason for rejection...'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4}
                  required={selectedApproval.action === 'reject'}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <Button
                variant="ghost"
                onClick={() => setShowApprovalModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant={selectedApproval.action === 'approve' ? 'primary' : 'secondary'}
                onClick={() => handleApprovalAction(selectedApproval.action, selectedApproval.Id, approvalComments)}
                disabled={selectedApproval.action === 'reject' && !approvalComments.trim()}
                icon={selectedApproval.action === 'approve' ? 'Check' : 'X'}
              >
                {selectedApproval.action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
</div>
  );
};

export default AdminDashboard;