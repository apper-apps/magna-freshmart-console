import 'react-toastify/dist/ReactToastify.css'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { Provider, useDispatch } from 'react-redux'
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@/store/index";
import { webSocketService } from "@/services/api/websocketService";
import { setConnectionStatus, updateApprovalStatus, addRealTimeNotification } from "@/store/approvalWorkflowSlice";
import Layout from "@/components/organisms/Layout";
import Loading from "@/components/ui/Loading";
// Direct imports for core components
import ProductDetail from "@/components/pages/ProductDetail";
import Cart from "@/components/pages/Cart";
import Checkout from "@/components/pages/Checkout";
import Home from "@/components/pages/Home";

// Lazy load heavy components for better performance
const AdminDashboard = React.lazy(() => import('@/components/pages/AdminDashboard'));
const ProductManagement = React.lazy(() => import('@/components/pages/ProductManagement'));
const Analytics = React.lazy(() => import('@/components/pages/Analytics'));
const FinancialDashboard = React.lazy(() => import('@/components/pages/FinancialDashboard'));
const POS = React.lazy(() => import('@/components/pages/POS'));
const PaymentManagement = React.lazy(() => import('@/components/pages/PaymentManagement'));
const PayrollManagement = React.lazy(() => import('@/components/pages/PayrollManagement'));
const DeliveryTracking = React.lazy(() => import('@/components/pages/DeliveryTracking'));
const AIGenerate = React.lazy(() => import('@/components/pages/AIGenerate'));
const Category = React.lazy(() => import('@/components/pages/Category'));
const Orders = React.lazy(() => import('@/components/pages/Orders'));
const OrderTracking = React.lazy(() => import('@/components/pages/OrderTracking'));
const Account = React.lazy(() => import('@/components/pages/Account'));
const VendorPortal = React.lazy(() => import('@/components/pages/VendorPortal'));
const RoleAssignment = React.lazy(() => import('@/components/pages/RoleAssignment'));
// WebSocket Integration Component
const WebSocketProvider = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize WebSocket connection for price approvals
    const initializeWebSocket = async () => {
      try {
        await webSocketService.connect();
        dispatch(setConnectionStatus(true));

        // Subscribe to price approval updates
        const unsubscribeApprovals = webSocketService.subscribe('price-approvals', (data) => {
          dispatch(updateApprovalStatus(data));
          dispatch(addRealTimeNotification({
            id: Date.now(),
            type: 'approval_update',
            message: `Price approval ${data.status} for order #${data.orderId}`,
            timestamp: new Date().toISOString()
          }));
        });

        // Handle approval update events
        const handleApprovalUpdate = (data) => {
          dispatch(updateApprovalStatus({
            requestId: data.requestId || data.orderId,
            status: data.status,
            approvedBy: data.approvedBy,
            comments: data.comments
          }));
        };

        const unsubscribeStatusChanges = webSocketService.subscribe('approval_status_changed', handleApprovalUpdate);

        return () => {
          unsubscribeApprovals();
          unsubscribeStatusChanges();
          webSocketService.disconnect();
        };
      } catch (error) {
        console.warn('WebSocket connection failed:', error);
        dispatch(setConnectionStatus(false));
      }
    };

    const cleanup = initializeWebSocket();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [dispatch]);

  return children;
};

// Import components
function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(null);

  // Optimized SDK status checking - memoized for performance
  const checkSDKStatus = useCallback(() => {
    try {
      const status = {
        available: typeof window.Apper !== 'undefined',
        ready: typeof window.apperSDK !== 'undefined',
        initialized: window.apperSDK?.isInitialized === true
      };
      return status;
    } catch (error) {
      console.error('Error checking SDK status:', error);
      return { available: false, ready: false, initialized: false, error: error.message };
    }
  }, []);
// Optimized SDK monitoring - non-blocking and lightweight
  useEffect(() => {
    let mounted = true;
    let checkCount = 0;
    
    const checkStatus = () => {
      if (!mounted || checkCount > 5) return; // Limit checks to prevent performance impact
      
      try {
        const status = checkSDKStatus();
        if (status.ready || status.initialized) {
          setSdkReady(true);
          setSdkError(null);
        } else if (checkCount === 5) {
          // After 5 attempts, just warn but don't block the app
          console.warn('SDK not ready after initial checks - continuing without it');
        }
        checkCount++;
      } catch (error) {
        console.warn('SDK check failed:', error);
        checkCount++;
      }
    };

    // Check immediately and then periodically
    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    
    // Clean timeout - don't wait forever
    const timeout = setTimeout(() => {
      if (mounted) {
        clearInterval(interval);
      }
    }, 6000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [checkSDKStatus]);

// Lightweight error handling - don't block the app for SDK errors
useEffect(() => {
    const handleError = (event) => {
      if (event.reason?.message?.includes('Apper') || event.error?.message?.includes('Apper')) {
        console.warn('SDK error detected but not blocking app:', event);
        // Don't set SDK error state - just log it
      }
      
      // Handle DataCloneError specifically for postMessage operations
      if (event.reason?.name === 'DataCloneError' || event.error?.name === 'DataCloneError') {
        console.warn('DataCloneError detected - likely from postMessage with non-cloneable objects:', event);
        // Log the error but don't crash the app
      }
    };

    const handleMessageError = (event) => {
      console.warn('Message error detected:', event);
      // Handle postMessage errors gracefully
    };
    
    window.addEventListener('unhandledrejection', handleError);
    window.addEventListener('messageerror', handleMessageError);
    return () => {
      window.removeEventListener('unhandledrejection', handleError);
      window.removeEventListener('messageerror', handleMessageError);
    };
  }, []);
// Memoized SDK utilities for performance
  const sdkUtils = useMemo(() => ({
    ready: sdkReady,
    error: sdkError,
    checkStatus: checkSDKStatus
  }), [sdkReady, sdkError, checkSDKStatus]);

  // Component preloader for performance
  useEffect(() => {
    // Preload likely-to-be-visited components after initial render
    const preloadTimer = setTimeout(() => {
      import("@/components/pages/Category").catch(() => {});
      import("@/components/pages/Orders").catch(() => {});
      import("@/components/pages/Account").catch(() => {});
    }, 2000);

    return () => clearTimeout(preloadTimer);
  }, []);
return (
    <Provider store={store}>
      <PersistGate loading={<Loading type="page" />} persistor={persistor}>
        <WebSocketProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            {/* Minimal SDK Status Indicator (only in development) */}
            {import.meta.env.DEV && sdkError && (
              <div className="fixed top-0 right-0 z-50 p-2 text-xs">
                <div className="px-2 py-1 rounded bg-orange-500 text-white">
                  SDK: Background Loading
                </div>
              </div>
            )}
            <Suspense fallback={<Loading type="page" />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  {/* Core routes - no lazy loading */}
                  <Route index element={<Home />} />
                  <Route path="product/:productId" element={<ProductDetail />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  
                  {/* Lazy loaded routes */}
                  <Route path="category/:categoryName" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <Category />
                    </Suspense>
                  } />
                  <Route path="orders" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <Orders />
                    </Suspense>
                  } />
                  <Route path="orders/:orderId" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <OrderTracking />
                    </Suspense>
                  } />
                  <Route path="account" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <Account />
                    </Suspense>
                  } />
                  
                  {/* Heavy admin routes - lazy loaded */}
                  <Route path="admin" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <AdminDashboard />
                    </Suspense>
                  } />
                  <Route path="admin/products" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <ProductManagement />
                    </Suspense>
                  } />
                  <Route path="admin/pos" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <POS />
                    </Suspense>
                  } />
                  <Route path="admin/delivery-dashboard" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <DeliveryTracking />
                    </Suspense>
                  } />
                  <Route path="admin/analytics" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <Analytics />
                    </Suspense>
                  } />
                  <Route path="admin/financial-dashboard" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <FinancialDashboard />
                    </Suspense>
                  } />
                  <Route path="admin/payments" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <PaymentManagement />
                    </Suspense>
                  } />
<Route path="admin/ai-generate" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <AIGenerate />
                    </Suspense>
                  } />
<Route path="admin/payroll" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <PayrollManagement />
                    </Suspense>
                  } />
                  
                  {/* Role Assignment Route - Admin Only */}
                  <Route path="role-management" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <RoleAssignment />
                    </Suspense>
                  } />
                  
                  {/* Vendor Portal Route */}
                  <Route path="vendor-portal" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <VendorPortal />
                    </Suspense>
                  } />
                </Route>
              </Routes>
            </Suspense>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss={false}
              draggable
              pauseOnHover={false}
              theme="colored"
              style={{ zIndex: 9999 }}
              limit={3}
            />
</div>
        </BrowserRouter>
        </WebSocketProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;