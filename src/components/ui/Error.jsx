import React from 'react';
import ApperIcon from '@/components/ApperIcon';

const Error = ({ message = "Something went wrong", onRetry, type = 'general' }) => {
  const getErrorIcon = () => {
switch (type) {
      case 'network':
        return 'WifiOff';
      case 'not-found':
        return 'SearchX';
      case 'payment':
        return 'CreditCard';
      case 'financial':
        return 'TrendingDown';
      case 'server':
        return 'Server';
      case 'timeout':
        return 'Clock';
      case 'validation':
        return 'AlertTriangle';
      case 'loading':
        return 'Loader2';
      default:
        return 'AlertCircle';
    }
  };

  const getErrorTitle = () => {
    switch (type) {
      case 'network':
        return 'Connection Problem';
      case 'not-found':
        return 'Not Found';
      case 'payment':
        return 'Payment Issue';
      case 'financial':
        return 'Financial Data Error';
      case 'server':
        return 'Server Error';
      case 'timeout':
        return 'Request Timeout';
      case 'validation':
        return 'Data Validation Error';
      case 'loading':
        return 'Loading Failed';
      default:
        return 'Oops! Something went wrong';
    }
  };

  const getErrorDescription = () => {
    switch (type) {
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'server':
        return 'Our servers are experiencing issues. Please try again in a few minutes.';
      case 'timeout':
        return 'The request took too long to complete. Please try again.';
      case 'validation':
        return 'The data received is invalid or corrupted.';
      case 'loading':
        return 'Failed to load the requested content.';
      default:
        return message;
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-full p-6 mb-6">
        <ApperIcon 
          name={getErrorIcon()} 
          size={48} 
          className="text-red-500" 
        />
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        {getErrorTitle()}
      </h3>
      
<p className="text-gray-600 mb-6 max-w-md leading-relaxed">
        {getErrorDescription()}
      </p>
      
{/* Additional error guidance for specific types */}
      {type === 'network' && !navigator.onLine && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-yellow-800">
            You appear to be offline. Please check your internet connection.
          </p>
        </div>
      )}
      
{type === 'processor' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-red-800">
            Payment processor issues are usually temporary. Try selecting a different payment method or contact our support team for assistance.
          </p>
        </div>
      )}
      
      {type === 'wallet' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-orange-800">
            Check your wallet balance and try again. If the issue persists, try using a different payment method.
          </p>
        </div>
      )}
      
      {type === 'server' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-blue-800">
            This is likely a temporary issue. You can also try refreshing the page.
          </p>
        </div>
      )}
      
      {type === 'unavailable' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-gray-800">
            Service is temporarily unavailable. Please try again later or choose an alternative option.
          </p>
        </div>
      )}
      
      {type === 'image-processing' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-red-800">
            Image processing failed. Please ensure your image is valid (JPG, PNG, WEBP, HEIC), under 10MB, and not corrupted. Try converting to JPG format if the issue persists.
          </p>
        </div>
      )}
      
      {type === 'file-validation' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-yellow-800">
            File validation failed. Only JPG, PNG, WEBP, and HEIC image files under 10MB are supported. Please check your file format and size.
          </p>
        </div>
      )}
      
      {type === 'compression' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-orange-800">
            Image compression failed. The file may be corrupted or in an unsupported format. Try using a different image or converting to JPG format first.
          </p>
        </div>
      )}
      
      {type === 'heic-conversion' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-purple-800">
            HEIC file conversion failed. Please convert your HEIC image to JPG format manually, or try uploading a different image format.
          </p>
        </div>
      )}
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary inline-flex items-center space-x-2"
        >
          <ApperIcon name="RefreshCw" size={20} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

export default Error;