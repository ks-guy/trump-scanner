import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

const Dashboard = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to metrics dashboard
        navigate('/metrics');
    }, [navigate]);

    return (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh' 
        }}>
            <CircularProgress />
        </Box>
    );
};

export default Dashboard; 