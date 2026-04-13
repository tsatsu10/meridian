"use client";

import { AnimatePresence, motion, useInView, useReducedMotion, Variants, UseInViewOptions } from "framer-motion";
import { useRef } from "react";

import { cn } from "@/lib/utils";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: UseInViewOptions["margin"];
  blur?: string;
}

const BlurFade = ({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inViewResult = useInView(ref, {
    once: true,
    margin: inViewMargin,
  });
  const isInView = !inView || inViewResult;

  if (prefersReducedMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  const defaultVariants: Variants = {
    hidden: {
      y: yOffset,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      y: -yOffset,
      opacity: 1,
      filter: `blur(0px)`,
    },
  };
  const combinedVariants = variant || defaultVariants;
  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: "easeOut",
        }}
        className={cn(className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export { BlurFade };
