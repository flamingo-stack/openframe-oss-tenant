import { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  loading = false,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseClass = 'btn'
  const variantClass = `btn--${variant}`
  const sizeClass = `btn--${size}`
  const loadingClass = loading ? 'btn--loading' : ''
  
  const classes = [baseClass, variantClass, sizeClass, loadingClass, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button 
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="btn__loader"></span>
      ) : (
        <span className="btn__content">{children}</span>
      )}
    </button>
  )
}
