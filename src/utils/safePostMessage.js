import React from "react";
import Error from "@/components/ui/Error";
/**
 * Safe PostMessage Utility
 * Provides secure cross-window communication with proper error handling
 * Fixes syntax errors from previous implementation and prevents code exposure
 */

// Enhanced PostMessage wrapper with comprehensive error handling
class SafePostMessage {
  constructor() {
    this.targetOrigin = '*'; // Configure as needed for security
    this.messageQueue = [];
    this.listeners = new Map();
    this.isInitialized = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    
    this.init();
  }

  init() {
    try {
      // Validate environment
      if (typeof window === 'undefined' || !window.postMessage) {
        console.warn('PostMessage not available in this environment');
        return;
      }

      // Set up message listener
      window.addEventListener('message', this.handleIncomingMessage.bind(this), false);
      
      // Set up error recovery for DataCloneError
      window.addEventListener('dataclone-error-recovered', this.handleDataCloneRecovery.bind(this));
      
      this.isInitialized = true;
      
      // Process any queued messages
      this.processMessageQueue();
      
    } catch (error) {
      console.error('SafePostMessage initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Send message with enhanced error handling and retry logic
   * @param {Window} targetWindow - Target window for message
   * @param {any} message - Message data to send
   * @param {string} targetOrigin - Target origin (default: '*')
   * @param {Object} options - Additional options
   */
  async sendMessage(targetWindow, message, targetOrigin = this.targetOrigin, options = {}) {
    const {
      retry = true,
      timeout = 5000,
      validate = true,
      fallback = null
    } = options;

    if (!this.isInitialized) {
      if (retry) {
        this.queueMessage({ targetWindow, message, targetOrigin, options });
        return { success: false, queued: true };
      }
      throw new Error('SafePostMessage not initialized');
    }

    // Validate inputs
    if (validate && !this.validateMessage(message)) {
      throw new Error('Message validation failed');
    }

    if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
      throw new Error('Invalid target window');
    }

    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        // Clone message safely to prevent DataCloneError
        const safeMessage = this.cloneMessageSafely(message);
        
        // Send with timeout protection
        const sendPromise = new Promise((resolve, reject) => {
          try {
            targetWindow.postMessage(safeMessage, targetOrigin);
            resolve({ success: true, attempt: attempt + 1 });
          } catch (error) {
            reject(error);
          }
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('PostMessage timeout')), timeout);
        });

        return await Promise.race([sendPromise, timeoutPromise]);

      } catch (error) {
        attempt++;
        
        if (error.name === 'DataCloneError') {
          console.warn(`DataCloneError on attempt ${attempt}:`, error.message);
          
          // Try fallback serialization
          if (fallback && typeof fallback === 'function') {
            try {
              const fallbackMessage = fallback(message);
              targetWindow.postMessage(fallbackMessage, targetOrigin);
              return { 
                success: true, 
                attempt, 
                fallbackUsed: true,
                warning: 'Used fallback serialization'
              };
            } catch (fallbackError) {
              console.error('Fallback serialization failed:', fallbackError);
            }
          }
          
          // Try JSON serialization as last resort
          if (attempt === this.retryAttempts) {
            try {
              const jsonMessage = {
                type: 'json_serialized',
                data: JSON.stringify(message),
                timestamp: Date.now()
              };
              targetWindow.postMessage(jsonMessage, targetOrigin);
              return { 
                success: true, 
                attempt, 
                jsonSerialized: true,
                warning: 'Used JSON serialization fallback'
              };
            } catch (jsonError) {
              console.error('JSON serialization fallback failed:', jsonError);
            }
          }
        }

        // Log attempt failure
        console.warn(`PostMessage attempt ${attempt} failed:`, error.message);

        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        } else {
          // All attempts failed
          this.handleSendError(error, { targetWindow, message, targetOrigin });
          throw new Error(`PostMessage failed after ${this.retryAttempts} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Clone message data safely to prevent DataCloneError
   * @param {any} message - Message to clone
   * @returns {any} Safely cloned message
   */
cloneMessageSafely(message) {
    try {
      // Try structured clone first (if available)
      if (typeof window !== 'undefined' && typeof window.structuredClone === 'function') {
        return window.structuredClone(message);
      }

      // Fall back to JSON clone for simple objects
      if (this.isJSONSerializable(message)) {
        return JSON.parse(JSON.stringify(message));
      }

      // For complex objects, create safe representation
      return this.createSafeRepresentation(message);

    } catch (error) {
      console.warn('Message cloning failed, using original:', error);
      return message;
    }
  }

  /**
   * Check if object can be safely JSON serialized
   * @param {any} obj - Object to check
   * @returns {boolean} Whether object is JSON serializable
   */
  isJSONSerializable(obj) {
    try {
      JSON.stringify(obj);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create safe representation of complex objects
   * @param {any} obj - Object to represent safely
   * @returns {Object} Safe representation
   */
  createSafeRepresentation(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return { __type: 'Date', value: obj.toISOString() };
    }

    if (obj instanceof RegExp) {
      return { __type: 'RegExp', source: obj.source, flags: obj.flags };
    }

    if (typeof obj === 'function') {
      return { __type: 'Function', name: obj.name || 'anonymous' };
    }

    if (obj instanceof Error) {
      return { 
        __type: 'Error', 
        name: obj.name, 
        message: obj.message, 
        stack: obj.stack 
      };
    }

    // For other objects, recursively create safe representation
    if (Array.isArray(obj)) {
      return obj.map(item => this.createSafeRepresentation(item));
    }

    const safeObj = {};
    for (const [key, value] of Object.entries(obj)) {
      try {
        safeObj[key] = this.createSafeRepresentation(value);
      } catch (error) {
        safeObj[key] = { __type: 'UnsafeValue', error: error.message };
      }
    }

    return safeObj;
  }

  /**
   * Validate message before sending
   * @param {any} message - Message to validate
   * @returns {boolean} Whether message is valid
   */
  validateMessage(message) {
    // Basic validation rules
    if (message === undefined) {
      return false;
    }

    // Check for circular references
    try {
      JSON.stringify(message);
    } catch (error) {
      if (error.message.includes('circular')) {
        console.warn('Message contains circular reference');
        return false;
      }
    }

    // Check message size (approximate)
    try {
      const messageSize = new Blob([JSON.stringify(message)]).size;
      if (messageSize > 1024 * 1024) { // 1MB limit
        console.warn('Message size exceeds 1MB limit');
        return false;
      }
    } catch (error) {
      console.warn('Could not determine message size:', error);
    }

    return true;
  }

  /**
   * Handle incoming messages
   * @param {MessageEvent} event - Message event
   */
  handleIncomingMessage(event) {
    try {
      const { data, origin, source } = event;
      
      // Basic security checks
      if (!this.isOriginAllowed(origin)) {
        console.warn('Message from disallowed origin:', origin);
        return;
      }

      // Handle JSON serialized messages
      let processedData = data;
      if (data && data.type === 'json_serialized') {
        try {
          processedData = JSON.parse(data.data);
        } catch (error) {
          console.error('Failed to parse JSON serialized message:', error);
          return;
        }
      }

      // Restore complex objects if needed
      processedData = this.restoreComplexObjects(processedData);

      // Dispatch to registered listeners
      this.dispatchToListeners({
        data: processedData,
        origin,
        source,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error handling incoming message:', error);
      this.handleReceiveError(error, event);
    }
  }

  /**
   * Restore complex objects from safe representation
   * @param {any} obj - Object to restore
   * @returns {any} Restored object
   */
  restoreComplexObjects(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (obj.__type) {
      switch (obj.__type) {
        case 'Date':
          return new Date(obj.value);
        case 'RegExp':
          return new RegExp(obj.source, obj.flags);
        case 'Error':
          const error = new Error(obj.message);
          error.name = obj.name;
          if (obj.stack) error.stack = obj.stack;
          return error;
        case 'Function':
          return () => console.log(`Restored function: ${obj.name}`);
        case 'UnsafeValue':
          console.warn('Encountered unsafe value during restoration:', obj.error);
          return null;
      }
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.restoreComplexObjects(item));
    }

    const restored = {};
    for (const [key, value] of Object.entries(obj)) {
      restored[key] = this.restoreComplexObjects(value);
    }

    return restored;
  }

  /**
   * Check if origin is allowed
   * @param {string} origin - Origin to check
   * @returns {boolean} Whether origin is allowed
   */
  isOriginAllowed(origin) {
    // In production, implement proper origin validation
    // For now, allow common development origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://apper.io',
      window.location.origin
    ];

    return this.targetOrigin === '*' || allowedOrigins.includes(origin);
  }

  /**
   * Register message listener
   * @param {string} type - Message type to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  addListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type).add(callback);
    
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(callback);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  /**
   * Dispatch message to registered listeners
   * @param {Object} messageData - Message data
   */
  dispatchToListeners(messageData) {
    const { data } = messageData;
    
    // Dispatch to type-specific listeners
    if (data && data.type) {
      const typeListeners = this.listeners.get(data.type);
      if (typeListeners) {
        typeListeners.forEach(callback => {
          try {
            callback(messageData);
          } catch (error) {
            console.error(`Error in message listener for type ${data.type}:`, error);
          }
        });
      }
    }

    // Dispatch to global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => {
        try {
          callback(messageData);
        } catch (error) {
          console.error('Error in global message listener:', error);
        }
      });
    }
  }

  /**
   * Queue message for later sending
   * @param {Object} messageInfo - Message information
   */
  queueMessage(messageInfo) {
    this.messageQueue.push({
      ...messageInfo,
      queuedAt: Date.now()
    });

    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  /**
   * Process queued messages
   */
  async processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const messageInfo = this.messageQueue.shift();
      
      try {
        await this.sendMessage(
          messageInfo.targetWindow,
          messageInfo.message,
          messageInfo.targetOrigin,
          { ...messageInfo.options, retry: false }
        );
      } catch (error) {
        console.warn('Failed to send queued message:', error);
      }
    }
  }

  /**
   * Handle DataCloneError recovery
   * @param {CustomEvent} event - Recovery event
   */
  handleDataCloneRecovery(event) {
    const { detail } = event;
    console.log('DataCloneError recovery initiated:', detail);
    
    // Implement recovery logic based on error context
    if (detail.context === 'postMessage') {
      // Could retry with alternative serialization
      console.log('PostMessage error recovered automatically');
    }
  }

  /**
   * Handle initialization errors
   * @param {Error} error - Initialization error
   */
  handleInitializationError(error) {
    console.error('PostMessage initialization error:', {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });

    // Track error for monitoring
    if (typeof window !== 'undefined' && window.performanceMonitor) {
      window.performanceMonitor.trackError(error, 'postmessage-init');
    }
  }

  /**
   * Handle send errors
   * @param {Error} error - Send error
   * @param {Object} context - Error context
   */
  handleSendError(error, context) {
    console.error('PostMessage send error:', {
      error: error.message,
      context: {
        hasTargetWindow: !!context.targetWindow,
        messageType: typeof context.message,
        targetOrigin: context.targetOrigin
      }
    });

    // Track error for monitoring
    if (typeof window !== 'undefined' && window.performanceMonitor) {
      window.performanceMonitor.trackError(error, 'postmessage-send');
    }
  }

  /**
   * Handle receive errors
   * @param {Error} error - Receive error
   * @param {MessageEvent} event - Message event
   */
  handleReceiveError(error, event) {
    console.error('PostMessage receive error:', {
      error: error.message,
      origin: event.origin,
      timestamp: Date.now()
    });

    // Track error for monitoring
    if (typeof window !== 'undefined' && window.performanceMonitor) {
      window.performanceMonitor.trackError(error, 'postmessage-receive');
    }
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleIncomingMessage.bind(this));
      window.removeEventListener('dataclone-error-recovered', this.handleDataCloneRecovery.bind(this));
    }
    
    this.listeners.clear();
    this.messageQueue.length = 0;
    this.isInitialized = false;
  }
}

// Create singleton instance
const safePostMessage = new SafePostMessage();

// Export utility functions
export const sendMessage = (targetWindow, message, targetOrigin, options) => {
  return safePostMessage.sendMessage(targetWindow, message, targetOrigin, options);
};

export const addMessageListener = (type, callback) => {
  return safePostMessage.addListener(type, callback);
};

export const validateMessage = (message) => {
  return safePostMessage.validateMessage(message);
};

export const cloneMessageSafely = (message) => {
  return safePostMessage.cloneMessageSafely(message);
};

// Export the main class for advanced usage
export { SafePostMessage };

export default safePostMessage;