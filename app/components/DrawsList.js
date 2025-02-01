import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    Chip,
    styled,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Today, AccessTime } from '@mui/icons-material';

const StyledCard = styled(Card)(({ theme }) => ({
    width: '100%',
    background: `linear-gradient(
        135deg,
        ${alpha('#1a237e', 0.95)},
        ${alpha('#0d47a1', 0.85)}
    )`,
    backdropFilter: 'blur(16px)',
    borderRadius: theme.spacing(3),
    border: `1px solid ${alpha('#ffffff', 0.12)}`,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 28px ${alpha(theme.palette.secondary.main, 0.25)}`,
    },
}));

const NumberBox = styled(Box)(({ theme }) => ({
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(2),
    background: alpha(theme.palette.common.white, 0.1),
    backdropFilter: 'blur(8px)',
    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '70px',
    transition: 'all 0.2s ease',
    '&:hover': {
        background: alpha(theme.palette.common.white, 0.15),
        transform: 'scale(1.05)',
    },
}));

const StatusChip = styled(Chip)(({ isvalid, theme }) => ({
    background: isvalid
        ? `linear-gradient(135deg, ${alpha('#00c853', 0.95)}, ${alpha('#00e676', 0.85)})`
        : `linear-gradient(135deg, ${alpha('#d50000', 0.95)}, ${alpha('#ff1744', 0.85)})`,
    color: theme.palette.common.white,
    fontWeight: 600,
    padding: theme.spacing(0.75, 2),
    height: 32,
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    border: `1px solid ${alpha('#ffffff', 0.2)}`,
    boxShadow: isvalid
        ? `0 2px 8px ${alpha('#00e676', 0.4)}`
        : `0 2px 8px ${alpha('#ff1744', 0.4)}`,
    '&:hover': {
        transform: 'scale(1.05)',
        boxShadow: isvalid
            ? `0 4px 12px ${alpha('#00e676', 0.6)}`
            : `0 4px 12px ${alpha('#ff1744', 0.6)}`,
    },
}));

const FireballBox = styled(Box)(({ theme }) => ({
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: `radial-gradient(
        circle at 30% 30%,
        #ffd700 25%,
        #ff4500 60%,
        #ff0000 100%
    )`,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette.common.white,
    fontWeight: 700,
}));

// Updated validation function for a sorted 4-digit draw with the new ranges
const validateSortedDraw = (sortedNums) => {
    if (sortedNums.length !== 4) return false;
    const [first, second, third, fourth] = sortedNums;
    const allDistinct =
        first !== second &&
        first !== third &&
        first !== fourth &&
        second !== third &&
        second !== fourth &&
        third !== fourth;
    return (
        allDistinct &&
        first >= 0 && first <= 2 &&
        second >= 2 && second <= 5 &&
        third >= 4 && third <= 7 &&
        fourth >= 7 && fourth <= 9
    );
};

const DrawList = ({ draws }) => {
    return (
        <Grid container spacing={3} sx={{ p: 3 }}>
            {draws?.slice(0, 62).map((item, index) => {
                const rawNumbers = [
                    Number(item.sortedFirstNumber),
                    Number(item.sortedSecondNumber),
                    Number(item.sortedThirdNumber),
                    Number(item.sortedFourthNumber),
                ];
                // If the numbers are already sorted, this step is optional.
                const sortedNums = [...rawNumbers].sort((a, b) => a - b);
                const drawIsValid = validateSortedDraw(sortedNums);

                return (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <StyledCard elevation={8}>
                            <CardContent sx={{ p: 3 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        mb: 3,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 2,
                                            mb: 3,
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {rawNumbers.map((num, idx) => (
                                            <NumberBox key={idx}>
                                                <Typography
                                                    variant="h4"
                                                    sx={{
                                                        color: 'common.white',
                                                        fontWeight: 700,
                                                        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    }}
                                                >
                                                    {num}
                                                </Typography>
                                            </NumberBox>
                                        ))}
                                    </Box>

                                    <FireballBox>
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                color: 'common.white',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                            }}
                                        >
                                            {item.fireball ?? '?'}
                                        </Typography>
                                    </FireballBox>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 1,
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <StatusChip
                                            label={drawIsValid ? 'VALID' : 'INVALID'}
                                            isvalid={drawIsValid}
                                        />
                                        {item.isValidFireball && (
                                            <StatusChip label="VALID FIREBALL" isvalid={true} />
                                        )}
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 3,
                                            color: 'common.white',
                                            opacity: 0.9,
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <Today sx={{ fontSize: 20 }} />
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {item.drawDate}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <AccessTime sx={{ fontSize: 20 }} />
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {item.time}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </CardContent>
                        </StyledCard>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default DrawList;
