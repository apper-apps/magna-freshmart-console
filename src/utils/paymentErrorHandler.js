/**
 * Payment Error Handler Utility
 * Provides centralized error handling for payment processor issues
 */

export class PaymentProcessorError extends Error {
  constructor(message, processorType = 'unknown', originalError = null) {
    super(message);
    this.name = 'PaymentProcessorError';
    this.processorType = processorType;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

export const validatePaymentProcessor = (ProcessorClass, processorName = 'PaymentProcessor') => {
  if (!ProcessorClass) {
    throw new PaymentProcessorError(
      `${processorName} class is not available. Please check imports and dependencies.`,
      processorName
    );
  }
  
  if (typeof ProcessorClass !== 'function') {
    throw new PaymentProcessorError(
      `${processorName} is not a constructor function. Expected a class or constructor.`,
      processorName
    );
  }
  
  return true;
};

export const createPaymentProcessor = (ProcessorClass, order, processorName = 'PaymentProcessor') => {
  try {
    validatePaymentProcessor(ProcessorClass, processorName);
    
    if (!order) {
      throw new PaymentProcessorError(
        'Order data is required to create payment processor',
        processorName
      );
    }
    
    return new ProcessorClass(order);
  } catch (error) {
    if (error instanceof PaymentProcessorError) {
      throw error;
    }
    
    throw new PaymentProcessorError(
      `Failed to create ${processorName}: ${error.message}`,
      processorName,
      error
    );
  }
};

export const handlePaymentProcessorError = (error, fallbackMessage = 'Payment processing failed') => {
  console.error('Payment Processor Error:', error);
  
  if (error instanceof PaymentProcessorError) {
    return {
      success: false,
      error: error.message,
      processorType: error.processorType,
      timestamp: error.timestamp,
      canRetry: true
    };
  }
  
  return {
    success: false,
    error: fallbackMessage,
    originalError: error.message,
    canRetry: false
  };
};

export const PAYMENT_PROCESSOR_TYPES = {
  JAZZCASH: 'JazzCashProcessor',
  EASYPAISA: 'EasyPaisaProcessor',
  BANK_TRANSFER: 'BankTransferProcessor',
  CARD: 'CardProcessor'
};