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
  LinearProgress,
  Button,
  Stack,
  CircularProgress,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Divider,
  Link,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { 
  Warning, 
  TrendingUp, 
  Speed, 
  Shield, 
  Refresh,
  CheckCircle,
  Error,
  ExpandMore,
  Code,
  Settings,
  BugReport,
  Timeline,
  Memory,
  Storage,
  CloudQueue,
} from '@mui/icons-material';
import { smartEASAPI, DashboardData } from '../../lib/api';
import DataSourceIndicator from '../../components/DataSourceIndicator';

export default function DeveloperDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dataSource, setDataSource] = useState<{
    isUsingRealData: boolean;
    backendStatus: 'connected' | 'disconnected' | 'error';
  }>({
    isUsingRealData: false,
    backendStatus: 'disconnected'
  });

  const api = smartEASAPI;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading SmartEAS dashboard data from centralized endpoint...');
      
      const dashboardResponse = await api.getDashboardData();
      
      console.log('📊 Dashboard Data Response:', dashboardResponse);
      
      setData(dashboardResponse);
      
      setDataSource({
        isUsingRealData: dashboardResponse.dataSource === 'real-time-ai-validated',
        backendStatus: dashboardResponse.status === 'success' ? 'connected' : 'error'
      });
      
      if (dashboardResponse.dataSource === 'real-time-ai-validated') {
        console.log('✅ Using real-time AI-validated data from backend');
        console.log(`📊 Found ${dashboardResponse.validatedEvents.length} validated events`);
        console.log(`🤖 Found ${dashboardResponse.aiAnalyzedEvents.length} AI analyzed events`);
        console.log(`🗺️ Found ${dashboardResponse.heatmapData.length} heatmap points`);
        console.log(`📱 Found ${dashboardResponse.redditPosts.length} Reddit posts`);
        console.log(`⚠️ Found ${dashboardResponse.recentAlerts.length} recent alerts`);
      } else {
        console.log('⚠️ Using fallback data structure');
      }

      setLastRefresh(new Date());

    } catch (err) {
      console.error('❌ Dashboard data fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      setDataSource({
        isUsingRealData: false,
        backendStatus: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 2 * 60 * 1000);
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

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Developer Header */}
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
          Last updated: {lastRefresh.toLocaleString()}
        </Typography>
      </Box>

      {/* Backend Status Alerts */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Backend Services Status</Typography>
          {error}
          <Typography variant="body2" sx={{ mt: 1 }}>
            Make sure your AWS Lambda functions are deployed and running:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            <li>Reddit Scraper (/scrape/reddit)</li>
            <li>AI Disaster Analyzer (/analyze/disaster)</li>
            <li>Weather Validator (/weather-validator)</li>
            <li>Heatmap Generator (/heatmap/data)</li>
            <li>Route Optimizer (/routes/optimize)</li>
          </Box>
        </Alert>
      )}

      {!loading && data && data.systemStats.totalAlerts === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>No Real Disaster Data Available</Typography>
          <Typography variant="body2">
            The dashboard is connected to your backend, but no disaster events were found in the real data sources. 
            This could mean:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            <li>No current disasters in monitored regions</li>
            <li>Reddit scraper needs more diverse subreddit monitoring</li>
            <li>AI analyzer confidence thresholds may be too high</li>
            <li>Weather validation services may be experiencing delays</li>
          </Box>
        </Alert>
      )}

      {loading && !data && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={48} />
        </Box>
      )}

      {data && (
        <>
          {/* Technical Overview Cards */}
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

          {/* Developer Sections */}
          <Grid container spacing={3}>
            {/* API Endpoints Status */}
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
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">/heatmap/data</Typography>
                    <Chip size="small" label="Ready" color="success" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">/routes/optimize</Typography>
                    <Chip size="small" label="Available" color="success" />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            {/* Data Pipeline Monitoring */}
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
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography>Validated:</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight="bold" color="success.main">
                        {data.validationStats.validated}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(data.validationStats.validated / data.validationStats.totalProcessed) * 100}
                        sx={{ width: 100 }}
                        color="success"
                      />
                    </Stack>
                  </Stack>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography>Rejected:</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight="bold" color="error.main">
                        {data.validationStats.rejected}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(data.validationStats.rejected / data.validationStats.totalProcessed) * 100}
                        sx={{ width: 100 }}
                        color="error"
                      />
                    </Stack>
                  </Stack>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography>Pending:</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight="bold" color="warning.main">
                        {data.validationStats.pending}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(data.validationStats.pending / data.validationStats.totalProcessed) * 100}
                        sx={{ width: 100 }}
                        color="warning"
                      />
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            {/* AI Analysis Details */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🤖 AI Analysis Engine
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Amazon Bedrock Nova Pro analysis results
                </Typography>
                <List>
                  {data.aiAnalyzedEvents.length > 0 ? (
                    data.aiAnalyzedEvents.slice(0, 5).map((event) => (
                      <ListItem key={event.id} divider>
                        <ListItemText
                          primary={event.title}
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                              <Chip
                                size="small"
                                label={event.priority}
                                color={event.priority === 'HIGH' ? 'error' : event.priority === 'MEDIUM' ? 'warning' : 'info'}
                              />
                              <Chip size="small" label={event.analysisType} variant="outlined" />
                              <Typography variant="caption">{event.correlatedEvents} correlations</Typography>
                            </Stack>
                          }
                        />
                        <Chip 
                          size="small" 
                          label={`${(event.confidence * 100).toFixed(0)}%`}
                          color="primary"
                          variant="outlined"
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary="No AI analysis results available"
                        secondary="AI disaster analyzer (Amazon Bedrock) is either offline or no events were detected"
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Grid>

            {/* Reddit Data Pipeline */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📱 Reddit Data Pipeline
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Social media monitoring and processing
                </Typography>
                <List>
                  {data.redditPosts.length > 0 ? (
                    data.redditPosts.slice(0, 5).map((post) => (
                      <ListItem key={post.id} divider>
                        <ListItemText
                          primary={post.title}
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                              <Chip size="small" label={`r/${post.subreddit}`} variant="outlined" />
                              <Chip size="small" label={`${post.score} upvotes`} color="info" />
                              <Chip 
                                size="small" 
                                label={`${(post.relevanceScore * 100).toFixed(0)}% relevant`}
                                color="success"
                              />
                              <Typography variant="caption">by {post.author}</Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary="No Reddit posts available"
                        secondary="Reddit scraper is either offline or no relevant disaster posts were found"
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Grid>

            {/* Validated Events (Technical View) */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🗺️ Validated Events (Technical Details)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Multi-source validated disaster events with confidence scores
                </Typography>
                <List>
                  {data.validatedEvents.length > 0 ? (
                    data.validatedEvents.slice(0, 5).map((event) => (
                      <ListItem key={event.id} divider>
                        <ListItemText
                          primary={event.title}
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                              <Chip
                                size="small"
                                label={event.severity.toUpperCase()}
                                color={getSeverityColor(event.severity)}
                              />
                              <Chip size="small" label={event.type} variant="outlined" />
                              <Typography variant="caption">{event.location.name}</Typography>
                              <Typography variant="caption">
                                ({event.location.lat.toFixed(4)}, {event.location.lng.toFixed(4)})
                              </Typography>
                            </Stack>
                          }
                        />
                        <Stack direction="column" alignItems="flex-end" spacing={1}>
                          <Chip 
                            size="small" 
                            label={`${(event.confidence * 100).toFixed(0)}%`}
                            color="info"
                            variant="outlined"
                          />
                          <Chip
                            icon={event.validated ? <CheckCircle /> : <Error />}
                            size="small"
                            label={event.validated ? 'Validated' : 'Pending'}
                            color={event.validated ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </Stack>
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary="No validated disaster events"
                        secondary="AI validation system is processing or no events meet the confidence threshold"
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Grid>

            {/* API Testing Section */}
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
                  <Button variant="outlined" size="small">
                    Test Weather Validator
                  </Button>
                </Stack>
                
                <Typography variant="body2" color="text.secondary">
                  Use the dedicated <Link href="/test">API Test page</Link> for comprehensive endpoint testing and debugging.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
}
