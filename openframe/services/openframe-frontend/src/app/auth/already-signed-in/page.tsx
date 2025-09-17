'use client'

import { useAuth } from '@app/auth/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Button } from '@flamingo/ui-kit/components/ui'
import { ArrowRightIcon } from 'lucide-react'
import { CheckCircleIcon } from '@flamingo/ui-kit/components/icons'

export default function AlreadySignedInPage() {
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-[#5EA62E]/20 mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-ods-text-primary">
            Already Signed In
          </h2>
          <p className="mt-2 text-ods-text-secondary">
            You are already authenticated in this auth-only mode.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-ods-surface border border-ods-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-ods-text-primary mb-2">
              Auth-Only Mode
            </h3>
            <p className="text-sm text-ods-text-secondary">
              This application is running in authentication-only mode. 
              Only login and signup functionality is available.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
            
            <button
              onClick={() => router.push('/auth')}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Auth
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
