import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// Virtualized Product List Component
const VirtualizedProductList = ({ 
  products, 
  renderItem, 
  itemHeight = 320,
  containerHeight = 600,
  overscan = 3 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount + overscan,
      products.length - 1
    );

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      visibleItems: products.slice(
        Math.max(0, startIndex - overscan),
        endIndex + 1
      )
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, products]);

  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  const totalHeight = products.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className="virtualized-container"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className="virtualized-content"
        style={{ height: totalHeight, position: 'relative' }}
      >
        {visibleRange.visibleItems.map((product, index) => {
          const actualIndex = visibleRange.startIndex + index;
          return (
            <div
              key={product.id}
              className="virtualized-item"
              style={{
                transform: `translateY(${actualIndex * itemHeight}px)`,
                height: itemHeight
              }}
            >
              {renderItem(product, actualIndex)}
            </div>
          );
        })}
      </div>
      
      {/* Performance indicator */}
      <div className={`performance-indicator ${isScrolling ? 'visible' : ''}`}>
        <div className="performance-good px-3 py-1 rounded-full text-sm">
          Virtualized: {visibleRange.visibleItems.length}/{products.length}
        </div>
      </div>
    </div>
  );
};

// Virtualized Order List Component
const VirtualizedOrderList = ({ 
  orders, 
  selectedOrders,
  setSelectedOrders,
  renderOrderCard,
  itemHeight = 400,
  containerHeight = 800,
  overscan = 2 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount + overscan,
      orders.length - 1
    );

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      visibleItems: orders.slice(
        Math.max(0, startIndex - overscan),
        endIndex + 1
      )
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, orders]);

  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  const totalHeight = orders.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className="virtualized-container"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className="virtualized-content"
        style={{ height: totalHeight, position: 'relative' }}
      >
        {visibleRange.visibleItems.map((order, index) => {
          const actualIndex = visibleRange.startIndex + index;
          return (
            <div
              key={order.id}
              className="virtualized-item"
              style={{
                transform: `translateY(${actualIndex * itemHeight}px)`,
                height: itemHeight,
                marginBottom: '1rem'
              }}
            >
              {renderOrderCard(order, actualIndex)}
            </div>
          );
        })}
      </div>
      
      {/* Scroll indicator */}
      <div className="scroll-indicator">
        <div 
          className="scroll-thumb"
          style={{
            height: `${(containerHeight / totalHeight) * 100}%`,
            top: `${(scrollTop / totalHeight) * 100}%`
          }}
        />
      </div>
    </div>
  );
};

// Lazy Image Component
const LazyImage = ({ 
  src, 
  alt, 
  className, 
  loading = 'lazy',
  virtualIndex = 0,
  fallbackSrc = '/api/placeholder/300/300',
  style,
  onClick,
  onLoad,
  onError 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const imgRef = useRef(null);

  // Use intersection observer for lazy loading
  const [isVisible] = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  useEffect(() => {
    if (isVisible && src && !isLoaded && !hasError) {
      setCurrentSrc(src);
    }
  }, [isVisible, src, isLoaded, hasError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (!hasError && fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
      if (onError) onError();
    }
  }, [hasError, fallbackSrc, onError]);

  return (
    <div 
      ref={imgRef}
      className={`lazy-image ${isLoaded ? 'loaded' : ''} ${className || ''}`}
      style={style}
      onClick={onClick}
    >
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading={virtualIndex > 12 ? 'lazy' : 'eager'}
          onLoad={handleLoad}
          onError={handleError}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }}
        />
      )}
    </div>
  );
};

// Multi-select Controls Component
const MultiSelectControls = ({ 
  selectedOrders, 
  setSelectedOrders, 
  orders, 
  onBulkAction 
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [device, setDevice] = useState('desktop');

  useEffect(() => {
    const updateDevice = () => {
      const width = window.innerWidth;
      if (width < 768) setDevice('mobile');
      else if (width < 1024) setDevice('tablet');
      else setDevice('desktop');
    };

    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  useEffect(() => {
    setIsSelecting(selectedOrders.size > 0);
  }, [selectedOrders]);

  const handleSelectAll = useCallback(() => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    }
  }, [selectedOrders, orders, setSelectedOrders]);

  const handleBulkAction = useCallback((action) => {
    onBulkAction(action, Array.from(selectedOrders));
    setSelectedOrders(new Set());
  }, [selectedOrders, onBulkAction, setSelectedOrders]);

  if (!isSelecting && device === 'desktop') {
    return null;
  }

  return (
    <>
      {/* Selection Controls */}
      <div className={`multi-select-container ${isSelecting ? 'selecting' : ''}`}>
        <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selectedOrders.size === orders.length}
              onChange={handleSelectAll}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-blue-900">
              {selectedOrders.size > 0 
                ? `${selectedOrders.size} selected` 
                : 'Select all orders'
              }
            </span>
          </div>
          
          {device === 'mobile' && (
            <div className="text-xs text-blue-600">
              Long press to select
            </div>
          )}
          
          {device === 'tablet' && (
            <div className="text-xs text-blue-600">
              Shift+click to select
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      <div className={`bulk-action-bar ${isSelecting ? 'visible' : ''}`}>
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {selectedOrders.size} orders selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('export')}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Archive
              </button>
              <button
                onClick={() => setSelectedOrders(new Set())}
                className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { 
  VirtualizedProductList, 
  VirtualizedOrderList, 
  LazyImage, 
  MultiSelectControls 
};