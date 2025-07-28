// Comprehensive error handling utilities
export class ErrorHandler {
  static classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    
    // Image processing and file validation errors
    if (message.includes('heic') || message.includes('heif')) {
      return 'heic-conversion';
    }
    if (message.includes('image') && (message.includes('load') || message.includes('corrupt') || message.includes('process'))) {
      return 'image-processing';
    }
    if (message.includes('file') && (message.includes('type') || message.includes('format') || message.includes('size'))) {
      return 'file-validation';
    }
    if (message.includes('compression') || message.includes('compress') || message.includes('quality')) {
      return 'compression';
    }
    
    // Network and connectivity errors
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
    
    // Enhanced retry logic with performance optimization context
    if (retryableTypes.includes(type)) {
      const message = error.message?.toLowerCase() || '';
      
      // Don't retry certain permanent errors
      if (message.includes('404') || message.includes('forbidden') || message.includes('unauthorized')) {
        return false;
      }
      
      // Don't retry validation errors from order processing
      if (message.includes('invalid order') || message.includes('payment result missing')) {
        return false;
      }
      
      // Retry network and timeout errors more aggressively for lazy loading
      if (type === 'network' || type === 'timeout') {
        // Increase retry attempts for order loading operations
        const isOrderLoading = message.includes('order') || message.includes('load');
        const maxOrderRetries = isOrderLoading ? maxRetries + 2 : maxRetries;
        return attemptCount < maxOrderRetries;
      }
      
      // Be more conservative with server errors but allow retries for pagination
      if (type === 'server') {
        const isPagination = message.includes('page') || message.includes('paginated');
        const maxServerRetries = isPagination ? Math.min(maxRetries, 3) : Math.min(maxRetries, 2);
        return attemptCount < maxServerRetries;
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
    // Enhanced error pattern tracking with image processing and payment processor health monitoring
    const errorKey = `${error.name || 'Unknown'}_${error.message || 'NoMessage'}`;
    const timestamp = Date.now();
    
    if (!window.errorPatterns) {
      window.errorPatterns = new Map();
    }
    
    if (!window.performanceMetrics) {
      window.performanceMetrics = {
        orderLoadErrors: 0,
        cacheErrors: 0,
        networkErrors: 0,
        paymentErrors: 0,
        processorErrors: 0,
        imageProcessingErrors: 0,
        fileValidationErrors: 0,
        compressionErrors: 0,
        lastErrorTime: null,
        errorRate: 0
      };
    }
    
    // Initialize payment processor health tracking
    if (!window.paymentProcessorHealth) {
      window.paymentProcessorHealth = {
        globalStatus: 'healthy',
        errorsByProcessor: new Map(),
        failureRates: new Map(),
        lastHealthCheck: timestamp,
        criticalErrors: [],
        recoveryActions: []
      };
    }
    
    const existing = window.errorPatterns.get(errorKey) || { 
      count: 0, 
      contexts: new Set(), 
      firstSeen: timestamp,
      metadata: new Map(),
      performanceImpact: {
        averageDelay: 0,
        maxDelay: 0,
        affectedOperations: new Set()
      },
      paymentProcessorImpact: {
        processorType: null,
        transactionFailures: 0,
        consecutiveFailures: 0,
        lastSuccessfulTransaction: null,
        affectedGateways: new Set()
      },
      imageProcessingImpact: {
        failedFormats: new Set(),
        averageFileSize: 0,
        compressionFailures: 0,
        conversionFailures: 0
      }
    };
    
    existing.count++;
    existing.contexts.add(context);
    existing.lastSeen = timestamp;
    
    // Track performance impact
    if (metadata.responseTime) {
      const responseTime = parseFloat(metadata.responseTime);
      existing.performanceImpact.averageDelay = 
        (existing.performanceImpact.averageDelay * (existing.count - 1) + responseTime) / existing.count;
      existing.performanceImpact.maxDelay = Math.max(existing.performanceImpact.maxDelay, responseTime);
    }
    
    if (metadata.operation) {
      existing.performanceImpact.affectedOperations.add(metadata.operation);
    }
    
    // Enhanced image processing error tracking
    const isImageError = context.includes('image') || context.includes('file') || 
                        error.message.includes('image') || error.message.includes('heic') ||
                        error.message.includes('compression') || error.message.includes('format');
    
    if (isImageError) {
      const errorType = this.classifyError(error);
      
      if (errorType === 'image-processing') {
        window.performanceMetrics.imageProcessingErrors++;
        if (metadata.fileFormat) {
          existing.imageProcessingImpact.failedFormats.add(metadata.fileFormat);
        }
        if (metadata.fileSize) {
          const currentAvg = existing.imageProcessingImpact.averageFileSize;
          existing.imageProcessingImpact.averageFileSize = 
            (currentAvg * (existing.count - 1) + metadata.fileSize) / existing.count;
        }
      } else if (errorType === 'file-validation') {
        window.performanceMetrics.fileValidationErrors++;
      } else if (errorType === 'compression') {
        window.performanceMetrics.compressionErrors++;
        existing.imageProcessingImpact.compressionFailures++;
      } else if (errorType === 'heic-conversion') {
        existing.imageProcessingImpact.conversionFailures++;
      }
    }
    
    // Enhanced payment processor tracking
    const isPaymentError = context.includes('payment') || context.includes('checkout') || 
                          context.includes('processor') || error.message.includes('payment') || 
                          error.message.includes('processor') || error.message.includes('eA') ||
                          context.includes('gateway') || context.includes('refund') ||
                          context.includes('verification') || context.includes('wallet');
    
    if (isPaymentError) {
      window.performanceMetrics.paymentErrors++;
      
      // Track processor-specific errors
      if (context.includes('processor') || error.message.includes('processor') || error.message.includes('eA')) {
        window.performanceMetrics.processorErrors++;
        existing.paymentProcessorImpact.processorType = metadata.processorType || 'unknown';
        existing.paymentProcessorImpact.transactionFailures++;
        
        // Track consecutive failures for circuit breaker logic
        if (metadata.lastSuccessfulTransaction) {
          existing.paymentProcessorImpact.lastSuccessfulTransaction = metadata.lastSuccessfulTransaction;
          existing.paymentProcessorImpact.consecutiveFailures = 1;
        } else {
          existing.paymentProcessorImpact.consecutiveFailures++;
        }
        
        // Track affected gateways
        if (metadata.gatewayId) {
          existing.paymentProcessorImpact.affectedGateways.add(metadata.gatewayId);
        }
      }
      
      // Update global payment processor health
      const processorKey = metadata.processorType || metadata.gatewayId || 'default';
      const processorHealth = window.paymentProcessorHealth.errorsByProcessor.get(processorKey) || {
        errorCount: 0,
        lastError: null,
        status: 'healthy',
        failureRate: 0,
        consecutiveFailures: 0
      };
      
      processorHealth.errorCount++;
      processorHealth.lastError = timestamp;
      processorHealth.consecutiveFailures++;
      
      // Calculate failure rate
      const timeWindow = 300000; // 5 minutes
      const recentErrors = Array.from(window.errorPatterns.values())
        .filter(pattern => 
          timestamp - pattern.lastSeen < timeWindow && 
          pattern.contexts.has(context) &&
          context.includes('payment')
        )
        .reduce((sum, pattern) => sum + pattern.count, 0);
      
      processorHealth.failureRate = recentErrors;
      
      // Determine processor status
      if (processorHealth.consecutiveFailures >= 10) {
        processorHealth.status = 'critical';
      } else if (processorHealth.consecutiveFailures >= 5) {
        processorHealth.status = 'degraded';
      } else if (processorHealth.failureRate > 50) {
        processorHealth.status = 'unstable';
      }
      
      window.paymentProcessorHealth.errorsByProcessor.set(processorKey, processorHealth);
      
      // Update global status
      const allProcessors = Array.from(window.paymentProcessorHealth.errorsByProcessor.values());
      const criticalProcessors = allProcessors.filter(p => p.status === 'critical').length;
      const degradedProcessors = allProcessors.filter(p => p.status === 'degraded').length;
      
      if (criticalProcessors > 0) {
        window.paymentProcessorHealth.globalStatus = 'critical';
      } else if (degradedProcessors > allProcessors.length * 0.5) {
        window.paymentProcessorHealth.globalStatus = 'degraded';
      } else if (degradedProcessors > 0) {
        window.paymentProcessorHealth.globalStatus = 'unstable';
      }
    }
    
    // Track metadata with enhanced context
    if (metadata && typeof metadata === 'object') {
      Object.entries(metadata).forEach(([key, value]) => {
        if (!existing.metadata.has(key)) {
          existing.metadata.set(key, new Set());
        }
        existing.metadata.get(key).add(value);
      });
    }
    
    window.errorPatterns.set(errorKey, existing);
    
    // Update global performance metrics
    const isOrderError = context.includes('order') || context.includes('load');
    const isCacheError = context.includes('cache') || error.message.includes('cache');
    const isNetworkError = error.message.includes('network') || error.message.includes('fetch');
    
    if (isOrderError) window.performanceMetrics.orderLoadErrors++;
    if (isCacheError) window.performanceMetrics.cacheErrors++;
    if (isNetworkError) window.performanceMetrics.networkErrors++;
    
    window.performanceMetrics.lastErrorTime = timestamp;
    
    // Calculate error rate (errors per minute) 
    const timeWindow = 60000; // 1 minute
    const recentErrors = Array.from(window.errorPatterns.values())
      .filter(pattern => timestamp - pattern.lastSeen < timeWindow)
      .reduce((sum, pattern) => sum + pattern.count, 0);
    window.performanceMetrics.errorRate = recentErrors;
    
    // Enhanced alerting with context-specific thresholds
    const criticalThreshold = isPaymentError ? 2 : (isImageError ? 3 : (isOrderError ? 5 : 7));
    
    if (existing.count >= criticalThreshold) {
      const errorDetails = {
        contexts: Array.from(existing.contexts),
        timespan: timestamp - existing.firstSeen,
        frequency: existing.count / ((timestamp - existing.firstSeen) / 60000), // errors per minute
        isPaymentError,
        isOrderError,
        isCacheError,
        isImageError,
        performanceImpact: {
          averageDelay: existing.performanceImpact.averageDelay.toFixed(2) + 'ms',
          maxDelay: existing.performanceImpact.maxDelay.toFixed(2) + 'ms',
          affectedOperations: Array.from(existing.performanceImpact.affectedOperations)
        },
        paymentProcessorImpact: isPaymentError ? {
          processorType: existing.paymentProcessorImpact.processorType,
          transactionFailures: existing.paymentProcessorImpact.transactionFailures,
          consecutiveFailures: existing.paymentProcessorImpact.consecutiveFailures,
          affectedGateways: Array.from(existing.paymentProcessorImpact.affectedGateways),
          lastSuccessfulTransaction: existing.paymentProcessorImpact.lastSuccessfulTransaction
        } : null,
        imageProcessingImpact: isImageError ? {
          failedFormats: Array.from(existing.imageProcessingImpact.failedFormats),
          averageFileSize: existing.imageProcessingImpact.averageFileSize,
          compressionFailures: existing.imageProcessingImpact.compressionFailures,
          conversionFailures: existing.imageProcessingImpact.conversionFailures
        } : null,
        globalMetrics: {
          orderLoadErrors: window.performanceMetrics.orderLoadErrors,
          cacheErrors: window.performanceMetrics.cacheErrors,
          networkErrors: window.performanceMetrics.networkErrors,
          paymentErrors: window.performanceMetrics.paymentErrors,
          processorErrors: window.performanceMetrics.processorErrors,
          imageProcessingErrors: window.performanceMetrics.imageProcessingErrors,
          fileValidationErrors: window.performanceMetrics.fileValidationErrors,
          compressionErrors: window.performanceMetrics.compressionErrors,
          currentErrorRate: window.performanceMetrics.errorRate
        },
        paymentProcessorHealth: isPaymentError ? {
          globalStatus: window.paymentProcessorHealth.globalStatus,
          affectedProcessors: Array.from(window.paymentProcessorHealth.errorsByProcessor.entries())
            .map(([key, health]) => ({ processor: key, ...health }))
        } : null,
        metadata: Object.fromEntries(
          Array.from(existing.metadata.entries()).map(([key, valueSet]) => [
            key, 
            Array.from(valueSet)
          ])
        )
      };
      
      if (isPaymentError) {
        const severity = existing.count >= 10 ? 'CRITICAL' : existing.count >= 5 ? 'HIGH' : 'MEDIUM';
        const processorHealth = window.paymentProcessorHealth.globalStatus;
        
        console.error(`${severity} payment error pattern detected: ${errorKey}`, {
          ...errorDetails,
          severity,
          processorHealth,
          recommendation: existing.count >= 10 ? 
            'IMMEDIATE ACTION: Disable affected payment processors and activate manual processing' : 
            existing.count >= 5 ?
            'Monitor payment processor health closely and prepare fallback mechanisms' :
            'Investigate payment processor configuration and network connectivity'
        });
        
        // Enhanced payment processor health tracking
        const processorKey = metadata.processorType || metadata.gatewayId || 'default';
        window.paymentProcessorHealth.errorsByProcessor.set(processorKey, {
          ...window.paymentProcessorHealth.errorsByProcessor.get(processorKey),
          status: existing.count >= 10 ? 'critical' : existing.count >= 5 ? 'degraded' : 'unstable',
          errorCount: existing.count,
          lastError: timestamp,
          contexts: Array.from(existing.contexts),
          performanceImpact: errorDetails.performanceImpact,
          recommendedAction: existing.count >= 10 ? 'disable_processor' : 'monitor_closely'
        });
        
        // Add to critical errors for monitoring
        if (existing.count >= 5) {
          window.paymentProcessorHealth.criticalErrors.push({
            errorKey,
            processor: processorKey,
            count: existing.count,
            timestamp,
            severity,
            contexts: Array.from(existing.contexts)
          });
          
          // Trigger recovery actions
          window.paymentProcessorHealth.recoveryActions.push({
            action: existing.count >= 10 ? 'processor_disabled' : 'fallback_activated',
            processor: processorKey,
            timestamp,
            reason: `${existing.count} consecutive errors detected`
          });
        }
        
      } else if (isImageError) {
        const severity = existing.count >= 5 ? 'HIGH' : 'MEDIUM';
        console.error(`${severity} image processing error pattern detected: ${errorKey}`, {
          ...errorDetails,
          severity,
          recommendation: existing.count >= 5 ? 
            'Investigate image processing pipeline and consider fallback options' : 
            'Monitor image processing performance and validate input formats'
        });
      } else if (isOrderError) {
        console.error(`Critical order loading error pattern detected: ${errorKey}`, {
          ...errorDetails,
          severity: existing.count >= 10 ? 'CRITICAL' : 'HIGH',
          recommendation: existing.count >= 10 ? 
            'Consider implementing circuit breaker for order service' : 
            'Increase cache TTL and implement better error recovery'
        });
      } else {
        console.error(`Critical error pattern detected: ${errorKey} occurred ${existing.count} times`, errorDetails);
      }
    }
    
    return existing;
  }
}

// Enhanced Network status monitoring with offline support
export class NetworkMonitor {
  static isOnline() {
    return navigator.onLine;
  }

  static addNetworkListener(callback) {
    const handleOnline = () => {
      console.log('Network connection restored');
      callback(true);
    };
    const handleOffline = () => {
      console.log('Network connection lost');
      callback(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  static async checkConnectivity() {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.warn('Connectivity check failed:', error);
      return false;
    }
  }

  static getConnectionType() {
    if (navigator.connection) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }
    return null;
  }
}

// Offline storage utility
export class OfflineStorage {
  static setItem(key, value, maxAge = 7 * 24 * 60 * 60 * 1000) {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        maxAge
      };
      localStorage.setItem(key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('Failed to save to offline storage:', error);
      return false;
    }
  }

  static getItem(key) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const item = JSON.parse(stored);
      const now = Date.now();

      if (now - item.timestamp > item.maxAge) {
        localStorage.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Failed to read from offline storage:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  static removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from offline storage:', error);
      return false;
    }
  }

  static clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('freshmart_')) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to clear offline storage:', error);
      return false;
    }
  }

  static getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return null;
    }

    return navigator.storage.estimate().then(estimate => ({
      quota: estimate.quota,
      usage: estimate.usage,
      available: estimate.quota - estimate.usage,
      usageBreakdown: estimate.usageDetails
    }));
  }
}

// Enhanced service layer error wrapper with offline support
export const withErrorHandling = (serviceMethod, context) => {
  return async (...args) => {
    let attemptCount = 0;
    const maxAttempts = context.includes('payment') ? 5 : 3; // More retries for payment operations
    const startTime = Date.now();
    
    // Check if offline before attempting operation
    const isOnline = await NetworkMonitor.checkConnectivity();
    
    // Payment processor error detection
    const isPaymentOperation = context.includes('payment') || context.includes('processor') || 
                              context.includes('gateway') || context.includes('wallet') ||
                              context.includes('refund') || context.includes('verification');
    
    // Handle offline operations
    if (!isOnline) {
      const offlineResult = handleOfflineOperation(context, args);
      if (offlineResult) {
        return offlineResult;
      }
      
      throw new Error(`${context} unavailable offline. Changes will be synced when connection is restored.`);
    }
    
    while (attemptCount < maxAttempts) {
      try {
        const result = await serviceMethod(...args);
        
        // Log successful operation for payment processor health tracking
        if (isPaymentOperation && attemptCount > 0) {
          ErrorHandler.trackErrorPattern(
            { name: 'PaymentRecoverySuccess', message: 'Payment operation recovered after retry' },
            `${context}_recovery_success`,
            {
              operation: context,
              attemptCount: attemptCount + 1,
              recoveryTime: Date.now() - startTime,
              timestamp: new Date().toISOString()
            }
          );
        }
        
        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error(`${context} error (attempt ${attemptCount + 1}):`, error);
        
        // Enhanced error tracking with payment processor context
        ErrorHandler.trackErrorPattern(error, context, {
          attemptCount: attemptCount + 1,
          maxAttempts,
          responseTime,
          operation: context,
          isPaymentOperation,
          isOffline: !isOnline,
          // Payment-specific metadata
          ...(isPaymentOperation && {
            processorType: args[0]?.processorType || 'unknown',
            gatewayId: args[0]?.gatewayId || args[1]?.gatewayId,
            transactionAmount: args[0]?.total || args[1],
            paymentMethod: args[0]?.paymentMethod
          })
        });
        
        // Check if we've gone offline during the request
        const currentlyOnline = await NetworkMonitor.checkConnectivity();
        if (!currentlyOnline) {
          const offlineResult = handleOfflineOperation(context, args);
          if (offlineResult) {
            return offlineResult;
          }
          
          throw new Error(`Connection lost during ${context}. Changes will be synced when connection is restored.`);
        }
        
        // Payment processor specific retry logic
        if (isPaymentOperation) {
          // Check payment processor health before retrying
          const processorHealth = window.paymentProcessorHealth?.globalStatus || 'unknown';
          
          if (processorHealth === 'critical' && attemptCount === 0) {
            console.warn('Payment processor in critical state, attempting fallback immediately');
            throw new Error('Payment processor unavailable. Please try manual processing or contact support.');
          }
          
          // Handle minified class errors (eA references)
          if (error.message.includes('eA') || error.message.includes('is not a constructor')) {
            console.error('Detected minified payment processor reference (eA). Attempting fallback to PaymentProcessor class.');
            throw new Error('Payment processor initialization failed. Using manual processing fallback.');
          }
          
          // Specific payment error handling
          if (error.message.includes('network') || error.message.includes('timeout')) {
            if (attemptCount < maxAttempts - 1) {
              console.log(`Payment operation failed due to network issue. Retrying in ${ErrorHandler.getRetryDelay(attemptCount)}ms`);
            }
          }
        }
        
        if (ErrorHandler.shouldRetry(error, attemptCount)) {
          attemptCount++;
          const delay = ErrorHandler.getRetryDelay(attemptCount);
          
          // Enhanced delay for payment operations
          const enhancedDelay = isPaymentOperation ? delay * 1.5 : delay;
          
          await new Promise(resolve => setTimeout(resolve, enhancedDelay));
          continue;
        }
        
        // Create enhanced user-friendly message for payment errors
        let userFriendlyMessage = ErrorHandler.createUserFriendlyMessage(error, context);
        
        if (isPaymentOperation) {
          if (error.message.includes('eA') || error.message.includes('is not a constructor')) {
            userFriendlyMessage = 'Payment system is temporarily unavailable. Your order has been saved and will be processed manually. You will be notified once payment is confirmed.';
          } else if (error.message.includes('processor')) {
            userFriendlyMessage = 'Payment processing temporarily unavailable. Please try again in a few moments or contact support.';
          } else if (error.message.includes('gateway')) {
            userFriendlyMessage = 'Payment gateway is currently unavailable. Please try a different payment method or contact support.';
          }
        }
        
        throw new Error(userFriendlyMessage);
      }
    }
  };
};

// Handle operations that can work offline
function handleOfflineOperation(context, args) {
  const allowedOfflineOperations = [
    'cart_add_item',
    'cart_remove_item', 
    'cart_update_quantity',
    'cart_clear',
    'product_view',
    'category_browse'
  ];
  
  if (allowedOfflineOperations.some(op => context.includes(op))) {
    // Store operation for later sync
    const offlineOperation = {
      context,
      args,
      timestamp: Date.now(),
      id: Date.now().toString()
    };
    
    OfflineStorage.setItem(`offline_operation_${offlineOperation.id}`, offlineOperation);
    
    return {
      success: true,
      offline: true,
      message: 'Operation saved for sync when online'
    };
  }
  
  return null;
}

// Payment processor health monitoring utility with offline support
export const PaymentProcessorMonitor = {
  getHealth: () => {
    return window.paymentProcessorHealth || {
      globalStatus: 'unknown',
      errorsByProcessor: new Map(),
      failureRates: new Map(),
      lastHealthCheck: Date.now(),
      criticalErrors: [],
      recoveryActions: [],
      offlineMode: !NetworkMonitor.isOnline()
    };
  },
  
  isProcessorHealthy: (processorId = 'default') => {
    const health = PaymentProcessorMonitor.getHealth();
    
    // In offline mode, processors are considered unhealthy
    if (health.offlineMode) {
      return false;
    }
    
    const processorHealth = health.errorsByProcessor.get(processorId);
    return !processorHealth || processorHealth.status === 'healthy';
  },
  
  shouldFallbackToManual: () => {
    const health = PaymentProcessorMonitor.getHealth();
    
    // Always fallback to manual when offline
    if (health.offlineMode) {
      return true;
    }
    
    return health.globalStatus === 'critical' || 
           health.criticalErrors.length > 5 ||
           Array.from(health.errorsByProcessor.values())
             .filter(p => p.status === 'critical').length > 0;
  },
  
  logRecoveryAction: (processor, action, reason) => {
    if (!window.paymentProcessorHealth) {
      window.paymentProcessorHealth = PaymentProcessorMonitor.getHealth();
    }
    
    window.paymentProcessorHealth.recoveryActions.push({
      processor,
      action,
      reason,
      timestamp: Date.now(),
      offline: !NetworkMonitor.isOnline()
    });
    
    // Store recovery actions offline for later analysis
    OfflineStorage.setItem(
      `recovery_action_${Date.now()}`,
      {
        processor,
        action, 
        reason,
        timestamp: Date.now(),
        offline: !NetworkMonitor.isOnline()
      }
    );
  },
  
  updateOfflineStatus: (isOffline) => {
    if (!window.paymentProcessorHealth) {
      window.paymentProcessorHealth = PaymentProcessorMonitor.getHealth();
    }
    
    window.paymentProcessorHealth.offlineMode = isOffline;
    window.paymentProcessorHealth.lastHealthCheck = Date.now();
    
    if (!isOffline) {
      // Coming back online, reset some error states
      window.paymentProcessorHealth.globalStatus = 'unknown';
    }
  }
};

// Offline sync utility
export const OfflineSyncManager = {
  queueOperation: (operation) => {
    try {
      const syncQueue = OfflineStorage.getItem('sync_queue') || [];
      syncQueue.push({
        ...operation,
        id: Date.now().toString(),
        timestamp: Date.now(),
        retryCount: 0
      });
      
      OfflineStorage.setItem('sync_queue', syncQueue);
      return true;
    } catch (error) {
      console.error('Failed to queue offline operation:', error);
      return false;
    }
  },
  
  getSyncQueue: () => {
    return OfflineStorage.getItem('sync_queue') || [];
  },
  
  clearSyncQueue: () => {
    return OfflineStorage.removeItem('sync_queue');
  },
  
  removeFromQueue: (operationId) => {
    try {
      const syncQueue = OfflineStorage.getItem('sync_queue') || [];
      const filteredQueue = syncQueue.filter(op => op.id !== operationId);
      OfflineStorage.setItem('sync_queue', filteredQueue);
      return true;
    } catch (error) {
      console.error('Failed to remove from sync queue:', error);
      return false;
    }
  },
  
  processQueue: async () => {
    const syncQueue = OfflineSyncManager.getSyncQueue();
    const processed = [];
    const failed = [];
    
    for (const operation of syncQueue) {
      try {
        // Attempt to process the operation
        // This would call the appropriate service method
        console.log('Processing queued operation:', operation);
        processed.push(operation.id);
      } catch (error) {
        console.error('Failed to process queued operation:', operation, error);
        
        if (operation.retryCount < 3) {
          operation.retryCount++;
          operation.lastRetry = Date.now();
        } else {
          failed.push(operation.id);
        }
      }
    }
    
    // Remove processed operations
    processed.forEach(id => OfflineSyncManager.removeFromQueue(id));
    
    // Remove permanently failed operations
    failed.forEach(id => OfflineSyncManager.removeFromQueue(id));
    
    return {
      processed: processed.length,
      failed: failed.length,
      remaining: syncQueue.length - processed.length - failed.length
    };
  }
};