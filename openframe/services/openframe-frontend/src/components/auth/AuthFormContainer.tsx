import React from 'react';
import { Card } from '@flamingo/ui-kit/components/ui';

interface AuthFormContainerProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  error?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const AuthFormContainer: React.FC<AuthFormContainerProps> = ({
  title,
  subtitle,
  children,
  error,
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
        
        {error && (
          <div className="mb-4 p-4 bg-ods-error/10 border border-ods-error/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <svg className="w-4 h-4 text-ods-error" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-ods-error text-sm font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {children}
      </Card>
    </div>
  );
};