import './index.css'
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import App from "@/App";
import { store } from "@/store/index";
import Error from "@/components/ui/Error";
// Global error handlers for external script errors
window.addEventListener('error', (event) => {
  // Handle errors from external scripts like Apper CDN
  if (event.filename && event.filename.includes('apper.io')) {
    console.warn('External Apper script error intercepted:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    // Prevent the error from breaking the application
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
});

// Handle unhandled promise rejections from external scripts
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && 
      (event.reason.message.includes('DataCloneError') || 
       event.reason.message.includes('postMessage') ||
       event.reason.message.includes('URL object could not be cloned'))) {
    console.warn('External script postMessage error intercepted:', {
      reason: event.reason.message,
      stack: event.reason.stack
    });
    // Prevent the error from breaking the application
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Intercept and sanitize postMessage calls to prevent DataCloneError
const originalPostMessage = window.postMessage;
window.postMessage = function(message, targetOrigin, transfer) {
  try {
    // Test if message can be cloned
    structuredClone(message);
    return originalPostMessage.call(this, message, targetOrigin, transfer);
  } catch (error) {
    if (error.name === 'DataCloneError') {
      console.warn('PostMessage DataCloneError prevented, sanitizing message');
      const sanitizedMessage = serializeForPostMessage(message);
      return originalPostMessage.call(this, sanitizedMessage, targetOrigin, transfer);
    }
    throw error;
  }
};

// Handle postMessage errors specifically with enhanced safety
window.addEventListener('message', (event) => {
  try {
    // Safely handle messages from external origins
    if (event?.origin && event.origin.includes('apper.io')) {
      console.log('Message from Apper script:', event.data);
      
      // If the message contains URL objects, convert them
      if (event.data && typeof event.data === 'object') {
        const sanitizedData = serializeForPostMessage(event.data);
        // Forward sanitized message to any listeners
        window.dispatchEvent(new CustomEvent('apper-message', {
          detail: sanitizedData
        }));
      }
    }
  } catch (error) {
    console.warn('Error handling postMessage from external script:', error);
    // Don't let message handling errors break the app
    event.preventDefault?.();
  }
});

// Performance monitoring utility
const performanceMonitor = {
  marks: {}
};
// Enhanced data serialization utility to prevent DataCloneError
const serializeForPostMessage = (data) => {
  try {
    // Handle null/undefined early
    if (data === null) return null;
    if (data === undefined) return { __type: 'Undefined' };
    
    // Handle primitives
    if (typeof data !== 'object') return data;
    
    // Track circular references with WeakSet
    const seen = new WeakSet();
    const path = [];
    
    // Convert non-serializable objects to serializable format
    const serialized = JSON.parse(JSON.stringify(data, function(key, value) {
      // Track path for better error reporting
      if (key) path.push(key);
      
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return { 
            __type: 'CircularReference', 
            key,
            path: path.slice() 
          };
        }
        seen.add(value);
      }
      
      // Handle URL objects (main cause of DataCloneError)
      if (value instanceof URL) {
        return { 
          __type: 'URL', 
          href: value.href, 
          origin: value.origin,
          protocol: value.protocol,
          host: value.host,
          pathname: value.pathname,
          search: value.search,
          hash: value.hash
        };
      }
      
      // Handle URLSearchParams
      if (value instanceof URLSearchParams) {
        return { 
          __type: 'URLSearchParams', 
          params: Array.from(value.entries()) 
        };
      }
      
      // Handle Date objects
      if (value instanceof Date) {
        return { 
          __type: 'Date', 
          timestamp: value.getTime(),
          iso: value.toISOString()
        };
      }
      
      // Handle RegExp objects
      if (value instanceof RegExp) {
        return { 
          __type: 'RegExp', 
          source: value.source, 
          flags: value.flags 
        };
      }
      
      // Handle Error objects with all properties
      if (value instanceof Error) {
        return { 
          __type: 'Error', 
          name: value.name,
          message: value.message, 
          stack: value.stack,
          cause: value.cause
        };
      }
      
      // Handle functions
      if (typeof value === 'function') {
        return { 
          __type: 'Function', 
          name: value.name || 'anonymous',
          length: value.length
        };
      }
      
      // Handle Symbol
      if (typeof value === 'symbol') {
        return { 
          __type: 'Symbol', 
          description: value.description 
        };
      }
      
      // Handle BigInt
      if (typeof value === 'bigint') {
        return { 
          __type: 'BigInt', 
          value: value.toString() 
        };
      }
      
      // Handle undefined explicitly
      if (value === undefined) {
        return { __type: 'Undefined' };
      }
      
      // Remove key from path when done processing
      if (key) path.pop();
      
      return value;
    }));
    
    return serialized;
  } catch (error) {
    console.warn('Failed to serialize data for postMessage:', error);
    // Return minimal safe object instead of throwing
    return { 
      __type: 'SerializationError', 
      originalType: typeof data,
      error: error.message,
      timestamp: Date.now(),
      fallback: 'safe-mode'
    };
  }
};
// Safe message sending utility with enhanced error handling
const sendSafeMessage = (targetWindow, message, targetOrigin = "*") => {
  try {
    // Validate target window
    if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
      console.warn('Invalid target window for postMessage');
      return false;
    }
    
    // Test if message can be cloned first
    try {
      structuredClone(message);
      targetWindow.postMessage(message, targetOrigin);
      return true;
    } catch (cloneError) {
      if (cloneError.name === 'DataCloneError') {
        console.warn('Message contains non-cloneable data, serializing...');
        const serializedMessage = serializeForPostMessage(message);
        targetWindow.postMessage(serializedMessage, targetOrigin);
        return true;
      }
      throw cloneError;
    }
  } catch (error) {
    console.warn('Failed to send safe message:', error);
    return false;
  }
};

// Setup comprehensive message handler for external scripts
const setupMessageHandler = () => {
  const handleMessage = (event) => {
    // Validate event and origin
    if (!event || !event.origin) return;
    
    if (event.origin.includes('apper.io')) {
      try {
        const sanitizedData = serializeForPostMessage(event.data);
        console.log('Received sanitized message from Apper:', sanitizedData);
        
        // Dispatch custom event for app components to listen to
        window.dispatchEvent(new CustomEvent('apper-safe-message', {
          detail: {
            origin: event.origin,
            data: sanitizedData,
            timestamp: Date.now()
          }
        }));
      } catch (error) {
        console.warn('Failed to handle message from external script:', error);
      }
    }
  };
  
  // Add event listener with error boundary
  try {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  } catch (error) {
    console.warn('Failed to setup message handler:', error);
    return () => {};
  }
};

// External SDK Error Recovery System
class BackgroundSDKLoader {
  static messageHandler = null;
  static retryCount = 0;
  static maxRetries = 3;
  static retryDelay = 1000;
  
  static async loadInBackground() {
    try {
      // Setup safe message handling first
      this.messageHandler = setupMessageHandler();
      
      // Monitor for SDK errors
      const errorHandler = (error) => {
        if (error.filename && error.filename.includes('apper.io')) {
          console.warn('SDK error detected, implementing fallback');
          this.handleSDKError(error);
        }
      };
      
      window.addEventListener('error', errorHandler);
      
      // Return cleanup function
      return () => {
        if (this.messageHandler) this.messageHandler();
        window.removeEventListener('error', errorHandler);
      };
    } catch (error) {
      console.warn('Failed to initialize SDK loader:', error);
      return () => {};
    }
  }
  
  static handleSDKError(error) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`SDK error recovery attempt ${this.retryCount}/${this.maxRetries}`);
      
      setTimeout(() => {
        // Attempt to reinitialize or provide fallback
        this.loadInBackground();
      }, this.retryDelay * this.retryCount);
    } else {
      console.warn('Max SDK recovery attempts reached, using fallback mode');
      // Implement fallback functionality here
      window.dispatchEvent(new CustomEvent('apper-sdk-fallback', {
        detail: { error: error.message, timestamp: Date.now() }
      }));
    }
  }
}

// Enhanced performance monitoring with error tracking
const performanceMonitor = {
  marks: {},
  errors: [],
  
  mark(name) {
    try {
      this.marks[name] = performance.now();
    } catch (error) {
      console.warn('Performance mark failed:', error);
    }
  },
  
  measure(name, startMark) {
    try {
      const start = this.marks[startMark];
      if (!start) {
        console.warn(`No start mark found for ${startMark}`);
        return 0;
      }
      const end = performance.now();
      const duration = end - start;
      console.log(`${name}: ${duration}ms`);
      return duration;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
      return 0;
    }
  },
  
  trackError(error, source = 'unknown') {
    this.errors.push({
      message: error.message,
      source,
      timestamp: Date.now(),
      stack: error.stack
    });
    
    // Keep only last 50 errors to prevent memory issues
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
  }
};

performanceMonitor.mark('app-start');
// Enhanced main initialization with comprehensive error handling
const initializeApp = async () => {
  try {
    performanceMonitor.mark('init-start');
    
    // Initialize SDK loader with error recovery
    const cleanupSDK = await BackgroundSDKLoader.loadInBackground();
    
    performanceMonitor.measure('SDK initialization', 'init-start');
    
    // Initialize React app with error boundary
    const root = ReactDOM.createRoot(document.getElementById('root'));
    
    // Enhanced error boundary component
    const AppWithErrorBoundary = () => {
      const [hasError, setHasError] = useState(false);
      const [error, setError] = useState(null);
      
      useEffect(() => {
        const handleError = (event) => {
          if (event.filename && event.filename.includes('apper.io')) {
            performanceMonitor.trackError(event.error || new Error(event.message), 'external-script');
            // Don't break app for external script errors
            event.preventDefault();
            return;
          }
          
          setHasError(true);
          setError(event.error || new Error(event.message));
          performanceMonitor.trackError(event.error || new Error(event.message), 'app-error');
        };
        
        const handleUnhandledRejection = (event) => {
          if (event.reason && event.reason.message && 
              event.reason.message.includes('DataCloneError')) {
            performanceMonitor.trackError(event.reason, 'postmessage-error');
            event.preventDefault();
            return;
          }
          
          setHasError(true);
          setError(event.reason);
          performanceMonitor.trackError(event.reason, 'promise-rejection');
        };
        
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        
        return () => {
          window.removeEventListener('error', handleError);
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
          if (cleanupSDK) cleanupSDK();
        };
      }, []);
      
      if (hasError) {
        return (
          <Provider store={store}>
            <Error 
              error={error} 
              onRetry={() => {
                setHasError(false);
                setError(null);
                window.location.reload();
              }}
            />
          </Provider>
        );
      }
      
      return (
        <Provider store={store}>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </Provider>
      );
    };
    
    root.render(<AppWithErrorBoundary />);
    
    performanceMonitor.measure('App initialization', 'init-start');
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    performanceMonitor.trackError(error, 'init-error');
    
    // Fallback initialization without external dependencies
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <Provider store={store}>
        <Error 
          error={error} 
          onRetry={() => window.location.reload()}
        />
      </Provider>
    );
  }
};

// Initialize when DOM is ready with additional safety
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // Add small delay to ensure all scripts are loaded
  setTimeout(initializeApp, 0);
}
      
      return false;
    }
  }
  
  static setupMessageHandler() {
    if (typeof window === 'undefined' || this.messageHandler) {
      return;
    }
    
    this.messageHandler = (event) => {
      try {
        handleSDKMessage(event);
      } catch (error) {
        console.warn('Message handler error:', error);
      }
    };
    
    window.addEventListener('message', this.messageHandler);
  }
  
  static cleanup() {
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
  
  static async initializeWhenReady() {
    try {
      if (window.apperSDK?.isInitialized) {
        return true;
      }
      
      // Try to initialize if available
      if (window.apperSDK?.initialize) {
        await window.apperSDK.initialize();
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('SDK initialization failed:', error);
      return false;
    }
  }
}

// Fast Error Boundary
function FastErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleError = (event) => {
      setHasError(true);
      setError(event.error);
    };

    const handleUnhandledRejection = (event) => {
      setHasError(true);
      setError(event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            We're sorry, but there was an error loading the application.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// Initialize app
async function initializeApp() {
  try {
    // Mark initialization start
    performanceMonitor.marks.initStart = performance.now();
    
    // Load SDK in background (non-blocking)
    BackgroundSDKLoader.loadInBackground().then(loaded => {
      if (loaded) {
        BackgroundSDKLoader.initializeWhenReady();
      }
    });

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Create React root
    const root = ReactDOM.createRoot(rootElement);
    
    // Mark render start
    performanceMonitor.marks.renderStart = performance.now();

    // Render app with error boundary
root.render(
      <FastErrorBoundary>
        <Provider store={store}>
          <App />
          <ToastContainer />
        </Provider>
      </FastErrorBoundary>
    );

    // Mark initialization complete
    performanceMonitor.marks.initComplete = performance.now();
    
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const initTime = performanceMonitor.marks.initComplete - performanceMonitor.marks.initStart;
      console.log(`App initialized in ${initTime.toFixed(2)}ms`);
    }

  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Fallback render
    document.getElementById('root').innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: #f5f5f5;">
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h2>
          <p style="color: #6b7280; margin-bottom: 1rem;">Unable to load the application. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
        </div>
      </div>
    `;
  }
}

// Start the application
initializeApp();