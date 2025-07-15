import React from "react";
import { useDispatch } from "react-redux";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency } from "@/utils/currency";
import { removeFromCart, updateQuantity, updateQuantityWithValidation } from "@/store/cartSlice";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
const CartItem = ({ item }) => {
  const dispatch = useDispatch();

const handleQuantityChange = async (newQuantity) => {
    if (newQuantity === 0) {
      dispatch(removeFromCart(item.id));
      toast.success(`${item.name} removed from cart`);
    } else if (newQuantity > 0) {
      // Use validation thunk for real-time stock checking
      try {
        await dispatch(updateQuantityWithValidation({ 
          productId: item.id, 
          quantity: newQuantity 
        })).unwrap();
        toast.info(`${item.name} quantity updated to ${newQuantity}`);
      } catch (error) {
        // Error already handled by the thunk with toast notification
      }
    }
  };

const handleRemove = () => {
    dispatch(removeFromCart(item.id));
    toast.success(`${item.name} removed from cart`);
  };

return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-gray-100 transition-all duration-300 ${item.isUpdating ? 'quantity-change' : ''}`}>
      {/* Mobile-first layout */}
      <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
        <div className="relative flex-shrink-0">
          <img
            src={item.image || item.imageUrl || '/placeholder-image.jpg'}
            alt={item.name}
            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg transition-transform duration-200 hover:scale-105"
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
          {item.stock === 0 && (
            <div className="absolute inset-0 bg-red-500 bg-opacity-75 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-medium">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.name}</h4>
          <p className="text-xs sm:text-sm text-gray-500">Rs. {item.price.toLocaleString()}/{item.unit}</p>
          {item.stock <= 10 && item.stock > 0 && (
            <p className="text-xs text-orange-600 flex items-center mt-1">
              <ApperIcon name="AlertTriangle" size={12} className="mr-1 flex-shrink-0" />
              Only {item.stock} left
            </p>
          )}
          {item.stock === 0 && (
            <p className="text-xs text-red-600 flex items-center mt-1">
              <ApperIcon name="XCircle" size={12} className="mr-1 flex-shrink-0" />
              Out of stock
            </p>
          )}
        </div>

        {/* Mobile remove button */}
        <div className="sm:hidden flex-shrink-0">
          <Button
            variant="ghost"
            size="small"
            icon="Trash2"
            onClick={handleRemove}
            className="text-red-500 hover:bg-red-50 hover:text-red-600 p-2 transition-colors duration-200"
          />
        </div>
      </div>
      
      {/* Mobile quantity controls and price */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end sm:space-y-2">
        {/* Mobile-optimized quantity controls - 44px minimum touch targets */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={item.quantity <= 1}
            className={`
              w-11 h-11 sm:w-9 sm:h-9 rounded-lg border-2 shadow-sm transition-all duration-200 flex items-center justify-center touch-manipulation
              ${item.quantity <= 1 
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 hover:scale-110 hover:shadow-md active:scale-95'
              }
            `}
          >
            <ApperIcon name="Minus" size={18} className="sm:w-4 sm:h-4" />
          </button>
          
          <span className={`w-12 sm:w-10 text-center font-semibold text-lg transition-all duration-300 ${item.isUpdating ? 'scale-110 text-primary' : ''}`}>
            {item.quantity}
          </span>
          
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={item.quantity >= item.stock || item.stock === 0}
            className={`
              w-11 h-11 sm:w-9 sm:h-9 rounded-lg border-2 shadow-sm transition-all duration-200 flex items-center justify-center touch-manipulation
              ${item.quantity >= item.stock || item.stock === 0
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hover:border-green-300 hover:scale-110 hover:shadow-md active:scale-95'
              }
            `}
          >
            <ApperIcon name="Plus" size={18} className="sm:w-4 sm:h-4" />
          </button>
        </div>
        
        {/* Price and desktop remove button */}
        <div className="flex items-center space-x-2 sm:flex-col sm:items-end sm:space-x-0 sm:space-y-1">
          <p className={`font-semibold text-base sm:text-lg gradient-text transition-all duration-300 ${item.isUpdating ? 'scale-105' : ''}`}>
            Rs. {(item.price * item.quantity).toLocaleString()}
          </p>
          
          {/* Desktop remove button */}
          <div className="hidden sm:block">
            <Button
              variant="ghost"
              size="small"
              icon="Trash2"
              onClick={handleRemove}
              className="text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
            />
          </div>
        </div>
      </div>
</div>
  );
};

export default CartItem;