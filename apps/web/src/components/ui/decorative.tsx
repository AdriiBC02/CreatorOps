'use client';

import { cn } from '@/lib/utils';

// Animated gradient orb for backgrounds
export function GradientOrb({
  className,
  color = 'from-primary/20 to-rose-500/20',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={cn(
        'absolute rounded-full blur-3xl bg-gradient-to-r opacity-50 animate-pulse',
        color,
        className
      )}
    />
  );
}

// Floating shapes for decoration
export function FloatingShapes({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float animation-delay-200" />
      <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-float animation-delay-400" />
    </div>
  );
}

// Animated dots pattern
export function DotsPattern({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none opacity-30', className)}>
      <div className="absolute inset-0 bg-dots" />
    </div>
  );
}

// Grid pattern
export function GridPattern({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none opacity-30', className)}>
      <div className="absolute inset-0 bg-grid" />
    </div>
  );
}

// Sparkle effect
export function Sparkle({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  return (
    <svg
      className={cn('text-yellow-400 animate-pulse', sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

// Animated sparkles container
export function SparklesEffect({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      <Sparkle className="absolute top-1/4 left-1/4 animation-delay-100" size="sm" />
      <Sparkle className="absolute top-1/3 right-1/4 animation-delay-300" size="md" />
      <Sparkle className="absolute bottom-1/4 left-1/3 animation-delay-500" size="sm" />
      <Sparkle className="absolute top-1/2 right-1/3 animation-delay-200" size="lg" />
    </div>
  );
}

// Animated border gradient
export function AnimatedBorder({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative p-[2px] rounded-2xl overflow-hidden group', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 gradient-animate" />
      <div className="relative bg-card rounded-2xl">{children}</div>
    </div>
  );
}

// Stat card with hover animation
export function AnimatedStatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
  trendValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <div className="group relative p-6 rounded-2xl border bg-card hover:shadow-xl transition-all duration-500 overflow-hidden">
      {/* Hover gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-all duration-500',
        color
      )} />

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 shimmer" />
      </div>

      <div className="relative">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110',
          color.replace('from-', 'bg-').split(' ')[0] + '/10'
        )}>
          <Icon className={cn('w-6 h-6', color.replace('from-', 'text-').split(' ')[0])} />
        </div>

        <p className="text-3xl font-bold mb-1 group-hover:scale-105 transition-transform origin-left">
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>

        {trend && trendValue && (
          <div className={cn(
            'mt-3 flex items-center gap-1 text-sm font-medium',
            trend === 'up' ? 'text-green-500' : 'text-red-500'
          )}>
            <svg
              className={cn('w-4 h-4', trend === 'down' && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}

// Glowing badge
export function GlowingBadge({
  children,
  color = 'primary',
  className,
}: {
  children: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  className?: string;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary shadow-primary/25',
    success: 'bg-green-500/10 text-green-500 shadow-green-500/25',
    warning: 'bg-amber-500/10 text-amber-500 shadow-amber-500/25',
    danger: 'bg-red-500/10 text-red-500 shadow-red-500/25',
    purple: 'bg-purple-500/10 text-purple-500 shadow-purple-500/25',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium shadow-lg transition-all duration-300 hover:scale-105',
      colorClasses[color],
      className
    )}>
      {children}
    </span>
  );
}

// Pulsing dot (for status indicators)
export function PulsingDot({
  color = 'bg-green-500',
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      <span className={cn(
        'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
        color
      )} />
      <span className={cn('relative inline-flex rounded-full h-3 w-3', color)} />
    </span>
  );
}
