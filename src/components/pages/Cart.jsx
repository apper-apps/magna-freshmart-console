import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import ApperIcon from "@/components/ApperIcon";
import CartItem from "@/components/molecules/CartItem";
import Empty from "@/components/ui/Empty";
import Checkout from "@/components/pages/Checkout";
import Button from "@/components/atoms/Button";
import { 
  clearCart, 
  loadFromLocalStorage, 
  selectCartItemCount, 
  selectCartItems, 
  selectCartTotal, 
  selectIsOffline, 
  selectOfflineChanges, 
  selectPendingSyncCount, 
  selectSyncInProgress, 
  setOfflineStatus, 
  syncCartChanges, 
  validateCartPrices 
} from "@/store/cartSlice";
import { NetworkMonitor, addNetworkListener, isOnline } from "@/utils/errorHandling";
import { formatCurrency } from "@/utils/currency";

const Cart = () => {
  const navigate = useNavigate();
const dispatch = useDispatch();
  const cart = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartItemCount);
  const isOffline = useSelector(selectIsOffline);
  const pendingSyncCount = useSelector(selectPendingSyncCount);
  const syncInProgress = useSelector(selectSyncInProgress);
  const offlineChanges = useSelector(selectOfflineChanges);
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);
  // Validate cart prices on component mount
// Load cart from localStorage on component mount
  useEffect(() => {
    dispatch(loadFromLocalStorage());
  }, [dispatch]);

  // Network status monitoring
  useEffect(() => {
    const updateNetworkStatus = (online) => {
      dispatch(setOfflineStatus(!online));
      setShowOfflineIndicator(!online);
      
      if (online && pendingSyncCount > 0) {
        // Auto-sync when coming back online
        dispatch(syncCartChanges());
      }
    };

    const cleanup = NetworkMonitor.addNetworkListener(updateNetworkStatus);
    
    // Set initial status
    updateNetworkStatus(NetworkMonitor.isOnline());
    
    return cleanup;
  }, [dispatch, pendingSyncCount]);

  useEffect(() => {
    if (cart.length > 0 && !isOffline) {
      try {
        dispatch(validateCartPrices());
      } catch (error) {
        console.error('Error validating cart prices:', error);
        // Continue without blocking the UI
      }
    }
  }, [dispatch, cart.length, isOffline]);
// Offline Status Indicator
  const OfflineIndicator = () => (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      showOfflineIndicator ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <ApperIcon name="WifiOff" size={16} />
        <span className="text-sm font-medium">You're offline</span>
        {offlineChanges && (
          <span className="bg-orange-600 px-2 py-1 rounded text-xs">
            {pendingSyncCount} changes pending
          </span>
        )}
      </div>
    </div>
  );

  // Sync Status Indicator
  const SyncIndicator = () => (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      syncInProgress ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <div className="animate-spin">
          <ApperIcon name="RefreshCw" size={16} />
        </div>
        <span className="text-sm font-medium">Syncing changes...</span>
      </div>
    </div>
  );

if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Empty 
          type="cart" 
          onAction={() => {
            try {
              navigate('/category/All');
            } catch (error) {
              console.error('Navigation error:', error);
              window.location.href = '/category/All';
            }
          }}
        />
      </div>
    );
  }

// Use validated cart total for accurate calculations
  const subtotal = cartTotal;
  const deliveryCharge = subtotal >= 2000 ? 0 : 150; // Free delivery over Rs. 2000
  const total = subtotal + deliveryCharge;
return (
<>
      <OfflineIndicator />
      <SyncIndicator />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      {/* Mobile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Shopping Cart
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        
        <button
          onClick={() => dispatch(clearCart())}
          className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors text-sm sm:text-base"
        >
          <ApperIcon name="Trash2" size={18} />
          <span>Clear Cart</span>
        </button>
      </div>

      {/* Offline changes notification */}
      {offlineChanges && !syncInProgress && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ApperIcon name="CloudOff" size={20} className="text-blue-600" />
              <div>
                <p className="text-blue-800 font-medium">Offline Changes Detected</p>
                <p className="text-blue-600 text-sm">
                  {pendingSyncCount} cart changes will sync when connection is restored
                </p>
              </div>
            </div>
            {!isOffline && (
              <Button
                variant="outline"
                size="small"
                onClick={() => dispatch(syncCartChanges())}
                disabled={syncInProgress}
              >
                {syncInProgress ? 'Syncing...' : 'Sync Now'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mobile-first responsive layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cart Items - Stacked on mobile */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="relative">
              <CartItem item={item} />
              {isOffline && (
                <div className="absolute top-2 right-2 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                  Offline
                </div>
              )}
            </div>
          ))}
          
          {/* Continue Shopping - Mobile optimized */}
          <div className="border-t border-gray-200 pt-4">
            <Link 
              to="/category/All"
              className="inline-flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors text-sm sm:text-base"
            >
              <ApperIcon name="ArrowLeft" size={18} />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary - Fixed on mobile */}
        <div className="lg:col-span-1">
          <div className="card p-4 sm:p-6 lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Order Summary</h2>
              {isOffline && (
                <div className="flex items-center space-x-1 text-orange-600">
                  <ApperIcon name="WifiOff" size={16} />
                  <span className="text-xs font-medium">Offline</span>
                </div>
              )}
            </div>
            
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">Subtotal ({cartCount} items)</span>
                <span className="font-medium text-sm sm:text-base transition-all duration-300">Rs. {subtotal.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">Delivery Charge</span>
                <span className="font-medium text-sm sm:text-base">
                  {deliveryCharge > 0 ? `Rs. ${deliveryCharge.toLocaleString()}` : 'Free'}
                </span>
              </div>
              
{subtotal >= 2000 && deliveryCharge === 150 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-xs sm:text-sm">Free delivery bonus!</span>
                  <span className="text-xs sm:text-sm font-medium">-Rs. 150</span>
                </div>
              )}
              
              {subtotal >= 2000 && deliveryCharge === 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-xs sm:text-sm">🎉 Free delivery applied!</span>
                  <span className="text-xs sm:text-sm font-medium">Rs. 0</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-3 sm:pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-base sm:text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-xl sm:text-2xl font-bold gradient-text transition-all duration-300">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="large"
              icon="CreditCard"
              onClick={() => navigate('/checkout')}
              className="w-full mb-4 text-sm sm:text-base py-3 sm:py-4"
disabled={isOffline}
              title={isOffline ? 'Checkout unavailable offline' : 'Proceed to Checkout'}
            >
              {isOffline ? 'Offline - Cannot Checkout' : 'Proceed to Checkout'}
            </Button>

            {/* Trust Badges - Responsive */}
            <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <ApperIcon name="Shield" size={14} className="text-green-600" />
                <span>Secure checkout</span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <ApperIcon name="Truck" size={14} className="text-blue-600" />
                <span>Fast delivery</span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <ApperIcon name="RotateCcw" size={14} className="text-purple-600" />
                <span>Easy returns</span>
              </div>
            </div>

            {/* Payment Methods - Mobile optimized */}
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">We accept:</p>
              <div className="flex flex-wrap gap-2">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded">
                  JazzCash
                </div>
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs px-2 py-1 rounded">
                  EasyPaisa
                </div>
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs px-2 py-1 rounded">
                  COD
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom checkout bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-50">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-lg gradient-text">Rs. {total.toLocaleString()}</span>
          </div>
          <div className="text-xs text-gray-500">
            {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </div>
        </div>
<Button
          variant="primary"
          size="large"
          icon="CreditCard"
          onClick={() => navigate('/checkout')}
          className="w-full"
          disabled={isOffline}
          title={isOffline ? 'Checkout unavailable offline' : 'Proceed to Checkout'}
        >
          {isOffline ? 'Offline - Cannot Checkout' : 'Proceed to Checkout'}
        </Button>
      </div>
    </div>
    </>
  );
};

export default Cart;