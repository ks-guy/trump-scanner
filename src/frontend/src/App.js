import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { createTheme } from '@mui/material/styles';

// Import pages
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import MediaManagement from './pages/MediaManagement';
import Backup from './pages/Backup';
import MetricsDashboard from './components/MetricsDashboard/MetricsDashboard';

// Import components
import Layout from './components/Layout';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Layout>
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/metrics" element={<MetricsDashboard />} />
                <Route path="/search" element={<Search />} />
                <Route path="/media" element={<MediaManagement />} />
                <Route path="/backup" element={<Backup />} />
              </Routes>
            </Box>
          </Layout>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App; 