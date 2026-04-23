import { RedditClickIdCapture } from './components/reddit-click-id-capture';

export const metadata = {
  title: 'OpenFrame - Authentication',
  description: 'Sign in to your OpenFrame account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RedditClickIdCapture />
      {children}
    </>
  );
}
