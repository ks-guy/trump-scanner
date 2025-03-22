import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, useTheme } from '@mui/material';
import { LineChart, AreaChart } from '@mui/x-charts';
import { formatBytes, formatPercent } from '../../utils/formatters';
import MetricsCard from './MetricsCard';
import SystemInfo from './SystemInfo';
import { fetchMetrics, fetchAggregatedMetrics } from '../../services/metricsApi';

const MetricsDashboard = () => {
    const theme = useTheme();
    const [realtimeMetrics, setRealtimeMetrics] = useState(null);
    const [historicalMetrics, setHistoricalMetrics] = useState([]);
    const [aggregatedMetrics, setAggregatedMetrics] = useState(null);

    useEffect(() => {
        const fetchRealtimeData = async () => {
            try {
                const data = await fetchMetrics();
                setRealtimeMetrics(data);
            } catch (error) {
                console.error('Error fetching realtime metrics:', error);
            }
        };

        const fetchHistoricalData = async () => {
            try {
                const end = new Date();
                const start = new Date(end - 60 * 60 * 1000); // Last hour
                const data = await fetchMetrics(start, end);
                setHistoricalMetrics(data);
            } catch (error) {
                console.error('Error fetching historical metrics:', error);
            }
        };

        const fetchAggregated = async () => {
            try {
                const data = await fetchAggregatedMetrics('1h');
                setAggregatedMetrics(data);
            } catch (error) {
                console.error('Error fetching aggregated metrics:', error);
            }
        };

        // Initial fetch
        fetchRealtimeData();
        fetchHistoricalData();
        fetchAggregated();

        // Set up polling
        const realtimeInterval = setInterval(fetchRealtimeData, 5000);
        const historicalInterval = setInterval(fetchHistoricalData, 60000);
        const aggregatedInterval = setInterval(fetchAggregated, 60000);

        return () => {
            clearInterval(realtimeInterval);
            clearInterval(historicalInterval);
            clearInterval(aggregatedInterval);
        };
    }, []);

    if (!realtimeMetrics) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Loading metrics...</Typography>
            </Box>
        );
    }

    const { cpu, memory, disk } = realtimeMetrics.data;

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                {/* System Overview Cards */}
                <Grid item xs={12} md={4}>
                    <MetricsCard
                        title="CPU Usage"
                        value={cpu.load_average['1m']}
                        format={formatPercent}
                        subtitle="1 minute load average"
                        trend={aggregatedMetrics?.cpu?.avg_load}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <MetricsCard
                        title="Memory Usage"
                        value={memory.usage_percent}
                        format={formatPercent}
                        subtitle={`${formatBytes(memory.used)} / ${formatBytes(memory.total)}`}
                        trend={aggregatedMetrics?.memory?.avg_usage}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <MetricsCard
                        title="Disk Usage"
                        value={disk.usage_percent}
                        format={formatPercent}
                        subtitle={`${formatBytes(disk.used)} / ${formatBytes(disk.total)}`}
                        trend={aggregatedMetrics?.disk?.avg_usage}
                    />
                </Grid>

                {/* Historical Charts */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            CPU Load Average (1h)
                        </Typography>
                        <LineChart
                            series={[
                                {
                                    data: historicalMetrics.map(m => m.data.cpu.load_average['1m']),
                                    label: 'Load Average (1m)'
                                }
                            ]}
                            xAxis={[{
                                data: historicalMetrics.map(m => new Date(m.timestamp)),
                                scaleType: 'time'
                            }]}
                            height={300}
                        />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Memory Usage (1h)
                        </Typography>
                        <AreaChart
                            series={[
                                {
                                    data: historicalMetrics.map(m => m.data.memory.usage_percent),
                                    label: 'Memory Usage %'
                                }
                            ]}
                            xAxis={[{
                                data: historicalMetrics.map(m => new Date(m.timestamp)),
                                scaleType: 'time'
                            }]}
                            height={300}
                        />
                    </Paper>
                </Grid>

                {/* System Information */}
                <Grid item xs={12}>
                    <SystemInfo metrics={realtimeMetrics.data} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default MetricsDashboard; 