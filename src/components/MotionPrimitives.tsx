import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  animate,
  type Variants,
} from 'motion/react';

// Apple-inspired quintic ease-out curve for crisp, natural deceleration
export const APPLE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};

export const VIEWPORT_ONCE = {
  once: true,
  amount: 0.14 as const,
};

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'scale' | 'none';

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.04,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.52,
      ease: APPLE_EASE,
    },
  },
};

export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: APPLE_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
}

/**
 * Scroll-triggered reveal wrapper using Motion's IntersectionObserver viewport trigger.
 * Animates once on entry (transform + opacity only) and respects reduced motion.
 */
export const RevealSection: React.FC<RevealSectionProps> = ({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 0.58,
  distance = 22,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const getInitial = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: distance };
      case 'down':
        return { opacity: 0, y: -distance };
      case 'left':
        return { opacity: 0, x: -distance };
      case 'right':
        return { opacity: 0, x: distance };
      case 'scale':
        return { opacity: 0, scale: 0.96, y: 10 };
      case 'none':
      default:
        return { opacity: 0 };
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration, delay, ease: APPLE_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
  immediate?: boolean;
}

/**
 * Coordinates staggered entrance for grids of department, doctor, diagnostic, or dashboard cards.
 */
export const StaggerGrid: React.FC<StaggerGridProps> = ({
  children,
  className = '',
  immediate = false,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  if (immediate) {
    return (
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  enableTilt?: boolean;
}

/**
 * Individual card inside a StaggerGrid. Supports optional subtle desktop-only 3D tilt.
 */
export const StaggerCard: React.FC<StaggerCardProps> = ({
  children,
  className = '',
  onClick,
  enableTilt = false,
}) => {
  const prefersReduced = useReducedMotion();
  const [canHover, setCanHover] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3.5, -3.5]), {
    stiffness: 220,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3.5, 3.5]), {
    stiffness: 220,
    damping: 24,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !canHover || prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    if (!enableTilt) return;
    mouseX.set(0);
    mouseY.set(0);
  };

  if (prefersReduced) {
    return (
      <div onClick={onClick} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerItemVariants}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        enableTilt && canHover
          ? {
              rotateX,
              rotateY,
              transformPerspective: 1000,
            }
          : undefined
      }
      whileTap={onClick ? { scale: 0.99 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

/**
 * Smooth tabular-nums counter for dashboards and KPI highlights.
 * Immediately displays accurate numeric output if reduced motion is enabled.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 0.85,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const [displayValue, setDisplayValue] = useState<number>(prefersReduced ? value : 0);
  const previousValueRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }
    if (!inView) return;

    const startVal = previousValueRef.current;
    const controls = animate(startVal, value, {
      duration,
      ease: APPLE_EASE,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
      onComplete: () => {
        setDisplayValue(value);
        previousValueRef.current = value;
      },
    });

    return () => controls.stop();
  }, [value, inView, duration, prefersReduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};
