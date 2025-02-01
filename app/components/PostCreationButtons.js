import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress, Collapse } from '@mui/material';
import { createPost, createAllPosts, deleteAllFromCurrentMonth } from "@/app/services/postService";
import { useStore } from '@/app/store/store';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const PostActionButtons = () => {
    const [open, setOpen] = useState(false);
    const [action, setAction] = useState(null);
    const [showButtons, setShowButtons] = useState(false);
    const isLoading = useStore((state) => state.isLoading);
    const setLoading = useStore((state) => state.setLoading);

    const handleClickOpen = (actionType) => {
        setAction(actionType);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleConfirm = async () => {
        try {
            setLoading(action, true);
            switch(action) {
                case 'createPost':
                    await createPost();
                    break;
                case 'createAllPosts':
                    await createAllPosts();
                    break;
                case 'deleteAllFromCurrentMonth':
                    await deleteAllFromCurrentMonth();
                    break;
                default:
                    console.error('Unknown action');
            }
        } catch (error) {
            console.error(`Error executing ${action}:`, error);
        } finally {
            setLoading(action, false);
            setOpen(false);
        }
    };

    const getDialogTitle = () => {
        switch(action) {
            case 'createPost': return 'Confirm Create Post';
            case 'createAllPosts': return 'Confirm Create All Posts';
            case 'deleteAllFromCurrentMonth': return 'Confirm Delete All From Current Month';
            default: return 'Confirm Action';
        }
    };

    const getDialogContent = () => {
        switch(action) {
            case 'createPost': return 'Are you sure you want to create a post?';
            case 'createAllPosts': return 'Are you sure you want to create all posts?';
            case 'deleteAllFromCurrentMonth': return 'Are you sure you want to delete all posts from the current month?';
            default: return 'Are you sure you want to perform this action?';
        }
    };

    const LoadingButton = ({ action, color, gradient, children }) => (
        <Button
            variant="contained"
            color={color}
            onClick={() => handleClickOpen(action)}
            disabled={isLoading[action]}
            sx={{
                background: gradient,
                color: 'white',
                marginRight: 2,
                minWidth: '200px',
                margin: 1,
                position: 'relative',
            }}
        >
            {isLoading[action] && (
                <CircularProgress
                    size={24}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                    }}
                />
            )}
            {children}
        </Button>
    );

    return (
        <div>
            <Button
                onClick={() => setShowButtons(!showButtons)}
                variant="contained"
                color="primary"
                endIcon={showButtons ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                sx={{
                    marginBottom: 2,
                    background: 'linear-gradient(to right, #3f51b5, #2196f3)',
                    color: 'white',
                }}
            >
                {showButtons ? 'Hide Actions' : 'Show Actions'}
            </Button>

            <Collapse in={showButtons}>
                <div>
                    <LoadingButton
                        action="createPost"
                        color="primary"
                        gradient="linear-gradient(to right, #4CAF50, #45a049)"
                    >
                        Create Post
                    </LoadingButton>
                    <LoadingButton
                        action="createAllPosts"
                        color="secondary"
                        gradient="linear-gradient(to right, #2196F3, #1976D2)"
                    >
                        Create All Posts
                    </LoadingButton>
                    <LoadingButton
                        action="deleteAllFromCurrentMonth"
                        color="error"
                        gradient="linear-gradient(to right, #f44336, #d32f2f)"
                    >
                        Delete All From Current Month
                    </LoadingButton>
                </div>
            </Collapse>

            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {getDialogTitle()}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {getDialogContent()}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} color="primary" autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default PostActionButtons;