// Comprehensive error handling utilities
export class ErrorHandler {
  static classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('timeout') || message.includes('deadline')) {
      return 'timeout';
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('parse')) {
      return 'validation';
    }
    if (message.includes('server') || message.includes('500') || message.includes('503')) {
      return 'server';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not-found';
    }
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('403')) {
      return 'permission';
    }
    
    return 'general';
  }

  static createUserFriendlyMessage(error, context = '') {
    const type = this.classifyError(error);
    const contextPrefix = context ? `${context}: ` : '';
    
    switch (type) {
      case 'network':
        return `${contextPrefix}Network connection issue. Please check your internet connection and try again.`;
      case 'timeout':
        return `${contextPrefix}Request timed out. Please try again.`;
      case 'server':
        return `${contextPrefix}Server error occurred. Please try again in a few moments.`;
      case 'validation':
        return `${contextPrefix}Invalid data provided. Please check your input and try again.`;
      case 'not-found':
        return `${contextPrefix}Requested item not found.`;
      case 'permission':
        return `${contextPrefix}You don't have permission to perform this action.`;
      default:
        return `${contextPrefix}An unexpected error occurred. Please try again.`;
    }
  }

static shouldRetry(error, attemptCount = 0, maxRetries = 3) {
    if (attemptCount >= maxRetries) return false;
    
    const type = this.classifyError(error);
    const retryableTypes = ['network', 'timeout', 'server'];
    
    // Enhanced retry logic with specific error patterns
    if (retryableTypes.includes(type)) {
      // Additional checks for specific error messages
      const message = error.message?.toLowerCase() || '';
      
      // Don't retry certain permanent errors
      if (message.includes('404') || message.includes('forbidden') || message.includes('unauthorized')) {
        return false;
      }
      
      // Retry network and timeout errors more aggressively
      if (type === 'network' || type === 'timeout') {
        return attemptCount < maxRetries;
      }
      
      // Be more conservative with server errors
      if (type === 'server') {
        return attemptCount < Math.min(maxRetries, 2);
      }
      
      return true;
    }
    
    return false;
  }

  static getRetryDelay(attemptCount, baseDelay = 1000) {
    // Exponential backoff with jitter to prevent thundering herd
    const exponentialDelay = baseDelay * Math.pow(2, attemptCount);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    const totalDelay = exponentialDelay + jitter;
    
    // Cap at 30 seconds
    return Math.min(totalDelay, 30000);
  }

static trackErrorPattern(error, context = '', metadata = {}) {
    // Enhanced error pattern tracking with payment-specific diagnostics
    const errorKey = `${error.name || 'Unknown'}_${error.message || 'NoMessage'}`;
    const timestamp = Date.now();
    
    if (!window.errorPatterns) {
      window.errorPatterns = new Map();
    }
    
    const existing = window.errorPatterns.get(errorKey) || { 
      count: 0, 
      contexts: new Set(), 
      firstSeen: timestamp,
      metadata: new Map()
    };
    
    existing.count++;
    existing.contexts.add(context);
    existing.lastSeen = timestamp;
    
    // Track metadata for payment errors
    if (metadata && typeof metadata === 'object') {
      Object.entries(metadata).forEach(([key, value]) => {
        if (!existing.metadata.has(key)) {
          existing.metadata.set(key, new Set());
        }
        existing.metadata.get(key).add(value);
      });
    }
    
    window.errorPatterns.set(errorKey, existing);
    
    // Enhanced alerting for payment processor errors
    const isPaymentError = context.includes('payment') || context.includes('checkout') || 
                          error.message.includes('payment') || error.message.includes('processor');
    
    const criticalThreshold = isPaymentError ? 3 : 5; // Lower threshold for payment errors
    
    if (existing.count >= criticalThreshold) {
      const errorDetails = {
        contexts: Array.from(existing.contexts),
        timespan: timestamp - existing.firstSeen,
        frequency: existing.count / ((timestamp - existing.firstSeen) / 60000), // errors per minute
        isPaymentError,
        metadata: Object.fromEntries(
          Array.from(existing.metadata.entries()).map(([key, valueSet]) => [
            key, 
            Array.from(valueSet)
          ])
        )
      };
      
      if (isPaymentError) {
        console.error(`Critical payment error pattern detected: ${errorKey}`, {
          ...errorDetails,
          severity: 'CRITICAL',
          recommendation: existing.count >= 10 ? 
            'Consider disabling payment method temporarily' : 
            'Monitor payment processor health'
        });
        
        // Track payment processor health
        if (typeof window !== 'undefined') {
          window.paymentProcessorHealth = window.paymentProcessorHealth || {};
          window.paymentProcessorHealth[errorKey] = {
            status: existing.count >= 10 ? 'critical' : 'degraded',
            errorCount: existing.count,
            lastError: timestamp,
            contexts: Array.from(existing.contexts)
          };
        }
      } else {
        console.error(`Critical error pattern detected: ${errorKey} occurred ${existing.count} times`, errorDetails);
      }
    }
    
    return existing;
  }
}

// Network status monitoring
export class NetworkMonitor {
  static isOnline() {
    return navigator.onLine;
  }

  static addNetworkListener(callback) {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

// Service layer error wrapper
export const withErrorHandling = (serviceMethod, context) => {
  return async (...args) => {
    let attemptCount = 0;
    
    while (attemptCount < 3) {
      try {
        return await serviceMethod(...args);
      } catch (error) {
        console.error(`${context} error (attempt ${attemptCount + 1}):`, error);
        
        if (ErrorHandler.shouldRetry(error, attemptCount)) {
          attemptCount++;
          const delay = ErrorHandler.getRetryDelay(attemptCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(ErrorHandler.createUserFriendlyMessage(error, context));
      }
    }
  };
};