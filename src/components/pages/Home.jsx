import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatCurrency } from "@/utils/currency";
import { selectPendingApprovalCount, selectRealTimeUpdates } from "@/store/approvalWorkflowSlice";
import ApperIcon from "@/components/ApperIcon";
import ProductGrid from "@/components/organisms/ProductGrid";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Orders from "@/components/pages/Orders";
import Category from "@/components/pages/Category";
import { productService } from "@/services/api/productService";
const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Real-time approval workflow data
  const pendingApprovalCount = useSelector(selectPendingApprovalCount);
  const realTimeUpdates = useSelector(selectRealTimeUpdates);
useEffect(() => {
    loadFeaturedProducts();
    
    // Preload likely next components
    const preloadTimer = setTimeout(() => {
      import('@/components/pages/Category').catch(() => {});
      import('@/components/pages/ProductDetail').catch(() => {});
    }, 1000);
    
    return () => clearTimeout(preloadTimer);
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Optimize for perceived performance - show loading state immediately
      const products = await productService.getAll();
      
      // Get first 8 products as featured, with intelligent caching
      const featured = products.slice(0, 8);
      setFeaturedProducts(featured);
      
// Cache products for faster subsequent loads
      if ('caches' in window && window.caches) {
        window.caches.open('products-v1').then(cache => {
          cache.put('featured-products', new window.Response(JSON.stringify(featured)));
        }).catch(() => {}); // Fail silently if caching not available
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    {
      name: 'Groceries',
      icon: 'ShoppingBasket',
      color: 'from-blue-500 to-cyan-500',
      description: 'Essential daily items'
    },
    {
      name: 'Meat',
      icon: 'Beef',
      color: 'from-red-500 to-pink-500',
      description: 'Fresh premium meat'
    },
    {
      name: 'Fruits',
      icon: 'Apple',
      color: 'from-green-500 to-emerald-500',
      description: 'Fresh seasonal fruits'
    },
    {
      name: 'Vegetables',
      icon: 'Carrot',
      color: 'from-orange-500 to-yellow-500',
      description: 'Farm fresh vegetables'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-accent rounded-2xl p-8 md:p-12 text-white mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Fresh Groceries
              <span className="block text-yellow-300">Delivered Fast</span>
            </h1>
            <p className="text-xl mb-6 text-green-100">
              Get fresh groceries, meat, fruits & vegetables delivered to your door across Pakistan. 
              Order now and enjoy same-day delivery!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/category/All">
                <Button variant="secondary" size="large" icon="ShoppingBag">
                  Shop Now
                </Button>
              </Link>
              <Button variant="outline" size="large" icon="Truck" className="text-white border-white hover:bg-white hover:text-primary">
                Free Delivery
              </Button>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl backdrop-blur-sm"></div>
              <div className="relative p-8 text-center">
                <ApperIcon name="ShoppingBag" size={120} className="mx-auto mb-4 text-yellow-300" />
                <p className="text-lg font-medium">Fresh • Fast • Reliable</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="mb-12">
        <div className="card p-6 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">We Accept</h2>
            <p className="text-gray-600">Multiple payment options for your convenience</p>
          </div>
          <div className="flex justify-center items-center space-x-6 flex-wrap gap-4">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl shadow-md">
              <div className="flex items-center space-x-2">
                <ApperIcon name="Smartphone" size={24} />
                <span className="font-bold">JazzCash</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-xl shadow-md">
              <div className="flex items-center space-x-2">
                <ApperIcon name="Smartphone" size={24} />
                <span className="font-bold">EasyPaisa</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl shadow-md">
              <div className="flex items-center space-x-2">
                <ApperIcon name="Building2" size={24} />
                <span className="font-bold">Bank Transfer</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl shadow-md">
              <div className="flex items-center space-x-2">
                <ApperIcon name="Banknote" size={24} />
                <span className="font-bold">Cash on Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Shop by Category</h2>
          <p className="text-gray-600">Explore our wide range of fresh products</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={`/category/${category.name}`}
              className="group"
            >
              <div className="card p-6 text-center hover:shadow-premium transform hover:scale-105 transition-all duration-300">
                <div className={`bg-gradient-to-r ${category.color} p-4 rounded-2xl mb-4 mx-auto w-fit`}>
                  <ApperIcon name={category.icon} size={32} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
{/* Real-time Dashboard Stats */}
      {realTimeUpdates.connected && (
        <section className="mb-8">
          <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ApperIcon name="Activity" size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Live Updates</h3>
                <Badge variant="success" className="text-xs animate-pulse">Connected</Badge>
              </div>
              <span className="text-xs text-gray-500">
                Last update: {realTimeUpdates.lastUpdate ? new Date(realTimeUpdates.lastUpdate).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <ApperIcon name="Clock" size={16} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Approvals</p>
                    <p className="text-xl font-bold text-orange-600">{pendingApprovalCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <ApperIcon name="Wallet" size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Wallet Balance</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(25000)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <ApperIcon name="TrendingUp" size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recent Orders</p>
                    <p className="text-xl font-bold text-purple-600">12</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Products</h2>
            <p className="text-gray-600">Fresh picks with updated prices in {formatCurrency(0).split(' ')[0]} format</p>
</div>
          <Link to="/category/All">
            <Button variant="outline" icon="ArrowRight" iconPosition="right">
              View All
            </Button>
          </Link>
        </div>
        
        <ProductGrid
          products={featuredProducts}
          loading={loading}
          error={error}
          onRetry={loadFeaturedProducts}
          emptyMessage="No featured products available"
        />
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="text-center p-6">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-2xl mb-4 mx-auto w-fit">
            <ApperIcon name="Truck" size={32} className="text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Delivery</h3>
          <p className="text-gray-600">Same-day delivery available across major cities in Pakistan</p>
        </div>
        
        <div className="text-center p-6">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 rounded-2xl mb-4 mx-auto w-fit">
            <ApperIcon name="Shield" size={32} className="text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Guaranteed</h3>
          <p className="text-gray-600">Fresh products with quality assurance and easy returns</p>
        </div>
        
        <div className="text-center p-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-2xl mb-4 mx-auto w-fit">
            <ApperIcon name="CreditCard" size={32} className="text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payments</h3>
          <p className="text-gray-600">Multiple payment options with secure transaction processing</p>
        </div>
      </section>
    </div>
  );
};

export default Home;