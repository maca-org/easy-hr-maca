import React from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'left' | 'right' | 'scale';
  delay?: number;
  className?: string;
}

export const ScrollReveal = ({ 
  children, 
  direction = 'up', 
  delay = 0,
  className 
}: ScrollRevealProps) => {
  const { ref, isVisible } = useScrollAnimation();
  
  const hiddenClass = {
    up: 'scroll-hidden',
    left: 'scroll-hidden-left',
    right: 'scroll-hidden-right',
    scale: 'scroll-hidden-scale'
  }[direction];

  return (
    <div 
      ref={ref}
      className={cn(
        hiddenClass,
        isVisible && 'scroll-visible',
        className
      )}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};
