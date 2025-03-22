import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function BatchAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [analytics, setAnalytics] = useState({
    throughput: [],
    statusDistribution: [],
    processingTimes: [],
    queueMetrics: {},
    resourceUtilization: []
  });

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/batch/analytics`, {
        params: { timeRange }
      });
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Batch Processing Analytics</Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Processing Throughput */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Processing Throughput
            </Typography>
            <LineChart
              width={500}
              height={300}
              data={analytics.throughput}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="filesPerMinute" stroke="#8884d8" name="Files/Minute" />
            </LineChart>
          </Paper>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status Distribution
            </Typography>
            <PieChart width={500} height={300}>
              <Pie
                data={analytics.statusDistribution}
                cx={250}
                cy={150}
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {analytics.statusDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </Paper>
        </Grid>

        {/* Processing Times by File Type */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Average Processing Time by File Type
            </Typography>
            <BarChart
              width={1100}
              height={300}
              data={analytics.processingTimes}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fileType" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageTime" fill="#82ca9d" name="Seconds" />
            </BarChart>
          </Paper>
        </Grid>

        {/* Queue Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Queue Health
              </Typography>
              <TableContainer>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Active Jobs</TableCell>
                      <TableCell>{analytics.queueMetrics.activeJobs}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Waiting Jobs</TableCell>
                      <TableCell>{analytics.queueMetrics.waitingJobs}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Completed Jobs (24h)</TableCell>
                      <TableCell>{analytics.queueMetrics.completedJobs24h}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Failed Jobs (24h)</TableCell>
                      <TableCell>{analytics.queueMetrics.failedJobs24h}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Wait Time</TableCell>
                      <TableCell>{analytics.queueMetrics.averageWaitTime}s</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Resource Utilization */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resource Utilization
            </Typography>
            <LineChart
              width={500}
              height={300}
              data={analytics.resourceUtilization}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU %" />
              <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="Memory %" />
              <Line type="monotone" dataKey="diskIO" stroke="#ffc658" name="Disk I/O %" />
            </LineChart>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default BatchAnalytics; 