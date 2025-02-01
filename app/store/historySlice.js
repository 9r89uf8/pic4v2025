// store/postSlice.js
export const createHistorySlice = (set) => ({
    history: [],
    display: {},
    data: [],
    setHistory: (history) => set({history}),
    setDisplay: (display) => set({display}),
    setData: (data) => set({data}),
    clearHistory: () => set({ history: [], display: {} }),
});