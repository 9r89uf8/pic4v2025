'use client';

import React, { useState } from 'react';
import { AppBar, Toolbar, IconButton, Menu, MenuItem, Button, Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import DehazeIcon from '@mui/icons-material/Dehaze';
import { AccountCircle } from '@mui/icons-material';
import { useStore } from '../store/store'; // Ensure this path is correct according to your structure


const Navbar = () => {
    const router = useRouter();
    const user = useStore((state) => state.user);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };


    return (
        <AppBar position="static" sx={{ backgroundColor: '#16242f' }}>
            <Toolbar>
                <Box display="flex" alignItems="center" flexGrow={1}>
                    <img
                        src="https://chicagocarhelp.s3.us-east-2.amazonaws.com/Untitled+design+(2).png"
                        alt="logo"
                        style={{ width: 60, height: 'auto', marginRight: 4 }}
                    />
                    <Button color="inherit" onClick={() => router.push('/')}></Button>
                </Box>

                {/*<div>*/}
                {/*    <IconButton*/}
                {/*        size="large"*/}
                {/*        edge="end"*/}
                {/*        aria-label="account of current user"*/}
                {/*        aria-controls="menu-appbar"*/}
                {/*        aria-haspopup="true"*/}
                {/*        onClick={handleMenuOpen}*/}
                {/*        color="inherit"*/}
                {/*    >*/}
                {/*        <DehazeIcon />*/}
                {/*    </IconButton>*/}
                {/*</div>*/}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;



