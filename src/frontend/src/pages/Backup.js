import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

function Backup() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupNote, setBackupNote] = useState('');
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/backup`);
      setBackups(response.data);
    } catch (err) {
      setError('Failed to fetch backups');
      console.error('Error fetching backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupInProgress(true);
      setProgress(0);
      
      const response = await axios.post(`${API_BASE_URL}/backup`, {
        note: backupNote,
      }, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      setBackups([...backups, response.data]);
      setCreateDialogOpen(false);
      setBackupNote('');
    } catch (err) {
      setError('Failed to create backup');
      console.error('Error creating backup:', err);
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setRestoreInProgress(true);
      setProgress(0);

      await axios.post(`${API_BASE_URL}/backup/${selectedBackup.id}/restore`, null, {
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    } catch (err) {
      setError('Failed to restore backup');
      console.error('Error restoring backup:', err);
    } finally {
      setRestoreInProgress(false);
    }
  };

  const handleDeleteBackup = async (backup) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/backup/${backup.id}`);
      setBackups(backups.filter(b => b.id !== backup.id));
    } catch (err) {
      setError('Failed to delete backup');
      console.error('Error deleting backup:', err);
    }
  };

  const handleDownloadBackup = async (backup) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/backup/${backup.id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${backup.id}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download backup');
      console.error('Error downloading backup:', err);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        <Typography variant="h4">Backup Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<BackupIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Backup
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {backups.map((backup) => (
          <Grid item xs={12} md={6} lg={4} key={backup.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Backup #{backup.id}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created: {format(new Date(backup.created_at), 'PPpp')}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Size: {formatSize(backup.size)}
                </Typography>
                {backup.note && (
                  <Typography variant="body2" color="text.secondary">
                    Note: {backup.note}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Tooltip title="Restore">
                  <IconButton
                    onClick={() => {
                      setSelectedBackup(backup);
                      setRestoreDialogOpen(true);
                    }}
                  >
                    <RestoreIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download">
                  <IconButton onClick={() => handleDownloadBackup(backup)}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteBackup(backup)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Details">
                  <IconButton>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Backup</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Backup Note"
            value={backupNote}
            onChange={(e) => setBackupNote(e.target.value)}
            multiline
            rows={4}
            sx={{ mt: 2 }}
          />
          {backupInProgress && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Creating backup... {progress}%
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateBackup}
            variant="contained"
            color="primary"
            disabled={backupInProgress}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to restore backup #{selectedBackup?.id}? This will overwrite current data.
          </Typography>
          {restoreInProgress && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Restoring backup... {progress}%
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRestoreBackup}
            variant="contained"
            color="primary"
            disabled={restoreInProgress}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Backup; 