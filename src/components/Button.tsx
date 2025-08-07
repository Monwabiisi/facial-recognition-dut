// 1️⃣ Import React for component creation
import React, { ButtonHTMLAttributes, ReactNode } from 'react';

// 2️⃣ Define button variants for different use cases
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

// 3️⃣ Interface extending HTML button attributes with polymorphic support
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
  as?: React.ElementType;
  to?: string;
}

// 4️⃣ Button component with multiple variants and animations
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  fullWidth = false,
  className = '',
  disabled,
  as: Component = 'button',
  ...props
}: ButtonProps) {
  
  // 5️⃣ Base button classes that apply to all variants
  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold font-heading
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    relative overflow-hidden
    ${fullWidth ? 'w-full' : ''}
  `;

  // 6️⃣ Size-specific classes
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-xl',
    lg: 'px-8 py-4 text-lg rounded-2xl'
  };

  // 7️⃣ Variant-specific classes with neon effects
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-neon-blue to-neon-purple
      text-white border-0
      hover:shadow-2xl hover:shadow-neon-blue/50
      hover:scale-105 active:scale-95
      focus:ring-neon-blue/50
    `,
    secondary: `
      bg-transparent border-2 border-neon-blue text-neon-blue
      hover:bg-neon-blue hover:text-black
      hover:shadow-lg hover:shadow-neon-blue/50
      hover:scale-105 active:scale-95
      focus:ring-neon-blue/50
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-pink-500
      text-white border-0
      hover:shadow-lg hover:shadow-red-500/50
      hover:scale-105 active:scale-95
      focus:ring-red-500/50
    `,
    ghost: `
      bg-white/5 backdrop-blur-sm border border-white/20 text-white
      hover:bg-white/10 hover:border-white/30
      hover:scale-105 active:scale-95
      focus:ring-white/50
    `
  };

  // 8️⃣ Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `;

  return (
    <Component
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {/* 9️⃣ Shimmer effect overlay for primary buttons */}
      {variant === 'primary' && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] skew-x-12 transition-transform duration-700 group-hover:translate-x-[100%]"></span>
      )}
      
      {/* 🔟 Button content with loading state */}
      <span className="relative flex items-center justify-center gap-2">
        {/* Loading spinner */}
        {loading && (
          <div className="loading-spinner w-4 h-4"></div>
        )}
        
        {/* Icon (if provided and not loading) */}
        {!loading && icon && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
        
        {/* Button text */}
        <span>
          {loading ? 'Loading...' : children}
        </span>
      </span>
    </Component>
  );
}

// 1️⃣1️⃣ Icon Button component for icon-only buttons
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode;
  'aria-label': string;
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'p-2 rounded-lg',
    md: 'p-3 rounded-xl',
    lg: 'p-4 rounded-2xl'
  };

  return (
    <Button
      variant={variant}
      className={`${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
    </Button>
  );
}

// 1️⃣2️⃣ Button Group component for related actions
interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className = '' }: ButtonGroupProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      {children}
    </div>
  );
}
