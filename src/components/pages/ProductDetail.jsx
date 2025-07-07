import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ApperIcon from '@/components/ApperIcon';
import Button from '@/components/atoms/Button';
import Badge from '@/components/atoms/Badge';
import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import { productService } from '@/services/api/productService';
import { useCart } from '@/hooks/useCart';

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart, isLoading: cartLoading } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getById(parseInt(productId));
      setProduct(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    
    toast.success(`${quantity} x ${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  const getPriceChange = () => {
    if (product?.previousPrice && product.previousPrice !== product.price) {
      const change = ((product.price - product.previousPrice) / product.previousPrice) * 100;
      return change;
    }
    return null;
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
        <Error message={error} onRetry={loadProduct} type="not-found" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message="Product not found" onRetry={() => navigate('/category/All')} type="not-found" />
      </div>
    );
  }

const priceChange = getPriceChange();

// Calculate dynamic image dimensions with aspect ratio enforcement for 1:1 framing
  const calculateImageDimensions = () => {
    // Get viewport width for responsive sizing
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    
    // Base size calculation with responsive scaling
    let baseSize = 600;
    
    // Responsive adjustments for mobile-first design
    if (viewportWidth < 640) {
      // Mobile: 400-500px with padding consideration
      baseSize = Math.max(400, Math.min(viewportWidth - 32, 500)); 
    } else if (viewportWidth < 1024) {
      // Tablet: 500-700px for comfortable viewing
      baseSize = Math.max(500, Math.min(viewportWidth * 0.4, 700)); 
    } else {
      // Desktop: 600-1200px for detailed product viewing
      baseSize = Math.max(600, Math.min(viewportWidth * 0.3, 1200)); 
    }
    
    // Enforce platform constraints (400x400px to 1200x1200px) for consistent framing
    const constrainedSize = Math.max(400, Math.min(baseSize, 1200));
    
    // Ensure perfect 1:1 aspect ratio for consistent product display
    return {
      width: constrainedSize,
      height: constrainedSize,
      aspectRatio: '1 / 1'
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ApperIcon name="ArrowLeft" size={20} />
          <span>Back</span>
        </button>
      </nav>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image with Enhanced 1:1 Frame Display */}
        <div className="space-y-4">
          <div className="relative">
            <div 
              className="mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative shadow-lg"
              style={{
                width: `${calculateImageDimensions().width}px`,
                height: `${calculateImageDimensions().height}px`,
                aspectRatio: calculateImageDimensions().aspectRatio
              }}
            >
              {/* Enhanced Progressive Image Loading with WebP Support */}
              <picture className="block w-full h-full">
                <source
                  srcSet={`${product.imageUrl}&fm=webp&w=${calculateImageDimensions().width}&h=${calculateImageDimensions().height}&fit=crop&crop=center 1x, ${product.imageUrl}&fm=webp&w=${calculateImageDimensions().width * 2}&h=${calculateImageDimensions().height * 2}&fit=crop&crop=center&dpr=2 2x`}
                  type="image/webp"
                />
                <img
                  src={`${product.imageUrl}&w=${calculateImageDimensions().width}&h=${calculateImageDimensions().height}&fit=crop&crop=center`}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-105 image-loaded"
                  style={{ 
                    backgroundColor: '#f3f4f6',
                    aspectRatio: '1 / 1'
                  }}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "/api/placeholder/600/600";
                  }}
                />
              </picture>
              
              {/* Frame Compatibility Indicator */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-md">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-xs font-medium text-gray-700">1:1 Frame</span>
                </div>
              </div>
            </div>
            {product.stock <= 10 && product.stock > 0 && (
              <Badge 
                variant="warning" 
                className="absolute top-4 left-4"
              >
                Low Stock
              </Badge>
            )}
            
            {product.stock === 0 && (
              <Badge 
                variant="danger" 
                className="absolute top-4 left-4"
              >
                Out of Stock
              </Badge>
            )}
            
            {priceChange && (
              <Badge 
                variant={priceChange > 0 ? 'danger' : 'success'} 
                className="absolute top-4 right-4"
              >
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <Badge variant="primary" className="mb-3">
              {product.category}
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <span className="text-4xl font-bold gradient-text">
                Rs. {product.price.toLocaleString()}
              </span>
              <span className="text-lg text-gray-500">
                /{product.unit}
              </span>
            </div>
            
            {product.previousPrice && product.previousPrice !== product.price && (
              <div className="flex items-center space-x-2">
                <span className="text-lg text-gray-500 line-through">
                  Rs. {product.previousPrice.toLocaleString()}
                </span>
                <span className={`text-sm font-medium ${priceChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {priceChange > 0 ? 'Price increased' : 'Price decreased'}
                </span>
              </div>
)}
</div>

          {/* Product Benefits & Quality */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <ApperIcon name="Star" size={20} className="text-green-600" />
              <span>Why Choose This Product</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Product Benefits */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="Leaf" size={16} className="text-green-600" />
                  <Badge variant="success">Farm Fresh</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Sourced directly from local farms, ensuring maximum freshness and nutritional value
                </p>
              </div>
              
              {/* Usage Suggestions */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="ChefHat" size={16} className="text-blue-600" />
                  <Badge variant="primary">Perfect for Biryani</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Ideal texture and aroma for traditional dishes, curries, and festive cooking
                </p>
              </div>
              
              {/* Quality Badge */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="Award" size={16} className="text-purple-600" />
                  <Badge variant="warning">Premium Quality</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Carefully selected and quality tested to meet the highest standards
                </p>
              </div>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center space-x-2">
            <ApperIcon name="Package" size={20} className="text-gray-500" />
            <span className="text-gray-700">
              {product.stock > 0 ? `${product.stock} items in stock` : 'Out of stock'}
            </span>
          </div>
          {/* Quantity Selector */}
          {product.stock > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ApperIcon name="Minus" size={16} />
                </button>
                
                <span className="text-xl font-semibold min-w-[3rem] text-center">
                  {quantity}
                </span>
                
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ApperIcon name="Plus" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {product.stock > 0 ? (
              <>
                <Button
                  variant="primary"
                  size="large"
                  icon="ShoppingCart"
                  onClick={handleAddToCart}
                  loading={cartLoading}
                  className="w-full"
                >
                  Add to Cart - Rs. {(product.price * quantity).toLocaleString()}
                </Button>
                
                <Button
                  variant="secondary"
                  size="large"
                  icon="Zap"
                  onClick={handleBuyNow}
                  loading={cartLoading}
                  className="w-full"
                >
                  Buy Now
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="large"
                disabled
                className="w-full"
              >
                Out of Stock
              </Button>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <ApperIcon name="Truck" size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Fast Delivery</p>
                <p className="text-sm text-gray-600">Same day delivery</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ApperIcon name="Shield" size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Quality Assured</p>
                <p className="text-sm text-gray-600">Fresh guarantee</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <ApperIcon name="CreditCard" size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Secure Payment</p>
                <p className="text-sm text-gray-600">Multiple options</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <ApperIcon name="RotateCcw" size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Easy Returns</p>
                <p className="text-sm text-gray-600">Hassle-free policy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;