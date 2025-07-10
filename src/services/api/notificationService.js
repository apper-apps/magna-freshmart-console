// Mock data for notification counts including approval workflow
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
  analytics: 0,
  approvals: 3,
  workflow: 2,
  sensitive_changes: 1
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
      '/admin/analytics': 'analytics',
      '/admin/approvals': 'approvals',
      '/admin/workflow': 'workflow',
      '/admin/sensitive-changes': 'sensitive_changes'
    };
    
    return pathMap[path] || null;
  }

  // Approval workflow specific notifications
  async getApprovalNotifications() {
    await this.delay(200);
    
    return {
      pendingApprovals: this.counts.approvals || 0,
      workflowAlerts: this.counts.workflow || 0,
      sensitiveChanges: this.counts.sensitive_changes || 0,
      lastUpdated: this.lastUpdate
    };
  }

  async markApprovalAsRead(category) {
    await this.delay(150);
    
    const approvalCategories = ['approvals', 'workflow', 'sensitive_changes'];
    if (approvalCategories.includes(category)) {
      this.counts[category] = 0;
      this.lastUpdate = new Date().toISOString();
    }
    
    return {
      success: true,
      category,
      newCount: this.counts[category] || 0
    };
  }
}

export const notificationService = new NotificationService();