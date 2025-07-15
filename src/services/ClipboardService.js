import { toast } from 'react-toastify';

/**
 * ClipboardService - Modern clipboard operations with fallback support
 * Provides copy functionality with proper error handling and user feedback
 */
class ClipboardService {
  /**
   * Copy text to clipboard using modern Clipboard API with fallback
   * @param {string} text - Text to copy to clipboard
   * @param {string} successMessage - Custom success message for toast
   * @returns {Promise<boolean>} - Returns true if successful, false otherwise
   */
  async copyToClipboard(text, successMessage = 'Copied to clipboard!') {
    if (!text || typeof text !== 'string') {
      toast.error('Invalid text to copy');
      return false;
    }

    try {
      // Modern Clipboard API - preferred method
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success(successMessage);
        return true;
      }

      // Fallback method for older browsers or non-secure contexts
      const result = this.fallbackCopyToClipboard(text);
      if (result) {
        toast.success(successMessage);
        return true;
      } else {
        toast.error('Failed to copy to clipboard');
        return false;
      }
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      
      // Try fallback method on error
      const fallbackResult = this.fallbackCopyToClipboard(text);
      if (fallbackResult) {
        toast.success(successMessage);
        return true;
      }
      
      // Handle specific error types
      if (error.name === 'NotAllowedError') {
        toast.error('Clipboard access denied. Please enable clipboard permissions.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Clipboard API not supported in this browser');
      } else {
        toast.error('Failed to copy to clipboard');
      }
      
      return false;
    }
  }

  /**
   * Fallback clipboard copy method for older browsers
   * @param {string} text - Text to copy
   * @returns {boolean} - Success status
   */
  fallbackCopyToClipboard(text) {
    try {
      // Create temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // Execute copy command
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return successful;
    } catch (error) {
      console.error('Fallback copy failed:', error);
      return false;
    }
  }

  /**
   * Check if clipboard functionality is available
   * @returns {boolean} - Clipboard availability status
   */
  isClipboardSupported() {
    return !!(navigator.clipboard || document.queryCommandSupported('copy'));
  }

  /**
   * Copy transaction ID with formatted message
   * @param {string} transactionId - Transaction ID to copy
   * @returns {Promise<boolean>} - Success status
   */
  async copyTransactionId(transactionId) {
    if (!transactionId) {
      toast.error('No transaction ID to copy');
      return false;
    }

    return await this.copyToClipboard(
      transactionId,
      `Transaction ID copied: ${transactionId}`
    );
  }
}

// Export singleton instance
export const clipboardService = new ClipboardService();
export default clipboardService;