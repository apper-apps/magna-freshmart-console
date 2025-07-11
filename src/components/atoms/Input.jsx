import React, { useState } from "react";
import ApperIcon from "@/components/ApperIcon";

const Input = ({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  icon,
  required = false,
  disabled = false,
  className = '',
  showCopyButton = false,
  onCopySuccess,
  onCopyError,
  ...props
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyToClipboard = async () => {
    if (!value) return;
    
    try {
      // Modern Clipboard API with fallback
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        setCopySuccess(true);
        onCopySuccess?.('Copied to clipboard!');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        onCopySuccess?.('Copied to clipboard!');
      }
      
      // Reset success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      const errorMessage = 'Failed to copy to clipboard. Please try selecting and copying manually.';
      onCopyError?.(errorMessage);
      
      // Show error state briefly
      setCopySuccess(false);
    }
  };
const inputClasses = `
    input-field
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${icon ? 'pl-10' : ''}
    ${showCopyButton ? 'pr-10' : ''}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ApperIcon name={icon} size={20} className="text-gray-400" />
          </div>
        )}
<input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClasses}
          disabled={disabled}
          {...props}
        />
        
        {showCopyButton && value && (
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors duration-200"
            title="Copy to clipboard"
          >
            <ApperIcon 
              name={copySuccess ? "Check" : "Copy"} 
              size={16} 
              className={`transition-colors duration-200 ${
                copySuccess ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
              }`} 
            />
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <ApperIcon name="AlertCircle" size={16} className="mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
export { Input };