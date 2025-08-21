'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to auth by default
    router.push('/auth')
  }, [router])

  return null
}