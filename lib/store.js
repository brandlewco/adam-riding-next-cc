import { create } from 'zustand';
const useStore = create(set => ({
  isInitialLoad: true,
  setInitialLoad: (value) => set({ isInitialLoad: value })
}));

export default useStore;
