import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CreditCard, DollarSign, Minus, Plus, ShoppingCart, Smartphone, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { addToCart, clearCart, removeFromCart, updateQuantity } from "@/store/cartSlice";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Cart from "@/components/pages/Cart";
import Analytics from "@/components/pages/Analytics";
import Category from "@/components/pages/Category";
import SearchBar from "@/components/molecules/SearchBar";
import BarcodeScanner from "@/components/molecules/BarcodeScanner";
import { posService } from "@/services/api/posService";
import { productService } from "@/services/api/productService";
import { paymentService } from "@/services/api/paymentService";
const POS = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [customerPaid, setCustomerPaid] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
// Receipt configuration state
  const [receiptConfig, setReceiptConfig] = useState({
    storeName: 'FreshMart',
    storeAddress: '123 Main Street, City, State 12345',
    storePhone: '(555) 123-4567',
    storeEmail: 'info@freshmart.com',
    footerMessage: 'Thank you for shopping with FreshMart!',
    showLogo: true,
    receiptFormat: 'standard', // 'thermal' or 'standard'
    autoPrint: true,
    includeBarcode: true
  });
  
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showReceiptConfig, setShowReceiptConfig] = useState(false);
  const [previewTransaction, setPreviewTransaction] = useState(null);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [printStatus, setPrintStatus] = useState('');
  
  // Shopkeeper Management States
  const [activeTab, setActiveTab] = useState('pos');
  const [dailySales, setDailySales] = useState([]);
  const [salesSummary, setSalesSummary] = useState({});
  const [paymentBreakdown, setPaymentBreakdown] = useState({});
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [bulkAction, setBulkAction] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
useEffect(() => {
    loadProducts();
    loadDashboardData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  useEffect(() => {
    checkStockAlerts();
  }, [products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getAll();
      setProducts(data.filter(p => p.isActive && p.stock > 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
};

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const salesData = await posService.getDailySales(today);
      const breakdown = await posService.getDailyPaymentBreakdown(today);
      
      setDailySales(salesData.transactions || []);
      setSalesSummary({
        totalSales: salesData.totalSales || 0,
        totalTransactions: salesData.totalTransactions || 0,
        averageTransaction: salesData.totalTransactions > 0 ? salesData.totalSales / salesData.totalTransactions : 0
      });
      setPaymentBreakdown(breakdown);
      
      // Load customers (mock data for now)
      const mockCustomers = [
        { Id: 1, name: 'Ahmed Khan', phone: '03001234567', email: 'ahmed@email.com', totalPurchases: 15000, lastVisit: '2024-01-15' },
        { Id: 2, name: 'Fatima Ali', phone: '03007654321', email: 'fatima@email.com', totalPurchases: 25000, lastVisit: '2024-01-14' },
        { Id: 3, name: 'Mohammad Hassan', phone: '03009876543', email: 'hassan@email.com', totalPurchases: 8000, lastVisit: '2024-01-13' }
      ];
      setCustomers(mockCustomers);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const checkStockAlerts = () => {
    const lowStock = products.filter(p => p.stock <= 5 && p.stock > 0);
    const outOfStock = products.filter(p => p.stock === 0);
    
    setLowStockItems(lowStock);
    setStockAlerts([
      ...lowStock.map(p => ({ type: 'low', product: p, message: `${p.name} is running low (${p.stock} remaining)` })),
      ...outOfStock.map(p => ({ type: 'out', product: p, message: `${p.name} is out of stock` }))
    ]);
  };

const addCustomer = async () => {
  if (!newCustomer?.name || !newCustomer?.phone) {
    console.error('Name and phone are required');
    return;
  }
  
  const customer = {
    Id: customers.length + 1,
    ...newCustomer,
    totalPurchases: 0,
    lastVisit: new Date().toISOString().split('T')[0]
  };
  
  setCustomers([...customers, customer]);
  setNewCustomer({ name: '', phone: '', email: '', address: '' });
  console.log('Customer added successfully');
};

const selectCustomer = (customer) => {
  if (!customer) return;
  setSelectedCustomer(customer);
  setShowCustomerModal(false);
  console.log(`Customer ${customer.name} selected`);
};

const bulkUpdateStock = async () => {
  if (selectedProducts.length === 0 || !bulkAction) {
    console.error('Please select products and action');
    return;
  }
    try {
      for (const productId of selectedProducts) {
        const product = products.find(p => p.id === productId);
        if (product) {
          let newStock = product.stock;
          
          if (bulkAction === 'add10') newStock += 10;
          else if (bulkAction === 'subtract10') newStock = Math.max(0, newStock - 10);
          else if (bulkAction === 'setZero') newStock = 0;
          
          await productService.update(productId, { ...product, stock: newStock });
        }
      }
      
await loadProducts();
    setSelectedProducts([]);
    setBulkAction('');
    console.log(`Bulk action applied to ${selectedProducts.length} products`);
  } catch (error) {
    console.error('Error updating stock:', error);
  }
};

  const getFilteredProducts = () => {
    let filtered = products;
    
    if (inventoryFilter === 'low') {
      filtered = products.filter(p => p.stock <= 5 && p.stock > 0);
    } else if (inventoryFilter === 'out') {
      filtered = products.filter(p => p.stock === 0);
    } else if (inventoryFilter === 'active') {
      filtered = products.filter(p => p.isActive);
    }
    
    return filtered;
  };

const filterProducts = () => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products.slice(0, 20)); // Show first 20 products
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm))
    );
    setFilteredProducts(filtered);
  };

const handleBarcodeScan = async (barcode) => {
  try {
    const product = await productService.getByBarcode(barcode);
    if (product) {
      addToCart(product);
      console.log(`${product.name} added to cart`);
    } else {
      console.error('Product not found');
    }
  } catch (err) {
    console.error('Error finding product:', err);
  }
  setShowBarcodeScanner(false);
};
const addToCart = (product) => {
  if (!product || !product.id) {
    console.error('Invalid product');
    return;
  }
  
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    if (existingItem.quantity >= product.stock) {
      console.error('Insufficient stock');
      return;
    }
    setCart(cart.map(item =>
      item.id === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    ));
  } else {
    setCart([...cart, { ...product, quantity: 1 }]);
  }
};

const updateQuantity = (productId, newQuantity) => {
  if (newQuantity <= 0) {
    setCart(cart.filter(item => item.id !== productId));
    return;
  }

  const product = products.find(p => p.id === productId);
  if (!product) {
    console.error('Product not found');
    return;
  }
  
  if (newQuantity > product.stock) {
    console.error('Insufficient stock');
    return;
  }

  setCart(cart.map(item =>
    item.id === productId
      ? { ...item, quantity: newQuantity }
      : item
  ));
};

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getChange = () => {
    const total = getTotal();
    const paid = parseFloat(customerPaid) || 0;
    return Math.max(0, paid - total);
  };

const processPayment = async () => {
  if (cart.length === 0) {
    console.error('Cart is empty');
    return;
  }

  const total = getTotal();
  const paid = parseFloat(customerPaid) || 0;

  if (paymentType === 'cash' && paid < total) {
    console.error('Insufficient payment amount');
    return;
  }

    try {
      setProcessingPayment(true);

      // Process payment based on payment type
      let paymentResult = null;
      
      if (paymentType !== 'cash') {
        try {
          if (paymentType === 'card') {
            // For POS, we'll simulate card payment without form
            const mockCardData = {
              cardNumber: '4*** **** **** ****',
              expiryDate: '12/25',
              cvv: '***',
              cardholderName: 'Customer'
            };
paymentResult = await paymentService.processCardPayment(mockCardData, total, `POS-${Date.now()}`);
          } else if (['jazzcash', 'easypaisa', 'sadapay'].includes(paymentType)) {
            paymentResult = await paymentService.processDigitalWalletPayment(paymentType, total, `POS-${Date.now()}`, '03001234567');
          } else if (paymentType === 'bank') {
            paymentResult = await paymentService.processBankTransfer(total, `POS-${Date.now()}`, {});
          }
        } catch (paymentError) {
          console.error('Payment error:', paymentError);
          setProcessingPayment(false);
          return;
        }
      }

const transactionData = {
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total,
        paymentType,
        cashierId: 'admin', // In real app, this would be the logged-in user
        customerPaid: paymentType === 'cash' ? paid : total,
        change: paymentType === 'cash' ? getChange() : 0,
        paymentResult: paymentResult || null,
        customerId: selectedCustomer ? selectedCustomer.Id : null,
        customerName: selectedCustomer ? selectedCustomer.name : null
      };
      await posService.createTransaction(transactionData);

      // Update product stock
      for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        await productService.update(item.id, {
          ...product,
          stock: product.stock - item.quantity
        });
      }

// Update customer purchase history
      if (selectedCustomer) {
        const updatedCustomer = {
          ...selectedCustomer,
          totalPurchases: selectedCustomer.totalPurchases + total,
          lastVisit: new Date().toISOString().split('T')[0]
        };
        setCustomers(customers.map(c => c.Id === selectedCustomer.Id ? updatedCustomer : c));
        setSelectedCustomer(updatedCustomer);
      }

      // Reset
      setCart([]);
      setCustomerPaid('');
      await loadProducts();
      await loadDashboardData(); // Refresh dashboard data
      
if (paymentType === 'cash') {
      console.log('Payment processed successfully!');
    } else {
      console.log(`${paymentType.toUpperCase()} payment processed successfully!`);
    }
    
    // Handle receipt printing based on configuration
    if (receiptConfig?.autoPrint) {
      printReceipt(transactionData);
    } else {
      showReceiptPreviewModal(transactionData);
    }
} catch (err) {
    console.error('Payment processing failed:', err);
    
    // Clear any previous payment errors
    setPaymentError(null);
    
    // Handle specific error types
    let errorMessage = 'Payment processing failed. Please try again.';
    
    if (err?.message) {
      if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('invalid') || err.message.includes('validation')) {
        errorMessage = 'Invalid payment information. Please check your details.';
      } else if (err.message.includes('insufficient')) {
        errorMessage = 'Insufficient funds. Please check your balance.';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Payment processing timed out. Please try again.';
      } else if (err.message.includes('constructor') || err.message.includes('not a function')) {
        errorMessage = 'Payment service unavailable. Please contact support.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setPaymentError(errorMessage);
    
    // Show user-friendly error notification
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error(errorMessage);
    } else {
      alert(errorMessage);
    }
  } finally {
    setProcessingPayment(false);
  }
  };

const generateReceiptHTML = (transaction) => {
    const receiptNumber = `RCP-${Date.now()}`;
    const currentDate = new Date().toLocaleString();
    
    const receiptStyles = receiptConfig.receiptFormat === 'thermal' ? `
      <style>
        @media print {
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          body { 
            font-size: 12px; 
            line-height: 1.3; 
            margin: 0; 
            padding: 5mm; 
          }
        }
        body { 
          font-family: 'Courier New', monospace; 
          width: 72mm; 
          margin: 0 auto; 
          padding: 10px; 
          background: white; 
        }
        .header { text-align: center; margin-bottom: 10px; }
        .store-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .store-info { font-size: 10px; line-height: 1.2; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
        .item-name { flex: 1; }
        .item-price { text-align: right; }
        .total-section { margin-top: 10px; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; }
        .footer { text-align: center; margin-top: 10px; font-size: 10px; }
        .receipt-number { font-size: 10px; text-align: center; margin-top: 5px; }
      </style>
    ` : `
      <style>
        @media print {
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          body { 
            font-size: 14px; 
            line-height: 1.4; 
          }
        }
        body { 
          font-family: Arial, sans-serif; 
          max-width: 400px; 
          margin: 0 auto; 
          padding: 20px; 
          background: white; 
        }
        .header { text-align: center; margin-bottom: 20px; }
        .store-name { font-size: 24px; font-weight: bold; color: #2E7D32; margin-bottom: 10px; }
        .store-info { font-size: 12px; color: #666; line-height: 1.3; }
        .divider { border-top: 2px solid #2E7D32; margin: 15px 0; }
        .transaction-info { margin-bottom: 15px; }
        .item-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
        .item-details { flex: 1; }
        .item-name { font-weight: 500; }
        .item-subtitle { font-size: 12px; color: #666; }
        .item-price { font-weight: bold; color: #2E7D32; }
        .total-section { margin-top: 20px; padding-top: 15px; border-top: 2px solid #2E7D32; }
        .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
        .final-total { font-size: 18px; font-weight: bold; color: #2E7D32; }
        .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
        .footer-message { font-style: italic; color: #666; }
        .receipt-number { font-size: 10px; color: #999; margin-top: 10px; }
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptNumber}</title>
          <meta charset="UTF-8">
          ${receiptStyles}
        </head>
        <body>
          <div class="header">
            <div class="store-name">${receiptConfig.storeName}</div>
            <div class="store-info">
              ${receiptConfig.storeAddress}<br>
              ${receiptConfig.storePhone}<br>
              ${receiptConfig.storeEmail}
            </div>
          </div>

          <div class="divider"></div>

          <div class="transaction-info">
            <div>Receipt #: ${receiptNumber}</div>
            <div>Date: ${currentDate}</div>
            <div>Cashier: ${transaction.cashierId}</div>
            <div>Payment: ${transaction.paymentType.toUpperCase()}</div>
          </div>

          <div class="divider"></div>

          <div class="items-section">
            ${transaction.items.map(item => `
              <div class="item-row">
                <div class="item-details">
                  <div class="item-name">${item.name}</div>
                  <div class="item-subtitle">${item.quantity} x Rs. ${item.price.toLocaleString()}</div>
                </div>
                <div class="item-price">Rs. ${(item.price * item.quantity).toLocaleString()}</div>
              </div>
            `).join('')}
          </div>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>Rs. ${transaction.total.toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span>Tax (0%):</span>
              <span>Rs. 0</span>
            </div>
            <div class="total-row final-total">
              <span>Total:</span>
              <span>Rs. ${transaction.total.toLocaleString()}</span>
            </div>
            ${transaction.paymentType === 'cash' ? `
              <div class="total-row">
                <span>Paid:</span>
                <span>Rs. ${transaction.customerPaid.toLocaleString()}</span>
              </div>
              <div class="total-row">
                <span>Change:</span>
                <span>Rs. ${transaction.change.toLocaleString()}</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div class="footer-message">${receiptConfig.footerMessage}</div>
            <div class="receipt-number">Receipt #: ${receiptNumber}</div>
          </div>
        </body>
      </html>
    `;
  };

  const printReceipt = (transaction) => {
    try {
      setPrintStatus('Preparing receipt...');
      
      const receiptHTML = generateReceiptHTML(transaction);
      const receiptWindow = window.open('', '_blank', 'width=400,height=600');
      
if (!receiptWindow) {
      console.error('Please allow pop-ups to print receipts');
      setPrintStatus('');
      return;
    }

      receiptWindow.document.write(receiptHTML);
      receiptWindow.document.close();
      
      receiptWindow.onload = () => {
        setPrintStatus('Printing...');
        setTimeout(() => {
receiptWindow.print();
        setPrintStatus('');
        console.log('Receipt printed successfully');
      }, 500);
    };

    receiptWindow.onafterprint = () => {
      receiptWindow.close();
    };

    setLastTransaction(transaction);
    
  } catch (error) {
    setPrintStatus('');
    console.error('Failed to print receipt:', error);
  }
  };

  const showReceiptPreviewModal = (transaction) => {
    setPreviewTransaction(transaction);
    setShowReceiptPreview(true);
  };

  const printFromPreview = () => {
    if (previewTransaction) {
      printReceipt(previewTransaction);
      setShowReceiptPreview(false);
    }
  };

const reprintLastReceipt = () => {
  if (lastTransaction) {
    printReceipt(lastTransaction);
  } else {
    console.error('No previous receipt to reprint');
  }
};

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadProducts} />
      </div>
    );
  }

return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shopkeeper Management</h1>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'pos' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('pos')}
            icon="ShoppingCart"
            size="small"
          >
            POS
          </Button>
          <Button
            variant={activeTab === 'inventory' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('inventory')}
            icon="Package"
            size="small"
          >
            Inventory
          </Button>
          <Button
            variant={activeTab === 'customers' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('customers')}
            icon="Users"
            size="small"
          >
            Customers
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('analytics')}
            icon="BarChart3"
            size="small"
          >
            Analytics
          </Button>
        </div>
      </div>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div className="bg-warning bg-opacity-10 border border-warning rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ApperIcon name="AlertTriangle" size={20} className="text-warning" />
              <span className="font-semibold text-warning">Stock Alerts ({stockAlerts.length})</span>
            </div>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowInventoryModal(true)}
              icon="Eye"
            >
              View Details
            </Button>
          </div>
          <div className="mt-2 text-sm text-gray-700">
            {stockAlerts.slice(0, 3).map((alert, index) => (
              <div key={index} className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${alert.type === 'out' ? 'bg-error' : 'bg-warning'}`}></div>
                <span>{alert.message}</span>
              </div>
            ))}
            {stockAlerts.length > 3 && (
              <div className="text-gray-500 mt-1">+{stockAlerts.length - 3} more alerts</div>
            )}
          </div>
        </div>
      )}

      {/* POS Tab */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="mb-6">
              <div className="flex space-x-2 mb-4">
                <div className="flex-1">
                  <SearchBar
                    onSearch={setSearchTerm}
                    placeholder="Search products or scan barcode..."
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowBarcodeScanner(true)}
                  icon="Scan"
                  className="whitespace-nowrap"
                >
                  Scan Barcode
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                  <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-primary font-bold text-sm">
                    Rs. {product.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Stock: {product.stock}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cart</h2>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ApperIcon name="ShoppingCart" size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select products to add to cart</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-600">Rs. {item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          <ApperIcon name="Minus" size={14} />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          <ApperIcon name="Plus" size={14} />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 rounded hover:bg-red-100 text-red-600"
                        >
                          <ApperIcon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold gradient-text">
                      Rs. {getTotal().toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
<select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="input-field"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="jazzcash">JazzCash</option>
                        <option value="easypaisa">EasyPaisa</option>
                        <option value="sadapay">SadaPay</option>
                        <option value="bank">Bank Transfer</option>
                      </select>
                    </div>

                    {paymentType === 'cash' && (
                      <div>
                        <Input
                          label="Customer Paid"
                          type="number"
                          step="0.01"
                          value={customerPaid}
                          onChange={(e) => setCustomerPaid(e.target.value)}
                          icon="Banknote"
                        />
                        {customerPaid && (
                          <div className="mt-2 text-sm">
                            <p className="text-gray-600">
                              Change: <span className="font-semibold text-green-600">
                                Rs. {getChange().toLocaleString()}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
{/* Customer Selection */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Customer
                        </label>
                        <Button
                          variant="ghost"
                          size="small"
                          icon="Plus"
                          onClick={() => setShowCustomerModal(true)}
                        >
                          Select
                        </Button>
                      </div>
                      {selectedCustomer ? (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{selectedCustomer.name}</p>
                            <p className="text-xs text-gray-600">{selectedCustomer.phone}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="small"
                            icon="X"
                            onClick={() => setSelectedCustomer(null)}
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">No customer selected</div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="small"
                        icon="Settings"
                        onClick={() => setShowReceiptConfig(true)}
                      >
                        Receipt Config
                      </Button>
                      <Button
                        variant="outline"
                        size="small"
                        icon="Printer"
                        onClick={reprintLastReceipt}
                        disabled={!lastTransaction}
                      >
                        Reprint Last
                      </Button>
                    </div>

                    <Button
                      variant="primary"
                      size="large"
                      icon="CreditCard"
                      onClick={processPayment}
                      loading={processingPayment}
                      className="w-full"
                    >
                      Process Payment
                    </Button>
                    
                    {printStatus && (
                      <div className="mt-2 text-sm text-center">
<span className="text-blue-600">{printStatus}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}
      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Inventory Management</h2>
            <div className="flex space-x-2">
              <select
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Products</option>
                <option value="active">Active Only</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
              <Button
                variant="primary"
                icon="Package"
                onClick={bulkUpdateStock}
                disabled={selectedProducts.length === 0 || !bulkAction}
              >
                Apply Bulk Action
              </Button>
            </div>
          </div>

          {selectedProducts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedProducts.length} products selected
                </span>
                <div className="flex space-x-2">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Select Action</option>
                    <option value="add10">Add 10 to Stock</option>
                    <option value="subtract10">Subtract 10 from Stock</option>
                    <option value="setZero">Set Stock to 0</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setSelectedProducts([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredProducts().map((product) => (
              <div key={product.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts([...selectedProducts, product.id]);
                      } else {
                        setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    product.stock === 0 ? 'bg-red-100 text-red-800' :
                    product.stock <= 5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Stock: {product.stock}
                  </div>
                </div>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
                <h3 className="font-medium text-sm mb-1">{product.name}</h3>
                <p className="text-primary font-bold">Rs. {product.price.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Category: {product.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Customer Management</h2>
            <Button
              variant="primary"
              icon="UserPlus"
              onClick={() => setShowCustomerModal(true)}
            >
              Add Customer
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <div key={customer.Id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <ApperIcon name="User" size={16} className="text-gray-400" />
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="small"
                    icon="Eye"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(true);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mb-1">{customer.phone}</p>
                <p className="text-sm text-gray-600 mb-2">{customer.email}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-primary">
                    Rs. {customer.totalPurchases.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    Last: {customer.lastVisit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Sales Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                  <p className="text-2xl font-bold text-primary">
                    Rs. {salesSummary.totalSales?.toLocaleString() || 0}
                  </p>
                </div>
                <ApperIcon name="TrendingUp" size={32} className="text-success" />
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-primary">
                    {salesSummary.totalTransactions || 0}
                  </p>
                </div>
                <ApperIcon name="Receipt" size={32} className="text-info" />
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Sale</p>
                  <p className="text-2xl font-bold text-primary">
                    Rs. {Math.round(salesSummary.averageTransaction || 0).toLocaleString()}
                  </p>
                </div>
                <ApperIcon name="Calculator" size={32} className="text-accent" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Method Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(paymentBreakdown).map(([method, data]) => (
                <div key={method} className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    Rs. {data.total?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">{method}</div>
                  <div className="text-xs text-gray-500">
                    {data.count || 0} transactions
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
<BarcodeScanner
        isActive={showBarcodeScanner}
        onScan={handleBarcodeScan}
        onClose={() => setShowBarcodeScanner(false)}
      />

      {/* Receipt Preview Modal */}
      {showReceiptPreview && previewTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Receipt Preview</h3>
              <button
                onClick={() => setShowReceiptPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ApperIcon name="X" size={24} />
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
              <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-primary">{receiptConfig.storeName}</h4>
                <p className="text-sm text-gray-600">{receiptConfig.storeAddress}</p>
                <p className="text-sm text-gray-600">{receiptConfig.storePhone}</p>
              </div>
              
              <div className="border-t border-gray-300 pt-3 mb-3">
                <p className="text-sm">Date: {new Date().toLocaleString()}</p>
                <p className="text-sm">Payment: {previewTransaction.paymentType.toUpperCase()}</p>
              </div>
              
              <div className="space-y-2 mb-3">
                {previewTransaction.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-gray-600">{item.quantity} x Rs. {item.price.toLocaleString()}</div>
                    </div>
                    <div className="font-medium">Rs. {(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-300 pt-3">
                <div className="flex justify-between font-bold text-lg text-primary">
                  <span>Total:</span>
                  <span>Rs. {previewTransaction.total.toLocaleString()}</span>
                </div>
                {previewTransaction.paymentType === 'cash' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Paid:</span>
                      <span>Rs. {previewTransaction.customerPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Change:</span>
                      <span>Rs. {previewTransaction.change.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="text-center mt-4 pt-3 border-t border-gray-300">
                <p className="text-sm text-gray-600 italic">{receiptConfig.footerMessage}</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowReceiptPreview(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={printFromPreview}
                icon="Printer"
                className="flex-1"
              >
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Configuration Modal */}
      {showReceiptConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Receipt Configuration</h3>
              <button
                onClick={() => setShowReceiptConfig(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ApperIcon name="X" size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Store Name"
                value={receiptConfig.storeName}
                onChange={(e) => setReceiptConfig({...receiptConfig, storeName: e.target.value})}
              />
              
              <Input
                label="Store Address"
                value={receiptConfig.storeAddress}
                onChange={(e) => setReceiptConfig({...receiptConfig, storeAddress: e.target.value})}
              />
              
              <Input
                label="Store Phone"
                value={receiptConfig.storePhone}
                onChange={(e) => setReceiptConfig({...receiptConfig, storePhone: e.target.value})}
              />
              
              <Input
                label="Store Email"
                value={receiptConfig.storeEmail}
                onChange={(e) => setReceiptConfig({...receiptConfig, storeEmail: e.target.value})}
              />
              
              <Input
                label="Footer Message"
                value={receiptConfig.footerMessage}
                onChange={(e) => setReceiptConfig({...receiptConfig, footerMessage: e.target.value})}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt Format
                </label>
                <select
                  value={receiptConfig.receiptFormat}
                  onChange={(e) => setReceiptConfig({...receiptConfig, receiptFormat: e.target.value})}
                  className="input-field"
                >
                  <option value="standard">Standard (A4)</option>
                  <option value="thermal">Thermal (80mm)</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoPrint"
                  checked={receiptConfig.autoPrint}
                  onChange={(e) => setReceiptConfig({...receiptConfig, autoPrint: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <label htmlFor="autoPrint" className="text-sm text-gray-700">
                  Auto-print receipts after payment
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowReceiptConfig(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
onClick={() => {
                setShowReceiptConfig(false);
                console.log('Receipt configuration saved');
              }}
                className="flex-1"
              >
                Save Configuration
              </Button>
            </div>
</div>
        </div>
      )}
      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedCustomer ? 'Customer Details' : 'Select Customer'}
              </h3>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setSelectedCustomer(null);
                  setNewCustomer({ name: '', phone: '', email: '', address: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <ApperIcon name="X" size={24} />
              </button>
            </div>

            {!selectedCustomer ? (
              <div className="space-y-4">
                <div>
                  <Input
                    label="Search Customers"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    icon="Search"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {customers
                    .filter(c => 
                      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.phone.includes(customerSearch)
                    )
                    .map(customer => (
                      <div
                        key={customer.Id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-primary">
                            Rs. {customer.totalPurchases.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">{customer.lastVisit}</p>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Add New Customer</h4>
                  <div className="space-y-3">
                    <Input
                      label="Name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="Customer name"
                    />
                    <Input
                      label="Phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      placeholder="03001234567"
                    />
                    <Input
                      label="Email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      placeholder="customer@email.com"
                    />
                    <Input
                      label="Address"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                      placeholder="Customer address"
                    />
                    <Button
                      variant="primary"
                      onClick={addCustomer}
                      icon="UserPlus"
                      className="w-full"
                    >
                      Add Customer
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <ApperIcon name="User" size={48} className="text-gray-400 mx-auto mb-2" />
                  <h4 className="text-lg font-semibold">{selectedCustomer.name}</h4>
                  <p className="text-gray-600">{selectedCustomer.phone}</p>
                  <p className="text-gray-600">{selectedCustomer.email}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      Rs. {selectedCustomer.totalPurchases.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Total Purchases</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedCustomer.lastVisit}</p>
                    <p className="text-sm text-gray-600">Last Visit</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCustomer(null)}
                    className="flex-1"
                  >
                    Back to List
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => selectCustomer(selectedCustomer)}
                    className="flex-1"
                  >
                    Select Customer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Alerts Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Inventory Alerts</h3>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ApperIcon name="X" size={24} />
              </button>
            </div>
            
            <div className="space-y-3">
              {stockAlerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  alert.type === 'out' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <ApperIcon 
                      name={alert.type === 'out' ? 'AlertCircle' : 'AlertTriangle'} 
                      size={16} 
                      className={alert.type === 'out' ? 'text-red-500' : 'text-yellow-500'} 
                    />
                    <span className="text-sm">{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => {
                  setShowInventoryModal(false);
                  setActiveTab('inventory');
                }}
                className="w-full"
                icon="Package"
              >
                Manage Inventory
              </Button>
            </div>
</div>
        </div>
      )}
    </div>
  );
};

export default POS;