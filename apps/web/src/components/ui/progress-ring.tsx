'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
  animated?: boolean;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  className,
  color = 'stroke-primary',
  bgColor = 'stroke-muted',
  showValue = true,
  animated = true,
  children,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(animated ? 0 : value);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((animatedValue / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedValue(value);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [value, animated]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={bgColor}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(color, 'transition-all duration-1000 ease-out')}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (showValue && (
          <span className="text-2xl font-bold">{Math.round(percentage)}%</span>
        ))}
      </div>
    </div>
  );
}

interface MiniProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export function MiniProgress({
  value,
  max = 100,
  className,
  color = 'bg-primary',
}: MiniProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('h-2 w-full bg-muted rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
