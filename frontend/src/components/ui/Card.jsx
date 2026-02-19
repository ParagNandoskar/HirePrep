import React from 'react'

const Card = ({ 
  children, 
  variant = 'default', 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'rounded-2xl p-8'
  
  const variants = {
    default: 'bg-white shadow-sm border',
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    tertiary: 'bg-tertiary text-text',
    light: 'bg-background-primary',
    muted: 'bg-background-secondary'
  }
  
  const classes = `${baseClasses} ${variants[variant]} ${className}`
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export default Card