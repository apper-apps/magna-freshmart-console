import './index.css'
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import App from "@/App";
import { store } from "@/store/index";
import ErrorComponent from "@/components/ui/Error";

// Polyfill for structuredClone if not available
if (typeof structuredClone === 'undefined') {
  window.structuredClone = function(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.warn('structuredClone fallback failed:', error);
      return obj;
    }
  };
}

// Polyfill for CustomEvent if not available
if (typeof CustomEvent === 'undefined') {
  window.CustomEvent = function(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    const evt = document.createEvent('CustomEvent');
evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  };
}

// Error handler coordination to prevent conflicts
const errorHandlerState = {
  processing: new Set(),
  lastError: null,
  lastErrorTime: 0,
  debounceMs: 100
};

// Global error handlers for external script errors with coordination
window.addEventListener('error', (event) => {
  const errorKey = `${event.filename}:${event.lineno}:${event.message}`;
  const now = Date.now();
  
  // Debounce identical errors
  if (errorHandlerState.lastError === errorKey && 
      now - errorHandlerState.lastErrorTime < errorHandlerState.debounceMs) {
    return false;
  }
  
  // Prevent concurrent processing of same error
  if (errorHandlerState.processing.has(errorKey)) {
    return false;
  }
  
  // Handle errors from external scripts like Apper CDN
  if (event.filename && event.filename.includes('apper.io')) {
    errorHandlerState.processing.add(errorKey);
    errorHandlerState.lastError = errorKey;
    errorHandlerState.lastErrorTime = now;
    
    console.warn('External Apper script error intercepted:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: now
    });
    
    // Clean up processing state after a delay
    setTimeout(() => {
      errorHandlerState.processing.delete(errorKey);
    }, 1000);
    
    // Prevent the error from breaking the application
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
});

// Handle unhandled promise rejections from external scripts with coordination
window.addEventListener('unhandledrejection', (event) => {
  const errorKey = `rejection:${event.reason?.message || 'unknown'}`;
  const now = Date.now();
  
  // Debounce identical rejections
  if (errorHandlerState.lastError === errorKey && 
      now - errorHandlerState.lastErrorTime < errorHandlerState.debounceMs) {
    event.preventDefault();
    return false;
  }
  
  if (event.reason && event.reason.message && 
      (event.reason.message.includes('DataCloneError') || 
       event.reason.message.includes('postMessage') ||
       event.reason.message.includes('URL object could not be cloned'))) {
    
    errorHandlerState.lastError = errorKey;
    errorHandlerState.lastErrorTime = now;
    
    console.warn('External script postMessage error intercepted:', {
      reason: event.reason.message,
      stack: event.reason.stack,
      timestamp: now
    });
    
    // Prevent the error from breaking the application
    event.preventDefault();
    return false;
  }
});

// Enhanced postMessage interception with better error recovery
const originalPostMessage = window.postMessage;
const postMessageState = {
  attempts: new Map(),
  maxRetries: 3,
  retryDelay: 100
};

window.postMessage = function(message, targetOrigin, transfer) {
  const attemptKey = `${targetOrigin}:${Date.now()}`;
try {
    // Test if message can be cloned
    window.structuredClone(message);
    return originalPostMessage.call(this, message, targetOrigin, transfer);
  } catch (error) {
    if (error.name === 'DataCloneError') {
      console.warn('PostMessage DataCloneError prevented, sanitizing message');
      
      try {
        const sanitizedMessage = serializeForPostMessage(message);
        return originalPostMessage.call(this, sanitizedMessage, targetOrigin, transfer);
      } catch (sanitizeError) {
        console.error('Failed to sanitize message:', sanitizeError);
        
        // Fallback to minimal safe message
        const fallbackMessage = {
          __type: 'PostMessageFallback',
          timestamp: Date.now(),
          originalError: error.message,
          targetOrigin
        };
        
        return originalPostMessage.call(this, fallbackMessage, targetOrigin, transfer);
      }
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
        window.dispatchEvent(new window.CustomEvent('apper-message', {
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

// Enhanced data serialization utility to prevent DataCloneError
// Enhanced serialization with performance optimizations
const serializeForPostMessage = (data) => {
  // Performance cache for frequently serialized objects
  const serializationCache = new Map();
  const maxCacheSize = 100;
  
  try {
    // Handle null/undefined early
    if (data === null) return null;
    if (data === undefined) return { __type: 'Undefined' };
    
    // Handle primitives - no serialization needed
    if (typeof data !== 'object') return data;
    
    // Check cache for performance
    const cacheKey = typeof data === 'object' ? JSON.stringify(data) : String(data);
    if (serializationCache.has(cacheKey)) {
      return serializationCache.get(cacheKey);
    }
    
    // Track circular references with WeakSet for better performance
    const seen = new WeakSet();
    const path = [];
    let depth = 0;
    const maxDepth = 50; // Prevent deep recursion
    
    // Optimized serialization function
    const serialize = (value, key = '') => {
      depth++;
      if (depth > maxDepth) {
        return { __type: 'MaxDepthExceeded', depth };
      }
      
      // Track path for better error reporting
      if (key) path.push(key);
      
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          depth--;
          return { 
            __type: 'CircularReference', 
            key,
            path: path.slice() 
          };
        }
        seen.add(value);
      }
      
      let result;
      
      // Handle URL objects (main cause of DataCloneError)
      if (value instanceof URL) {
        result = { 
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
      else if (value instanceof URLSearchParams) {
        result = { 
          __type: 'URLSearchParams', 
          params: Array.from(value.entries()) 
        };
      }
      // Handle Date objects
      else if (value instanceof Date) {
        result = { 
          __type: 'Date', 
          timestamp: value.getTime(),
          iso: value.toISOString()
        };
      }
      // Handle RegExp objects
      else if (value instanceof RegExp) {
        result = { 
          __type: 'RegExp', 
          source: value.source, 
          flags: value.flags 
        };
      }
      // Handle Error objects with all properties
      else if (value instanceof Error) {
        result = { 
          __type: 'Error', 
          name: value.name,
          message: value.message, 
          stack: value.stack,
          cause: value.cause
        };
      }
      // Handle functions
      else if (typeof value === 'function') {
        result = { 
          __type: 'Function', 
          name: value.name || 'anonymous',
          length: value.length
        };
      }
      // Handle Symbol
      else if (typeof value === 'symbol') {
        result = { 
          __type: 'Symbol', 
          description: value.description 
        };
      }
      // Handle BigInt
      else if (typeof value === 'bigint') {
        result = { 
          __type: 'BigInt', 
          value: value.toString() 
        };
      }
      // Handle undefined explicitly
      else if (value === undefined) {
        result = { __type: 'Undefined' };
      }
      // Handle arrays and objects
      else if (Array.isArray(value)) {
        result = value.map((item, index) => serialize(item, `[${index}]`));
      }
      else if (typeof value === 'object' && value !== null) {
        result = {};
        for (const [objKey, objValue] of Object.entries(value)) {
          try {
            result[objKey] = serialize(objValue, objKey);
          } catch (err) {
            result[objKey] = { __type: 'SerializationError', error: err.message };
          }
        }
      }
      else {
        result = value;
      }
      
      // Remove key from path when done processing
      if (key) path.pop();
      depth--;
      
      return result;
    };
    
    const serialized = serialize(data);
    
    // Cache result for performance (with size limit)
    if (serializationCache.size >= maxCacheSize) {
      const firstKey = serializationCache.keys().next().value;
      serializationCache.delete(firstKey);
    }
    serializationCache.set(cacheKey, serialized);
    
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
// Enhanced safe message sending utility with retry mechanism
const sendSafeMessage = (targetWindow, message, targetOrigin = "*") => {
  const maxRetries = 3;
  let attempts = 0;
  
  const attemptSend = async () => {
    attempts++;
    
    try {
      // Validate target window
      if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
        console.warn('Invalid target window for postMessage');
        return false;
      }
      
      // Check if window is still accessible
      if (targetWindow.closed) {
        console.warn('Target window is closed');
        return false;
      }
// Test if message can be cloned first
      try {
        window.structuredClone(message);
        targetWindow.postMessage(message, targetOrigin);
        return true;
      } catch (cloneError) {
        if (cloneError.name === 'DataCloneError') {
          console.warn('Message requires serialization for postMessage');
          const sanitizedMessage = serializeForPostMessage(message);
          targetWindow.postMessage(sanitizedMessage, targetOrigin);
          return true;
        }
        throw cloneError;
      }
    } catch (error) {
      console.error(`Failed to send safe message (attempt ${attempts}/${maxRetries}):`, {
        error: error.message,
        targetOrigin,
        messageType: typeof message,
        attempt: attempts
      });
      
      // Retry with exponential backoff
      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts - 1) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptSend();
      }
      
      return false;
    }
  };
  
  return attemptSend();
};

// Enhanced message handler for external SDK communication
const setupMessageHandler = () => {
  const messageQueue = [];
  const processingQueue = false;
  
  const processMessageQueue = async () => {
    if (processingQueue || messageQueue.length === 0) return;
    
    processingQueue = true;
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      try {
        await handleMessage(message);
      } catch (error) {
        console.error('Error processing queued message:', error);
      }
    }
    processingQueue = false;
  };
  
const handleMessage = (event) => {
    // Validate message origin for security
    if (!event.origin.includes('apper.io') && !event.origin.includes('integrately.com')) {
      return;
    }
    
    try {
      const sanitizedData = serializeForPostMessage(event.data);
console.log('Received sanitized message from Apper:', sanitizedData);
      
      // Dispatch custom event for app components to listen to
      window.dispatchEvent(new window.CustomEvent('apper-safe-message', {
        detail: {
          origin: event.origin,
          data: sanitizedData,
          timestamp: Date.now()
        }
      }));
    } catch (error) {
      console.warn('Failed to handle message from external script:', error);
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
      
      // Monitor for SDK errors and setup recovery
      window.addEventListener('apper-sdk-error', this.handleSDKError.bind(this));
      
      // Initialize SDK with timeout
      const sdkPromise = this.initializeSDK();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SDK initialization timeout')), 5000)
      );
      
      await Promise.race([sdkPromise, timeoutPromise]);
      
      console.log('SDK loaded successfully in background');
      return this.messageHandler;
      
    } catch (error) {
      console.warn('SDK background loading failed:', error);
      performanceMonitor.trackError(error, 'sdk-load-error');
      
      // Attempt recovery if retries available
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying SDK load (${this.retryCount}/${this.maxRetries})`);
        
        // Retry with exponential backoff
        setTimeout(() => {
          this.loadInBackground();
        }, this.retryDelay * this.retryCount);
console.warn('Max SDK recovery attempts reached, using fallback mode');
        // Implement fallback functionality
        window.dispatchEvent(new window.CustomEvent('apper-sdk-fallback', {
          detail: { error: error.message, timestamp: Date.now() }
        }));
      }
      
      return () => {}; // Return cleanup function
    }
  }
  
  static async initializeSDK() {
    // Placeholder for actual SDK initialization
    // This would contain the actual SDK loading logic
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
  
  static handleSDKError(event) {
    console.error('SDK Error:', event.detail);
    performanceMonitor.trackError(new Error(event.detail.message), 'sdk-runtime-error');
  }
};

// Enhanced error boundary component with recovery mechanisms
function FastErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const maxRetries = 3;
  const retryDelay = 1000;
  
  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setIsRecovering(true);
      setTimeout(() => {
        setHasError(false);
        setError(null);
        setRetryCount(prev => prev + 1);
        setIsRecovering(false);
      }, retryDelay);
    }
  }, [retryCount]);
  
  const handleReset = useCallback(() => {
    setHasError(false);
    setError(null);
    setRetryCount(0);
    setIsRecovering(false);
  }, []);
  
  useEffect(() => {
    const handleError = (errorEvent) => {
      // Only handle errors that haven't been handled by other mechanisms
      if (errorEvent.filename?.includes('apper.io') && !errorHandlerState.processing.has(errorEvent.message)) {
        setHasError(true);
        setError({
          message: errorEvent.message || errorEvent.reason?.message || 'Unknown error',
          stack: errorEvent.error?.stack || errorEvent.reason?.stack,
          filename: errorEvent.filename,
          lineno: errorEvent.lineno,
          colno: errorEvent.colno
        });
      }
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);
  
  // Auto-recovery after successful retries
  useEffect(() => {
    if (hasError && retryCount > 0 && !isRecovering) {
      const timer = setTimeout(() => {
        handleReset();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount, isRecovering, handleReset]);
  
  if (hasError) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="error-boundary-container p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold mb-2">Something went wrong</h2>
        <p className="text-red-600 mb-4">
          {error?.message || 'An unexpected error occurred'}
        </p>
        {retryCount < maxRetries && (
          <button
            onClick={handleRetry}
            disabled={isRecovering}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isRecovering ? 'Retrying...' : `Retry (${retryCount}/${maxRetries})`}
          </button>
        )}
        {retryCount >= maxRetries && (
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        )}
      </div>
    );
  }
return children;
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

// Missing function for SDK message handling

// Missing function for SDK message handling
const handleSDKMessage = (event) => {
  try {
    if (event.origin && event.origin.includes('apper.io')) {
      const sanitizedData = serializeForPostMessage(event.data);
console.log('Handled SDK message:', sanitizedData);
      
      // Dispatch sanitized message
      window.dispatchEvent(new window.CustomEvent('apper-sdk-message', {
        detail: sanitizedData
      }));
    }
  } catch (error) {
    console.warn('SDK message handling failed:', error);
  }
};

performanceMonitor.mark('app-start');

// Fast Error Boundary

// Initialize app with comprehensive error handling
async function initializeApp() {
  try {
    // Mark initialization start
    performanceMonitor.mark('init-start');
    
    // Initialize SDK loader with error recovery
    const cleanupSDK = await BackgroundSDKLoader.loadInBackground();

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Create React root
    const root = ReactDOM.createRoot(rootElement);
    
    // Mark render start
    performanceMonitor.mark('render-start');

    // Render app with error boundary
    root.render(
      <FastErrorBoundary>
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
      </FastErrorBoundary>
    );

    // Mark initialization complete
    performanceMonitor.measure('App initialization', 'init-start');
    
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const renderTime = performanceMonitor.measure('Render time', 'render-start');
      console.log(`App initialized successfully`);
    }

    // Return cleanup function
    return () => {
      if (cleanupSDK) cleanupSDK();
    };

  } catch (error) {
    console.error('Failed to initialize app:', error);
    performanceMonitor.trackError(error, 'init-error');
    
    // Fallback render
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
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
}

// Initialize when DOM is ready with additional safety
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // Add small delay to ensure all scripts are loaded
  setTimeout(initializeApp, 0);
}