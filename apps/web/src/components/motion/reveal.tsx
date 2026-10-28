'use client';

import { LazyMotion, MotionConfig, m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

const loadAnimationFeatures = () =>
  import('@/components/motion/features').then((module) => module.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadAnimationFeatures}>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

/** Content remains visible in SSR and when JavaScript is disabled. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={false}
      whileInView={reduced ? undefined : { y: [18, 0], opacity: [0.65, 1] }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, delay: Math.min(delay, 0.24) }}
    >
      {children}
    </m.div>
  );
}
