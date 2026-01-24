// components/layout/Container.tsx - UPDATED
interface ContainerProps {
  children: React.ReactNode
  className?: string
  fullWidthOnMobile?: boolean
}

export function Container({ 
  children, 
  className = '', 
  fullWidthOnMobile = false 
}: ContainerProps) {
  return (
    <div className={`
      mx-auto w-full 
      ${fullWidthOnMobile ? 'px-0 sm:px-6' : 'px-4 sm:px-6 lg:px-8'} 
      max-w-7xl 
      ${className}
    `}>
      {children}
    </div>
  )
}