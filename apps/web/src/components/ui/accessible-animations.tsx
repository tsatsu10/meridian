import React, { ReactNode } from 'react';
import { motion, Variants, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useAccessibility } from '@/hooks/useAccessibility';

interface AccessibleMotionProps extends Omit<HTMLMotionProps<"div">, 'variants'> {
  children: ReactNode;
  animation?: 'fade' | 'slide' | 'scale' | 'bounce' | 'rotate' | 'pulse' | 'shake';
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  delay?: number;
  triggerOnHover?: boolean;
  triggerOnFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

// Animation variants that respect reduced motion
const createVariants = (
  animation: string,
  direction: string,
  shouldAnimate: boolean
): Variants => {
  if (!shouldAnimate) {
    return {
      initial: {},
      animate: {},
      hover: {},
      focus: {},
      exit: {}
    };
  }

  const variants: Variants = {
    initial: {},
    animate: {},
    hover: {},
    focus: {},
    exit: {}
  };

  switch (animation) {
    case 'fade':
      variants.initial = { opacity: 0 };
      variants.animate = { opacity: 1 };
      variants.exit = { opacity: 0 };
      break;

    case 'slide':
      const slideDistance = 20;
      const slideProps = {
        up: { y: slideDistance, opacity: 0 },
        down: { y: -slideDistance, opacity: 0 },
        left: { x: slideDistance, opacity: 0 },
        right: { x: -slideDistance, opacity: 0 }
      };
      variants.initial = slideProps[direction as keyof typeof slideProps];
      variants.animate = { x: 0, y: 0, opacity: 1 };
      variants.exit = slideProps[direction as keyof typeof slideProps];
      break;

    case 'scale':
      variants.initial = { scale: 0.8, opacity: 0 };
      variants.animate = { scale: 1, opacity: 1 };
      variants.hover = { scale: 1.05 };
      variants.focus = { scale: 1.02 };
      variants.exit = { scale: 0.8, opacity: 0 };
      break;

    case 'bounce':
      variants.initial = { y: -10, opacity: 0 };
      variants.animate = { 
        y: 0, 
        opacity: 1,
        transition: { 
          type: "spring", 
          bounce: 0.4 
        }
      };
      variants.hover = { y: -2 };
      variants.exit = { y: -10, opacity: 0 };
      break;

    case 'rotate':
      variants.initial = { rotate: -10, opacity: 0 };
      variants.animate = { rotate: 0, opacity: 1 };
      variants.hover = { rotate: 2 };
      variants.focus = { rotate: 1 };
      variants.exit = { rotate: -10, opacity: 0 };
      break;

    case 'pulse':
      variants.animate = {
        scale: [1, 1.02, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      };
      break;

    case 'shake':
      variants.animate = {
        x: [0, -2, 2, -2, 2, 0],
        transition: {
          duration: 0.5,
          ease: "easeInOut"
        }
      };
      break;
  }

  return variants;
};

export function AccessibleMotion({
  children,
  animation = 'fade',
  direction = 'up',
  duration = 0.3,
  delay = 0,
  triggerOnHover = true,
  triggerOnFocus = true,
  disabled = false,
  className,
  ...props
}: AccessibleMotionProps) {
  const { animationUtils } = useAccessibility();
  const shouldAnimate = animationUtils.shouldAnimate() && !disabled;
  
  const variants = createVariants(animation, direction, shouldAnimate);
  const actualDuration = animationUtils.getDuration(duration * 1000) / 1000;

  return (
    <motion.div
      className={cn("accessible-motion", className)}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={triggerOnHover ? "hover" : undefined}
      whileFocus={triggerOnFocus ? "focus" : undefined}
      transition={{
        duration: actualDuration,
        delay: shouldAnimate ? delay : 0,
        ease: "easeOut"
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Micro-interaction components
interface MicroInteractionProps {
  children: ReactNode;
  type: 'button' | 'card' | 'input' | 'checkbox' | 'toggle';
  className?: string;
  disabled?: boolean;
}

export function MicroInteraction({
  children,
  type,
  className,
  disabled = false
}: MicroInteractionProps) {
  const { animationUtils } = useAccessibility();
  const shouldAnimate = animationUtils.shouldAnimate() && !disabled;

  const getMicroInteractionStyles = () => {
    if (!shouldAnimate) return {};

    switch (type) {
      case 'button':
        return {
          whileHover: { scale: 1.02, y: -1 },
          whileTap: { scale: 0.98, y: 0 },
          whileFocus: { scale: 1.01 },
          transition: { duration: 0.15, ease: "easeOut" }
        };

      case 'card':
        return {
          whileHover: { 
            y: -2, 
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)" 
          },
          whileFocus: { 
            y: -1, 
            boxShadow: "0 5px 15px rgba(0,0,0,0.08)" 
          },
          transition: { duration: 0.2, ease: "easeOut" }
        };

      case 'input':
        return {
          whileFocus: { 
            scale: 1.01,
            borderColor: "var(--blue-500)" 
          },
          transition: { duration: 0.15 }
        };

      case 'checkbox':
        return {
          whileHover: { scale: 1.1 },
          whileTap: { scale: 0.95 },
          transition: { duration: 0.1 }
        };

      case 'toggle':
        return {
          whileHover: { scale: 1.05 },
          whileTap: { scale: 0.95 },
          transition: { duration: 0.15 }
        };

      default:
        return {};
    }
  };

  return (
    <motion.div
      className={cn("micro-interaction", className)}
      {...getMicroInteractionStyles()}
    >
      {children}
    </motion.div>
  );
}

// Loading animations
interface LoadingAnimationProps {
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingAnimation({
  type = 'spinner',
  size = 'md',
  className
}: LoadingAnimationProps) {
  const { animationUtils } = useAccessibility();
  const shouldAnimate = animationUtils.shouldAnimate();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-6 h-6';
      case 'lg': return 'w-8 h-8';
      default: return 'w-6 h-6';
    }
  };

  if (!shouldAnimate) {
    // Static loading indicator for reduced motion
    return (
      <div 
        className={cn(
          "border-2 border-blue-200 border-t-blue-500 rounded-full",
          getSizeClasses(),
          className
        )}
        role="status"
        aria-label="Loading"
      />
    );
  }

  switch (type) {
    case 'spinner':
      return (
        <motion.div
          className={cn(
            "border-2 border-blue-200 border-t-blue-500 rounded-full",
            getSizeClasses(),
            className
          )}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
          role="status"
          aria-label="Loading"
        />
      );

    case 'dots':
      return (
        <div className={cn("flex space-x-1", className)} role="status" aria-label="Loading">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={cn(
                "bg-blue-500 rounded-full",
                size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'
              )}
              animate={{
                y: [0, -8, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      );

    case 'pulse':
      return (
        <motion.div
          className={cn(
            "bg-blue-500 rounded-full",
            getSizeClasses(),
            className
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          role="status"
          aria-label="Loading"
        />
      );

    case 'skeleton':
      return (
        <motion.div
          className={cn(
            "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded",
            "bg-[length:200%_100%]",
            getSizeClasses(),
            className
          )}
          animate={{
            backgroundPosition: ["200% 0", "-200% 0"]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
          role="status"
          aria-label="Loading content"
        />
      );

    default:
      return null;
  }
}

// Notification animations
interface NotificationAnimationProps {
  children: ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
  position?: 'top' | 'bottom';
  className?: string;
}

export function NotificationAnimation({
  children,
  type = 'info',
  position = 'top',
  className
}: NotificationAnimationProps) {
  const { animationUtils } = useAccessibility();
  const shouldAnimate = animationUtils.shouldAnimate();

  const getNotificationStyles = () => {
    if (!shouldAnimate) {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      };
    }

    const slideDistance = position === 'top' ? -50 : 50;
    
    return {
      initial: { 
        opacity: 0, 
        y: slideDistance,
        scale: 0.95
      },
      animate: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        transition: {
          type: "spring",
          damping: 25,
          stiffness: 300
        }
      },
      exit: { 
        opacity: 0, 
        y: slideDistance,
        scale: 0.95,
        transition: {
          duration: 0.2,
          ease: "easeIn"
        }
      }
    };
  };

  return (
    <motion.div
      className={cn("notification-animation", className)}
      {...getNotificationStyles()}
      layout={shouldAnimate}
    >
      {children}
    </motion.div>
  );
}

// Focus animation wrapper
interface FocusAnimationProps {
  children: ReactNode;
  className?: string;
}

export function FocusAnimation({ children, className }: FocusAnimationProps) {
  const { animationUtils } = useAccessibility();
  const shouldAnimate = animationUtils.shouldAnimate();

  if (!shouldAnimate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileFocus={{
        scale: 1.02,
        transition: { duration: 0.15 }
      }}
      onFocus={() => {
        // Optional: Add additional focus handling
      }}
    >
      {children}
    </motion.div>
  );
}

// Page transition animation
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const { animationUtils } = useAccessibility();
  const shouldAnimate = animationUtils.shouldAnimate();

  if (!shouldAnimate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  );
}