import { orderService } from '@/services/api/orderService';
import { paymentService } from '@/services/api/paymentService';

class ReportService {
  constructor() {
    this.reports = [];
    this.reportIdCounter = 1;
    this.refreshIntervals = new Map();
    this.exportQueue = [];
    this.exportIdCounter = 1;
  }

  // Payment Verification Report Methods
  async getPaymentVerificationReport(filters = {}) {
    await this.delay(300);
    
    try {
      const pendingVerifications = await orderService.getPendingVerifications();
      const walletTransactions = await paymentService.getWalletTransactions(100);
      
      // Filter by date range if provided
      let filteredVerifications = pendingVerifications;
      if (filters.startDate || filters.endDate) {
        filteredVerifications = pendingVerifications.filter(verification => {
          const verificationDate = new Date(verification.submittedAt);
          if (filters.startDate && verificationDate < new Date(filters.startDate)) return false;
          if (filters.endDate && verificationDate > new Date(filters.endDate)) return false;
          return true;
        });
      }
      
      // Filter by vendor if provided
      if (filters.vendor) {
        filteredVerifications = filteredVerifications.filter(verification => 
          verification.customerName.toLowerCase().includes(filters.vendor.toLowerCase())
        );
      }
      
      // Filter by payment method if provided
      if (filters.paymentMethod) {
        filteredVerifications = filteredVerifications.filter(verification => 
          verification.paymentMethod === filters.paymentMethod
        );
      }
      
      // Generate summary statistics
      const totalPendingAmount = filteredVerifications.reduce((sum, v) => sum + (v.amount || 0), 0);
      const averageAmount = filteredVerifications.length > 0 ? totalPendingAmount / filteredVerifications.length : 0;
      
      // Group by payment method
      const byPaymentMethod = filteredVerifications.reduce((acc, v) => {
        const method = v.paymentMethod || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});
      
      // Recent activity (last 24 hours)
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      const recentActivity = filteredVerifications.filter(v => 
        new Date(v.submittedAt) >= last24Hours
      ).length;
      
      return {
        data: filteredVerifications,
        summary: {
          totalPending: filteredVerifications.length,
          totalAmount: totalPendingAmount,
          averageAmount,
          recentActivity,
          byPaymentMethod
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          lastRefresh: new Date().toISOString(),
          filters: filters,
          totalRecords: pendingVerifications.length,
          filteredRecords: filteredVerifications.length
        }
      };
    } catch (error) {
      throw new Error('Failed to generate payment verification report: ' + error.message);
    }
  }

  // Real-time Data Methods
  async getRealtimePaymentData() {
    await this.delay(200);
    
    try {
      const [pendingVerifications, walletBalance, recentTransactions] = await Promise.all([
        orderService.getPendingVerifications(),
        paymentService.getWalletBalance(),
        paymentService.getWalletTransactions(10)
      ]);
      
      return {
        pendingVerifications: pendingVerifications.length,
        walletBalance,
        recentTransactions: recentTransactions.length,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to fetch real-time payment data: ' + error.message);
    }
  }

  // Export Methods
  async exportReport(reportType, format = 'pdf', filters = {}) {
    await this.delay(1000);
    
    const exportId = this.exportIdCounter++;
    const exportJob = {
      Id: exportId,
      reportType,
      format,
      filters,
      status: 'processing',
      createdAt: new Date().toISOString(),
      progress: 0
    };
    
    this.exportQueue.push(exportJob);
    
    try {
      // Simulate export processing
      exportJob.progress = 25;
      await this.delay(500);
      
      // Get report data
      let reportData;
      switch (reportType) {
        case 'payment_verification':
          reportData = await this.getPaymentVerificationReport(filters);
          break;
        default:
          throw new Error('Unknown report type');
      }
      
      exportJob.progress = 75;
      await this.delay(500);
      
      // Generate export file
      const fileName = `${reportType}_${new Date().getTime()}.${format}`;
      const fileUrl = this.generateExportUrl(fileName);
      
      exportJob.status = 'completed';
      exportJob.progress = 100;
      exportJob.fileName = fileName;
      exportJob.fileUrl = fileUrl;
      exportJob.completedAt = new Date().toISOString();
      
      return {
        exportId,
        fileName,
        fileUrl,
        recordCount: reportData.data.length,
        fileSize: this.calculateFileSize(reportData.data.length, format)
      };
    } catch (error) {
      exportJob.status = 'failed';
      exportJob.error = error.message;
      exportJob.failedAt = new Date().toISOString();
      throw error;
    }
  }

  async getExportStatus(exportId) {
    await this.delay(100);
    
    const exportJob = this.exportQueue.find(job => job.Id === exportId);
    if (!exportJob) {
      throw new Error('Export job not found');
    }
    
    return { ...exportJob };
  }

  // Auto-refresh Methods
  startAutoRefresh(reportType, intervalSeconds = 15) {
    const key = `${reportType}_refresh`;
    
    // Clear existing interval if any
    if (this.refreshIntervals.has(key)) {
      clearInterval(this.refreshIntervals.get(key));
    }
    
    // Set new interval
    const intervalId = setInterval(async () => {
      try {
        await this.getRealtimePaymentData();
        console.log(`Auto-refresh completed for ${reportType}`);
      } catch (error) {
        console.error(`Auto-refresh failed for ${reportType}:`, error);
      }
    }, intervalSeconds * 1000);
    
    this.refreshIntervals.set(key, intervalId);
    
    return {
      refreshKey: key,
      intervalSeconds,
      startedAt: new Date().toISOString()
    };
  }

  stopAutoRefresh(reportType) {
    const key = `${reportType}_refresh`;
    
    if (this.refreshIntervals.has(key)) {
      clearInterval(this.refreshIntervals.get(key));
      this.refreshIntervals.delete(key);
      return { stopped: true, reportType };
    }
    
    return { stopped: false, reportType };
  }

  // Report Configuration Methods
  async createReport(reportConfig) {
    await this.delay(400);
    
    const report = {
      Id: this.reportIdCounter++,
      name: reportConfig.name,
      type: reportConfig.type,
      description: reportConfig.description || '',
      filters: reportConfig.filters || {},
      autoRefresh: reportConfig.autoRefresh || false,
      refreshInterval: reportConfig.refreshInterval || 15,
      priority: reportConfig.priority || 'medium',
      enabled: reportConfig.enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.reports.push(report);
    
    if (report.autoRefresh) {
      this.startAutoRefresh(report.type, report.refreshInterval);
    }
    
    return { ...report };
  }

  async getAllReports() {
    await this.delay(200);
    return [...this.reports];
  }

  async getReportById(id) {
    await this.delay(200);
    
    const report = this.reports.find(r => r.Id === id);
    if (!report) {
      throw new Error('Report not found');
    }
    
    return { ...report };
  }

  async updateReport(id, updateData) {
    await this.delay(300);
    
    const report = this.reports.find(r => r.Id === id);
    if (!report) {
      throw new Error('Report not found');
    }
    
    // Handle auto-refresh changes
    if (updateData.autoRefresh !== undefined) {
      if (updateData.autoRefresh && !report.autoRefresh) {
        this.startAutoRefresh(report.type, updateData.refreshInterval || report.refreshInterval);
      } else if (!updateData.autoRefresh && report.autoRefresh) {
        this.stopAutoRefresh(report.type);
      }
    }
    
    Object.assign(report, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
    
    return { ...report };
  }

  async deleteReport(id) {
    await this.delay(300);
    
    const index = this.reports.findIndex(r => r.Id === id);
    if (index === -1) {
      throw new Error('Report not found');
    }
    
    const report = this.reports[index];
    
    // Stop auto-refresh if enabled
    if (report.autoRefresh) {
      this.stopAutoRefresh(report.type);
    }
    
    this.reports.splice(index, 1);
    return { success: true };
  }

  // Utility Methods
  generateExportUrl(fileName) {
    return `https://storage.freshmart.com/exports/${fileName}`;
  }

  calculateFileSize(recordCount, format) {
    const baseSize = recordCount * 150; // Approximate bytes per record
    const formatMultiplier = {
      'pdf': 1.5,
      'csv': 0.8,
      'xlsx': 1.2,
      'json': 1.0
    };
    
    return Math.round(baseSize * (formatMultiplier[format] || 1));
  }

  // Data Freshness Methods
  getDataFreshness(reportType) {
    const key = `${reportType}_refresh`;
    const isAutoRefreshing = this.refreshIntervals.has(key);
    
    return {
      isAutoRefreshing,
      lastRefresh: new Date().toISOString(),
      nextRefresh: isAutoRefreshing ? new Date(Date.now() + 15000).toISOString() : null,
      refreshInterval: isAutoRefreshing ? 15 : null
    };
  }

  // Cleanup method
  cleanup() {
    this.refreshIntervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.refreshIntervals.clear();
  }

  delay(ms = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const reportService = new ReportService();