import '@/index.css';
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import Error from "@/components/ui/Error";

// Performance monitoring
const performanceMonitor = {
  start: performance.now(),
  marks: {}
};

// Background SDK Loader - non-blocking
class BackgroundSDKLoader {
  static async loadInBackground() {
    try {
      // Check if Apper SDK is available
      if (typeof window !== 'undefined' && !window.Apper) {
        console.log('Apper SDK not detected - continuing without it');
        return false;
      }
      return true;
    } catch (error) {
      console.warn('SDK loading failed:', error);
      return false;
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
        <App />
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