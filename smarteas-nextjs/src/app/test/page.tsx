'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  Divider,
  TextField,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  Link,
  Paper
} from '@mui/material';
import { smartEASAPI } from '../../lib/api';

// Component to display Reddit posts in a detailed format
const RedditPostDisplay = ({ posts }: { posts: any[] }) => {
  if (!posts || posts.length === 0) {
    return (
      <Alert severity="info">
        No Reddit posts found in the response.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom color="primary">
        🔴 Reddit Posts Found: {posts.length}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
        {posts.slice(0, 10).map((post, index) => (
          <Paper elevation={1} sx={{ p: 2 }} key={index}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" noWrap title={post.title}>
                {post.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                r/{post.subreddit} • Score: {post.score}
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip 
                label={`Relevance: ${post.relevanceScore || 'N/A'}`}
                size="small" 
                color="secondary"
              />
              <Chip 
                label={new Date(post.created).toLocaleDateString()}
                size="small" 
                variant="outlined"
              />
            </Stack>

            {post.url && (
              <Link 
                href={post.url} 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.75rem', display: 'block', mt: 1 }}
              >
                View on Reddit →
              </Link>
            )}
          </Paper>
        ))}
      </Box>
      
      {posts.length > 10 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Showing first 10 of {posts.length} posts. Check console logs for complete data.
        </Alert>
      )}
    </Box>
  );
};

// Component to display disaster events
const DisasterEventsDisplay = ({ events }: { events: any[] }) => {
  if (!events || events.length === 0) {
    return <Alert severity="info">No disaster events found.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom color="error">
        🚨 Disaster Events: {events.length}
      </Typography>
      <List dense>
        {events.slice(0, 5).map((event, index) => (
          <ListItem key={index} divider>
            <ListItemText
              primary={event.title}
              secondary={
                <Box>
                  <Typography variant="caption" display="block">
                    Type: {event.type} • Severity: {event.severity}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Location: {event.location?.name} • Confidence: {event.confidence}%
                  </Typography>
                </Box>
              }
            />
            <Chip 
              label={event.severity} 
              size="small"
              color={
                event.severity === 'CRITICAL' ? 'error' :
                event.severity === 'HIGH' ? 'warning' :
                event.severity === 'MEDIUM' ? 'info' : 'default'
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default function TestPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('general disaster monitoring');

  const api = smartEASAPI;

  const testEndpoint = async (name: string, testFn: () => Promise<any>) => {
    try {
      setLoading(name);
      console.log(`🧪 Testing ${name}...`);
      
      const result = await testFn();
      
      setResults((prev: any) => ({
        ...prev,
        [name]: { success: true, data: result, error: null }
      }));
      
      console.log(`✅ ${name} success:`, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResults((prev: any) => ({
        ...prev,
        [name]: { success: false, data: null, error: errorMessage }
      }));
      
      console.error(`❌ ${name} failed:`, error);
    } finally {
      setLoading(null);
    }
  };

  const tests = [
    {
      name: '🗺️ Heatmap Data (Validated Events)',
      description: 'GET /heatmap/data - Returns validated disaster events from DynamoDB',
      test: () => api.getHeatmapData({ timeRange: '24h', minConfidence: 0.7 }),
      showData: true
    },
    {
      name: '🤖 AI Disaster Analyzer (Validated Analysis)',
      description: 'POST /analyze/disaster - Returns AI-validated disaster analysis',
      test: () => api.analyzeDisaster(testInput),
      showData: true
    },
    {
      name: '📱 Reddit Scraper (Validated Posts)',
      description: 'POST /scrape/reddit - Returns validated disaster-related posts',
      test: () => api.scrapeRedditData(['emergency', 'disaster', 'wildfire', 'earthquake', 'hurricane']),
      showData: true
    },
    {
      name: '📊 Dashboard Data (All Validated)',
      description: 'Combined validated data from all sources',
      test: () => api.getDashboardData(),
      showData: true
    },
    {
      name: '🗺️ Maps Visualization',
      description: 'GET /maps/visualization - Geographic disaster data',
      test: () => api.getMapsVisualization({ lat: 34.0522, lng: -118.2437, zoom: 10 }),
      showData: false
    },
    {
      name: '🚗 Route Optimization',
      description: 'POST /routes/optimize - Safe routes avoiding disasters',
      test: () => api.optimizeRoute('Los Angeles, CA', 'San Francisco, CA', { avoidDisasters: true }),
      showData: false
    },
    {
      name: '❤️ Health Check',
      description: 'Backend connectivity test',
      test: () => api.healthCheck(),
      showData: false
    }
  ];

  const testAll = async () => {
    setResults({});
    for (const test of tests) {
      await testEndpoint(test.name, test.test);
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        🧪 SmartEAS API Testing - Validated Data Sources
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Test Lambda functions that return validated disaster data from DynamoDB
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>📊 Validated Data Flow</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>These Lambda functions return REAL validated data from DynamoDB:</strong>
        </Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0 }}>
          <li><strong>🗺️ Heatmap Data Generator</strong> - Validated disaster events with confidence scores</li>
          <li><strong>🤖 AI Disaster Analyzer</strong> - AI-analyzed events with validation status</li>
          <li><strong>📱 Reddit Scraper</strong> - Social media posts with relevance validation</li>
          <li><strong>📊 Dashboard Data</strong> - Combined validated data from all sources</li>
        </Box>
      </Alert>

      <Box sx={{ mb: 4 }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>🎉 Backend Services Status</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>✅ Working Endpoints (Ready for Real Data):</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 1 }}>
            <li><strong>AI Disaster Analyzer</strong> - POST /analyze/disaster ✅</li>
            <li><strong>Route Optimizer</strong> - POST /routes/optimize ✅</li>
          </Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>⚠️ Needs AWS Credential Refresh:</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            <li>Heatmap Data Generator - DynamoDB access issue</li>
            <li>Reddit Scraper - Timeout/credential issue</li>
            <li>Health Check - Not deployed (credential expiration)</li>
          </Box>
        </Alert>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL || 'https://oeqsffqyzg.execute-api.us-east-1.amazonaws.com/dev'}
          <br />
          <strong>Mode:</strong> 🌐 Real Backend (Partial)
        </Alert>
        
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <TextField
            label="Test Input Text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ flex: 1 }}
          />
          <Button 
            variant="contained" 
            onClick={testAll}
            disabled={loading !== null}
          >
            Test All Endpoints
          </Button>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gap: 3 }}>
        {tests.map((test, index) => {
          const result = results[test.name];
          const isLoading = loading === test.name;
          
          return (
            <Card key={index} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {test.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {test.description}
                    </Typography>
                  </Box>
                  
                  <Stack direction="row" spacing={1} alignItems="center">
                    {result && (
                      <Chip
                        label={result.success ? 'Success' : 'Failed'}
                        color={result.success ? 'success' : 'error'}
                        size="small"
                      />
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => testEndpoint(test.name, test.test)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Testing...' : 'Test'}
                    </Button>
                  </Stack>
                </Box>

                {result && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    {result.success ? (
                      <Box>
                        <Typography variant="subtitle2" color="success.main" gutterBottom>
                          ✅ Success Response:
                        </Typography>
                        
                        {/* Special handling for different data types */}
                        {test.showData && result.data && (
                          <>
                            {/* Reddit Posts Display */}
                            {result.data.posts && (
                              <RedditPostDisplay posts={result.data.posts} />
                            )}
                            
                            {/* Heatmap Data Display */}
                            {result.data.heatmapData && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="h6" color="primary">
                                  🗺️ Validated Disaster Events: {result.data.heatmapData.length}
                                </Typography>
                                {result.data.heatmapData.slice(0, 3).map((event: any, idx: number) => (
                                  <Paper key={idx} sx={{ p: 2, mb: 1 }}>
                                    <Typography variant="subtitle2">{event.type || 'Unknown'} - {event.severity || 'N/A'}</Typography>
                                    <Typography variant="caption">
                                      Location: {event.lat?.toFixed(4)}, {event.lng?.toFixed(4)} | 
                                      Confidence: {((event.intensity || event.confidence || 0) * 100).toFixed(1)}%
                                    </Typography>
                                  </Paper>
                                ))}
                              </Box>
                            )}
                            
                            {/* AI Analysis Display */}
                            {result.data.events && (
                              <DisasterEventsDisplay events={result.data.events} />
                            )}
                            
                            {/* Dashboard Data Display */}
                            {result.data.redditPosts && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="h6" color="secondary">
                                  📊 Dashboard Summary
                                </Typography>
                                <Typography variant="body2">
                                  Reddit Posts: {result.data.redditPosts.length} | 
                                  Events: {result.data.events?.length || 0} | 
                                  Heatmap Points: {result.data.heatmapData?.length || 0}
                                </Typography>
                              </Box>
                            )}
                          </>
                        )}
                        
                        <Box 
                          component="pre" 
                          sx={{ 
                            bgcolor: '#f5f5f5', 
                            p: 2, 
                            borderRadius: 1, 
                            overflow: 'auto',
                            fontSize: '0.875rem',
                            maxHeight: '200px'
                          }}
                        >
                          {JSON.stringify(result.data, null, 2)}
                        </Box>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="subtitle2" color="error.main" gutterBottom>
                          ❌ Error:
                        </Typography>
                        <Alert severity="error">
                          {result.error}
                        </Alert>
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          💡 <strong>Tip:</strong> Open browser dev tools (F12) to see detailed console logs for each API call.
          Check the Network tab to see the actual HTTP requests and responses.
        </Typography>
      </Box>
    </Container>
  );
}
