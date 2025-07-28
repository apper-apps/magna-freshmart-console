import React, { memo, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { toast } from "react-toastify";
import ApperIcon from "@/components/ApperIcon";
import LazyImage from "@/components/atoms/LazyImage";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import { addToCart, selectCartLoading, setLoading } from "@/store/cartSlice";
import { formatCurrency } from "@/utils/currency";
const ProductCard = memo(({ product, loading = false, virtualIndex = 0 }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isLoading = useSelector(selectCartLoading);

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation();
    dispatch(setLoading(true));
    setTimeout(() => {
      dispatch(addToCart(product));
      dispatch(setLoading(false));
      toast.success(`${product.name} added to cart!`, { autoClose: 2000 });
    }, 200);
  }, [dispatch, product]);

  const handleCardClick = useCallback(() => {
    navigate(`/product/${product.id}`);
  }, [navigate, product.id]);

  // Memoized price change calculation for performance
  const priceChange = React.useMemo(() => {
    if (product.previousPrice && product.previousPrice !== product.price) {
      return ((product.price - product.previousPrice) / product.previousPrice) * 100;
    }
    return null;
  }, [product.price, product.previousPrice]);
}, [product.price, product.previousPrice]);

  return (
      className="card p-4 cursor-pointer hover:shadow-premium transform hover:scale-102 transition-all duration-300"
      onClick={handleCardClick}
    >
      <div className="relative mb-4">
        <picture className="block w-full h-48 rounded-lg overflow-hidden bg-gray-100">
          <source
            srcSet={`${product.imageUrl}&fm=webp 1x, ${product.imageUrl}&fm=webp&dpr=2 2x`}
            type="image/webp"
/>
          <LazyImage
            src={product.imageUrl}
            alt={product.name}
            loading={loading}
            virtualIndex={virtualIndex}
            className="w-full h-48 object-cover transition-opacity duration-300 hover:opacity-95"
            style={{ backgroundColor: '#f3f4f6' }}
            fallbackSrc="/api/placeholder/300/300"
          />
        </picture>
        {product.stock <= 10 && product.stock > 0 && (
          <Badge 
            variant="warning" 
            size="small"
            className="absolute top-2 left-2"
          >
            Low Stock
          </Badge>
        )}
        
        {product.stock === 0 && (
          <Badge 
            variant="danger" 
            size="small"
            className="absolute top-2 left-2"
          >
            Out of Stock
          </Badge>
        )}
        
        {priceChange && (
          <Badge 
            variant={priceChange > 0 ? 'danger' : 'success'} 
            size="small"
            className="absolute top-2 right-2"
          >
            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
          </Badge>
        )}
      </div>
</div>

      <div className="space-y-3">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold gradient-text">
              Rs. {product.price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">
              /{product.unit}
            </span>
          </div>
          
          {product.previousPrice && product.previousPrice !== product.price && (
            <span className="text-sm text-gray-500 line-through">
              Rs. {product.previousPrice.toLocaleString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-1 min-h-[2.5rem]">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <ApperIcon name="Package" size={16} />
            <span>{product.stock} in stock</span>
          </div>
          
          <Button
            variant="primary"
            size="small"
            icon="Plus"
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isLoading}
            loading={isLoading}
            className="flex-shrink-0"
          >
            Add
          </Button>
        </div>
      </div>
</div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;