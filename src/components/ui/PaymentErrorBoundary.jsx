import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "@/components/atoms/Button";

class PaymentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log payment-specific errors
    if (error.name === 'PaymentProcessorError' || 
        error.message.includes('constructor') ||
        error.message.includes('processor')) {
      console.error('Payment Processing Error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleFallback = () => {
    if (this.props.onFallback) {
      this.props.onFallback();
    }
  };

  render() {
    if (this.state.hasError) {
      const isPaymentError = this.state.error?.name === 'PaymentProcessorError' ||
                            this.state.error?.message?.includes('constructor') ||
                            this.state.error?.message?.includes('processor');

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isPaymentError ? 'Payment System Error' : 'Something went wrong'}
            </h2>
            
<p className="text-gray-600 mb-6">
              {isPaymentError 
                ? 'We encountered an issue processing your payment. Please try again or use manual processing.'
                : 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="btn-primary flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              {isPaymentError && (
                <Button
                  onClick={this.handleFallback}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Manual Processing
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PaymentErrorBoundary;