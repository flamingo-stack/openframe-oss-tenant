import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Owns the open state of the logout confirmation modal, lifted into a store so
 * it can be triggered from anywhere — the Settings page "Log Out" button and
 * the navigation user menu both live in separate subtrees but must open the
 * same confirmation dialog (mounted once in `AppShell`).
 *
 * Mirrors the `mingo-launcher-store` "open from anywhere" pattern.
 */
interface LogoutConfirmStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useLogoutConfirmStore = create<LogoutConfirmStore>()(
  devtools(
    set => ({
      isOpen: false,
      open: () => set({ isOpen: true }, false, 'open'),
      close: () => set({ isOpen: false }, false, 'close'),
      setOpen: open => set({ isOpen: open }, false, 'setOpen'),
    }),
    { name: 'logout-confirm-store' },
  ),
);
