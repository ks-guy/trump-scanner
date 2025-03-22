import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Cancel as CancelIcon,
  Replay as RetryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );
}

function Media() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaStats, setMediaStats] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateRange: 'all',
  });

  const [batches, setBatches] = useState([]);
  const [batchUploadDialogOpen, setBatchUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchOptions, setBatchOptions] = useState({
    processImmediately: true,
    generateThumbnails: true,
    thumbnailSize: { width: 200, height: 200 },
    compressionLevel: 7,
    outputFormat: 'original',
    watermark: { enabled: false }
  });
  const [batchUploadProgress, setBatchUploadProgress] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [expandedBatch, setExpandedBatch] = useState(null);

  useEffect(() => {
    fetchMedia();
    fetchBatches();
    fetchMediaStats();
  }, [filters]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/media`, { params: filters });
      setMedia(response.data);
    } catch (err) {
      setError('Failed to fetch media');
      console.error('Error fetching media:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/batch`);
      setBatches(response.data);
    } catch (err) {
      setError('Failed to fetch batches');
      console.error('Error fetching batches:', err);
    }
  };

  const fetchMediaStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/media/stats`);
      setMediaStats(response.data);
    } catch (err) {
      console.error('Error fetching media stats:', err);
    }
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files.length) return;

    try {
      setUploadProgress(0);
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      await axios.post(`${API_BASE_URL}/media/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setUploadDialogOpen(false);
      fetchMedia();
      fetchMediaStats();
    } catch (err) {
      setError('Failed to upload media');
      console.error('Error uploading media:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await Promise.all(
        selectedMedia.map(id => axios.delete(`${API_BASE_URL}/media/${id}`))
      );
      setDeleteDialogOpen(false);
      setSelectedMedia([]);
      fetchMedia();
      fetchMediaStats();
    } catch (err) {
      setError('Failed to delete media');
      console.error('Error deleting media:', err);
    }
  };

  const handleDownload = async (mediaId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/media/${mediaId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `media-${mediaId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download media');
      console.error('Error downloading media:', err);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedMedia(media.map(item => item.id));
    } else {
      setSelectedMedia([]);
    }
  };

  const handleSelectOne = (mediaId) => {
    setSelectedMedia(prev => {
      if (prev.includes(mediaId)) {
        return prev.filter(id => id !== mediaId);
      }
      return [...prev, mediaId];
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleBatchUpload = async () => {
    try {
      setBatchUploadProgress(0);
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('options', JSON.stringify(batchOptions));

      const response = await axios.post(`${API_BASE_URL}/batch`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setBatchUploadProgress(percentCompleted);
        },
      });

      setBatchUploadDialogOpen(false);
      setSelectedFiles([]);
      fetchBatches();
    } catch (err) {
      setError('Failed to create batch');
      console.error('Error creating batch:', err);
    }
  };

  const handleFileSelect = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const handleCancelBatch = async (batchId) => {
    try {
      await axios.post(`${API_BASE_URL}/batch/${batchId}/cancel`);
      fetchBatches();
    } catch (err) {
      setError('Failed to cancel batch');
      console.error('Error cancelling batch:', err);
    }
  };

  const handleRetryBatch = async (batchId) => {
    try {
      await axios.post(`${API_BASE_URL}/batch/${batchId}/retry`);
      fetchBatches();
    } catch (err) {
      setError('Failed to retry batch');
      console.error('Error retrying batch:', err);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      await axios.delete(`${API_BASE_URL}/batch/${batchId}`);
      fetchBatches();
    } catch (err) {
      setError('Failed to delete batch');
      console.error('Error deleting batch:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBatchExpand = (batchId) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
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
            startIcon={<FilterIcon />}
            onClick={() => setFilterDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadIcon />}
            onClick={() => setBatchUploadDialogOpen(true)}
          >
            Batch Upload
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Media Files" />
        <Tab label="Batch Operations" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {/* Media Stats */}
        {mediaStats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Media Files
                  </Typography>
                  <Typography variant="h4">
                    {mediaStats.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Storage Used
                  </Typography>
                  <Typography variant="h4">
                    {formatSize(mediaStats.totalSize)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Processing Queue
                  </Typography>
                  <Typography variant="h4">
                    {mediaStats.processingQueue}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Failed Items
                  </Typography>
                  <Typography variant="h4" color="error">
                    {mediaStats.failed}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Media Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedMedia.length > 0 && selectedMedia.length < media.length}
                    checked={media.length > 0 && selectedMedia.length === media.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Preview</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {media
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedMedia.includes(item.id)}
                        onChange={() => handleSelectOne(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <CardMedia
                        component="img"
                        height="40"
                        image={item.thumbnail_url || item.url}
                        alt={item.name}
                        sx={{ objectFit: 'cover' }}
                      />
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{formatSize(item.size)}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        color={
                          item.status === 'processed'
                            ? 'success'
                            : item.status === 'processing'
                            ? 'primary'
                            : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.created_at), 'PPpp')}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Download">
                        <IconButton onClick={() => handleDownload(item.id)}>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => setEditDialogOpen(true)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => {
                            setSelectedMedia([item.id]);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={media.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {batches.map((batch) => (
          <Accordion
            key={batch.id}
            expanded={expandedBatch === batch.id}
            onChange={() => handleBatchExpand(batch.id)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" width="100%">
                <Typography sx={{ flexGrow: 1 }}>
                  Batch #{batch.id.slice(0, 8)} - {batch.total_files} files
                </Typography>
                <Chip
                  label={batch.status}
                  color={
                    batch.status === 'completed'
                      ? 'success'
                      : batch.status === 'processing'
                      ? 'primary'
                      : batch.status === 'failed'
                      ? 'error'
                      : 'default'
                  }
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {format(new Date(batch.created_at), 'PPpp')}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={batch.progress}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" gutterBottom>
                  Progress: {batch.progress}%
                </Typography>
                {batch.error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {batch.error}
                  </Alert>
                )}
                <Box display="flex" justifyContent="flex-end">
                  {['failed', 'cancelled'].includes(batch.status) && (
                    <Button
                      startIcon={<RetryIcon />}
                      onClick={() => handleRetryBatch(batch.id)}
                      sx={{ mr: 1 }}
                    >
                      Retry
                    </Button>
                  )}
                  {batch.status === 'processing' && (
                    <Button
                      startIcon={<CancelIcon />}
                      onClick={() => handleCancelBatch(batch.id)}
                      sx={{ mr: 1 }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    startIcon={<DeleteIcon />}
                    color="error"
                    onClick={() => handleDeleteBatch(batch.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </TabPanel>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Media</DialogTitle>
        <DialogContent>
          <input
            type="file"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
            id="media-upload"
          />
          <label htmlFor="media-upload">
            <Button
              variant="contained"
              component="span"
              fullWidth
              sx={{ mb: 2 }}
            >
              Select Files
            </Button>
          </label>
          {uploadProgress > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading... {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Media</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedMedia.length} media item(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filter Media</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              label="Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="image">Images</MenuItem>
              <MenuItem value="video">Videos</MenuItem>
              <MenuItem value="audio">Audio</MenuItem>
              <MenuItem value="document">Documents</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="processed">Processed</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              label="Date Range"
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setFilterDialogOpen(false);
              fetchMedia();
            }}
            variant="contained"
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Upload Dialog */}
      <Dialog open={batchUploadDialogOpen} onClose={() => setBatchUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Batch Upload</DialogTitle>
        <DialogContent>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="batch-file-input"
          />
          <label htmlFor="batch-file-input">
            <Button
              variant="contained"
              component="span"
              fullWidth
              sx={{ mb: 2 }}
            >
              Select Files
            </Button>
          </label>
          {selectedFiles.length > 0 && (
            <Typography variant="body2" gutterBottom>
              Selected {selectedFiles.length} files
            </Typography>
          )}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={batchOptions.processImmediately}
                  onChange={(e) => setBatchOptions({
                    ...batchOptions,
                    processImmediately: e.target.checked
                  })}
                />
              }
              label="Process Immediately"
            />
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={batchOptions.generateThumbnails}
                  onChange={(e) => setBatchOptions({
                    ...batchOptions,
                    generateThumbnails: e.target.checked
                  })}
                />
              }
              label="Generate Thumbnails"
            />
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Output Format</InputLabel>
            <Select
              value={batchOptions.outputFormat}
              onChange={(e) => setBatchOptions({
                ...batchOptions,
                outputFormat: e.target.value
              })}
              label="Output Format"
            >
              <MenuItem value="original">Original</MenuItem>
              <MenuItem value="mp4">MP4</MenuItem>
              <MenuItem value="webm">WebM</MenuItem>
              <MenuItem value="jpg">JPEG</MenuItem>
              <MenuItem value="png">PNG</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Compression Level</InputLabel>
            <Select
              value={batchOptions.compressionLevel}
              onChange={(e) => setBatchOptions({
                ...batchOptions,
                compressionLevel: e.target.value
              })}
              label="Compression Level"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <MenuItem key={level} value={level}>
                  {level} {level === 1 ? '(Fastest)' : level === 9 ? '(Best)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {batchUploadProgress > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading... {batchUploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={batchUploadProgress} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBatchUpload}
            variant="contained"
            color="primary"
            disabled={selectedFiles.length === 0}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Media; 