import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const useIntersectionObserver = (elementRef, options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const element = elementRef?.current;
    if (!element) return;

    const defaultOptions = {
      threshold: 0.1,
      rootMargin: '0px',
      ...options
    };

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setIsVisible(isIntersecting);
        
        if (isIntersecting && !hasBeenVisible) {
          setHasBeenVisible(true);
        }
      },
      defaultOptions
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRef, options, hasBeenVisible]);

  return [isVisible, hasBeenVisible];
};

export const useVirtualizedScroll = (
  items, 
  containerHeight, 
  itemHeight, 
  overscan = 3
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount + overscan,
      items.length - 1
    );

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      visibleItems: items.slice(
        Math.max(0, startIndex - overscan),
        endIndex + 1
      )
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, items]);

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

  return {
    visibleRange,
    handleScroll,
    isScrolling,
    totalHeight: items.length * itemHeight
  };
};

export const useCrossPlatformInteraction = () => {
  const [device, setDevice] = useState('desktop');
  const [interactionMode, setInteractionMode] = useState('click');

  useEffect(() => {
    const updateDevice = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window;
      
      if (width < 768) {
        setDevice('mobile');
        setInteractionMode(hasTouch ? 'touch' : 'click');
      } else if (width < 1024) {
        setDevice('tablet');
        setInteractionMode('hover');
      } else {
        setDevice('desktop');
        setInteractionMode('always');
      }
    };

    updateDevice();
    window.addEventListener('resize', updateDevice);
    
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  const getPaymentProofBehavior = () => {
    switch (device) {
      case 'mobile':
        return {
          trigger: 'tap-twice',
          className: 'payment-proof-mobile',
          behavior: 'modal'
        };
      case 'tablet':
        return {
          trigger: 'hover',
          className: 'payment-proof-tablet',
          behavior: 'preview'
        };
      case 'desktop':
        return {
          trigger: 'always-visible',
          className: 'payment-proof-desktop',
          behavior: 'inline'
        };
      default:
        return {
          trigger: 'click',
          className: 'payment-proof-mobile',
          behavior: 'modal'
        };
    }
  };

  const getMultiSelectBehavior = () => {
    switch (device) {
      case 'mobile':
        return {
          trigger: 'long-press',
          className: 'multi-select-mobile',
          duration: 600
        };
      case 'tablet':
        return {
          trigger: 'shift-click',
          className: 'multi-select-tablet',
          modifier: 'shiftKey'
        };
      case 'desktop':
        return {
          trigger: 'checkbox',
          className: 'multi-select-desktop',
          always: true
        };
      default:
        return {
          trigger: 'click',
          className: 'multi-select-mobile',
          duration: 0
        };
    }
  };

  const getSwipeConfirmationBehavior = () => {
    return {
      enabled: device === 'mobile',
      threshold: 100, // pixels
      className: 'swipe-confirm-mobile'
    };
  };

  return {
    device,
    interactionMode,
    getPaymentProofBehavior,
    getMultiSelectBehavior,
    getSwipeConfirmationBehavior
  };
};