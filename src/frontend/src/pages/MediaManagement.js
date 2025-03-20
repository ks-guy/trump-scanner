import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridToolbar,
  GridToolbarFilterButton,
  GridToolbarExport,
} from '@mui/x-data-grid';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

function MediaManagement() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    media_type: '',
    status: '',
    date_range: '',
  });

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
    },
    {
      field: 'source_url',
      headerName: 'Source URL',
      width: 300,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <span>{params.value}</span>
        </Tooltip>
      ),
    },
    {
      field: 'media_type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'video' ? 'primary' : 'secondary'}
          size="small"
        />
      ),
    },
    {
      field: 'download_status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'completed'
              ? 'success'
              : params.value === 'failed'
              ? 'error'
              : 'warning'
          }
          size="small"
        />
      ),
    },
    {
      field: 'file_size',
      headerName: 'Size',
      width: 120,
      valueFormatter: (params) => {
        if (params.value === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(params.value) / Math.log(k));
        return parseFloat((params.value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      },
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 180,
      valueFormatter: (params) => format(new Date(params.value), 'PPpp'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Play">
            <IconButton
              size="small"
              onClick={() => handlePlay(params.row)}
              disabled={params.row.download_status !== 'completed'}
            >
              <PlayIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton
              size="small"
              onClick={() => handleDownload(params.row)}
              disabled={params.row.download_status !== 'completed'}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Retry">
            <IconButton
              size="small"
              onClick={() => handleRetry(params.row)}
              disabled={params.row.download_status !== 'failed'}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDeleteClick(params.row)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  useEffect(() => {
    fetchMedia();
  }, [filters]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/media`, { params: filters });
      setMedia(response.data);
    } catch (err) {
      setError('Failed to fetch media content');
      console.error('Error fetching media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (media) => {
    // Implement video playback
    window.open(`${API_BASE_URL}/media/${media.id}/stream`, '_blank');
  };

  const handleDownload = (media) => {
    window.open(`${API_BASE_URL}/media/${media.id}/download`, '_blank');
  };

  const handleRetry = async (media) => {
    try {
      await axios.post(`${API_BASE_URL}/media/${media.id}/retry`);
      fetchMedia();
    } catch (err) {
      setError('Failed to retry media processing');
      console.error('Error retrying media:', err);
    }
  };

  const handleDeleteClick = (media) => {
    setSelectedMedia([media]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await Promise.all(
        selectedMedia.map((media) =>
          axios.delete(`${API_BASE_URL}/media/${media.id}`)
        )
      );
      setDeleteDialogOpen(false);
      setSelectedMedia([]);
      fetchMedia();
    } catch (err) {
      setError('Failed to delete media content');
      console.error('Error deleting media:', err);
    }
  };

  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Media Management</Typography>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setFilterDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDelete}
            disabled={selectedMedia.length === 0}
          >
            Delete Selected
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
        <DataGrid
          rows={media}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          checkboxSelection
          disableSelectionOnClick
          onSelectionModelChange={(newSelection) => {
            setSelectedMedia(
              newSelection.map((id) => media.find((item) => item.id === id))
            );
          }}
          components={{
            Toolbar: GridToolbar,
          }}
          componentsProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedMedia.length} media item(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)}>
        <DialogTitle>Filter Media</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                name="media_type"
                label="Media Type"
                value={filters.media_type}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="image">Image</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                name="status"
                label="Status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="date_range"
                label="Date Range"
                type="date"
                value={filters.date_range}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MediaManagement; 