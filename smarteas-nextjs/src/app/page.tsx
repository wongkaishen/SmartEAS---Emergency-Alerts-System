'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Stack,
  CircularProgress,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { 
  Warning, 
  LocationOn, 
  AccessTime, 
  TrendingUp,
  Security,
  Refresh,
  NotificationsActive,
  Public,
  Map as MapIcon,
  Emergency,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import { smartEASAPI, DashboardData } from '../lib/api';
import Link from 'next/link';

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const api = smartEASAPI;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dashboardResponse = await api.getDashboardData();
      setData(dashboardResponse);
      setLastRefresh(new Date());

    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Unable to connect to emergency services. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getTimeAgo = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Hero Section */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Avatar sx={{ bgcolor: 'error.main', width: 64, height: 64 }}>
            <Emergency sx={{ fontSize: 32 }} />
          </Avatar>
        </Stack>
        
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          SmartEAS
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Emergency Alert System
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
          Real-time monitoring and early warning system for natural disasters and emergencies. 
          Stay informed and stay safe with AI-powered alerts and comprehensive emergency information.
        </Typography>
        
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<MapIcon />}
            component={Link}
            href="/map"
            sx={{ px: 4 }}
          >
            View Emergency Map
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Refresh Alerts'}
          </Button>
        </Stack>
        
        <Typography variant="body2" color="text.secondary">
          Last updated: {lastRefresh.toLocaleString()}
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Service Notice:</strong> {error}
          </Typography>
          <Typography variant="body2">
            Emergency services may be experiencing high traffic. Please check official emergency channels for critical updates.
          </Typography>
        </Alert>
      )}

      {loading && !data && (
        <Box display="flex" flexDirection="column" alignItems="center" py={8}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography>Loading emergency information...</Typography>
        </Box>
      )}

      {data && (
        <>
          {/* Current Status Cards */}
          <Grid container spacing={3} sx={{ mb: 5 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'error.main' }}>
                      <NotificationsActive />
                    </Avatar>
                    <div>
                      <Typography variant="h3" color="error.main">
                        {data.systemStats.totalAlerts}
                      </Typography>
                      <Typography color="text.secondary">Active Alerts</Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <TrendingUp />
                    </Avatar>
                    <div>
                      <Typography variant="h3" color="warning.main">
                        {data.systemStats.activeDisasters}
                      </Typography>
                      <Typography color="text.secondary">Ongoing Events</Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircle />
                    </Avatar>
                    <div>
                      <Typography variant="h3" color="success.main">
                        {data.validationStats.validated}
                      </Typography>
                      <Typography color="text.secondary">Verified Reports</Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <Security />
                    </Avatar>
                    <div>
                      <Typography variant="h3" color="info.main">
                        {data.systemStats.systemHealth}%
                      </Typography>
                      <Typography color="text.secondary">System Status</Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Main Content */}
          <Grid container spacing={4}>
            {/* Recent Emergency Alerts */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Paper sx={{ p: 3, height: 'fit-content' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'error.main' }}>
                      <Warning />
                    </Avatar>
                    <div>
                      <Typography variant="h5" gutterBottom>
                        Recent Emergency Alerts
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Latest verified emergency events in your area
                      </Typography>
                    </div>
                  </Stack>
                </Stack>

                <List>
                  {data.validatedEvents.length > 0 ? (
                    data.validatedEvents.slice(0, 5).map((event, index) => (
                      <div key={event.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <Typography variant="h6" component="span">
                                  {event.title}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={event.severity.toUpperCase()}
                                  color={getSeverityColor(event.severity)}
                                />
                              </Stack>
                            }
                            secondary={
                              <Box>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                  <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {event.location.name}
                                  </Typography>
                                  <AccessTime sx={{ fontSize: 16, color: 'text.secondary', ml: 2 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {getTimeAgo(event.timestamp)}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1}>
                                  <Chip size="small" label={event.type} variant="outlined" />
                                  <Chip 
                                    size="small" 
                                    label={`${(event.confidence * 100).toFixed(0)}% confidence`}
                                    color="info"
                                    variant="outlined"
                                  />
                                </Stack>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < data.validatedEvents.slice(0, 5).length - 1 && <Divider />}
                      </div>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <CheckCircle color="success" />
                            <Typography variant="h6">No Active Emergency Alerts</Typography>
                          </Stack>
                        }
                        secondary="There are currently no active emergency alerts in your monitored areas. Stay vigilant and check back regularly."
                      />
                    </ListItem>
                  )}
                </List>

                {data.validatedEvents.length > 5 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button variant="outlined" component={Link} href="/map">
                      View All Alerts on Map
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Quick Actions & Info */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={3}>
                {/* Emergency Actions */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="error.main">
                    Emergency Actions
                  </Typography>
                  <Stack spacing={2}>
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      size="large"
                      startIcon={<Emergency />}
                    >
                      Call 911
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<MapIcon />}
                      component={Link}
                      href="/map"
                    >
                      View Emergency Map
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Info />}
                    >
                      Emergency Contacts
                    </Button>
                  </Stack>
                </Paper>

                {/* System Information */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    System Status
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Data Sources</Typography>
                      <Chip 
                        size="small" 
                        label="Active" 
                        color="success" 
                        variant="outlined"
                      />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">AI Validation</Typography>
                      <Chip 
                        size="small" 
                        label="Online" 
                        color="success" 
                        variant="outlined"
                      />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Emergency Services</Typography>
                      <Chip 
                        size="small" 
                        label="Connected" 
                        color="success" 
                        variant="outlined"
                      />
                    </Stack>
                    <Divider />
                    <Typography variant="caption" color="text.secondary">
                      Monitoring {data.redditPosts.length} social media sources and {data.validationStats.totalProcessed} official channels
                    </Typography>
                  </Stack>
                </Paper>

                {/* Recent Activity Summary */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Activity Summary
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Reports Processed</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {data.validationStats.totalProcessed}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Verified Events</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {data.validationStats.validated}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">AI Analyzed</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {data.aiAnalyzedEvents.length}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
}
