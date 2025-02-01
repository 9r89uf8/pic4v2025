'use client';
import React, { useEffect, useState } from 'react';
import { fetchPosts } from './services/postService';
import DrawsList from "@/app/components/DrawsList";
import ProbabilityTable from "@/app/components/ProbabilityTable";
import StatsDisplay from "@/app/components/StatsDisplay";
import {
  Button,
  List,
  Container,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  IconButton,
  ButtonGroup,
  Collapse,
} from '@mui/material';
import { alpha, styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useStore } from '@/app/store/store';
import { playCombo, playStraight, checkDraws } from "@/app/services/playService";
import NumbersList from "@/app/components/NumbersList";
import PostCreationButtons from "@/app/components/PostCreationButtons";
import { getDisplayInfo } from "@/app/services/displayService";

const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  marginTop: 15,
  color: '#ffffff',
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  borderRadius: 10,
  border: `1px solid ${alpha('#ffffff', 0.2)}`,
}));

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  width: '40px',
  height: '40px',
  fontSize: 30,
  margin: '4px',
  borderRadius: '8px',
  color: '#ffffff',
  border: `1px solid ${alpha('#ffffff', 0.3)}`,
  '&.Mui-selected': {
    backgroundColor: alpha('#9f0000', 0.6),
    color: '#000000',
    '&:hover': {
      backgroundColor: alpha('#9f0000', 0.8),
    },
  },
  '&:hover': {
    backgroundColor: alpha('#ffffff', 0.1),
  },
}));

const ExpandButton = styled(IconButton)(({ theme }) => ({
  color: '#ffffff',
  margin: theme.spacing(1),
  transition: 'transform 0.3s',
  '&:hover': {
    backgroundColor: alpha('#ffffff', 0.1),
  },
}));

const HomePage = () => {
  const posts = useStore((state) => state.posts);
  const numbers = useStore((state) => state.numbers);
  const display = useStore((state) => state.display);
  const [loading, setLoading] = useState(false);
  const clearNumbers = useStore((state) => state.clearNumbers);
  const [showDashboard, setShowDashboard] = useState(false);
  const [expandSection, setExpandSection] = useState(false);

  const [excludedNumbers, setExcludedNumbers] = useState({
    first: [],
    second: [],
    third: []
  });

  useEffect(() => {
    const getPosts = async () => {
      await fetchPosts();
      await getDisplayInfo()

    };
    getPosts();
  }, []);

  const handleNumberToggle = (position, value) => {
    setExcludedNumbers(prev => ({
      ...prev,
      [position]: prev[position].includes(value)
          ? prev[position].filter(n => n !== value)
          : [...prev[position], value]
    }));
  };

  const handleCombo = async () => {
    setLoading(true);
    await playCombo({ excludedNumbers });
    // await checkDraws();
    setLoading(false);
  };

  const handleStraight = async () => {
    setLoading(true);
    await playStraight({ excludedNumbers });
    setLoading(false);
  };

  const handleCheck = async () => {
    await checkDraws();
  };


  const handleClear = () => {
    clearNumbers();
    setExcludedNumbers({ first: [], second: [], third: [] });
  };

  const renderNumberSelection = (position, numbers, label) => (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
          {label}
        </Typography>
        <ToggleButtonGroup value={excludedNumbers[position]} sx={{ flexWrap: 'wrap' }}>
          {numbers.map((number) => (
              <StyledToggleButton
                  key={number}
                  value={number}
                  selected={excludedNumbers[position].includes(number)}
                  onChange={() => handleNumberToggle(position, number)}
              >
                {number}
              </StyledToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
  );

  return (
      <Box sx={{ width: '100%' }}>
        <Container maxWidth="sm">
          <Item elevation={4}>
            <Typography variant="h6" sx={{ mb: 2, color: '#ffc300' }}>
              Select Numbers to Exclude
            </Typography>

            <Stack spacing={3}>
              {renderNumberSelection('first', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'First Position')}
              {renderNumberSelection('second', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'Second Position')}
              {renderNumberSelection('third', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'Third Position')}
            </Stack>

            <ButtonGroup variant="contained" aria-label="Basic button group">
              <Button
                  variant="contained"
                  disabled={loading}
                  size="large"
                  onClick={handleCombo}
                  sx={{
                    mt: 3,
                    mb: 1,
                    background: 'linear-gradient(to right, #f8f9fa, #e9ecef)',
                    color: 'black',
                    minWidth: 200,
                  }}
              >
                Combo
              </Button>

              <Button
                  variant="contained"
                  disabled={loading}
                  size="large"
                  onClick={handleStraight}
                  sx={{
                    mt: 3,
                    mb: 1,
                    background: 'linear-gradient(to right, #f8f9fa, #e9ecef)',
                    color: 'black',
                    minWidth: 200,
                  }}
              >
                Straight
              </Button>
            </ButtonGroup>

            <Button
                variant="contained"
                disabled={loading}
                size="large"
                onClick={handleCheck}
                sx={{
                  mt: 3,
                  mb: 1,
                  background: 'linear-gradient(to right, #f8f9fa, #e9ecef)',
                  color: 'black',
                  minWidth: 200,
                }}
            >
              Check
            </Button>

            {numbers && numbers.length > 0 && (
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Button
                      variant="contained"
                      size="large"
                      onClick={handleClear}
                      sx={{
                        mt: 2,
                        background: 'linear-gradient(to right, #ef233c, #d90429)',
                        color: 'black',
                      }}
                  >
                    Clear
                  </Button>
                  <List>
                    <NumbersList combinations={numbers} />
                  </List>
                </Box>
            )}


            {display && (
                <StatsDisplay display={display} />
            )}


          </Item>

          <ProbabilityTable/>


          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <ExpandButton
                onClick={() => setExpandSection(!expandSection)}
                aria-label="expand section"
            >
              {expandSection ? <KeyboardArrowUpIcon fontSize='large'/> : <KeyboardArrowDownIcon fontSize='large'/>}
            </ExpandButton>
          </Box>

          <Collapse in={expandSection}>
            <Item elevation={4}>
              <PostCreationButtons />
            </Item>
          </Collapse>

          {posts.length > 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center">
                <List>
                  <DrawsList draws={posts} />
                </List>
              </Box>
          ) : (
              <Typography sx={{ textAlign: 'center', mt: 2 }}>No posts available</Typography>
          )}
        </Container>
      </Box>
  );
};

export default HomePage;