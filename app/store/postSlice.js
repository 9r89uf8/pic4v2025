// store/postSlice.js
export const createPostSlice = (set) => ({
    posts: [],
    post: null,
    isLoading: {
        createPost: false,
        createAllPosts: false,
        deleteAllFromCurrentMonth: false,
    },
    checkLoading: false,
    setPost: (post) => set({ post }),
    setPosts: (posts) => set({ posts }),
    addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
    removePost: (id) => set((state) => ({ posts: state.posts.filter((post) => post.id !== id) })),
    updatePost: (updatedPost) => set((state) => ({
        posts: state.posts.map((post) => post.id === updatedPost.id ? updatedPost : post),
    })),
    setLoading: (action, isLoading) => set((state) => ({
        isLoading: { ...state.isLoading, [action]: isLoading }
    })),
    setCheckLoading: (checkLoading) => set({ checkLoading })

});
