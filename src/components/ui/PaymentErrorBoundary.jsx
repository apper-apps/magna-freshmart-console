import React from "react";
import Error from "@/components/ui/Error";

class PaymentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log payment-specific errors
    console.error('Payment Error Boundary caught an error:', {
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="payment-error-container p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Payment Processing Error
              </h3>
            </div>
          </div>
          <div className="text-sm text-red-700">
            <p className="mb-2">
              We encountered an issue while processing your payment. This could be due to:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>Network connectivity issues</li>
              <li>Payment service temporarily unavailable</li>
              <li>Invalid payment information</li>
            </ul>
            <div className="flex space-x-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Refresh Page
              </button>
</div>
          </div>
          {(typeof process !== 'undefined' && process.env.NODE_ENV === 'development') && this.state.error && (
            <details className="mt-4 cursor-pointer">
              <summary className="text-xs text-red-600 font-medium">
                Technical Details (Development Only)
              </summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default PaymentErrorBoundary;