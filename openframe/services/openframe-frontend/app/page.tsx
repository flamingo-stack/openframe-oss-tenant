import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to auth by default
  redirect('/auth')
}