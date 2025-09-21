'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  LinearProgress,
  Button,
  Stack,
  CircularProgress,
  Badge,
  Link,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { 
  Warning, 
  TrendingUp, 
  Speed, 
  Shield, 
  Refresh,
  Code,
} from '@mui/icons-material';
import { smartEASAPI, DashboardData } from '../../lib/api';
import DataSourceIndicator from '../../components/DataSourceIndicator';

export default function DeveloperDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  const [dataSource, setDataSource] = useState<{
    isUsingRealData: boolean;
    backendStatus: 'connected' | 'disconnected' | 'error';
  }>({
    isUsingRealData: false,
    backendStatus: 'disconnected'
  });

  const api = smartEASAPI;

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dashboardResponse = await api.getDashboardData();
      setData(dashboardResponse);
      
      setDataSource({
        isUsingRealData: dashboardResponse.dataSource === 'real-time-ai-validated',
        backendStatus: dashboardResponse.status === 'success' ? 'connected' : 'error'
      });

      setLastRefresh(new Date());

    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
      setError('Failed to fetch dashboard data');
      setDataSource({
        isUsingRealData: false,
        backendStatus: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <div>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Code color="primary" sx={{ fontSize: 32 }} />
              <div>
                <Typography variant="h3" component="h1" gutterBottom>
                  Developer Dashboard
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  SmartEAS Technical Monitoring & API Testing
                </Typography>
              </div>
            </Stack>
          </div>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <DataSourceIndicator 
              isUsingRealData={dataSource.isUsingRealData}
              backendStatus={dataSource.backendStatus}
            />
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchDashboardData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>
        </Stack>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Last updated: {mounted ? lastRefresh.toLocaleString() : 'Loading...'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Backend Services Status</Typography>
          {error}
        </Alert>
      )}

      {loading && !data && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={48} />
        </Box>
      )}

      {data && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Badge badgeContent={data.systemStats.totalAlerts} color="error">
                      <Warning color="warning" />
                    </Badge>
                    <div>
                      <Typography variant="h4">{data.systemStats.totalAlerts}</Typography>
                      <Typography color="text.secondary">Total Alerts</Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Badge badgeContent={data.systemStats.activeDisasters} color="error">
                      <TrendingUp color="error" />
                    </Badge>
                    <div>
                      <Typography variant="h4">{data.systemStats.activeDisasters}</Typography>
                      <Typography color="text.secondary">Active Disasters</Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Speed color={data.systemStats.systemHealth > 80 ? 'success' : data.systemStats.systemHealth > 60 ? 'warning' : 'error'} />
                    <div>
                      <Typography variant="h4">{data.systemStats.systemHealth}%</Typography>
                      <Typography color="text.secondary">System Health</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={data.systemStats.systemHealth} 
                        sx={{ mt: 1 }}
                        color={data.systemStats.systemHealth > 80 ? 'success' : data.systemStats.systemHealth > 60 ? 'warning' : 'error'}
                      />
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Shield color="primary" />
                    <div>
                      <Typography variant="h4">{data.validationStats.validated}</Typography>
                      <Typography color="text.secondary">Validated Events</Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🔌 API Endpoints Status
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Real-time backend service monitoring
                </Typography>
                
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">/scrape/reddit</Typography>
                    <Chip size="small" label="Active" color="success" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">/analyze/disaster</Typography>
                    <Chip size="small" label="Online" color="success" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">/weather-validator</Typography>
                    <Chip size="small" label="Connected" color="success" />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📊 Data Pipeline Stats
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Processing metrics and validation statistics
                </Typography>
                
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Total Processed:</Typography>
                    <Typography fontWeight="bold">{data.validationStats.totalProcessed}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Validated:</Typography>
                    <Typography fontWeight="bold" color="success.main">
                      {data.validationStats.validated}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Rejected:</Typography>
                    <Typography fontWeight="bold" color="error.main">
                      {data.validationStats.rejected}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🧪 Quick API Testing
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Test individual endpoints and view responses
                </Typography>
                
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Button variant="outlined" size="small" href="/test" component={Link}>
                    Full API Test Suite
                  </Button>
                  <Button variant="outlined" size="small">
                    Test Reddit Scraper
                  </Button>
                  <Button variant="outlined" size="small">
                    Test AI Analyzer
                  </Button>
                </Stack>
                
                <Typography variant="body2" color="text.secondary">
                  Use the dedicated API Test page for comprehensive endpoint testing and debugging.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
}