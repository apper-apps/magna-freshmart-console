import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { 
  addToCart as addToCartAction, 
  removeFromCart as removeFromCartAction, 
  updateQuantity as updateQuantityAction, 
  clearCart as clearCartAction,
  setLoading,
  selectCartItems,
  selectCartTotal,
  selectCartItemCount,
  selectCartLoading,
  selectIsProductInCart,
  selectProductQuantityInCart
} from '@/store/cartSlice';
export const useCart = () => {
  const dispatch = useDispatch();
  
// Selectors
  const cart = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartItemCount);
  const isLoading = useSelector(selectCartLoading);

  // Actions with loading states
  const addToCart = (product) => {
    dispatch(setLoading(true));
    setTimeout(() => {
      dispatch(addToCartAction(product));
      dispatch(setLoading(false));
    }, 200);
  };

  const removeFromCart = (productId) => {
    dispatch(removeFromCartAction(productId));
  };

  const updateQuantity = (productId, quantity) => {
    dispatch(updateQuantityAction({ productId, quantity }));
  };

  const clearCart = () => {
    dispatch(clearCartAction());
  };

// Helper functions that use selectors
  const getCartTotal = () => cartTotal;
  const getCartCount = () => cartCount;
  const getCartItems = () => cart;
  
  const isProductInCart = (productId) => {
    return cart.some(item => item.id === productId);
  };
  
  const getProductQuantityInCart = (productId) => {
    const item = cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };
  
  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    getCartItems,
    isProductInCart,
    getProductQuantityInCart,
    isLoading
  };
};