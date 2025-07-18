import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  InputBase,
  IconButton,
  useTheme,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import { 
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  ErrorOutline as ErrorIcon,
  Clear as ClearIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  searchAssessments, 
  searchQuestions,
  debouncedSearch 
} from '../services/searchService';
import PropTypes from 'prop-types';

const SearchResultItem = ({ result, onClick, type = 'assessment' }) => {
  const theme = useTheme();
  
  return (
    <ListItem 
      button 
      onClick={onClick}
      sx={{
        '&:hover': {
          backgroundColor: theme.palette.action.hover
        }
      }}
    >
      <ListItemIcon>
        {type === 'question' ? (
          <QuizIcon color="secondary" />
        ) : (
          <AssessmentIcon color="primary" />
        )}
      </ListItemIcon>
      <ListItemText
        primary={result.title || result.text}
        secondary={
          type === 'question' 
            ? `From: ${result.assessmentTitle}`
            : result.description || 'No description available'
        }
        secondaryTypographyProps={{ noWrap: true }}
      />
      <Chip 
        label={type === 'question' ? 'Question' : result.type} 
        size="small" 
        variant="outlined"
        sx={{ ml: 2 }}
      />
    </ListItem>
  );
};

SearchResultItem.propTypes = {
  result: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['assessment', 'question'])
};

const SearchTabs = ({ activeTab, onChange, assessmentCount, questionCount }) => {
  return (
    <Tabs 
      value={activeTab} 
      onChange={onChange}
      variant="fullWidth"
      sx={{ mb: 3 }}
    >
      <Tab 
        label={
          <Badge badgeContent={assessmentCount} color="primary">
            Assessments
          </Badge>
        } 
        value="assessments" 
      />
      <Tab 
        label={
          <Badge badgeContent={questionCount} color="secondary">
            Questions
          </Badge>
        } 
        value="questions" 
      />
    </Tabs>
  );
};

SearchTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  assessmentCount: PropTypes.number.isRequired,
  questionCount: PropTypes.number.isRequired
};

export default function SearchPage() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('assessments');
  const [assessmentResults, setAssessmentResults] = useState([]);
  const [questionResults, setQuestionResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const searchQuery = new URLSearchParams(location.search).get('q') || '';
    setQuery(searchQuery);
    
    if (searchQuery && currentUser?.uid) {
      setLoading(true);
      debouncedSearch(
        searchQuery, 
        currentUser.uid,
        (results, error) => {
          if (error) {
            setError(error);
          } else {
            if (activeTab === 'assessments') {
              setAssessmentResults(results);
            } else {
              setQuestionResults(results);
            }
          }
          setLoading(false);
        },
        activeTab
      );
    } else {
      setAssessmentResults([]);
      setQuestionResults([]);
    }
  }, [location.search, currentUser?.uid, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    navigate('/search');
  };

  const handleResultClick = (result) => {
    if (activeTab === 'questions') {
      navigate(`/assessments/${result.assessmentId}?question=${result.id}`);
    } else {
      navigate(`/assessments/${result.id}`);
    }
  };

  const currentResults = activeTab === 'assessments' 
    ? assessmentResults 
    : questionResults;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Search Bar */}
      <Paper
        component="form"
        onSubmit={handleSearchSubmit}
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          mb: 3,
          borderRadius: 2,
          boxShadow: theme.shadows[1]
        }}
      >
        <InputBase
          fullWidth
          placeholder="Search assessments, questions, or templates..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ ml: 2, flex: 1 }}
          inputProps={{ 'aria-label': 'search assessments' }}
        />
        <IconButton 
          type="button" 
          onClick={handleClearSearch}
          disabled={!query}
          aria-label="clear search"
        >
          <ClearIcon />
        </IconButton>
        <Divider orientation="vertical" sx={{ height: 28, m: 0.5 }} />
        <IconButton 
          type="submit" 
          color="primary" 
          aria-label="search"
          disabled={!query.trim()}
        >
          <SearchIcon />
        </IconButton>
      </Paper>

      {/* Search Tabs */}
      {query && (
        <SearchTabs
          activeTab={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          assessmentCount={assessmentResults.length}
          questionCount={questionResults.length}
        />
      )}

      {/* Results Section */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          p: 4,
          color: theme.palette.error.main
        }}>
          <ErrorIcon fontSize="large" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {error}
          </Typography>
        </Box>
      ) : query && currentResults.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: 'center', p: 4 }}>
          No {activeTab} found for "{query}"
        </Typography>
      ) : currentResults.length > 0 ? (
        <>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {currentResults.length} {activeTab}{currentResults.length !== 1 ? 's' : ''} for "{query}"
          </Typography>
          <Paper elevation={0} sx={{ borderRadius: 2 }}>
            <List disablePadding>
              {currentResults.map((result, index) => (
                <React.Fragment key={result.id || `${result.assessmentId}-${result.id}`}>
                  <SearchResultItem 
                    result={result} 
                    onClick={() => handleResultClick(result)}
                    type={activeTab === 'questions' ? 'question' : 'assessment'}
                  />
                  {index < currentResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          p: 4,
          textAlign: 'center'
        }}>
          <SearchIcon fontSize="large" color="action" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Search for assessments, questions, or templates
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter a search term in the field above to get started
          </Typography>
        </Box>
      )}
    </Box>
  );
}
