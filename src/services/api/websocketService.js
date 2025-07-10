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
          
          // Notify listeners of error
          this.notifyListeners('connection_error', { error: error.message, timestamp: new Date().toISOString() });
          
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
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

  // Start mock message simulation
  startMockMessages(mockWS) {
    const messageTypes = [
      'approval_request_submitted',
      'approval_status_changed',
      'approval_comment_added',
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

  // Generate mock messages for demo
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

  // Disconnect WebSocket
  disconnect() {
    if (this.connection) {
      this.stopHeartbeat();
      this.connection.close(1000, 'Client initiated disconnect');
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

  // Specific methods for approval workflow
  subscribeToApprovalUpdates(callback) {
    const unsubscribers = [
      this.subscribe('approval_request_submitted', callback),
      this.subscribe('approval_status_changed', callback),
      this.subscribe('approval_comment_added', callback)
    ];
    
    // Return function to unsubscribe from all approval events
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  // Send approval-specific messages
  sendApprovalMessage(type, data) {
    return this.send({
      type: `approval_${type}`,
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