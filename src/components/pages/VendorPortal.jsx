import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { formatCurrency } from "@/utils/currency";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Category from "@/components/pages/Category";
import { vendorService } from "@/services/api/vendorService";
import { productService } from "@/services/api/productService";

const VendorPortal = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const validation = await vendorService.validateSession();
      if (validation.valid) {
        setIsAuthenticated(true);
        const profile = await vendorService.getVendorProfile(validation.session.vendorId);
        setVendor(profile);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const result = await vendorService.login(credentials);
      setIsAuthenticated(true);
      setVendor(result.vendor);
      toast.success(`Welcome back, ${result.vendor.name}!`);
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await vendorService.logout();
      setIsAuthenticated(false);
      setVendor(null);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  if (loading) {
    return <Loading type="page" />;
  }

  if (error) {
    return <Error message={error} />;
  }

  if (!isAuthenticated) {
    return <VendorLogin onLogin={handleLogin} />;
  }

  return (
    <VendorDashboard 
      vendor={vendor} 
      onLogout={handleLogout}
      onProfileUpdate={setVendor}
    />
  );
};

// Vendor Login Component
const VendorLogin = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await onLogin(formData);
    } catch (error) {
      // Error handled in onLogin
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center">
            <ApperIcon name="Store" size={32} className="text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Vendor Portal
          </h2>
          <p className="mt-2 text-gray-600">
            Sign in to manage your products and pricing
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              type="email"
              name="email"
              label="Email Address"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <Input
              type="password"
              name="password"
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <ApperIcon name="Loader2" size={16} className="animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              <>
                <ApperIcon name="LogIn" size={16} className="mr-2" />
                Sign In
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Demo Credentials: ahmed.khan@vendor.com / vendor123
          </p>
        </div>
      </div>
    </div>
  );
};

// Vendor Dashboard Component
const VendorDashboard = ({ vendor, onLogout, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVendorData();
  }, [vendor]);

  const loadVendorData = async () => {
    if (!vendor) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [vendorProducts, vendorStats] = await Promise.all([
        productService.getVendorProducts(vendor.Id),
        productService.getVendorStats(vendor.Id)
      ]);
      
      setProducts(vendorProducts);
      setStats(vendorStats);
    } catch (error) {
      console.error('Error loading vendor data:', error);
      setError(error.message);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductUpdate = async (productId, priceData) => {
    try {
      const updatedProduct = await productService.updateVendorPrice(vendor.Id, productId, priceData);
      
      setProducts(prev => 
        prev.map(product => 
          product.id === productId ? updatedProduct : product
        )
      );
      
      toast.success('Product price updated successfully');
      
      // Reload stats
      const newStats = await productService.getVendorStats(vendor.Id);
      setStats(newStats);
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const tabs = [
    { id: 'products', label: 'My Products', icon: 'Package' },
    { id: 'profile', label: 'Profile', icon: 'User' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                <ApperIcon name="Store" size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Vendor Portal
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome, {vendor.name}
                </p>
              </div>
            </div>
            
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
            >
              <ApperIcon name="LogOut" size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ApperIcon name="Package" size={24} className="text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ApperIcon name="TrendingUp" size={24} className="text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Margin</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.averageMargin}%</p>
                </div>
              </div>
            </div>
            
<div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ApperIcon name="DollarSign" size={24} className="text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ApperIcon name="AlertTriangle" size={24} className="text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.lowStockCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ApperIcon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <Loading type="component" />
            ) : error ? (
              <Error message={error} />
            ) : (
              <>
                {activeTab === 'products' && (
                  <VendorProductsTab 
                    products={products}
                    vendor={vendor}
                    onProductUpdate={handleProductUpdate}
                  />
                )}
                {activeTab === 'profile' && (
                  <VendorProfileTab 
                    vendor={vendor}
                    onProfileUpdate={onProfileUpdate}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Vendor Products Tab Component
const VendorProductsTab = ({ products, vendor, onProductUpdate }) => {
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = [...new Set(products.map(p => p.category))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleEditPrice = (product) => {
    setEditingProduct(product);
  };

  const handleSavePrice = async (productId, priceData) => {
    try {
      await onProductUpdate(productId, priceData);
      setEditingProduct(null);
    } catch (error) {
      // Error handled in onProductUpdate
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon="Search"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Margin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-lg object-cover"
                      src={product.imageUrl}
                      alt={product.name}
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.unit}
                      </div>
                    </div>
                  </div>
</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(product.price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.purchasePrice ? formatCurrency(product.purchasePrice) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.profitMargin >= 20 
                      ? 'bg-green-100 text-green-800'
                      : product.profitMargin >= 10
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.profitMargin?.toFixed(1) || '0'}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm ${
                    product.stock <= (product.minStock || 10)
                      ? 'text-red-600 font-medium'
                      : 'text-gray-900'
                  }`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button
                    onClick={() => handleEditPrice(product)}
                    variant="outline"
                    size="sm"
                    disabled={!product.vendorInfo?.canEditPrice}
                  >
                    <ApperIcon name="Edit" size={14} className="mr-1" />
                    Edit Price
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <ApperIcon name="Package" size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">
            {searchTerm || categoryFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'You have no assigned products yet.'
            }
          </p>
        </div>
      )}

      {/* Edit Price Modal */}
      {editingProduct && (
        <EditPriceModal
          product={editingProduct}
          vendor={vendor}
          onSave={handleSavePrice}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
};

// Edit Price Modal Component
const EditPriceModal = ({ product, vendor, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    price: product.price,
    purchasePrice: product.purchasePrice || 0
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    if (formData.purchasePrice < 0) {
      newErrors.purchasePrice = 'Purchase price cannot be negative';
    }
    
    if (formData.purchasePrice > 0 && formData.price <= formData.purchasePrice) {
      newErrors.price = 'Selling price must be greater than purchase price';
    }
    
    const margin = formData.purchasePrice > 0 
      ? ((formData.price - formData.purchasePrice) / formData.purchasePrice) * 100 
      : 0;
    
    if (margin < (product.vendorInfo?.minMargin || 5)) {
      newErrors.price = `Minimum margin required: ${product.vendorInfo?.minMargin || 5}%`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      await onSave(product.id, formData);
    } catch (error) {
      // Error handled in onSave
    } finally {
      setLoading(false);
    }
  };

  const calculateMargin = () => {
    if (formData.purchasePrice > 0 && formData.price > 0) {
      return ((formData.price - formData.purchasePrice) / formData.purchasePrice) * 100;
    }
    return 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit Price - {product.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <ApperIcon name="X" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
<div>
            <Input
              type="number"
              name="price"
              label="Selling Price (Rs.)"
              value={formData.price}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
              error={errors.price}
              disabled={!product.vendorInfo?.canEditPrice}
            />
            {!product.vendorInfo?.canEditPrice && (
              <p className="text-xs text-amber-600 mt-1">
                <ApperIcon name="Lock" size={12} className="inline mr-1" />
                Selling price editing restricted for this product
              </p>
            )}
          </div>

          <div>
            <Input
              type="number"
              name="purchasePrice"
              label="Cost Price (Rs.)"
              value={formData.purchasePrice}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              error={errors.purchasePrice}
              disabled={!product.vendorInfo?.canEditCost}
            />
            {!product.vendorInfo?.canEditCost && (
              <p className="text-xs text-amber-600 mt-1">
                <ApperIcon name="Lock" size={12} className="inline mr-1" />
                Cost price editing restricted - contact admin for changes
              </p>
            )}
          </div>

          {/* Calculated Margin */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Profit Margin:
              </span>
<span className={`text-sm font-semibold ${
                calculateMargin() >= (product.vendorInfo?.minMargin || 5)
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {calculateMargin().toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Minimum required: {product.vendorInfo?.minMargin || 5}% • 
              Profit: {formData.purchasePrice > 0 && formData.price > formData.purchasePrice ? 
                formatCurrency(formData.price - formData.purchasePrice) : 'Rs. 0'}
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <ApperIcon name="Loader2" size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Vendor Profile Tab Component
const VendorProfileTab = ({ vendor, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: vendor.name,
    email: vendor.email,
    company: vendor.company || '',
    phone: vendor.phone || '',
    address: vendor.address || ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updatedProfile = await vendorService.updateVendorProfile(vendor.Id, formData);
      onProfileUpdate(updatedProfile);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: vendor.name,
      email: vendor.email,
      company: vendor.company || '',
      phone: vendor.phone || '',
      address: vendor.address || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              <ApperIcon name="Edit" size={16} className="mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <Input
                type="email"
                name="email"
                label="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                name="company"
                label="Company Name"
                value={formData.company}
                onChange={handleInputChange}
              />
              <Input
                type="tel"
                name="phone"
                label="Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            
            <Input
              type="text"
              name="address"
              label="Address"
              value={formData.address}
              onChange={handleInputChange}
            />

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ApperIcon name="Loader2" size={16} className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <p className="text-sm text-gray-900">{vendor.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <p className="text-sm text-gray-900">{vendor.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <p className="text-sm text-gray-900">{vendor.company || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <p className="text-sm text-gray-900">{vendor.phone || 'Not specified'}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <p className="text-sm text-gray-900">{vendor.address || 'Not specified'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permissions
              </label>
              <div className="flex flex-wrap gap-2">
                {vendor.permissions?.map((permission) => (
                  <span
                    key={permission}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                  >
                    {permission.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorPortal;