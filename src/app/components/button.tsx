import {
  forwardRef,
} from 'react'
import type {
  ButtonHTMLAttributes,
} from 'react'

import {
  Button as ThemeButton,
} from '@radix-ui/themes'

type ButtonVariant = 'default' | 'ghost'
type ButtonSize = 'default' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantMap: Record<ButtonVariant, 'solid' | 'ghost'> = {
  default: 'solid',
  ghost: 'ghost',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  ...props
}, ref) {
  return (
    <ThemeButton
      ref={ref}
      type={type}
      variant={variantMap[variant]}
      size={size === 'icon' ? '1' : '2'}
      className={className}
      {...(props as object)}
    />
  )
})
