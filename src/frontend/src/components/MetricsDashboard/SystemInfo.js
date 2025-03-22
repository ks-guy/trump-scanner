import React from 'react';
import { Paper, Grid, Typography, Divider, Box } from '@mui/material';
import { formatBytes, formatDuration } from '../../utils/formatters';

const InfoSection = ({ title, children }) => (
    <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom color="textSecondary">
            {title}
        </Typography>
        <Grid container spacing={2}>
            {children}
        </Grid>
    </Box>
);

const InfoItem = ({ label, value }) => (
    <Grid item xs={12} sm={6} md={4}>
        <Typography variant="body2" color="textSecondary">
            {label}
        </Typography>
        <Typography variant="body1">
            {value}
        </Typography>
    </Grid>
);

const SystemInfo = ({ metrics }) => {
    const { system, cpu, memory, disk, process, network } = metrics;

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                System Information
            </Typography>
            <Divider sx={{ my: 2 }} />

            <InfoSection title="System">
                <InfoItem label="Platform" value={system.platform} />
                <InfoItem label="Architecture" value={system.arch} />
                <InfoItem label="Node Version" value={system.version} />
                <InfoItem label="Hostname" value={system.hostname} />
                <InfoItem label="OS Type" value={system.type} />
                <InfoItem label="OS Release" value={system.release} />
                <InfoItem label="System Uptime" value={formatDuration(system.uptime)} />
            </InfoSection>

            <InfoSection title="CPU">
                <InfoItem label="Model" value={cpu.model} />
                <InfoItem label="Cores" value={cpu.cores} />
                <InfoItem label="Speed" value={`${cpu.speed} MHz`} />
                <InfoItem label="Load (1m)" value={`${cpu.load_average['1m'].toFixed(2)}%`} />
                <InfoItem label="Load (5m)" value={`${cpu.load_average['5m'].toFixed(2)}%`} />
                <InfoItem label="Load (15m)" value={`${cpu.load_average['15m'].toFixed(2)}%`} />
            </InfoSection>

            <InfoSection title="Memory">
                <InfoItem label="Total" value={formatBytes(memory.total)} />
                <InfoItem label="Used" value={formatBytes(memory.used)} />
                <InfoItem label="Free" value={formatBytes(memory.free)} />
                <InfoItem label="Usage" value={`${memory.usage_percent.toFixed(1)}%`} />
                <InfoItem label="Heap Total" value={formatBytes(memory.heap.heapTotal)} />
                <InfoItem label="Heap Used" value={formatBytes(memory.heap.heapUsed)} />
            </InfoSection>

            <InfoSection title="Storage">
                <InfoItem label="Mount Point" value={disk.path} />
                <InfoItem label="Total Space" value={formatBytes(disk.total)} />
                <InfoItem label="Used Space" value={formatBytes(disk.used)} />
                <InfoItem label="Free Space" value={formatBytes(disk.free)} />
                <InfoItem label="Usage" value={`${disk.usage_percent.toFixed(1)}%`} />
            </InfoSection>

            <InfoSection title="Process">
                <InfoItem label="PID" value={process.pid} />
                <InfoItem label="Uptime" value={formatDuration(process.uptime)} />
                <InfoItem 
                    label="CPU User Time" 
                    value={`${(process.cpu_usage.user / 1000000).toFixed(2)}s`} 
                />
                <InfoItem 
                    label="CPU System Time" 
                    value={`${(process.cpu_usage.system / 1000000).toFixed(2)}s`} 
                />
                <InfoItem label="RSS Memory" value={formatBytes(process.memory.rss)} />
                <InfoItem label="External Memory" value={formatBytes(process.memory.external)} />
            </InfoSection>

            <InfoSection title="Network">
                {Object.entries(network).map(([name, interfaces]) => (
                    <Grid item xs={12} key={name}>
                        <Typography variant="subtitle2" gutterBottom>
                            {name}
                        </Typography>
                        {interfaces.map((iface, index) => (
                            <Typography 
                                key={index} 
                                variant="body2" 
                                color="textSecondary"
                                sx={{ ml: 2 }}
                            >
                                {iface.family}: {iface.address}
                                {iface.internal ? ' (internal)' : ''}
                            </Typography>
                        ))}
                    </Grid>
                ))}
            </InfoSection>
        </Paper>
    );
};

export default SystemInfo; 