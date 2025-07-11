import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import Chart from "react-apexcharts";
import { financialService } from "@/services/api/financialService";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Analytics from "@/components/pages/Analytics";
import Category from "@/components/pages/Category";
import { orderService } from "@/services/api/orderService";
import { productService } from "@/services/api/productService";

const FinancialDashboard = () => {
  const [data, setData] = useState({
    products: [],
    orders: [],
    financialMetrics: {}
  });
  const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');
const [selectedView, setSelectedView] = useState('overview');
  const [expenseData, setExpenseData] = useState({
    expenses: [],
    categories: [],
    analytics: {}
  });
  const [vendorData, setVendorData] = useState({
    vendors: [],
    payments: [],
    analytics: {}
  });
  const [cashFlowData, setCashFlowData] = useState({
    analysis: {},
    workingCapital: {},
    liquidity: {},
    projections: []
  });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    loadFinancialData();
    if (selectedView === 'expenses') {
      loadExpenseData();
    } else if (selectedView === 'vendors') {
      loadVendorData();
    } else if (selectedView === 'cashflow') {
      loadCashFlowData();
    }
}, [dateRange, selectedView]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [products, orders, metrics] = await Promise.all([
        productService.getAll(),
        orderService.getAll(),
        financialService.getFinancialMetrics(parseInt(dateRange))
      ]);
      
      setData({ products, orders, financialMetrics: metrics });
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
};

  const loadExpenseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [expenses, categories, analytics] = await Promise.all([
        financialService.getExpenses(parseInt(dateRange)),
        financialService.getExpenseCategories(),
        financialService.getExpenseAnalytics(parseInt(dateRange))
      ]);
      
      setExpenseData({ expenses, categories, analytics });
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load expense data');
    } finally {
      setLoading(false);
    }
};

  const loadVendorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [vendors, payments, analytics] = await Promise.all([
        financialService.getVendors(),
        financialService.getVendorPayments(parseInt(dateRange)),
        financialService.getVendorPaymentAnalytics(parseInt(dateRange))
      ]);
      
      setVendorData({ vendors, payments, analytics });
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
};

  const loadCashFlowData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [analysis, workingCapital, liquidity, projections] = await Promise.all([
        financialService.getCashFlowAnalytics(parseInt(dateRange)),
        financialService.calculateWorkingCapital(),
        financialService.getLiquidityMetrics(parseInt(dateRange)),
        financialService.getCashFlowProjections(30)
      ]);
      
      setCashFlowData({ analysis, workingCapital, liquidity, projections });
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load cash flow data');
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
      loadExpenseData();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleExpenseDelete = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await financialService.deleteExpense(expenseId);
      toast.success('Expense deleted successfully');
      loadExpenseData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const handleReceiptUpload = async (file) => {
    try {
      setOcrProcessing(true);
      const ocrResult = await financialService.processReceiptOCR(file);
      
      if (ocrResult.success) {
        setShowExpenseForm(true);
        setEditingExpense({
          amount: ocrResult.amount,
          vendor: ocrResult.vendor,
          date: ocrResult.date,
          category: ocrResult.category,
          description: ocrResult.description
        });
        toast.success('Receipt processed successfully');
      } else {
        toast.warning('Could not extract all data from receipt. Please fill manually.');
        setShowExpenseForm(true);
      }
    } catch (error) {
      toast.error('Failed to process receipt');
    } finally {
      setOcrProcessing(false);
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
      loadVendorData();
    } catch (error) {
      toast.error('Failed to save vendor');
    }
  };

  const handleVendorDelete = async (vendorId) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
      await financialService.deleteVendor(vendorId);
      toast.success('Vendor deleted successfully');
      loadVendorData();
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
  };

  const handleVendorPayment = async (paymentData) => {
    try {
      await financialService.processVendorPayment(paymentData);
      toast.success('Payment processed successfully');
      setShowPaymentForm(false);
      setSelectedVendorForPayment(null);
      loadVendorData();
    } catch (error) {
      toast.error('Failed to process payment');
    }
  };

  const handleBulkPayment = async () => {
    if (selectedPayments.length === 0) {
      toast.error('Please select payments to process');
      return;
    }

    setBulkProcessing(true);
    try {
      await financialService.processBulkVendorPayments(selectedPayments);
      toast.success(`${selectedPayments.length} payments processed successfully`);
      setSelectedPayments([]);
      setShowBulkPaymentModal(false);
      loadVendorData();
    } catch (error) {
      toast.error('Failed to process bulk payments');
    } finally {
      setBulkProcessing(false);
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
    return vendorData.payments.filter(payment => 
      payment.status === 'pending' && new Date(payment.dueDate) < today
    );
  };

  const calculateProfitMetrics = () => {
    const days = parseInt(dateRange);
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
    const filteredOrders = data.orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        const product = data.products.find(p => p.id === item.productId);
        if (product) {
          const revenue = product.price * item.quantity;
          const cost = (product.purchasePrice || 0) * item.quantity;
          totalRevenue += revenue;
          totalCost += cost;
          totalProfit += (revenue - cost);
        }
      });
    });

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      roi,
      orderCount: filteredOrders.length
    };
  };

  const getTopProfitableProducts = () => {
    const days = parseInt(dateRange);
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
    const productSales = {};
    
    data.orders
      .filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      })
      .forEach(order => {
        order.items?.forEach(item => {
          const product = data.products.find(p => p.id === item.productId);
          if (product && product.purchasePrice) {
            const productId = item.productId;
            const revenue = product.price * item.quantity;
            const cost = product.purchasePrice * item.quantity;
            const profit = revenue - cost;
            
            if (!productSales[productId]) {
              productSales[productId] = {
                product,
                quantity: 0,
                revenue: 0,
                cost: 0,
                profit: 0
              };
            }
            
            productSales[productId].quantity += item.quantity;
            productSales[productId].revenue += revenue;
            productSales[productId].cost += cost;
            productSales[productId].profit += profit;
          }
        });
      });

    return Object.values(productSales)
      .map(item => ({
        ...item,
        profitMargin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  };

  const getProfitTrendData = () => {
    const days = parseInt(dateRange);
    const trendData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayOrders = data.orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });

      let dayRevenue = 0;
      let dayCost = 0;
      
      dayOrders.forEach(order => {
        order.items?.forEach(item => {
          const product = data.products.find(p => p.id === item.productId);
          if (product) {
            dayRevenue += product.price * item.quantity;
            dayCost += (product.purchasePrice || 0) * item.quantity;
          }
        });
      });

      trendData.push({
        date: format(date, 'MMM dd'),
        revenue: dayRevenue,
        cost: dayCost,
        profit: dayRevenue - dayCost,
        margin: dayRevenue > 0 ? ((dayRevenue - dayCost) / dayRevenue) * 100 : 0
      });
    }
    
    return trendData;
  };

  const getCategoryProfitability = () => {
    const categoryData = {};
    
    data.orders.forEach(order => {
      order.items?.forEach(item => {
        const product = data.products.find(p => p.id === item.productId);
        if (product && product.purchasePrice) {
          const category = product.category || 'Uncategorized';
          const revenue = product.price * item.quantity;
          const cost = product.purchasePrice * item.quantity;
          
          if (!categoryData[category]) {
            categoryData[category] = { revenue: 0, cost: 0, profit: 0 };
          }
          
          categoryData[category].revenue += revenue;
          categoryData[category].cost += cost;
          categoryData[category].profit += (revenue - cost);
        }
      });
    });

    return Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        ...data,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit);
  };

  const exportFinancialReport = async () => {
    try {
      const metrics = calculateProfitMetrics();
      const topProducts = getTopProfitableProducts();
      const categoryData = getCategoryProfitability();
      
      const report = {
        period: `${dateRange} days`,
        generatedAt: new Date().toISOString(),
        summary: metrics,
        topProducts: topProducts.slice(0, 5),
        categoryBreakdown: categoryData,
        healthMetrics: {
          profitableProducts: data.products.filter(p => 
            p.profitMargin && parseFloat(p.profitMargin) > 0
          ).length,
          totalProducts: data.products.length,
          averageMargin: metrics.profitMargin
        }
      };
      
      const dataStr = JSON.stringify(report, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Financial report exported successfully');
    } catch (error) {
      toast.error('Failed to export financial report');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="financial" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadFinancialData} type="financial" />
      </div>
    );
  }

  const metrics = calculateProfitMetrics();
  const topProducts = getTopProfitableProducts();
  const trendData = getProfitTrendData();
  const categoryData = getCategoryProfitability();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Dashboard</h1>
          <p className="text-gray-600">Comprehensive profitability analysis and insights</p>
        </div>
<div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button onClick={exportFinancialReport} variant="outline">
            <ApperIcon name="Download" size={16} className="mr-2" />
            Export Report
          </Button>
          <Link to="/admin/analytics">
            <Button variant="secondary">
              <ApperIcon name="BarChart3" size={16} className="mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

{/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setSelectedView('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedView === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ApperIcon name="BarChart3" size={16} className="mr-2 inline" />
            Financial Overview
          </button>
          <button
            onClick={() => setSelectedView('cashflow')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedView === 'cashflow'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ApperIcon name="TrendingUp" size={16} className="mr-2 inline" />
            Cash Flow Analysis
          </button>
          <button
            onClick={() => setSelectedView('expenses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedView === 'expenses'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ApperIcon name="Receipt" size={16} className="mr-2 inline" />
            Expense Tracking
          </button>
          <button
            onClick={() => setSelectedView('vendors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedView === 'vendors'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ApperIcon name="Users" size={16} className="mr-2 inline" />
            Vendor Payments
          </button>
        </nav>
      </div>

{selectedView === 'overview' && (
        <>
          {/* Key Financial Metrics */}
          {/* Key Financial Metrics - Enhanced with Real-time Updates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="card p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold">Rs. {metrics.totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <ApperIcon name="TrendingUp" size={12} className="mr-1" />
                    <span className="text-xs text-green-100">Real-time</span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="TrendingUp" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Net Profit</p>
                  <p className="text-3xl font-bold">Rs. {metrics.totalProfit.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <div className={`w-2 h-2 rounded-full mr-2 ${metrics.totalProfit > 0 ? 'bg-green-300' : 'bg-red-300'}`}></div>
                    <span className="text-xs text-blue-100">Live</span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="DollarSign" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Profit Margin</p>
                  <p className="text-3xl font-bold">{metrics.profitMargin.toFixed(1)}%</p>
                  <div className="flex items-center mt-2">
                    <ApperIcon name={metrics.profitMargin > 15 ? "ArrowUp" : metrics.profitMargin > 5 ? "Minus" : "ArrowDown"} size={12} className="mr-1" />
                    <span className="text-xs text-purple-100">
                      {metrics.profitMargin > 15 ? 'Excellent' : metrics.profitMargin > 5 ? 'Good' : 'Low'}
                    </span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Percent" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Return on Investment</p>
                  <p className="text-3xl font-bold">{metrics.roi.toFixed(1)}%</p>
                  <div className="flex items-center mt-2">
                    <ApperIcon name="Target" size={12} className="mr-1" />
                    <span className="text-xs text-orange-100">
                      {dateRange} days
                    </span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Target" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Cash Position</p>
                  <p className="text-3xl font-bold">Rs. {(metrics.totalRevenue - metrics.totalCost).toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse"></div>
                    <span className="text-xs text-indigo-100">Current</span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Wallet" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Profit Trend Chart */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Profit Trend Analysis</h2>
              <Chart
                options={{
                  chart: {
                    type: 'line',
                    toolbar: { show: false }
                  },
                  stroke: {
                    curve: 'smooth',
                    width: [0, 3, 3]
                  },
                  fill: {
                    type: ['gradient', 'solid', 'solid'],
                    gradient: {
                      shade: 'light',
                      type: 'vertical',
                      shadeIntensity: 0.25,
                      gradientToColors: ['#10B981'],
                      inverseColors: true,
                      opacityFrom: 0.85,
                      opacityTo: 0.25
                    }
                  },
                  colors: ['#10B981', '#3B82F6', '#8B5CF6'],
                  xaxis: {
                    categories: trendData.map(d => d.date)
                  },
                  yaxis: [
                    {
                      title: { text: 'Amount (Rs.)' },
                      labels: {
                        formatter: (val) => `Rs. ${val.toLocaleString()}`
                      }
                    },
                    {
                      opposite: true,
                      title: { text: 'Margin (%)' },
                      labels: {
                        formatter: (val) => `${val.toFixed(1)}%`
                      }
                    }
                  ],
                  tooltip: {
                    y: [
                      {
                        formatter: (val) => `Rs. ${val.toLocaleString()}`
                      },
                      {
                        formatter: (val) => `Rs. ${val.toLocaleString()}`
                      },
                      {
                        formatter: (val) => `${val.toFixed(1)}%`
                      }
                    ]
                  },
                  legend: {
                    position: 'top'
                  }
                }}
                series={[
                  {
                    name: 'Revenue',
                    data: trendData.map(d => d.revenue),
                    type: 'area'
                  },
                  {
                    name: 'Profit',
                    data: trendData.map(d => d.profit),
                    type: 'line'
                  },
                  {
                    name: 'Margin %',
                    data: trendData.map(d => d.margin),
                    type: 'line',
                    yAxisIndex: 1
                  }
                ]}
                type="line"
                height={350}
              />
            </div>

            {/* Category Profitability */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Profitability</h2>
              <Chart
                options={{
                  chart: {
                    type: 'donut'
                  },
                  labels: categoryData.map(c => c.category),
                  colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'],
                  legend: {
                    position: 'bottom'
                  },
                  plotOptions: {
                    pie: {
                      donut: {
                        labels: {
                          show: true,
                          total: {
                            show: true,
                            label: 'Total Profit',
                            formatter: (w) => {
                              const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                              return `Rs. ${total.toLocaleString()}`;
                            }
                          }
                        }
                      }
                    }
                  },
                  tooltip: {
                    y: {
                      formatter: (val) => `Rs. ${val.toLocaleString()}`
                    }
                  }
                }}
                series={categoryData.map(c => c.profit)}
                type="donut"
                height={350}
              />
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Profitable Products */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Most Profitable Products</h2>
              <div className="space-y-4">
                {topProducts.slice(0, 5).map((item, index) => {
                  const healthColor = item.profitMargin >= 25 ? 'green' : 
                                     item.profitMargin >= 15 ? 'blue' : 
                                     item.profitMargin >= 5 ? 'yellow' : 'red';
                  
                  return (
                    <div key={item.product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary p-2 rounded-lg">
                          <span className="text-white font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-600">{item.quantity} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">Rs. {item.profit.toLocaleString()}</p>
                        <Badge variant={healthColor} className="text-xs">
                          {item.profitMargin.toFixed(1)}% margin
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {topProducts.length === 0 && (
                <div className="text-center py-8">
                  <ApperIcon name="TrendingDown" size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No profit data available</p>
                </div>
              )}
            </div>

            {/* Financial Health Indicators */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Health</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-200 p-2 rounded-lg">
                      <ApperIcon name="TrendingUp" size={20} className="text-green-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Profitable Products</p>
                      <p className="text-sm text-gray-600">Products with positive margin</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-700">
                      {data.products.filter(p => p.profitMargin && parseFloat(p.profitMargin) > 0).length}
                    </p>
                    <p className="text-sm text-gray-600">
                      of {data.products.length}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-200 p-2 rounded-lg">
                      <ApperIcon name="DollarSign" size={20} className="text-blue-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Average Profit Margin</p>
                      <p className="text-sm text-gray-600">Across all sales</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {metrics.profitMargin.toFixed(1)}%
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-200 p-2 rounded-lg">
                      <ApperIcon name="Target" size={20} className="text-purple-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Cost Efficiency</p>
                      <p className="text-sm text-gray-600">Cost to revenue ratio</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {metrics.totalRevenue > 0 ? ((metrics.totalCost / metrics.totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-4">
                <Link to="/admin/products" className="block">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
                        <ApperIcon name="Package" size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Manage Products</p>
                        <p className="text-sm text-gray-600">Update pricing & costs</p>
                      </div>
                    </div>
                  </div>
                </Link>
                
                <Link to="/admin/analytics" className="block">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                        <ApperIcon name="BarChart3" size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">View Analytics</p>
                        <p className="text-sm text-gray-600">Detailed business insights</p>
                      </div>
                    </div>
                  </div>
                </Link>
                
                <button
                  onClick={exportFinancialReport}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
                      <ApperIcon name="FileText" size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Generate Report</p>
                      <p className="text-sm text-gray-600">Export financial summary</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedView === 'cashflow' && (
        <>
          {/* Cash Flow Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card p-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white">
              <div className="flex items-center justify-between">
<div>
                  <p className="text-emerald-100 text-sm font-medium">Cash Inflows</p>
                  <p className="text-3xl font-bold">Rs. {cashFlowData.analysis?.totalInflows?.toLocaleString() || 0}</p>
                  <div className="flex items-center mt-2">
                    <ApperIcon name="ArrowDownToLine" size={12} className="mr-1" />
                    <span className="text-xs text-emerald-100">This period</span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="ArrowDownToLine" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-red-500 to-pink-500 text-white">
              <div className="flex items-center justify-between">
<div>
                  <p className="text-red-100 text-sm font-medium">Cash Outflows</p>
                  <p className="text-3xl font-bold">Rs. {cashFlowData.analysis?.totalOutflows?.toLocaleString() || 0}</p>
                  <div className="flex items-center mt-2">
                    <ApperIcon name="ArrowUpFromLine" size={12} className="mr-1" />
                    <span className="text-xs text-red-100">This period</span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="ArrowUpFromLine" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <div className="flex items-center justify-between">
<div>
                  <p className="text-blue-100 text-sm font-medium">Net Cash Flow</p>
                  <p className="text-3xl font-bold">Rs. {cashFlowData.analysis?.netCashFlow?.toLocaleString() || 0}</p>
                  <div className="flex items-center mt-2">
                    <ApperIcon name={(cashFlowData.analysis?.netCashFlow || 0) > 0 ? "TrendingUp" : "TrendingDown"} size={12} className="mr-1" />
                    <span className="text-xs text-blue-100">
                      {(cashFlowData.analysis?.netCashFlow || 0) > 0 ? 'Positive' : 'Negative'}
                    </span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Activity" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
              <div className="flex items-center justify-between">
<div>
                  <p className="text-purple-100 text-sm font-medium">Working Capital</p>
                  <p className="text-3xl font-bold">Rs. {cashFlowData.workingCapital?.amount?.toLocaleString() || 0}</p>
                  <div className="flex items-center mt-2">
                    <ApperIcon name="Coins" size={12} className="mr-1" />
                    <span className="text-xs text-purple-100">
                      {(cashFlowData.workingCapital?.ratio || 0) > 1.5 ? 'Strong' : 
                       (cashFlowData.workingCapital?.ratio || 0) > 1 ? 'Adequate' : 'Weak'}
                    </span>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Coins" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Analysis Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Cash Flow Trend */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cash Flow Trend Analysis</h2>
              <Chart
                options={{
                  chart: {
                    type: 'area',
                    toolbar: { show: false }
                  },
                  stroke: {
                    curve: 'smooth',
                    width: [3, 3, 3]
                  },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shade: 'light',
                      type: 'vertical',
                      shadeIntensity: 0.25,
                      gradientToColors: ['#10B981', '#EF4444', '#3B82F6'],
                      inverseColors: false,
                      opacityFrom: 0.8,
                      opacityTo: 0.2
                    }
                  },
                  colors: ['#10B981', '#EF4444', '#3B82F6'],
                  xaxis: {
categories: cashFlowData.analysis?.trendData?.map(d => d.date) || []
                  },
                  yaxis: {
                    labels: {
                      formatter: (val) => `Rs. ${val.toLocaleString()}`
                    }
                  },
                  tooltip: {
                    y: {
                      formatter: (val) => `Rs. ${val.toLocaleString()}`
                    }
                  },
                  legend: {
                    position: 'top'
                  }
                }}
                series={[
                  {
                    name: 'Cash Inflows',
data: cashFlowData.analysis?.trendData?.map(d => d.inflows) || []
                  },
                  {
                    name: 'Cash Outflows',
                    data: cashFlowData.analysis?.trendData?.map(d => d.outflows) || []
                  },
                  {
                    name: 'Net Cash Flow',
                    data: cashFlowData.analysis?.trendData?.map(d => d.netFlow) || []
                  }
                ]}
                type="area"
                height={350}
              />
            </div>

            {/* Liquidity Analysis */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Liquidity Ratios</h2>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Current Ratio</span>
                    <span className="text-lg font-bold text-blue-700">
{cashFlowData.liquidity?.currentRatio?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((cashFlowData.liquidity?.currentRatio || 0) * 50, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    {(cashFlowData.liquidity?.currentRatio || 0) > 1.5 ? 'Excellent liquidity' : 
                     (cashFlowData.liquidity?.currentRatio || 0) > 1 ? 'Good liquidity' : 'Low liquidity'}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Quick Ratio</span>
                    <span className="text-lg font-bold text-green-700">
                      {cashFlowData.liquidity?.quickRatio?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((cashFlowData.liquidity?.quickRatio || 0) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    {(cashFlowData.liquidity?.quickRatio || 0) > 1 ? 'Strong quick liquidity' : 'Monitor quick assets'}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900">Cash Ratio</span>
                    <span className="text-lg font-bold text-purple-700">
                      {cashFlowData.liquidity?.cashRatio?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
<div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((cashFlowData.liquidity?.cashRatio || 0) * 200, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    {(cashFlowData.liquidity?.cashRatio || 0) > 0.5 ? 'Strong cash position' : 'Adequate cash reserves'}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-900">Operating Cash Flow Ratio</span>
                    <span className="text-lg font-bold text-orange-700">
                      {cashFlowData.liquidity?.operatingCashFlowRatio?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2">
<div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((cashFlowData.liquidity?.operatingCashFlowRatio || 0) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-orange-600 mt-2">
                    Ability to pay current liabilities from operations
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Projections and Working Capital Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Cash Flow Projections */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">30-Day Cash Flow Projection</h2>
              <Chart
                options={{
                  chart: {
                    type: 'line',
                    toolbar: { show: false }
                  },
                  stroke: {
                    curve: 'smooth',
                    width: 3
                  },
                  colors: ['#6366F1'],
                  xaxis: {
                    categories: cashFlowData.projections?.map(p => p.date) || []
                  },
                  yaxis: {
                    labels: {
                      formatter: (val) => `Rs. ${val.toLocaleString()}`
                    }
                  },
                  markers: {
                    size: 5,
                    colors: ['#6366F1'],
                    strokeColors: '#ffffff',
                    strokeWidth: 2
                  },
                  tooltip: {
                    y: {
                      formatter: (val) => `Rs. ${val.toLocaleString()}`
                    }
                  },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shade: 'light',
                      type: 'vertical',
                      shadeIntensity: 0.25,
                      gradientToColors: ['#8B5CF6'],
                      inverseColors: false,
                      opacityFrom: 0.4,
                      opacityTo: 0.1
                    }
                  }
                }}
                series={[
                  {
                    name: 'Projected Cash Balance',
                    data: cashFlowData.projections?.map(p => p.cumulativeCashFlow) || []
                  }
                ]}
                type="area"
                height={300}
              />
              
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <ApperIcon name="Info" size={16} className="text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">
                      Projected minimum cash: Rs. {Math.min(...(cashFlowData.projections?.map(p => p.cumulativeCashFlow) || [0])).toLocaleString()}
                    </p>
                    <p className="text-xs text-indigo-600">
                      Based on historical trends and pending obligations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Working Capital Analysis */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Working Capital Analysis</h2>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-green-900">Current Assets</h3>
                    <span className="text-lg font-bold text-green-700">
Rs. {cashFlowData.workingCapital?.currentAssets?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-green-600">Cash & Equivalents:</span>
                      <p className="font-medium">Rs. {cashFlowData.workingCapital?.cash?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-green-600">Accounts Receivable:</span>
                      <p className="font-medium">Rs. {cashFlowData.workingCapital?.receivables?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-green-600">Inventory:</span>
                      <p className="font-medium">Rs. {cashFlowData.workingCapital?.inventory?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-green-600">Other Current:</span>
                      <p className="font-medium">Rs. {cashFlowData.workingCapital?.otherCurrentAssets?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-red-900">Current Liabilities</h3>
                    <span className="text-lg font-bold text-red-700">
                      Rs. {cashFlowData.workingCapital?.currentLiabilities?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-red-600">Accounts Payable:</span>
                      <p className="font-medium">Rs. {cashFlowData.workingCapital?.payables?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-red-600">Short-term Debt:</span>
                      <p className="font-medium">Rs. {cashFlowData.workingCapital?.shortTermDebt?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-red-600">Accrued Expenses:</span>
                      <p className="font-medium">Rs. {cashFlowData.workingCapital?.accruedExpenses?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-red-600">Other Current:</span>
                      <p className="font-medium">Rs. {cashFlowData.workingCapital?.otherCurrentLiabilities?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-blue-900">Net Working Capital</h3>
                    <span className="text-2xl font-bold text-blue-700">
                      Rs. {cashFlowData.workingCapital?.amount?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600">Working Capital Ratio:</span>
                    <span className="font-medium text-blue-800">
                      {cashFlowData.workingCapital?.ratio?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((cashFlowData.workingCapital?.ratio || 0) * 50, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {(cashFlowData.workingCapital?.ratio || 0) > 1.5 ? 'Strong liquidity position' : 
                     (cashFlowData.workingCapital?.ratio || 0) > 1 ? 'Adequate working capital' : 'Monitor liquidity closely'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Insights and Recommendations */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Cash Flow Insights & Recommendations</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Current Financial Health</h3>
                <div className="space-y-3">
{(cashFlowData.analysis?.netCashFlow || 0) > 0 && (
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <ApperIcon name="CheckCircle" size={16} className="text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Positive Cash Flow</p>
                        <p className="text-xs text-green-700">Your business is generating more cash than it's spending</p>
                      </div>
                    </div>
                  )}
                  
                  {(cashFlowData.analysis?.netCashFlow || 0) < 0 && (
                    <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                      <ApperIcon name="AlertTriangle" size={16} className="text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Negative Cash Flow</p>
                        <p className="text-xs text-red-700">Your business is spending more cash than it's generating</p>
                      </div>
                    </div>
                  )}

{(cashFlowData.workingCapital?.ratio || 0) > 1.5 && (
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <ApperIcon name="Shield" size={16} className="text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Strong Liquidity</p>
                        <p className="text-xs text-blue-700">Excellent ability to meet short-term obligations</p>
                      </div>
                    </div>
                  )}

                  {(cashFlowData.workingCapital?.ratio || 0) < 1 && (
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <ApperIcon name="AlertCircle" size={16} className="text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Liquidity Concern</p>
                        <p className="text-xs text-yellow-700">Monitor cash position closely</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-4">Action Recommendations</h3>
                <div className="space-y-3">
{(cashFlowData.analysis?.netCashFlow || 0) < 0 && (
                    <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                      <ApperIcon name="Lightbulb" size={16} className="text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-900">Improve Collections</p>
                        <p className="text-xs text-orange-700">Focus on reducing accounts receivable and accelerating payments</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                    <ApperIcon name="TrendingUp" size={16} className="text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">Monitor Daily</p>
                      <p className="text-xs text-purple-700">Track cash position daily for better financial control</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-lg">
                    <ApperIcon name="Target" size={16} className="text-indigo-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-indigo-900">Optimize Inventory</p>
                      <p className="text-xs text-indigo-700">Balance inventory levels to improve cash flow</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <ApperIcon name="Calendar" size={16} className="text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Plan Ahead</p>
                      <p className="text-xs text-gray-700">Use projections to anticipate and prepare for cash needs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {selectedView === 'expenses' && (
        <>
          {/* Expense Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card p-6 bg-gradient-to-r from-red-500 to-pink-500 text-white">
              <div className="flex items-center justify-between">
<div>
                  <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                  <p className="text-3xl font-bold">Rs. {expenseData.analytics?.totalExpenses?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Receipt" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Monthly Average</p>
                  <p className="text-3xl font-bold">Rs. {expenseData.analytics?.monthlyAverage?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Calendar" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Top Category</p>
                  <p className="text-xl font-bold">{expenseData.analytics?.topCategory || 'N/A'}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="PieChart" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm font-medium">Expense Count</p>
                  <p className="text-3xl font-bold">{expenseData.expenses.length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Hash" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Expense Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button
              onClick={() => setShowExpenseForm(true)}
              className="flex-1"
            >
              <ApperIcon name="Plus" size={16} className="mr-2" />
              Add Expense
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => e.target.files[0] && handleReceiptUpload(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={ocrProcessing}
              />
              <Button variant="outline" disabled={ocrProcessing} className="w-full sm:w-auto">
                {ocrProcessing ? (
                  <ApperIcon name="Loader2" size={16} className="mr-2 animate-spin" />
                ) : (
                  <ApperIcon name="Camera" size={16} className="mr-2" />
                )}
                {ocrProcessing ? 'Processing...' : 'Scan Receipt'}
              </Button>
            </div>
          </div>

          {/* Expense Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Expense Trends</h2>
              <Chart
                options={{
                  chart: { type: 'area', toolbar: { show: false } },
                  colors: ['#EF4444'],
                  stroke: { curve: 'smooth' },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shadeIntensity: 1,
                      colorStops: [
                        { offset: 0, color: '#EF4444', opacity: 0.8 },
                        { offset: 100, color: '#EF4444', opacity: 0.1 }
                      ]
                    }
                  },
                  xaxis: {
categories: expenseData.analytics?.trendData?.map(d => d.date) || []
                  },
                  yaxis: {
                    labels: {
                      formatter: (val) => `Rs. ${val.toLocaleString()}`
                    }
                  }
                }}
                series={[{
                  name: 'Expenses',
                  data: expenseData.analytics?.trendData?.map(d => d.amount) || []
                }]}
                type="area"
                height={300}
              />
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Breakdown</h2>
              <Chart
                options={{
                  chart: { type: 'donut' },
                  labels: expenseData.analytics?.categoryBreakdown?.map(c => c.category) || [],
                  colors: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'],
                  legend: { position: 'bottom' }
                }}
                series={expenseData.analytics?.categoryBreakdown?.map(c => c.amount) || []}
                type="donut"
                height={300}
              />
            </div>
          </div>

          {/* Expense List */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Expenses</h2>
              <Badge variant="secondary">
                {expenseData.expenses.length} total
              </Badge>
            </div>

            <div className="space-y-4">
              {expenseData.expenses.slice(0, 10).map((expense) => (
                <div key={expense.Id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <ApperIcon name="Receipt" size={20} className="text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{expense.description}</p>
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <span>{expense.vendor}</span>
                        <Badge variant="outline" size="small">{expense.category}</Badge>
                        <span>{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <p className="font-semibold text-gray-900">Rs. {expense.amount.toLocaleString()}</p>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingExpense(expense);
                          setShowExpenseForm(true);
                        }}
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        <ApperIcon name="Edit2" size={16} />
                      </button>
                      <button
                        onClick={() => handleExpenseDelete(expense.Id)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                      >
                        <ApperIcon name="Trash2" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {expenseData.expenses.length === 0 && (
              <div className="text-center py-12">
                <ApperIcon name="Receipt" size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No expenses recorded yet</p>
                <Button onClick={() => setShowExpenseForm(true)}>
                  <ApperIcon name="Plus" size={16} className="mr-2" />
                  Add Your First Expense
                </Button>
              </div>
            )}
          </div>
        </>
)}

      {selectedView === 'vendors' && (
        <>
          {/* Vendor Payment Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Vendors</p>
                  <p className="text-3xl font-bold">{vendorData.vendors.length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Users" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="flex items-center justify-between">
<div>
                  <p className="text-green-100 text-sm font-medium">Paid This Month</p>
                  <p className="text-3xl font-bold">Rs. {vendorData.analytics?.totalPaid?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="CheckCircle" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Pending Payments</p>
                  <p className="text-3xl font-bold">Rs. {vendorData.analytics?.totalPending?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="Clock" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Overdue Payments</p>
                  <p className="text-3xl font-bold">{getOverduePayments().length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ApperIcon name="AlertTriangle" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button
              onClick={() => setShowVendorForm(true)}
              className="flex-1"
            >
              <ApperIcon name="Plus" size={16} className="mr-2" />
              Add Vendor
            </Button>
            
            <Button
              onClick={() => setShowPaymentForm(true)}
              variant="outline"
              className="flex-1"
            >
              <ApperIcon name="CreditCard" size={16} className="mr-2" />
              Record Payment
            </Button>

            {selectedPayments.length > 0 && (
              <Button
                onClick={() => setShowBulkPaymentModal(true)}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500"
              >
                <ApperIcon name="Package" size={16} className="mr-2" />
                Bulk Pay ({selectedPayments.length})
              </Button>
            )}
          </div>

          {/* Vendor List */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Vendors & Payments</h2>
              <Badge variant="secondary">
                {vendorData.vendors.length} vendors
              </Badge>
            </div>

            <div className="space-y-6">
              {vendorData.vendors.map((vendor) => {
                const vendorPayments = vendorData.payments.filter(p => p.vendorId === vendor.Id);
                const pendingPayments = vendorPayments.filter(p => p.status === 'pending');
                const overduePayments = pendingPayments.filter(p => new Date(p.dueDate) < new Date());
                
                return (
                  <div key={vendor.Id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                          {overduePayments.length > 0 && (
                            <Badge variant="red" className="text-xs">
                              {overduePayments.length} Overdue
                            </Badge>
                          )}
                          {pendingPayments.length > 0 && (
                            <Badge variant="yellow" className="text-xs">
                              {pendingPayments.length} Pending
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Contact:</span>
                            <p className="font-medium">{vendor.email}</p>
                            <p className="text-gray-600">{vendor.phone}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment Terms:</span>
                            <p className="font-medium">{vendor.paymentTerms} days</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <p className="font-medium">{vendor.category}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVendorForPayment(vendor);
                            setShowPaymentForm(true);
                          }}
                        >
                          <ApperIcon name="Plus" size={14} className="mr-1" />
                          Pay
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingVendor(vendor);
                            setShowVendorForm(true);
                          }}
                        >
                          <ApperIcon name="Edit" size={14} />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-500 hover:bg-red-600"
                          onClick={() => handleVendorDelete(vendor.Id)}
                        >
                          <ApperIcon name="Trash2" size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Vendor Payments */}
                    {vendorPayments.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Recent Payments</h4>
                        <div className="space-y-2">
                          {vendorPayments.slice(0, 3).map((payment) => {
                            const isOverdue = payment.status === 'pending' && new Date(payment.dueDate) < new Date();
                            const isDueSoon = payment.status === 'pending' && 
                              new Date(payment.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                            return (
                              <div key={payment.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  {payment.status === 'pending' && (
                                    <input
                                      type="checkbox"
                                      checked={selectedPayments.includes(payment.Id)}
                                      onChange={() => togglePaymentSelection(payment.Id)}
                                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                    />
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900">{payment.description}</p>
                                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                                      <span>Due: {format(new Date(payment.dueDate), 'MMM dd, yyyy')}</span>
                                      {isOverdue && (
                                        <Badge variant="red" size="small">Overdue</Badge>
                                      )}
                                      {!isOverdue && isDueSoon && (
                                        <Badge variant="yellow" size="small">Due Soon</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">Rs. {payment.amount.toLocaleString()}</p>
                                  <Badge 
                                    variant={payment.status === 'paid' ? 'green' : 
                                           payment.status === 'pending' ? 'yellow' : 'gray'}
                                    size="small"
                                  >
                                    {payment.status}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {vendorData.vendors.length === 0 && (
              <div className="text-center py-12">
                <ApperIcon name="Users" size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No vendors registered yet</p>
                <Button onClick={() => setShowVendorForm(true)}>
                  <ApperIcon name="Plus" size={16} className="mr-2" />
                  Add Your First Vendor
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button
                onClick={() => {
                  setShowExpenseForm(false);
                  setEditingExpense(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <ApperIcon name="X" size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleExpenseSubmit({
                  amount: parseFloat(formData.get('amount')),
                  vendor: formData.get('vendor'),
                  category: formData.get('category'),
                  description: formData.get('description'),
                  date: formData.get('date'),
                  receiptUrl: editingExpense?.receiptUrl
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  defaultValue={editingExpense?.amount || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  name="vendor"
                  defaultValue={editingExpense?.vendor || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  defaultValue={editingExpense?.category || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select Category</option>
                  {expenseData.categories.map((category) => (
                    <option key={category.Id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingExpense?.description || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={editingExpense?.date || format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingExpense ? 'Update' : 'Add'} Expense
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowExpenseForm(false);
                    setEditingExpense(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
</div>
            </form>
          </div>
        </div>
      )}
      {/* Vendor Form Modal */}
      {showVendorForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button
                onClick={() => {
                  setShowVendorForm(false);
                  setEditingVendor(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <ApperIcon name="X" size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleVendorSubmit({
                  name: formData.get('name'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  category: formData.get('category'),
                  paymentTerms: parseInt(formData.get('paymentTerms')),
                  address: formData.get('address')
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingVendor?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingVendor?.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingVendor?.phone || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingVendor?.category || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Service Provider">Service Provider</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Utility">Utility</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (Days)</label>
                  <input
                    type="number"
                    name="paymentTerms"
                    min="1"
                    max="365"
                    defaultValue={editingVendor?.paymentTerms || 30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  rows="2"
                  defaultValue={editingVendor?.address || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Vendor address..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingVendor ? 'Update' : 'Add'} Vendor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowVendorForm(false);
                    setEditingVendor(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Record Vendor Payment</h3>
              <button
                onClick={() => {
                  setShowPaymentForm(false);
                  setSelectedVendorForPayment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <ApperIcon name="X" size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const dueDate = new Date(formData.get('dueDate'));
                handleVendorPayment({
                  vendorId: parseInt(formData.get('vendorId')),
                  amount: parseFloat(formData.get('amount')),
                  description: formData.get('description'),
                  dueDate: dueDate.toISOString(),
                  invoiceNumber: formData.get('invoiceNumber'),
                  status: 'pending'
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <select
                  name="vendorId"
                  defaultValue={selectedVendorForPayment?.Id || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendorData.vendors.map((vendor) => (
                    <option key={vendor.Id} value={vendor.Id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    defaultValue={format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Optional invoice reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Payment description..."
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  Record Payment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedVendorForPayment(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Payment Modal */}
      {showBulkPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Process Bulk Payments</h3>
              <button
                onClick={() => setShowBulkPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ApperIcon name="X" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <ApperIcon name="Info" size={20} className="text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Processing {selectedPayments.length} payments
                    </p>
                    <p className="text-sm text-blue-700">
                      Total amount: Rs. {vendorData.payments
                        .filter(p => selectedPayments.includes(p.Id))
                        .reduce((sum, p) => sum + p.amount, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {vendorData.payments
                  .filter(p => selectedPayments.includes(p.Id))
                  .map((payment) => {
                    const vendor = vendorData.vendors.find(v => v.Id === payment.vendorId);
                    return (
                      <div key={payment.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{vendor?.name}</p>
                          <p className="text-sm text-gray-600">{payment.description}</p>
                          <p className="text-xs text-gray-500">Due: {format(new Date(payment.dueDate), 'MMM dd, yyyy')}</p>
                        </div>
                        <p className="font-semibold text-gray-900">Rs. {payment.amount.toLocaleString()}</p>
                      </div>
                    );
                  })}
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleBulkPayment}
                  disabled={bulkProcessing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {bulkProcessing ? (
                    <>
                      <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ApperIcon name="CheckCircle" size={16} className="mr-2" />
                      Confirm Payment
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBulkPaymentModal(false)}
                  disabled={bulkProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
);
};

export default FinancialDashboard;