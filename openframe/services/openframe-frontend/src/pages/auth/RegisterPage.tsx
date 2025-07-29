import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

interface PasswordStrength {
  percentage: number;
  class: 'weak' | 'medium' | 'strong' | '';
  label: string;
}

export const RegisterPage = () => {
  const navigate = useNavigate();
  const authStore = useAuthStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePasswordStrength = (pwd: string): PasswordStrength => {
    if (!pwd) return { percentage: 0, class: '', label: '' };

    let strength = 0;
    let checks = 0;

    // Length check
    if (pwd.length >= 8) {
      strength += 25;
      checks++;
    }

    // Contains number
    if (/\d/.test(pwd)) {
      strength += 25;
      checks++;
    }

    // Contains lowercase
    if (/[a-z]/.test(pwd)) {
      strength += 25;
      checks++;
    }

    // Contains uppercase
    if (/[A-Z]/.test(pwd)) {
      strength += 25;
      checks++;
    }

    let strengthClass: 'weak' | 'medium' | 'strong' | '' = '';
    let label = '';

    if (checks === 4) {
      strengthClass = 'strong';
      label = 'Strong';
    } else if (checks >= 2) {
      strengthClass = 'medium';
      label = 'Medium';
    } else {
      strengthClass = 'weak';
      label = 'Weak';
    }

    return {
      percentage: strength,
      class: strengthClass,
      label
    };
  };

  const passwordStrength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !firstName || !lastName) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength.percentage < 50) {
      setError('Password is too weak. Please use a stronger password.');
      return;
    }

    try {
      setLoading(true);
      await authStore.register(email, password, firstName, lastName);
      console.log('✅ [Register] Registration successful, redirecting to dashboard');
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      console.error('❌ [Register] Registration failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center p-4">
      <div className="bg-ods-card rounded-lg shadow-lg p-6 w-full max-w-2xl border border-ods-border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-ods-text-primary mb-2">Create Account</h1>
          <p className="text-ods-text-secondary">Join OpenFrame and start your journey</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-ods-text-primary mb-2">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-ods-bg border border-ods-border rounded-md focus:outline-none focus:ring-2 focus:ring-ods-accent text-ods-text-primary"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-ods-text-primary mb-2">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-ods-bg border border-ods-border rounded-md focus:outline-none focus:ring-2 focus:ring-ods-accent text-ods-text-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ods-text-primary mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-ods-bg border border-ods-border rounded-md focus:outline-none focus:ring-2 focus:ring-ods-accent text-ods-text-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ods-text-primary mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pr-10 px-3 py-2 bg-ods-bg border border-ods-border rounded-md focus:outline-none focus:ring-2 focus:ring-ods-accent text-ods-text-primary"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ods-text-secondary hover:text-ods-text-primary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
              {password && (
                <div className="absolute left-0 right-0 mt-1">
                  <div className="h-1 bg-ods-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.class === 'strong' ? 'bg-green-500' :
                        passwordStrength.class === 'medium' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-ods-text-secondary mt-1 block">
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-ods-text-primary mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pr-10 px-3 py-2 bg-ods-bg border border-ods-border rounded-md focus:outline-none focus:ring-2 focus:ring-ods-accent text-ods-text-primary"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ods-text-secondary hover:text-ods-text-primary"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ods-accent text-white py-2 px-4 rounded-md hover:bg-ods-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-ods-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-ods-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};