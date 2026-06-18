'use client';

import { useCallback, useState } from 'react';
import { useLogoutConfirmStore } from '@/app/(auth)/auth/stores/logout-confirm-store';
import { performLogout } from '@/app/(auth)/auth/utils/auth-actions';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

/**
 * Logout confirmation dialog. Reads its open state from `useLogoutConfirmStore`
 * so any trigger (Settings "Log Out" button, navigation user menu) can open it.
 * Mounted once in `AppShell`.
 *
 * `performLogout` redirects the browser on success, so the modal is not closed
 * manually after confirm — the pending state stays visible until navigation.
 */
export function LogoutConfirmModal() {
  const isOpen = useLogoutConfirmStore(state => state.isOpen);
  const setOpen = useLogoutConfirmStore(state => state.setOpen);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = useCallback(() => {
    setIsPending(true);
    performLogout();
  }, []);

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
