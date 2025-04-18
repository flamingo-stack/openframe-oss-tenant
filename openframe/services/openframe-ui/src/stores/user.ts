import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as any | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    setUser(user: any | null) {
      this.user = user;
    },
    setLoading(loading: boolean) {
      this.loading = loading;
    },
    setError(error: string | null) {
      this.error = error;
    },
  },
}); 