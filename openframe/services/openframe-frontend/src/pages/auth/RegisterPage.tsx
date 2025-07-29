import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@flamingo/ui-kit/components/ui';
import { useToast } from '@flamingo/ui-kit/hooks';
import { useAuthStore } from '@/stores/auth';
import { AuthFormContainer } from '@/components/auth/AuthFormContainer';
import { FormField } from '@/components/auth/FormField';
import { PasswordField } from '@/components/auth/PasswordField';


export const RegisterPage = () => {
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await authStore.register(email, password, firstName, lastName);
      console.log('✅ [Register] Registration successful, redirecting to dashboard');
      
      toast({
        title: "Welcome to OpenFrame!",
        description: "Your account has been created successfully",
        variant: "success"
      });
      
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed. Please try again.';
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive"
      });
      console.error('❌ [Register] Registration failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFormContainer
      title="Create Account"
      subtitle="Join OpenFrame and start your journey"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="firstName"
            label="First Name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
          />
          <FormField
            id="lastName"
            label="Last Name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>

        <FormField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          showStrength={true}
          required
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={isLoading}
          onClick={handleRegister}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </div>

      <div className="text-center mt-6">
        <p className="text-ods-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-ods-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthFormContainer>
  );
};