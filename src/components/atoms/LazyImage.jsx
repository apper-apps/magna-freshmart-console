import React, { useState, useRef, useCallback, Suspense } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import ApperIcon from '@/components/ApperIcon';

const LazyImage = ({ 
  src, 
  alt = '', 
  className = '', 
  fallbackSrc = '/default-product.webp',
  loadingClassName = 'lazy-image image-loading',
  loadedClassName = 'lazy-image loaded',
  errorClassName = 'lazy-image error',
  enableRetry = true,
  maxRetries = 3,
  ...props 
}) => {
  const [imageState, setImageState] = useState('loading'); // loading, loaded, error
  const [imageSrc, setImageSrc] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef(null);

  const handleImageLoad = useCallback(() => {
    setImageState('loaded');
    setRetryCount(0); // Reset retry count on successful load
  }, []);

  const handleImageError = useCallback(() => {
    console.warn(`Image load failed for: ${imageSrc || src}. Retry ${retryCount + 1}/${maxRetries}`);
    
    if (enableRetry && retryCount < maxRetries) {
      // Retry with exponential backoff
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageState('loading');
        
        // If this is the last retry, try fallback
        if (retryCount + 1 >= maxRetries && fallbackSrc && imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc);
        } else if (imageSrc !== src) {
          // Retry original source
          setImageSrc(src);
        }
      }, Math.pow(2, retryCount) * 1000); // 1s, 2s, 4s delays
    } else {
      // Max retries reached or retry disabled
      setImageState('error');
      if (fallbackSrc && imageSrc !== fallbackSrc) {
        setImageSrc(fallbackSrc);
        setImageState('loading'); // Try loading fallback
      }
    }
  }, [fallbackSrc, imageSrc, src, retryCount, maxRetries, enableRetry]);

  const onIntersect = useCallback(() => {
    if (src && !imageSrc) {
      setImageSrc(src);
    }
  }, [src, imageSrc]);

  useIntersectionObserver(imgRef, onIntersect, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  const getClassName = () => {
    switch (imageState) {
      case 'loaded':
        return `${loadedClassName} ${className}`;
      case 'error':
        return `${errorClassName} ${className}`;
      default:
        return `${loadingClassName} ${className}`;
    }
  };

  return (
    <Suspense fallback={
      <div className={`${loadingClassName} ${className}`} {...props}>
        <div className="absolute inset-0 shimmer rounded flex items-center justify-center">
          <ApperIcon name="Loader" size={24} className="text-gray-400 animate-spin" />
        </div>
      </div>
    }>
      <div ref={imgRef} className={getClassName()} {...props}>
        {imageSrc && (
          <img
            src={imageSrc}
            alt={alt}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="responsive-image"
            loading="lazy"
            style={{
              opacity: imageState === 'loaded' ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        )}
        
        {imageState === 'loading' && (
          <div className="absolute inset-0 shimmer rounded flex items-center justify-center">
            {retryCount > 0 && (
              <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                Retry {retryCount}/{maxRetries}
              </div>
            )}
            <ApperIcon name="Loader" size={24} className="text-gray-400 animate-spin" />
          </div>
        )}
        
        {imageState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 flex-col space-y-2">
            <ApperIcon name="ImageOff" size={32} className="text-gray-400" />
            <span className="text-sm text-center px-2">
              {imageSrc === fallbackSrc ? 'Default image unavailable' : 'Image not available'}
            </span>
            {enableRetry && retryCount < maxRetries && (
              <button
                onClick={() => {
                  setRetryCount(0);
                  setImageState('loading');
                  setImageSrc(src);
                }}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
              >
                <ApperIcon name="RefreshCw" size={12} className="inline mr-1" />
                Retry
              </button>
            )}
          </div>
        )}
        
        {imageSrc === fallbackSrc && imageState === 'loaded' && (
          <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Default Image
          </div>
        )}
      </div>
    </Suspense>
  );
};

export default LazyImage;