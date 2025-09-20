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
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success/20 bg-success/20 mb-4">
            <CheckCircleIcon className="h-8 w-8 text-success text-success" />
          </div>
          <h2 className="text-3xl font-bold text-ods-text-primary">
            Already Signed In
          </h2>
          <p className="mt-2 text-ods-text-secondary">
            You are already authenticated in this auth-only mode.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-ods-bg-surface border border-ods-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-ods-text-primary mb-2">
              Auth-Only Mode
            </h3>
            <p className="text-sm text-ods-text-secondary">
              This application is running in authentication-only mode. 
              Only login and signup functionality is available.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full px-4 py-2 border border-ods-border rounded-md hover:bg-ods-bg-hover dark:border-ods-border dark:hover:bg-ods-bg-hover transition-colors"
            >
              Sign Out
            </Button>
            
            <Button
              onClick={() => router.push('/auth')}
              variant="secondary"
              className="w-full px-4 py-2 bg-ods-card hover:bg-ods-bg-hover rounded-md dark:bg-ods-card dark:hover:bg-ods-bg-hover transition-colors"
            >
              Back to Auth
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
