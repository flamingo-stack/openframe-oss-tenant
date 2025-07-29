import React from 'react';
import { Card } from '@flamingo/ui-kit/components/ui';

interface AuthFormContainerProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const AuthFormContainer: React.FC<AuthFormContainerProps> = ({
  title,
  subtitle,
  children,
  maxWidth = 'md'
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center p-4">
      <Card className={`w-full ${maxWidthClasses[maxWidth]} p-6 bg-ods-card border-none rounded-2xl shadow-2xl`}>
        <div className="text-center mb-6">
          <h1 className="font-['Azeret_Mono'] font-semibold text-[24px] md:text-[32px] leading-[1.3333333333333333] md:leading-[1.25] tracking-[-0.02em] text-ods-text-primary mb-2">
            {title}
          </h1>
          <p className="font-['DM_Sans'] font-medium text-[14px] md:text-[18px] leading-[1.4285714285714286] md:leading-[1.3333333333333333] text-ods-text-secondary">
            {subtitle}
          </p>
        </div>
        
        {children}
      </Card>
    </div>
  );
};