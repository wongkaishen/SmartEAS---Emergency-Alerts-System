'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Map, Layers, Timeline, Navigation } from '@mui/icons-material';
import { smartEASAPI, HeatmapData, RouteOptimization } from '@/lib/api';

export default function MapView() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [routeData, setRouteData] = useState<RouteOptimization | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);

  // Load map data
  const loadMapData = async () => {
    try {
      setLoading(true);
      const heatmap = await smartEASAPI.getHeatmapData({ 
        timeRange,
        minConfidence: 0.7 
      });
      setHeatmapData(heatmap);
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Optimize route example
  const optimizeExampleRoute = async () => {
    try {
      const route = await smartEASAPI.optimizeRoute(
        'Los Angeles, CA',
        'San Francisco, CA',
        { avoidDisasters: true }
      );
      setRouteData(route);
    } catch (error) {
      console.error('Error optimizing route:', error);
    }
  };

  useEffect(() => {
    loadMapData();
  }, [timeRange]);

  const getIntensityColor = (intensity: number) => {
    if (intensity > 0.8) return '#d32f2f';
    if (intensity > 0.6) return '#f57c00';
    if (intensity > 0.4) return '#fbc02d';
    return '#388e3c';
  };

  return (
    <Container maxWidth="xl" className="mt-8 mb-8">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          🗺️ Disaster Heatmap & Route Planning
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time disaster intensity mapping and safe route optimization
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="6h">Last 6 Hours</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Button 
              variant="contained" 
              startIcon={<Navigation />}
              onClick={optimizeExampleRoute}
              fullWidth
            >
              Optimize Route (LA → SF)
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Button 
              variant="outlined" 
              startIcon={<Timeline />}
              onClick={loadMapData}
              fullWidth
            >
              Refresh Data
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Map Placeholder */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3, height: '600px' }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <Map sx={{ mr: 1 }} />
              Disaster Intensity Heatmap
            </Typography>
            
            {/* Simulated Map Display */}
            <Box sx={{ 
              height: '520px', 
              bgcolor: '#f5f5f5', 
              border: '2px dashed #ccc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              borderRadius: 1
            }}>
              <Map sx={{ fontSize: 60, color: '#666', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Interactive Map View
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This would show a real interactive map with disaster heatmap overlay
              </Typography>
              
              {/* Heatmap Data Points */}
              <Box sx={{ width: '100%', maxWidth: 400 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Detected Hotspots ({heatmapData.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                  {heatmapData.slice(0, 10).map((point, index) => (
                    <Chip
                      key={index}
                      label={`${point.type} (${(point.intensity * 100).toFixed(0)}%)`}
                      size="small"
                      sx={{
                        bgcolor: getIntensityColor(point.intensity),
                        color: 'white'
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Side Panel */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, height: '600px', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <Layers sx={{ mr: 1 }} />
              Data Analysis
            </Typography>

            {/* Route Information */}
            {routeData && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    🛣️ Optimized Route
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {routeData.origin} → {routeData.destination}
                  </Typography>
                  
                  {routeData.routes.map((route, index) => (
                    <Box key={index} sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight="bold">
                          Route {index + 1}
                        </Typography>
                        <Chip 
                          label={route.riskLevel} 
                          size="small"
                          color={route.riskLevel === 'LOW' ? 'success' : route.riskLevel === 'MEDIUM' ? 'warning' : 'error'}
                        />
                      </Box>
                      <Typography variant="caption" display="block">
                        Distance: {route.distance} • Duration: {route.duration}
                      </Typography>
                    </Box>
                  ))}

                  {routeData.recommendations.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Recommendations:
                      </Typography>
                      {routeData.recommendations.map((rec, index) => (
                        <Typography key={index} variant="caption" display="block" sx={{ mb: 0.5 }}>
                          • {rec}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Heatmap Statistics */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  📊 Heatmap Statistics
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Data Points: {heatmapData.length}
                  </Typography>
                </Box>

                {/* Intensity Distribution */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Intensity Distribution:
                  </Typography>
                  {[
                    { range: 'Critical (80%+)', color: '#d32f2f', count: heatmapData.filter(p => p.intensity > 0.8).length },
                    { range: 'High (60-80%)', color: '#f57c00', count: heatmapData.filter(p => p.intensity > 0.6 && p.intensity <= 0.8).length },
                    { range: 'Medium (40-60%)', color: '#fbc02d', count: heatmapData.filter(p => p.intensity > 0.4 && p.intensity <= 0.6).length },
                    { range: 'Low (0-40%)', color: '#388e3c', count: heatmapData.filter(p => p.intensity <= 0.4).length },
                  ].map((level, index) => (
                    <Box key={index} display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Box display="flex" alignItems="center">
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            bgcolor: level.color, 
                            borderRadius: 1, 
                            mr: 1 
                          }} 
                        />
                        <Typography variant="caption">
                          {level.range}
                        </Typography>
                      </Box>
                      <Typography variant="caption" fontWeight="bold">
                        {level.count}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Recent Activity */}
                <Box>
                  <Typography variant="caption" display="block" gutterBottom>
                    Recent Activity:
                  </Typography>
                  {heatmapData.slice(0, 5).map((point, index) => (
                    <Typography key={index} variant="caption" display="block" sx={{ mb: 0.5 }}>
                      📍 {point.type} at ({point.lat.toFixed(3)}, {point.lng.toFixed(3)})
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Paper>
        </Grid>
      </Grid>

      {/* Integration Note */}
      <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          💡 <strong>Integration Ready:</strong> This Next.js app is fully connected to your deployed AWS Lambda backend at{' '}
          <code>https://oeqsffqyzg.execute-api.us-east-1.amazonaws.com/dev</code>
          <br />
          All data shown is fetched in real-time from your SmartEAS backend APIs.
        </Typography>
      </Box>
    </Container>
  );
}
