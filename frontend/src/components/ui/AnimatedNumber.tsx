import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * Spring-tweens between numeric values so live metrics glide instead of
 * snapping. Honors prefers-reduced-motion via the global MotionConfig
 * (the spring still settles, just instantly).
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 140, damping: 22, mass: 0.4 });
  const text = useTransform(spring, (v) => format(v));

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}
