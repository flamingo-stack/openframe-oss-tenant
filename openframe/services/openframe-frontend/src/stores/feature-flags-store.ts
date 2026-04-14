import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
}

export interface FeatureFlagsState {
  flags: Record<string, boolean>;
  isLoaded: boolean;
  setFlags: (flags: FeatureFlag[]) => void;
  setLoaded: () => void;
  reset: () => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  devtools(
    immer(set => ({
      flags: {},
      isLoaded: false,

      setFlags: flags =>
        set(state => {
          state.flags = {};
          for (const flag of flags) {
            state.flags[flag.name] = flag.enabled;
          }
          state.isLoaded = true;
        }),

      setLoaded: () =>
        set(state => {
          state.isLoaded = true;
        }),

      reset: () =>
        set(state => {
          state.flags = {};
          state.isLoaded = false;
        }),
    })),
    { name: 'feature-flags-store' },
  ),
);
