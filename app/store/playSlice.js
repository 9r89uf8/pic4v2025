// store/postSlice.js
export const createPlaySlice = (set) => ({
    numbers: [],
    setNumbers: (numbers) => set({numbers}),
    clearNumbers: () => set({ numbers: [] })
});