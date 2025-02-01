import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Grid,
    Paper,
    Divider,
    styled,
    Chip,
    Tooltip,
} from '@mui/material';
import ConnectionsVisualizer from "@/app/components/ConnectionsVisualizer";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    height: '100%',
    background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[8],
    },
}));

const PredictionNumber = styled(Typography)(({ theme }) => ({
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
}));

const MovementChip = styled(Chip)(({ trend, theme }) => ({
    margin: theme.spacing(1, 0),
    backgroundColor: trend === 'up'
        ? theme.palette.success.light
        : trend === 'down'
            ? theme.palette.error.light
            : theme.palette.grey[300],
    '& .MuiChip-icon': {
        color: trend === 'up'
            ? theme.palette.success.dark
            : trend === 'down'
                ? theme.palette.error.dark
                : theme.palette.grey[700],
    },
}));

const HistoryBox = styled(Box)(({ theme }) => ({
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
}));

const RangeIndicator = styled(Box)(({ inrange, theme }) => ({
    backgroundColor: inrange === 'true'
        ? theme.palette.success.light
        : 'transparent',
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const PatternChip = styled(Chip)(({ count, theme }) => ({
    margin: theme.spacing(0.5),
    backgroundColor: count === 3
        ? theme.palette.success.light
        : count === 2
            ? theme.palette.info.light
            : count === 1
                ? theme.palette.warning.light
                : theme.palette.error.light,
}));

const NumbersList = ({ combinations }) => {
    const isInRange = (number, position) => {
        if (position === 0) return [0, 1, 2].includes(Number(number));
        if (position === 1) return [3, 4, 5, 6].includes(Number(number));
        if (position === 2) return [7, 8, 9].includes(Number(number));
        return false;
    };


    if (!combinations || combinations.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Typography color="textSecondary">
                        No prediction data available
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card elevation={0} sx={{ backgroundColor: 'transparent' }}>
            <CardContent>

                <ConnectionsVisualizer numbers={combinations} />

                <Grid container spacing={3}>
                    {combinations.map((combination, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <StyledPaper elevation={3}>
                                {/* Prediction Section */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="overline" color="primary" gutterBottom>
                                        Prediction #{index + 1}
                                    </Typography>
                                    <Box display="flex" justifyContent="space-around" sx={{ mb: 2 }}>
                                        {combination.map((number, idx) => (
                                            <Box key={idx} textAlign="center">
                                                <PredictionNumber>
                                                    {number}
                                                </PredictionNumber>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </StyledPaper>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default NumbersList;