import { create } from 'zustand'

const useNotificationStore = create((set, get) => ({
  unreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: count }),

  increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  decrement: () =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  reset: () => set({ unreadCount: 0 }),
}))

export default useNotificationStore
