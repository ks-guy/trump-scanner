import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Autocomplete,
  Slider,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    media_type: [],
    date_range: null,
    file_size: [0, 1000], // MB
    status: [],
    sort_by: 'relevance',
  });

  const [stats, setStats] = useState({
    total_results: 0,
    media_types: {},
    date_distribution: {},
  });

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length >= 2) {
        try {
          const response = await axios.get(`${API_BASE_URL}/media/search/suggestions`, {
            params: { query },
          });
          setSuggestions(response.data);
        } catch (err) {
          console.error('Error fetching suggestions:', err);
        }
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/media/search/stats`);
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/media/search`, {
        params: {
          query,
          ...filters,
        },
      });
      setResults(response.data);
    } catch (err) {
      setError('Failed to perform search');
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setFilters({
      media_type: [],
      date_range: null,
      file_size: [0, 1000],
      status: [],
      sort_by: 'relevance',
    });
    handleSearch();
  };

  const handlePlay = (media) => {
    window.open(`${API_BASE_URL}/media/${media.id}/stream`, '_blank');
  };

  const handleDownload = (media) => {
    window.open(`${API_BASE_URL}/media/${media.id}/download`, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Search Media</Typography>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Autocomplete
              freeSolo
              options={suggestions}
              value={query}
              onChange={(event, newValue) => setQuery(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  placeholder="Search media content..."
                  onKeyPress={handleKeyPress}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Filters</Typography>
            <Button
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              disabled={Object.values(filters).every((v) => !v || v.length === 0)}
            >
              Clear All
            </Button>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Media Type"
                multiple
                value={filters.media_type}
                onChange={(e) => setFilters({ ...filters, media_type: e.target.value })}
                SelectProps={{
                  multiple: true,
                }}
              >
                {Object.entries(stats.media_types).map(([type, count]) => (
                  <option key={type} value={type}>
                    {type} ({count})
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Status"
                multiple
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                SelectProps={{
                  multiple: true,
                }}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Sort By"
                value={filters.sort_by}
                onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
              >
                <option value="relevance">Relevance</option>
                <option value="date_newest">Date (Newest)</option>
                <option value="date_oldest">Date (Oldest)</option>
                <option value="size_largest">Size (Largest)</option>
                <option value="size_smallest">Size (Smallest)</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>File Size (MB)</Typography>
              <Slider
                value={filters.file_size}
                onChange={(event, newValue) =>
                  setFilters({ ...filters, file_size: newValue })
                }
                valueLabelDisplay="auto"
                min={0}
                max={1000}
                step={10}
              />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption">{filters.file_size[0]} MB</Typography>
                <Typography variant="caption">{filters.file_size[1]} MB</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Found {results.length} results
          </Typography>
          <Grid container spacing={2}>
            {results.map((media) => (
              <Grid item xs={12} sm={6} md={4} key={media.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={`${API_BASE_URL}/media/${media.id}/thumbnail`}
                    alt={media.source_url}
                  />
                  <CardContent>
                    <Typography variant="subtitle2" noWrap>
                      {media.source_url}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Chip
                        label={media.media_type}
                        size="small"
                        color={media.media_type === 'video' ? 'primary' : 'secondary'}
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={media.download_status}
                        size="small"
                        color={
                          media.download_status === 'completed'
                            ? 'success'
                            : media.download_status === 'failed'
                            ? 'error'
                            : 'warning'
                        }
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {formatFileSize(media.file_size)}
                    </Typography>
                    <Box display="flex" justifyContent="flex-end" mt={2}>
                      <Tooltip title="Play">
                        <IconButton
                          size="small"
                          onClick={() => handlePlay(media)}
                          disabled={media.download_status !== 'completed'}
                        >
                          <PlayIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(media)}
                          disabled={media.download_status !== 'completed'}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}

export default Search; 