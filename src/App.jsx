import 'react-toastify/dist/ReactToastify.css'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@/store/index";
import { addRealTimeNotification, setConnectionStatus, updateApprovalStatus } from "@/store/approvalWorkflowSlice";
import Layout from "@/components/organisms/Layout";
import Loading from "@/components/ui/Loading";
import PayrollManagement from "@/components/pages/PayrollManagement";
import AdminDashboard from "@/components/pages/AdminDashboard";
import Cart from "@/components/pages/Cart";
import AIGenerate from "@/components/pages/AIGenerate";
import ProductManagement from "@/components/pages/ProductManagement";
import Analytics from "@/components/pages/Analytics";
import Orders from "@/components/pages/Orders";
import PaymentManagement from "@/components/pages/PaymentManagement";
import VendorPortal from "@/components/pages/VendorPortal";
import Category from "@/components/pages/Category";
import OrderTracking from "@/components/pages/OrderTracking";
import Account from "@/components/pages/Account";
import DeliveryTracking from "@/components/pages/DeliveryTracking";
import POS from "@/components/pages/POS";
import Checkout from "@/components/pages/Checkout";
import FinancialDashboard from "@/components/pages/FinancialDashboard";
import Home from "@/components/pages/Home";
import VendorManagement from "@/components/pages/VendorManagement";
import webSocketService from "@/services/api/websocketService";
// Error boundary for lazy-loaded components
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component failed to load:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Failed to load component</h2>
            <p className="text-gray-600 mb-4">There was an error loading this page.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe lazy loading with error handling
const createLazyComponent = (importFn, componentName) => {
  return React.lazy(() => 
    importFn().catch(error => {
      console.error(`Failed to load ${componentName}:`, error);
      // Return a fallback component instead of failing
      return {
        default: () => (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center p-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Component Unavailable</h2>
              <p className="text-gray-600 mb-4">The {componentName} component could not be loaded.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      };
    })
  );
};

// Lazy load heavy components for better performance with error handling
const AdminDashboard = createLazyComponent(() => import('@/components/pages/AdminDashboard'), 'Admin Dashboard');
const ProductManagement = createLazyComponent(() => import('@/components/pages/ProductManagement'), 'Product Management');
const VendorManagement = createLazyComponent(() => import('@/components/pages/VendorManagement'), 'Vendor Management');
const Analytics = createLazyComponent(() => import('@/components/pages/Analytics'), 'Analytics');
const FinancialDashboard = createLazyComponent(() => import('@/components/pages/FinancialDashboard'), 'Financial Dashboard');
const POS = createLazyComponent(() => import('@/components/pages/POS'), 'POS');
const PaymentManagement = createLazyComponent(() => import('@/components/pages/PaymentManagement'), 'Payment Management');
const PayrollManagement = createLazyComponent(() => import('@/components/pages/PayrollManagement'), 'Payroll Management');
const DeliveryTracking = createLazyComponent(() => import('@/components/pages/DeliveryTracking'), 'Delivery Tracking');
const AIGenerate = createLazyComponent(() => import('@/components/pages/AIGenerate'), 'AI Generate');
const Category = createLazyComponent(() => import('@/components/pages/Category'), 'Category');
const Orders = createLazyComponent(() => import('@/components/pages/Orders'), 'Orders');
const OrderTracking = createLazyComponent(() => import('@/components/pages/OrderTracking'), 'Order Tracking');
const Account = createLazyComponent(() => import('@/components/pages/Account'), 'Account');
const VendorPortal = createLazyComponent(() => import('@/components/pages/VendorPortal'), 'Vendor Portal');
const RoleAssignment = createLazyComponent(() => import('@/components/pages/RoleAssignment'), 'Role Assignment');
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
                  
{/* Lazy loaded routes with error boundaries */}
                  <Route path="category/:categoryName" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <Category />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
<Route path="orders" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <Orders />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="orders/:orderId" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <OrderTracking />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="account" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <Account />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  
                  {/* Heavy admin routes - lazy loaded with error boundaries */}
                  <Route path="admin" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <AdminDashboard />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="admin/products" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <ProductManagement />
                      </Suspense>
</LazyErrorBoundary>
                  } />
                  <Route path="admin/vendors" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <VendorManagement />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="admin/pos" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <POS />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="admin/delivery-dashboard" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <DeliveryTracking />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="admin/analytics" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <Analytics />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="admin/financial-dashboard" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <FinancialDashboard />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="admin/payments" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <PaymentManagement />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="admin/ai-generate" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <AIGenerate />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  <Route path="admin/payroll" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <PayrollManagement />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  
                  {/* Role Assignment Route - Admin Only */}
                  <Route path="role-management" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <RoleAssignment />
                      </Suspense>
                    </LazyErrorBoundary>
                  } />
                  
                  {/* Vendor Portal Route */}
                  <Route path="vendor-portal" element={
                    <LazyErrorBoundary>
                      <Suspense fallback={<Loading type="page" />}>
                        <VendorPortal />
                      </Suspense>
                    </LazyErrorBoundary>
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