import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
  ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
}

const sizes = {
  default: 'h-9 px-4 py-2',
  icon: 'size-9',
}

export function Button({ className, variant = 'default', size = 'default', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
