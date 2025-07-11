import React from "react";

const Badge = ({ 
  variant = 'default', 
  size = 'medium', 
  children, 
  className = '' 
}) => {
const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    sale: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg',
    promotional: 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg animate-pulse',
    featured: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg',
    offer: 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-md',
    strikethrough: 'bg-gray-200 text-gray-500 line-through'
  };

  const sizes = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-sm',
    large: 'px-3 py-1.5 text-base'
  };

  const classes = `
    inline-flex items-center font-medium rounded-full
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `.trim();

  return (
    <span className={classes}>
      {children}
    </span>
  );
};

export default Badge;
export { Badge };