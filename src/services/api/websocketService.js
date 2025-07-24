import React from "react";
import Error from "@/components/ui/Error";
class WebSocketService {
  constructor() {
    this.connection = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
  }

// Initialize WebSocket connection
  async connect(url = 'ws://localhost:8080/api/ws') {
    if (this.isConnecting || (this.connection && this.connection.readyState === WebSocket.OPEN)) {
      return this.getConnectionStatus();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // For demo purposes, simulate WebSocket connection
        // In production, this would be a real WebSocket connection to your Node.js backend
        this.connection = this.createMockWebSocket();
        
        this.connection.onopen = () => {
          console.log('WebSocket connected successfully');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          // Notify listeners of connection status
          this.notifyListeners('connection_status', { connected: true, timestamp: new Date().toISOString() });
          
          resolve(this.getConnectionStatus());
        };

        this.connection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.connection.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          
          // Notify listeners of disconnection
          this.notifyListeners('connection_status', { connected: false, timestamp: new Date().toISOString() });
          
          // Attempt reconnection if not intentionally closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
this.connection.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          
          // Safely serialize error object to prevent DataCloneError
          const safeErrorData = this.serializeErrorSafely(error);
          this.notifyListeners('connection_error', { 
            error: safeErrorData, 
            timestamp: new Date().toISOString() 
          });
          
          // Reject with safe error object
          reject(this.serializeErrorSafely(error));
        };

} catch (error) {
        this.isConnecting = false;
        reject(this.serializeErrorSafely(error));
      }
    });
  }

  // Create mock WebSocket for demo purposes
  createMockWebSocket() {
    const mockWS = {
      readyState: 1, // OPEN
      send: (data) => {
        console.log('Sending WebSocket message:', data);
      },
      close: () => {
        console.log('Closing mock WebSocket');
        if (mockWS.onclose) {
          mockWS.onclose({ code: 1000, reason: 'Normal closure' });
        }
      }
    };

    // Simulate connection opening
    setTimeout(() => {
      if (mockWS.onopen) {
        mockWS.onopen();
      }
    }, 100);

    // Simulate periodic messages for demo
    this.startMockMessages(mockWS);

    return mockWS;
  }

// Enhanced mock message simulation with payment flow updates
  startMockMessages(mockWS) {
    const messageTypes = [
      'approval_request_submitted',
      'approval_status_changed',
      'approval_comment_added',
      'price-approvals',
      'payment_flow_update',
      'vendor_payment_processed',
      'admin_payment_confirmed',
      'payment_proof_uploaded',
      'amount_auto_matched',
      'vendor_payment_confirmed',
      'system_notification'
    ];

    setInterval(() => {
      if (mockWS.readyState === 1 && Math.random() > 0.7) {
        const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
        const mockMessage = this.generateMockMessage(messageType);
        
        if (mockWS.onmessage) {
          mockWS.onmessage({ data: JSON.stringify(mockMessage) });
        }
      }
    }, 15000); // Every 15 seconds
  }

// Enhanced mock message generation with payment flow updates
  generateMockMessage(type) {
    const baseMessage = {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type
    };

    switch (type) {
      case 'approval_request_submitted':
        return {
          ...baseMessage,
          data: {
            requestId: Math.floor(Math.random() * 1000) + 100,
            title: 'New approval request submitted',
            submittedBy: 'vendor_user',
            priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
          }
        };

      case 'approval_status_changed':
        return {
          ...baseMessage,
          data: {
requestId: Math.floor(Math.random() * 10) + 1,
            status: ['approved', 'rejected'][Math.floor(Math.random() * 2)],
            actionBy: 'admin_user'
          }
        };
      case 'price-approvals':
        return {
          ...baseMessage,
          data: {
            orderId: Math.floor(Math.random() * 100) + 1,
            requestId: Math.floor(Math.random() * 1000) + 100,
            status: ['approved', 'pending', 'rejected'][Math.floor(Math.random() * 3)],
            approvedBy: 'price_admin',
            priceChange: Math.floor(Math.random() * 1000) + 100,
            comments: 'Price approval processed automatically'
          }
        };

      // Enhanced Payment Flow Messages
      case 'payment_flow_update':
        return {
          ...baseMessage,
          data: {
            orderId: Math.floor(Math.random() * 100) + 1,
            flowStage: ['vendor_processed', 'admin_paid', 'proof_uploaded', 'amount_matched', 'vendor_confirmed'][Math.floor(Math.random() * 5)],
            amount: Math.floor(Math.random() * 5000) + 500,
            vendor: 'Fresh Foods Co.',
            status: 'updated'
          }
        };

      case 'vendor_payment_processed':
        return {
          ...baseMessage,
          data: {
            orderId: Math.floor(Math.random() * 100) + 1,
            vendorId: Math.floor(Math.random() * 3) + 1,
            amount: Math.floor(Math.random() * 5000) + 500,
            paymentMethod: ['jazzcash', 'easypaisa', 'bank'][Math.floor(Math.random() * 3)],
            timestamp: new Date().toISOString(),
            status: 'processed'
          }
        };

      case 'admin_payment_confirmed':
        return {
          ...baseMessage,
          data: {
            orderId: Math.floor(Math.random() * 100) + 1,
            adminId: 'admin_1',
            amount: Math.floor(Math.random() * 5000) + 500,
            proofUploaded: true,
            timestamp: new Date().toISOString(),
            status: 'confirmed'
          }
        };

      case 'payment_proof_uploaded':
        return {
          ...baseMessage,
          data: {
            orderId: Math.floor(Math.random() * 100) + 1,
            fileName: 'payment_proof_' + Date.now() + '.jpg',
            uploadedBy: 'admin_1',
            timestamp: new Date().toISOString(),
            status: 'uploaded'
          }
        };

      case 'amount_auto_matched':
        return {
          ...baseMessage,
          data: {
            orderId: Math.floor(Math.random() * 100) + 1,
            vendorAmount: Math.floor(Math.random() * 5000) + 500,
            adminAmount: Math.floor(Math.random() * 5000) + 500,
            matched: true,
            tolerance: 0.01,
            timestamp: new Date().toISOString()
          }
        };

      case 'vendor_payment_confirmed':
        return {
          ...baseMessage,
          data: {
            orderId: Math.floor(Math.random() * 100) + 1,
            vendorId: Math.floor(Math.random() * 3) + 1,
            confirmationMethod: 'receipt_verification',
            timestamp: new Date().toISOString(),
            status: 'confirmed'
          }
        };

      case 'approval_comment_added':
        return {
          ...baseMessage,
          data: {
            requestId: Math.floor(Math.random() * 10) + 1,
            commentBy: 'reviewer_user',
            preview: 'New comment added to approval request'
          }
        };

      case 'system_notification':
        return {
          ...baseMessage,
          data: {
            message: 'System maintenance scheduled for tonight',
            severity: 'info'
          }
        };

      default:
        return baseMessage;
    }
  }

  // Handle incoming WebSocket messages
  handleMessage(message) {
    console.log('Received WebSocket message:', message);

    // Route message to appropriate listeners
    const { type, data } = message;
    
    // Update last heartbeat if it's a heartbeat message
    if (type === 'heartbeat') {
      this.lastHeartbeat = new Date().toISOString();
      return;
    }

    // Notify all listeners
    this.notifyListeners(type, data);
    
    // Notify generic message listeners
    this.notifyListeners('message', message);
  }

  // Subscribe to specific message types
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  // Notify listeners of specific event type
  notifyListeners(eventType, data) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Send message through WebSocket
  send(message) {
    if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      this.connection.send(messageString);
      return true;
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }
  }

  // Send heartbeat to maintain connection
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connection && this.connection.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat', timestamp: new Date().toISOString() });
      }
    }, 30000); // Every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Schedule reconnection attempt
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(error => {
          console.error('Reconnection attempt failed:', error);
        });
      } else {
console.error('Max reconnection attempts reached, giving up');
        this.notifyListeners('connection_failed', {
          reason: 'Max reconnection attempts exceeded',
          attempts: this.reconnectAttempts 
        });
      }
    }, delay);
  }

serializeErrorSafely(error) {
    if (!error) return { __type: 'NullError', timestamp: new Date().toISOString() };
    
    // Enhanced error serialization with comprehensive circular reference handling
    try {
      // Handle Error instances with comprehensive property extraction
      if (error instanceof Error) {
        const errorData = {
          __type: 'Error',
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
          fileName: error.fileName,
          lineNumber: error.lineNumber,
          columnNumber: error.columnNumber,
          timestamp: new Date().toISOString()
        };
        
// Add any custom properties that might exist on the error
        for (const key in error) {
          if (!Object.prototype.hasOwnProperty.call(errorData, key) && Object.prototype.hasOwnProperty.call(error, key)) {
            try {
              const value = error[key];
              if (typeof value !== 'function' && !(value instanceof Node)) {
                JSON.stringify(value); // Test if serializable
                errorData[key] = value;
              }
            } catch (propError) {
              errorData[key] = String(error[key]);
            }
          }
        }
        return errorData;
      }
      
      // Handle DOM events or other non-serializable objects
      if (error.target && error.type) {
        return {
          __type: 'DOMEvent',
          eventType: error.type,
          targetType: error.target.constructor.name,
          bubbles: error.bubbles,
          cancelable: error.cancelable,
          timestamp: new Date().toISOString()
        };
      }

      // Enhanced circular reference handling for complex objects
      if (typeof error === 'object' && error !== null) {
        const serialized = { __type: 'ComplexObject' };
        const seen = new WeakSet();
        const pathStack = [];
        let depth = 0;
        const maxDepth = 20;
        
        const serializeValue = (value, key = '', currentPath = []) => {
          depth++;
          if (depth > maxDepth) {
            return { __type: 'MaxDepthExceeded', path: currentPath.slice() };
          }
          
          // Handle circular references with path tracking
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              depth--;
              return { 
                __type: 'CircularReference', 
                key,
                path: currentPath.slice(),
                objectType: Object.prototype.toString.call(value)
              };
            }
            seen.add(value);
          }
          
          let result;
          
          // Handle special object types
          if (value instanceof URL) {
            result = {
              __type: 'URL',
              href: value.href,
              origin: value.origin,
              pathname: value.pathname
            };
          }
          else if (value instanceof Date) {
            result = {
              __type: 'Date',
              iso: value.toISOString(),
              timestamp: value.getTime()
            };
          }
          else if (value instanceof RegExp) {
            result = {
              __type: 'RegExp',
              source: value.source,
              flags: value.flags
            };
          }
          else if (value instanceof Error) {
            result = this.serializeErrorSafely(value); // Recursive call for nested errors
          }
          else if (typeof value === 'function') {
            result = {
              __type: 'Function',
              name: value.name || 'anonymous',
              length: value.length
            };
          }
          else if (typeof value === 'symbol') {
            result = {
              __type: 'Symbol',
              description: value.description
            };
          }
          else if (typeof value === 'bigint') {
            result = {
              __type: 'BigInt',
              value: value.toString()
            };
          }
          else if (value === undefined) {
            result = { __type: 'Undefined' };
          }
          else if (value instanceof Node) {
            result = {
              __type: 'DOMNode',
              nodeName: value.nodeName,
              nodeType: value.nodeType
            };
          }
          else if (Array.isArray(value)) {
            result = value.map((item, index) => {
              try {
                return serializeValue(item, `[${index}]`, [...currentPath, `[${index}]`]);
              } catch (itemError) {
                return {
                  __type: 'ArrayItemError',
                  index,
                  error: itemError.message
                };
              }
            });
          }
          else if (typeof value === 'object' && value !== null) {
            result = {};
for (const objKey in value) {
              if (Object.prototype.hasOwnProperty.call(value, objKey)) {
                try {
                  result[objKey] = serializeValue(value[objKey], objKey, [...currentPath, objKey]);
                } catch (propError) {
                  result[objKey] = {
                    __type: 'PropertyError',
                    key: objKey,
                    error: propError.message,
                    fallback: String(value[objKey])
                  };
                }
              }
            }
          }
          else {
            // Primitive value - test if it can be JSON serialized
            try {
              JSON.stringify(value);
              result = value;
            } catch (jsonError) {
              result = {
                __type: 'NonSerializablePrimitive',
                value: String(value),
                originalType: typeof value
              };
            }
          }
          
          depth--;
          return result;
        };
        
// Serialize all enumerable properties
        for (const key in error) {
          if (Object.prototype.hasOwnProperty.call(error, key)) {
            try {
              serialized[key] = serializeValue(error[key], key, [key]);
            } catch (keyError) {
              serialized[key] = {
                __type: 'KeySerializationError',
                key,
                error: keyError.message,
                fallback: String(error[key])
              };
            }
          }
        }
        serialized.timestamp = new Date().toISOString();
        serialized.objectPrototype = Object.prototype.toString.call(error);
        return serialized;
      }
      
      // For primitive values, ensure they're JSON serializable
      try {
        JSON.stringify(error);
        return {
          __type: 'Primitive',
          value: error,
          dataType: typeof error,
          timestamp: new Date().toISOString()
        };
      } catch (primitiveError) {
        return {
          __type: 'NonSerializablePrimitive',
          value: String(error),
          dataType: typeof error,
          serializationError: primitiveError.message,
          timestamp: new Date().toISOString()
        };
      }
    } catch (criticalError) {
      console.error('Critical serialization failure in serializeErrorSafely:', criticalError);
      return {
        __type: 'CriticalSerializationError',
        originalError: String(error),
        serializationError: criticalError.message,
        timestamp: new Date().toISOString(),
        recoveryAttempted: true
      };
    }
  }
// Comprehensive message serialization with enhanced circular reference handling
  serializeMessageSafely(message) {
    if (!message) return null;
    
    // Enhanced message serialization with multiple recovery layers
    const primaryMessageSerialize = (message) => {
      try {
if (typeof message !== 'object' || message === null) {
          // Test if primitive can be cloned (with fallback for environments without structuredClone)
          try {
            if (typeof structuredClone !== 'undefined') {
              structuredClone(message);
            } else {
              // Fallback for environments without structuredClone
              JSON.parse(JSON.stringify(message));
            }
            return message;
          } catch (cloneError) {
            return {
              __type: 'NonCloneablePrimitive',
              value: String(message),
              originalType: typeof message
            };
          }
        }
        
        // Enhanced circular reference detection with comprehensive tracking
        // Enhanced circular reference detection with comprehensive tracking
        const seen = new WeakSet();
        const pathTracker = [];
        let depth = 0;
        const maxDepth = 50;
        
        const serialize = (value, key = '', currentPath = []) => {
          depth++;
          if (depth > maxDepth) {
            return {
              __type: 'MaxDepthExceeded',
              depth,
              path: currentPath.slice(),
              key
            };
          }
          
          // Track current path for detailed circular reference reporting
          if (key) pathTracker.push(key);
          
          // Enhanced circular reference detection
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              depth--;
              const circularRef = {
                __type: 'CircularReference',
                key,
                path: currentPath.slice(),
                objectType: Object.prototype.toString.call(value),
                detectedAt: Date.now()
              };
              if (key) pathTracker.pop();
              return circularRef;
            }
            seen.add(value);
          }
          
          let result;
          
          // Handle URL objects (primary cause of DataCloneError)
          if (value instanceof URL) {
            result = {
              __type: 'URL',
              href: value.href,
              origin: value.origin,
              pathname: value.pathname,
              search: value.search,
              hash: value.hash,
              protocol: value.protocol,
              hostname: value.hostname,
              port: value.port,
              username: value.username,
              password: '[REDACTED]' // Security: don't serialize passwords
            };
          }
          // Handle URLSearchParams
          else if (value instanceof URLSearchParams) {
            result = {
              __type: 'URLSearchParams',
              params: Array.from(value.entries()),
              toString: value.toString(),
              size: value.size || Array.from(value.entries()).length
            };
          }
          // Handle Date objects
          else if (value instanceof Date) {
            result = {
              __type: 'Date',
              iso: value.toISOString(),
              timestamp: value.getTime(),
              valid: !isNaN(value.getTime()),
              timezone: value.getTimezoneOffset()
            };
          }
          // Handle RegExp objects
          else if (value instanceof RegExp) {
            result = {
              __type: 'RegExp',
              source: value.source,
              flags: value.flags,
              global: value.global,
              ignoreCase: value.ignoreCase,
              multiline: value.multiline,
              dotAll: value.dotAll,
              unicode: value.unicode,
              sticky: value.sticky
            };
          }
          // Handle Error objects using existing safe method
else if (value instanceof Error) {
            result = this.serializeErrorSafely(value);
          }
// Handle File objects (common in forms) - with environment check
          else if (typeof File !== 'undefined' && value instanceof File) {
            result = {
              __type: 'File',
              name: value.name,
              size: value.size,
              type: value.type,
              lastModified: value.lastModified
            };
          }
          // Handle Blob objects - with environment check
          else if (typeof Blob !== 'undefined' && value instanceof Blob) {
            result = {
              __type: 'Blob',
              size: value.size,
              type: value.type
            };
          }
          // Handle functions
          else if (typeof value === 'function') {
            result = {
              __type: 'Function',
              name: value.name || 'anonymous',
              length: value.length,
              toString: value.toString().substring(0, 200) + '...'
            };
          }
          // Handle Symbol
          else if (typeof value === 'symbol') {
            result = {
              __type: 'Symbol',
              description: value.description,
              toString: value.toString()
            };
          }
          // Handle BigInt
          else if (typeof value === 'bigint') {
            result = {
              __type: 'BigInt',
              value: value.toString(),
              valueOf: Number(value)
            };
          }
          // Handle undefined explicitly
          else if (value === undefined) {
            result = { __type: 'Undefined' };
          }
          // Handle DOM nodes
          else if (value instanceof Node) {
            result = {
              __type: 'DOMNode',
              nodeName: value.nodeName,
              nodeType: value.nodeType,
              tagName: value.tagName,
              id: value.id,
              className: value.className
            };
}
// Handle Window objects - with proper environment checks
          else if (typeof window !== 'undefined' && typeof Window !== 'undefined' && value instanceof Window) {
            result = {
              __type: 'Window',
              origin: value.origin,
              closed: value.closed
            };
          }
          // Handle arrays
          else if (Array.isArray(value)) {
            result = [];
            for (let i = 0; i < value.length; i++) {
              try {
                result[i] = serialize(value[i], `[${i}]`, [...currentPath, `[${i}]`]);
              } catch (itemError) {
                result[i] = {
                  __type: 'ArrayItemError',
                  index: i,
                  error: itemError.message,
                  fallback: String(value[i])
                };
              }
            }
          }
          // Handle plain objects and other object types
          else if (typeof value === 'object' && value !== null) {
            result = {};
            
            // Add object metadata
            result.__objectType = Object.prototype.toString.call(value);
            result.__constructor = value.constructor?.name;
            
for (const objKey in value) {
              if (Object.prototype.hasOwnProperty.call(value, objKey)) {
                try {
                  result[objKey] = serialize(value[objKey], objKey, [...currentPath, objKey]);
                } catch (propError) {
                  result[objKey] = {
                    __type: 'PropertyError',
                    key: objKey,
                    error: propError.message,
                    fallback: String(value[objKey])
                  };
                }
              }
            }
          }
else {
            // Handle primitive values with clone test (with fallback)
            try {
              if (typeof structuredClone !== 'undefined') {
                structuredClone(value);
              } else {
                // Fallback for environments without structuredClone
                JSON.parse(JSON.stringify(value));
              }
              result = value;
            } catch (cloneError) {
              result = {
                __type: 'NonCloneablePrimitive',
                value: String(value),
                originalType: typeof value,
                cloneError: cloneError.message
              };
            }
          }
          // Remove key from path tracker
          if (key) pathTracker.pop();
          depth--;
          
          return result;
        };
        
        return serialize(message);
      } catch (error) {
        throw error; // Let fallback mechanisms handle it
      }
    };

    // JSON stringify fallback with circular reference handling
    const jsonStringifyFallback = (message) => {
      try {
        const seen = new WeakSet();
        return JSON.parse(JSON.stringify(message, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return { __type: 'CircularReference', key };
            }
            seen.add(value);
          }
          
          // Handle special types in JSON.stringify
          if (value instanceof URL) return { __type: 'URL', href: value.href };
          if (value instanceof Date) return { __type: 'Date', iso: value.toISOString() };
          if (value instanceof RegExp) return { __type: 'RegExp', source: value.source, flags: value.flags };
          if (value instanceof Error) return { __type: 'Error', message: value.message, name: value.name };
          if (typeof value === 'function') return { __type: 'Function', name: value.name || 'anonymous' };
          if (typeof value === 'symbol') return { __type: 'Symbol', description: value.description };
          if (typeof value === 'bigint') return { __type: 'BigInt', value: value.toString() };
          if (value === undefined) return { __type: 'Undefined' };
          
          return value;
        }));
      } catch (error) {
        throw error; // Let final fallback handle it
      }
    };

    // Final string conversion fallback
    const stringConversionFallback = (message) => {
      return {
        __type: 'StringConversionFallback',
        originalType: typeof message,
        objectType: Object.prototype.toString.call(message),
        value: String(message),
        timestamp: Date.now(),
        warning: 'All serialization methods failed, converted to string'
      };
    };

    // Implement comprehensive error recovery strategy
    try {
      // Primary serialization attempt
      return primaryMessageSerialize(message);
    } catch (primaryError) {
      console.warn('Primary message serialization failed, attempting JSON.stringify fallback:', {
        error: primaryError.message,
        messageType: typeof message,
        timestamp: Date.now()
      });
      
      try {
        // JSON.stringify fallback
        return jsonStringifyFallback(message);
      } catch (fallbackError) {
        console.warn('JSON.stringify fallback failed, using string conversion:', {
          primaryError: primaryError.message,
          fallbackError: fallbackError.message,
          messageType: typeof message,
          timestamp: Date.now()
        });
        
        try {
          // Final string conversion fallback
          return stringConversionFallback(message);
        } catch (criticalError) {
          console.error('Critical: All message serialization methods failed:', criticalError);
          return {
            __type: 'CriticalSerializationFailure',
            error: 'Complete serialization system failure',
            timestamp: Date.now(),
            value: '[Completely Unserializable]'
          };
        }
      }
    }
  }
  
  // Disconnect WebSocket
  disconnect() {
    if (this.connection) {
      this.stopHeartbeat();
      this.connection = null;
    }
    
    // Clear all listeners
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }
  
  // Get connection status
  getConnectionStatus() {
    // Check if we're in a browser environment and WebSocket is available
    const isWebSocketAvailable = typeof WebSocket !== 'undefined';
    
    return {
      connected: isWebSocketAvailable && this.connection && this.connection.readyState === 1, // 1 = OPEN
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      listenersCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
      webSocketAvailable: isWebSocketAvailable
    };
  }
  
  // Enhanced methods for approval workflow and payment flow
  subscribeToApprovalUpdates(callback) {
    const unsubscribers = [
      this.subscribe('approval_request_submitted', callback),
      this.subscribe('approval_status_changed', callback),
      this.subscribe('approval_comment_added', callback),
      this.subscribe('price-approvals', callback)
    ];
    
    // Return function to unsubscribe from all approval events
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
  
  // Enhanced payment flow subscription
  subscribeToPaymentFlowUpdates(callback) {
    const unsubscribers = [
      this.subscribe('payment_flow_update', callback),
      this.subscribe('vendor_payment_processed', callback),
      this.subscribe('admin_payment_confirmed', callback),
      this.subscribe('payment_proof_uploaded', callback),
      this.subscribe('amount_auto_matched', callback),
      this.subscribe('vendor_payment_confirmed', callback)
    ];
    
    // Return function to unsubscribe from all payment flow events
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
  
  // Price approval specific subscription
  subscribeToPriceApprovals(callback) {
    return this.subscribe('price-approvals', callback);
  }
  
  // Send approval-specific messages
  sendApprovalMessage(type, data) {
    return this.send({
      type: `approval_${type}`,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  // Send payment flow messages
  sendPaymentFlowMessage(type, data) {
    return this.send({
      type: `payment_${type}`,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Auto-connect on module load (with error handling)
webSocketService.connect().catch(error => {
  console.warn('Initial WebSocket connection failed, will retry:', error.message);
});

export default webSocketService;