// Mock data for notification counts
const mockNotificationCounts = {
  payments: 5,
  orders: 3,
  products: 12,
  pos: 2,
  financial: 1,
  ai: 0,
  verification: 8,
  management: 4,
  delivery: 6,
  analytics: 0
};

class NotificationService {
  constructor() {
    this.counts = { ...mockNotificationCounts };
    this.lastUpdate = new Date().toISOString();
  }

  async getUnreadCounts() {
    await this.delay();
    
    // Simulate real-time changes by occasionally updating counts
    if (Math.random() > 0.7) {
      this.simulateCountChanges();
    }
    
    return {
      ...this.counts,
      lastUpdated: this.lastUpdate
    };
  }

  async markAsRead(category) {
    await this.delay(200);
    
    if (this.counts[category] !== undefined) {
      this.counts[category] = 0;
      this.lastUpdate = new Date().toISOString();
    }
    
    return {
      success: true,
      category,
      newCount: this.counts[category] || 0
    };
  }

  async markAllAsRead() {
    await this.delay(300);
    
    Object.keys(this.counts).forEach(key => {
      this.counts[key] = 0;
    });
    
    this.lastUpdate = new Date().toISOString();
    
    return {
      success: true,
      counts: { ...this.counts }
    };
  }

  // Simulate realistic count changes
  simulateCountChanges() {
    const categories = Object.keys(this.counts);
    const categoryToUpdate = categories[Math.floor(Math.random() * categories.length)];
    
    // Randomly increase or decrease counts (but not below 0)
    const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    this.counts[categoryToUpdate] = Math.max(0, this.counts[categoryToUpdate] + change);
    
    // Occasionally add new notifications
    if (Math.random() > 0.8) {
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      this.counts[randomCategory] += Math.floor(Math.random() * 2) + 1;
    }
    
    this.lastUpdate = new Date().toISOString();
  }

  // Utility method for simulating API delay
  delay(ms = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Map quick action paths to notification categories
  getNotificationKey(path) {
    const pathMap = {
      '/admin/products': 'products',
      '/admin/pos': 'pos',
      '/orders': 'orders',
      '/admin/financial-dashboard': 'financial',
      '/admin/ai-generate': 'ai',
      '/admin/payments?tab=verification': 'verification',
      '/admin/payments': 'payments',
      '/admin/delivery-dashboard': 'delivery',
      '/admin/analytics': 'analytics'
    };
    
    return pathMap[path] || null;
  }
}

export const notificationService = new NotificationService();