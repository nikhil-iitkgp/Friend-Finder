import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'secondary' | 'muted';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colorClasses = {
  primary: 'text-primary',
  secondary: 'text-secondary-foreground',
  muted: 'text-muted-foreground',
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  color = 'primary'
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-transparent border-t-current',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role=\"status\"
      aria-label=\"Loading\"
    >
      <span className=\"sr-only\">Loading...</span>
    </div>
  );
}

// Inline spinner for buttons
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <LoadingSpinner 
      size=\"sm\" 
      className={cn('mr-2', className)}
      color=\"secondary\"
    />
  );
}

// Full page loading overlay
export function LoadingOverlay({ 
  message = 'Loading...', 
  className 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
      className
    )}>
      <div className=\"text-center space-y-4\">
        <LoadingSpinner size=\"lg\" />
        <p className=\"text-muted-foreground\">{message}</p>
      </div>
    </div>
  );
}

// Loading skeleton for content
export function LoadingSkeleton({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      {...props}
    />
  );
}

// Loading dots animation
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex space-x-1', className)}>
      <div className=\"h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]\" />
      <div className=\"h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]\" />
      <div className=\"h-2 w-2 bg-current rounded-full animate-bounce\" />
    </div>
  );
}"