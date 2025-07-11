import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import Chart from "react-apexcharts";
import { formatCurrency } from "@/utils/currency";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Analytics from "@/components/pages/Analytics";
import Orders from "@/components/pages/Orders";
import Category from "@/components/pages/Category";
import { orderService } from "@/services/api/orderService";
import { financialService } from "@/services/api/financialService";
import { productService } from "@/services/api/productService";

function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Financial Data State
  const [financialMetrics, setFinancialMetrics] = useState(null);
  const [profitTrends, setProfitTrends] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState([]);
  
  // Form States
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metrics, trends, expenses, vendors, payments, cashFlow] = await Promise.all([
        financialService.getFinancialMetrics(30),
        financialService.getProfitTrends(30),
        financialService.getExpenses(30),
        financialService.getVendors(),
        financialService.getVendorPayments(30),
        financialService.getCashFlowAnalytics(30)
      ]);

      setFinancialMetrics(metrics);
      setProfitTrends(trends);
      setExpenseData(expenses);
      setVendorData(vendors);
      setVendorPayments(payments);
      setCashFlowData(cashFlow);
    } catch (err) {
      console.error('Error loading financial data:', err);
      setError(err.message || 'Failed to load financial data');
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (expenseData) => {
    try {
      if (editingExpense) {
        await financialService.updateExpense(editingExpense.Id, expenseData);
        toast.success('Expense updated successfully');
      } else {
        await financialService.createExpense(expenseData);
        toast.success('Expense created successfully');
      }
      
      setShowExpenseForm(false);
      setEditingExpense(null);
      loadFinancialData();
    } catch (err) {
      console.error('Error saving expense:', err);
      toast.error('Failed to save expense');
    }
  };

  const handleExpenseDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await financialService.deleteExpense(expenseId);
      toast.success('Expense deleted successfully');
      loadFinancialData();
    } catch (err) {
      console.error('Error deleting expense:', err);
      toast.error('Failed to delete expense');
    }
  };

  const handleVendorSubmit = async (vendorData) => {
    try {
      if (editingVendor) {
        await financialService.updateVendor(editingVendor.Id, vendorData);
        toast.success('Vendor updated successfully');
      } else {
        await financialService.createVendor(vendorData);
        toast.success('Vendor created successfully');
      }
      
      setShowVendorForm(false);
      setEditingVendor(null);
      loadFinancialData();
    } catch (err) {
      console.error('Error saving vendor:', err);
      toast.error('Failed to save vendor');
    }
  };

  const handleVendorDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
      await financialService.deleteVendor(vendorId);
      toast.success('Vendor deleted successfully');
      loadFinancialData();
    } catch (err) {
      console.error('Error deleting vendor:', err);
      toast.error('Failed to delete vendor');
    }
  };

  const handleVendorPayment = async (paymentData) => {
    try {
      await financialService.processVendorPayment(paymentData);
      toast.success('Payment processed successfully');
      setShowPaymentForm(false);
      loadFinancialData();
    } catch (err) {
      console.error('Error processing payment:', err);
      toast.error('Failed to process payment');
    }
  };

  const handleBulkPayment = async () => {
    if (selectedPayments.length === 0) {
      toast.warning('Please select payments to process');
      return;
    }
    
    if (!window.confirm(`Process ${selectedPayments.length} payments?`)) return;
    
    try {
      await financialService.processBulkVendorPayments(selectedPayments);
      toast.success(`${selectedPayments.length} payments processed successfully`);
      setSelectedPayments([]);
      loadFinancialData();
    } catch (err) {
      console.error('Error processing bulk payments:', err);
      toast.error('Failed to process bulk payments');
    }
  };

  const togglePaymentSelection = (paymentId) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const getOverduePayments = () => {
    const today = new Date();
    return vendorPayments?.filter(payment => 
      payment.status === 'pending' && new Date(payment.dueDate) < today
    ) || [];
  };

  const getProfitTrendChartData = () => {
    if (!profitTrends || profitTrends.length === 0) return null;
    
    return {
      options: {
        chart: {
          type: 'line',
          toolbar: { show: false }
        },
        colors: ['#4CAF50', '#2196F3', '#FF9800'],
        xaxis: {
          categories: profitTrends.map(trend => format(new Date(trend.date), 'MMM dd'))
        },
        yaxis: {
          labels: {
            formatter: (value) => formatCurrency(value)
          }
        },
        stroke: {
          curve: 'smooth',
          width: 2
        },
        legend: {
          position: 'top'
        }
      },
      series: [
        {
          name: 'Revenue',
          data: profitTrends.map(trend => trend.revenue)
        },
        {
          name: 'Cost',
          data: profitTrends.map(trend => trend.cost)
        },
        {
          name: 'Profit',
          data: profitTrends.map(trend => trend.profit)
        }
      ]
    };
  };

  const getCashFlowChartData = () => {
    if (!cashFlowData?.trendData || cashFlowData.trendData.length === 0) return null;
    
    return {
      options: {
        chart: {
          type: 'bar',
          toolbar: { show: false }
        },
        colors: ['#4CAF50', '#F44336'],
        xaxis: {
          categories: cashFlowData.trendData.map(trend => trend.date)
        },
        yaxis: {
          labels: {
            formatter: (value) => formatCurrency(value)
          }
        },
        legend: {
          position: 'top'
        }
      },
      series: [
        {
          name: 'Inflows',
          data: cashFlowData.trendData.map(trend => trend.inflows)
        },
        {
          name: 'Outflows',
          data: cashFlowData.trendData.map(trend => trend.outflows)
        }
      ]
    };
  };

  const exportFinancialReport = async () => {
    try {
      const reportData = {
        period: format(new Date(), 'MMMM yyyy'),
        generatedAt: new Date().toISOString(),
        metrics: financialMetrics,
        trends: profitTrends,
        expenses: expenseData,
        vendors: vendorData,
        payments: vendorPayments,
        cashFlow: cashFlowData
      };
      
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Financial report exported successfully');
    } catch (err) {
      console.error('Error exporting report:', err);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return <Loading type="financial" />;
  }

  if (error) {
    return (
      <Error 
        message={error} 
        onRetry={loadFinancialData}
        showRetry={true}
      />
    );
  }

  const overduePayments = getOverduePayments();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600">Monitor your business financial health</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={exportFinancialReport}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ApperIcon name="Download" size={16} />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* Alert for Overdue Payments */}
      {overduePayments.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ApperIcon name="AlertCircle" className="text-red-600 mr-2" size={20} />
            <div>
              <h3 className="text-red-800 font-semibold">Overdue Payments Alert</h3>
              <p className="text-red-700">
                You have {overduePayments.length} overdue payment(s) totaling{' '}
                {formatCurrency(overduePayments.reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Financial Metrics Overview */}
      {financialMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(financialMetrics.summary.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ApperIcon name="TrendingUp" className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">Total Profit</h3>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(financialMetrics.summary.totalProfit)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ApperIcon name="DollarSign" className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">Profit Margin</h3>
                <p className="text-2xl font-bold text-warning">
                  {financialMetrics.summary.profitMargin?.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <ApperIcon name="Percent" className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">Total Orders</h3>
                <p className="text-2xl font-bold text-info">
                  {financialMetrics.summary.totalOrders}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <ApperIcon name="ShoppingCart" className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: 'BarChart3' },
            { id: 'expenses', label: 'Expenses', icon: 'CreditCard' },
            { id: 'vendors', label: 'Vendors', icon: 'Building' },
            { id: 'payments', label: 'Payments', icon: 'Wallet' },
            { id: 'cashflow', label: 'Cash Flow', icon: 'TrendingUp' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ApperIcon name={tab.icon} size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit Trends Chart */}
            <div className="bg-white p-6 rounded-lg shadow-card">
              <h3 className="text-lg font-semibold mb-4">Profit Trends</h3>
              {getProfitTrendChartData() && (
                <Chart
                  options={getProfitTrendChartData().options}
                  series={getProfitTrendChartData().series}
                  type="line"
                  height={300}
                />
              )}
            </div>

            {/* Cash Flow Chart */}
            <div className="bg-white p-6 rounded-lg shadow-card">
              <h3 className="text-lg font-semibold mb-4">Cash Flow</h3>
              {getCashFlowChartData() && (
                <Chart
                  options={getCashFlowChartData().options}
                  series={getCashFlowChartData().series}
                  type="bar"
                  height={300}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="bg-white rounded-lg shadow-card">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Expense Management</h3>
                <Button 
                  onClick={() => setShowExpenseForm(true)}
                  className="flex items-center space-x-2"
                >
                  <ApperIcon name="Plus" size={16} />
                  <span>Add Expense</span>
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Date</th>
                    <th className="text-left p-4 font-medium text-gray-600">Description</th>
                    <th className="text-left p-4 font-medium text-gray-600">Category</th>
                    <th className="text-left p-4 font-medium text-gray-600">Vendor</th>
                    <th className="text-right p-4 font-medium text-gray-600">Amount</th>
                    <th className="text-center p-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseData?.map(expense => (
                    <tr key={expense.Id} className="border-b border-gray-100">
                      <td className="p-4 text-sm">
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="p-4 text-sm">{expense.description}</td>
                      <td className="p-4 text-sm">
                        <Badge variant="secondary">{expense.category}</Badge>
                      </td>
                      <td className="p-4 text-sm">{expense.vendor}</td>
                      <td className="p-4 text-sm text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingExpense(expense);
                              setShowExpenseForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ApperIcon name="Edit" size={16} />
                          </button>
                          <button
                            onClick={() => handleExpenseDelete(expense.Id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <ApperIcon name="Trash2" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="bg-white rounded-lg shadow-card">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Vendor Management</h3>
                <Button 
                  onClick={() => setShowVendorForm(true)}
                  className="flex items-center space-x-2"
                >
                  <ApperIcon name="Plus" size={16} />
                  <span>Add Vendor</span>
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Name</th>
                    <th className="text-left p-4 font-medium text-gray-600">Email</th>
                    <th className="text-left p-4 font-medium text-gray-600">Phone</th>
                    <th className="text-left p-4 font-medium text-gray-600">Category</th>
                    <th className="text-left p-4 font-medium text-gray-600">Payment Terms</th>
                    <th className="text-center p-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorData?.map(vendor => (
                    <tr key={vendor.Id} className="border-b border-gray-100">
                      <td className="p-4 text-sm font-medium">{vendor.name}</td>
                      <td className="p-4 text-sm">{vendor.email}</td>
                      <td className="p-4 text-sm">{vendor.phone}</td>
                      <td className="p-4 text-sm">
                        <Badge variant="outline">{vendor.category}</Badge>
                      </td>
                      <td className="p-4 text-sm">{vendor.paymentTerms} days</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingVendor(vendor);
                              setShowVendorForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ApperIcon name="Edit" size={16} />
                          </button>
                          <button
                            onClick={() => handleVendorDelete(vendor.Id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <ApperIcon name="Trash2" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-card">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Vendor Payments</h3>
                <div className="flex space-x-3">
                  {selectedPayments.length > 0 && (
                    <Button 
                      onClick={handleBulkPayment}
                      variant="primary"
                      className="flex items-center space-x-2"
                    >
                      <ApperIcon name="CreditCard" size={16} />
                      <span>Pay Selected ({selectedPayments.length})</span>
                    </Button>
                  )}
                  <Button 
                    onClick={() => setShowPaymentForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <ApperIcon name="Plus" size={16} />
                    <span>Add Payment</span>
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPayments(
                              vendorPayments?.filter(p => p.status === 'pending').map(p => p.Id) || []
                            );
                          } else {
                            setSelectedPayments([]);
                          }
                        }}
                        checked={selectedPayments.length > 0}
                      />
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600">Vendor</th>
                    <th className="text-left p-4 font-medium text-gray-600">Description</th>
                    <th className="text-left p-4 font-medium text-gray-600">Due Date</th>
                    <th className="text-right p-4 font-medium text-gray-600">Amount</th>
                    <th className="text-center p-4 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorPayments?.map(payment => {
                    const vendor = vendorData?.find(v => v.Id === payment.vendorId);
                    const isOverdue = payment.status === 'pending' && new Date(payment.dueDate) < new Date();
                    
                    return (
                      <tr key={payment.Id} className="border-b border-gray-100">
                        <td className="p-4">
                          {payment.status === 'pending' && (
                            <input
                              type="checkbox"
                              checked={selectedPayments.includes(payment.Id)}
                              onChange={() => togglePaymentSelection(payment.Id)}
                            />
                          )}
                        </td>
                        <td className="p-4 text-sm font-medium">{vendor?.name || 'Unknown'}</td>
                        <td className="p-4 text-sm">{payment.description}</td>
                        <td className="p-4 text-sm">
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(payment.dueDate), 'MMM dd, yyyy')}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            variant={
                              payment.status === 'paid' ? 'success' :
                              isOverdue ? 'error' : 'warning'
                            }
                          >
                            {payment.status === 'paid' ? 'Paid' :
                             isOverdue ? 'Overdue' : 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'cashflow' && cashFlowData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-card">
              <h3 className="text-lg font-semibold mb-4">Cash Flow Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Inflows:</span>
                  <span className="font-medium text-success">
                    {formatCurrency(cashFlowData.totalInflows)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Outflows:</span>
                  <span className="font-medium text-error">
                    {formatCurrency(cashFlowData.totalOutflows)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-gray-900 font-medium">Net Cash Flow:</span>
                  <span className={`font-bold ${
                    cashFlowData.netCashFlow >= 0 ? 'text-success' : 'text-error'
                  }`}>
                    {formatCurrency(cashFlowData.netCashFlow)}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-card">
              <h3 className="text-lg font-semibold mb-4">Cash Flow Trend</h3>
              {getCashFlowChartData() && (
                <Chart
                  options={getCashFlowChartData().options}
                  series={getCashFlowChartData().series}
                  type="bar"
                  height={300}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Simple Forms - These would be replaced with proper modal forms in production */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const expenseData = {
                amount: formData.get('amount'),
                vendor: formData.get('vendor'),
                category: formData.get('category'),
                description: formData.get('description'),
                date: formData.get('date')
              };
              handleExpenseSubmit(expenseData);
            }}>
              <div className="space-y-4">
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  defaultValue={editingExpense?.amount || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  name="vendor"
                  type="text"
                  placeholder="Vendor"
                  defaultValue={editingExpense?.vendor || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
                <select
                  name="category"
                  defaultValue={editingExpense?.category || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Other">Other</option>
                </select>
                <textarea
                  name="description"
                  placeholder="Description"
                  defaultValue={editingExpense?.description || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows="3"
                  required
                />
                <input
                  name="date"
                  type="date"
                  defaultValue={editingExpense?.date || format(new Date(), 'yyyy-MM-dd')}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowExpenseForm(false);
                    setEditingExpense(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingExpense ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVendorForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const vendorData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                category: formData.get('category'),
                paymentTerms: formData.get('paymentTerms'),
                address: formData.get('address')
              };
              handleVendorSubmit(vendorData);
            }}>
              <div className="space-y-4">
                <input
                  name="name"
                  type="text"
                  placeholder="Vendor Name"
                  defaultValue={editingVendor?.name || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  defaultValue={editingVendor?.email || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="Phone"
                  defaultValue={editingVendor?.phone || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
                <select
                  name="category"
                  defaultValue={editingVendor?.category || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Supplier">Supplier</option>
                  <option value="Service Provider">Service Provider</option>
                  <option value="Utility">Utility</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  name="paymentTerms"
                  type="number"
                  placeholder="Payment Terms (days)"
                  defaultValue={editingVendor?.paymentTerms || '30'}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
                <textarea
                  name="address"
                  placeholder="Address"
                  defaultValue={editingVendor?.address || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowVendorForm(false);
                    setEditingVendor(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVendor ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4">Add New Payment</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const paymentData = {
                vendorId: formData.get('vendorId'),
                amount: formData.get('amount'),
                description: formData.get('description'),
                dueDate: formData.get('dueDate'),
                invoiceNumber: formData.get('invoiceNumber')
              };
              handleVendorPayment(paymentData);
            }}>
              <div className="space-y-4">
                <select
                  name="vendorId"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendorData?.map(vendor => (
                    <option key={vendor.Id} value={vendor.Id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows="3"
                  required
                />
                <input
                  name="dueDate"
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  name="invoiceNumber"
                  type="text"
                  placeholder="Invoice Number"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialDashboard;
