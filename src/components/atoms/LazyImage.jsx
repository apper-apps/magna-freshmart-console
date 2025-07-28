import React, { useState, useRef, useCallback } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

const LazyImage = ({ 
  src, 
  alt = '', 
  className = '', 
  fallbackSrc = '/placeholder-image.jpg',
  loadingClassName = 'lazy-image image-loading',
  loadedClassName = 'lazy-image loaded',
  errorClassName = 'lazy-image error',
  ...props 
}) => {
  const [imageState, setImageState] = useState('loading'); // loading, loaded, error
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef(null);

  const handleImageLoad = useCallback(() => {
    setImageState('loaded');
  }, []);

  const handleImageError = useCallback(() => {
    setImageState('error');
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
  }, [fallbackSrc, imageSrc]);

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
    <div ref={imgRef} className={getClassName()} {...props}>
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="responsive-image"
          style={{
            opacity: imageState === 'loaded' ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}
      {imageState === 'loading' && (
        <div className="absolute inset-0 shimmer rounded" />
      )}
      {imageState === 'error' && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <span className="text-sm">Image not available</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;