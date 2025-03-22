import React from 'react';
import { Paper, Box, Typography, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const MetricsCard = ({ title, value, format, subtitle, trend }) => {
    const theme = useTheme();

    const getTrendColor = (current, average) => {
        if (!average) return theme.palette.text.secondary;
        return current > average 
            ? theme.palette.error.main 
            : theme.palette.success.main;
    };

    const getTrendIcon = (current, average) => {
        if (!average) return null;
        return current > average ? <TrendingUp /> : <TrendingDown />;
    };

    return (
        <Paper
            sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Typography variant="h6" color="textSecondary" gutterBottom>
                {title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                <Typography
                    variant="h3"
                    component="div"
                    sx={{ fontWeight: 'medium' }}
                >
                    {format ? format(value) : value}
                </Typography>
                
                {trend && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            ml: 2,
                            color: getTrendColor(value, trend)
                        }}
                    >
                        {getTrendIcon(value, trend)}
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                            vs {format ? format(trend) : trend} avg
                        </Typography>
                    </Box>
                )}
            </Box>

            {subtitle && (
                <Typography variant="body2" color="textSecondary">
                    {subtitle}
                </Typography>
            )}

            {/* Background indicator */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: 4,
                    bgcolor: theme.palette.primary.main,
                    opacity: 0.2,
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${Math.min(value, 100)}%`,
                        bgcolor: theme.palette.primary.main
                    }
                }}
            />
        </Paper>
    );
};

export default MetricsCard; 