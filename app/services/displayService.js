import { useStore } from '../store/store'; // Ensure you import the correct store

export const setDisplayInfo = async () => {
    const setDisplay = useStore.getState().setDisplay;
    try {
        const response = await fetch('/api/display/create',{
            method: 'GET',
            cache: 'no-store'
        });

        if (response.ok) {
            const numbers = await response.json();
            setDisplay(numbers);
            return numbers;
        } else {
            throw new Error('Failed to fetch posts');
        }
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const getDisplayInfo = async () => {
    const setDisplay = useStore.getState().setDisplay;
    try {
        const response = await fetch('/api/display/get',{
            method: 'GET',
            cache: 'no-store'
        });

        if (response.ok) {
            const numbers = await response.json();
            setDisplay(numbers);
            return numbers;
        } else {
            throw new Error('Failed to fetch posts');
        }
    } catch (error) {
        console.error(error);
        return [];
    }
};