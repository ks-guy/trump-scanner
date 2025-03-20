import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsResponse, historyResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/monitoring/metrics/current`),
          axios.get(`${API_BASE_URL}/monitoring/metrics/history`),
        ]);

        setMetrics(metricsResponse.data);
        setHistory(historyResponse.data);
      } catch (err) {
        setError('Failed to fetch monitoring data');
        console.error('Error fetching monitoring data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercent = (value) => `${value.toFixed(1)}%`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* System Health Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                CPU Usage
              </Typography>
              <Typography variant="h4">
                {formatPercent(metrics?.system?.cpu?.usage || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {metrics?.system?.cpu?.cores || 0} cores
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Memory Usage
              </Typography>
              <Typography variant="h4">
                {formatPercent(metrics?.system?.memory?.usagePercent || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatBytes(metrics?.system?.memory?.used || 0)} / {formatBytes(metrics?.system?.memory?.total || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Storage Usage
              </Typography>
              <Typography variant="h4">
                {formatPercent(metrics?.storage?.usagePercent || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatBytes(metrics?.storage?.used || 0)} / {formatBytes(metrics?.storage?.total || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Media Success Rate
              </Typography>
              <Typography variant="h4">
                {formatPercent(metrics?.application?.media?.successRate || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {metrics?.application?.media?.failed || 0} failed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Resource Usage
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), 'PPpp')}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="system.cpu.usage"
                      name="CPU Usage"
                      stroke="#8884d8"
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="system.memory.usagePercent"
                      name="Memory Usage"
                      stroke="#82ca9d"
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="storage.usagePercent"
                      name="Storage Usage"
                      stroke="#ffc658"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Application Performance
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), 'PPpp')}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="application.media.successRate"
                      name="Success Rate"
                      stroke="#8884d8"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="application.media.failed"
                      name="Failed Items"
                      stroke="#ff7300"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard; 