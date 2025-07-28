import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@flamingo/ui-kit/components/ui';
import { Input } from '@flamingo/ui-kit/components/ui';
import { ProviderButton } from '../components/auth/ProviderButton';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await register(email, password, firstName, lastName);
      // Navigation will happen automatically via the auth state change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'microsoft') => {
    try {
      console.log(`🔑 [OAuth] Starting ${provider} OAuth registration`);
      // TODO: Implement OAuth registration logic
      console.log(`✅ [OAuth] ${provider} OAuth registration successful`);
    } catch (err) {
      console.error(`❌ [OAuth] ${provider} OAuth registration failed:`, err);
      setError(err instanceof Error ? err.message : `${provider} registration failed. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ods-bg p-4">
      <div className="w-full max-w-[400px] md:max-w-[600px] bg-[#161616] border-none rounded-2xl p-6 md:p-10 shadow-2xl">
        
        {/* Header Section */}
        <div className="flex flex-col items-center gap-1 md:gap-2 mb-8">
          <h1 className="font-['Azeret_Mono'] font-semibold text-[24px] md:text-[32px] leading-[1.3333333333333333] md:leading-[1.25] tracking-[-0.02em] text-ods-text-primary text-center">
            Create account
          </h1>
          <p className="font-['DM_Sans'] font-medium text-[14px] md:text-[18px] leading-[1.4285714285714286] md:leading-[1.3333333333333333] text-ods-text-primary text-center">
            Join OpenFrame to manage your infrastructure
          </p>
        </div>

        {/* OAuth Provider Buttons */}
        <div className="flex flex-col gap-4 mb-8">
          <ProviderButton
            provider="google"
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
          />
          <ProviderButton
            provider="microsoft"
            onClick={() => handleOAuthLogin('microsoft')}
            disabled={isLoading}
          />
        </div>

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-ods-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#161616] px-2 text-ods-text-secondary">Or continue with email</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#2A1F1F] border border-[#6B2C2C] rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#FF6B6B]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-[#FF6B6B] text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2 text-ods-text-primary">
                First Name
              </label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2 text-ods-text-primary">
                Last Name
              </label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-ods-text-primary">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-ods-text-primary">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            variant="primary"
            size="lg"
            loading={isLoading}
            className="w-full"
          >
            Create account
          </Button>
        </form>

        {/* Footer Text */}
        <div className="text-center mt-8">
          <p className="font-['DM_Sans'] font-medium text-[14px] md:text-[18px] leading-[1.4285714285714286] md:leading-[1.3333333333333333] text-ods-text-primary text-center max-w-[320px] mx-auto">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-ods-accent hover:text-ods-accent/80 underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
          <p className="font-['DM_Sans'] font-medium text-[14px] md:text-[18px] leading-[1.4285714285714286] md:leading-[1.3333333333333333] text-ods-text-primary text-center max-w-[320px] mx-auto mt-4">
            By creating an account, you agree to our{' '}
            <a
              href="/terms-of-service"
              className="text-ods-accent hover:text-ods-accent/80 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy-policy"
              className="text-ods-accent hover:text-ods-accent/80 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};