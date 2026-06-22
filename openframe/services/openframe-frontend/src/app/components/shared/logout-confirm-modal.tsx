'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useState } from 'react';
import { useLogoutConfirmStore } from '@/app/(auth)/auth/stores/logout-confirm-store';
import { performLogout } from '@/app/(auth)/auth/utils/auth-actions';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { handleApiError } from '@/lib/handle-api-error';

/**
 * Logout confirmation dialog. Reads its open state from `useLogoutConfirmStore`
 * so any trigger (Settings "Log Out" button, navigation user menu) can open it.
 * Mounted once in `AppShell`.
 *
 * `performLogout` redirects the browser on success, so the modal is not closed
 * manually after confirm — the pending state stays visible until navigation.
 */
export function LogoutConfirmModal() {
  const { toast } = useToast();
  const isOpen = useLogoutConfirmStore(state => state.isOpen);
  const setOpen = useLogoutConfirmStore(state => state.setOpen);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsPending(true);
    try {
      await performLogout();
    } catch (error) {
      // performLogout normally redirects on success; on failure re-enable the
      // action so the modal isn't stuck, and surface the error to the user.
      setIsPending(false);
      handleApiError(error, toast, 'Failed to log out');
    }
  }, [toast]);

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={setOpen}
      title="Log Out"
      description="You'll be signed out of your OpenFrame account on this device."
      confirmLabel="Confirm"
      cancelLabel="Cancel"
      variant="destructive"
      isPending={isPending}
      pendingLabel="Logging Out..."
      onConfirm={handleConfirm}
    />
  );
}
