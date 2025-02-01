// store/store.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPostSlice } from './postSlice';
import {createPlaySlice} from "@/app/store/playSlice";
import {createHistorySlice} from "@/app/store/historySlice";


export const useStore = create(
    persist(
        (...a) => ({
            ...createPostSlice(...a),
            ...createPlaySlice(...a),
            ...createHistorySlice(...a)
        }),
        {
            name: 'pick4db', // unique name for the storage
            storage: createJSONStorage(() => localStorage), // use local storage
        }
    )
);

export default useStore;



