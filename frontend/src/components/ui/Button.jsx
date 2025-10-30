import React from 'react'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'font-medium transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 active:scale-95'
  
  const variants = {
    primary: 'bg-primary hover:bg-white text-white hover:text-primary border-2 border-primary hover:border-primary focus:ring-primary-500',
    secondary: 'bg-secondary hover:bg-white text-white hover:text-secondary border-2 border-secondary hover:border-secondary focus:ring-secondary-500',
    tertiary: 'bg-tertiary hover:bg-primary text-text hover:text-white border-2 border-tertiary hover:border-primary focus:ring-tertiary-500',
    outline: 'border-2 border-primary bg-transparent hover:bg-primary text-primary hover:text-white focus:ring-primary-500'
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-md',
    md: 'px-6 py-2 text-sm rounded-lg',
    lg: 'px-8 py-3 text-base rounded-full'
  }
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button