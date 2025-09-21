import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';
import { logger } from '../utils/logger';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table name configuration  
const EVENTS_TABLE_NAME = process.env.DYNAMODB_TABLE || (process.env.DYNAMODB_TABLE_PREFIX ? `${process.env.DYNAMODB_TABLE_PREFIX}-events` : undefined);

interface MapVisualizationRequest {
  center?: { lat: number; lng: number };
  zoom?: number;
  timeRange?: string;
  disasterTypes?: string[];
  severityLevels?: string[];
  showHeatmap?: boolean;
  showMarkers?: boolean;
  showRegions?: boolean;
  includeUnconfirmed?: boolean;
  minConfidence?: number;
}

interface GoogleMapsIntegration {
  mapId: string;
  apiKey: string;
  heatmapLayer: any;
  markerLayer: any;
  polygonLayer: any;
}

/**
 * Function 5: Google Maps Disaster Visualization
 * Integrates with Google Maps to display disaster data as heatmaps, markers, and regions
 */
export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Processing Google Maps visualization request...');
    
    // Parse request parameters
    const body = event.body ? JSON.parse(event.body) : {};
    const queryParams = event.queryStringParameters || {};
    const request: MapVisualizationRequest = { ...queryParams, ...body };
    
    // Set default values
    const {
      center = { lat: 39.8283, lng: -98.5795 }, // Center of USA
      zoom = 4,
      timeRange = '24h',
      disasterTypes = [],
      severityLevels = [],
      showHeatmap = true,
      showMarkers = true,
      showRegions = false,
      includeUnconfirmed = false,
      minConfidence = 60
    } = request;
    
    // Get disaster data for visualization
    const disasterData = await getDisasterDataForVisualization(
      timeRange,
      disasterTypes,
      severityLevels,
      includeUnconfirmed,
      minConfidence
    );
    
    // Generate Google Maps configuration
    const mapsConfig = await generateGoogleMapsConfig(
      disasterData,
      {
        center,
        zoom,
        showHeatmap,
        showMarkers,
        showRegions
      }
    );
    
    // Generate MCP (Model Context Protocol) integration for real-time updates
    const mcpIntegration = await generateMCPIntegration(disasterData);
    
    // Create response with all visualization data
    const response = {
      mapConfiguration: mapsConfig,
      disasterData: {
        heatmapPoints: disasterData.heatmapPoints,
        markers: disasterData.markers,
        regions: disasterData.regions,
        statistics: disasterData.statistics
      },
      mcpIntegration: mcpIntegration,
      visualization: {
        layers: generateLayerConfiguration(disasterData, request),
        styles: generateMapStyles(disasterData),
        controls: generateControlsConfiguration(request),
        events: generateEventHandlers()
      },
      metadata: {
        generated: new Date().toISOString(),
        totalDisasters: disasterData.totalCount,
        timeRange: timeRange,
        center: center,
        zoom: zoom
      }
    };
    
    logger.info(`Google Maps visualization generated: ${disasterData.totalCount} disasters`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Cache-Control': 'max-age=180' // 3 minutes cache
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    logger.error('Google Maps visualization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Failed to generate Google Maps visualization',
        message: errorMessage
      })
    };
  }
};

async function getDisasterDataForVisualization(
  timeRange: string,
  disasterTypes: string[],
  severityLevels: string[],
  includeUnconfirmed: boolean,
  minConfidence: number
): Promise<any> {
  
  // Calculate time filter
  const timeFilter = calculateTimeFilter(timeRange);
  
  try {
    // Scan DynamoDB for disaster events
    const scanParams: any = {
      TableName: EVENTS_TABLE_NAME,
      FilterExpression: '#timestamp > :timeFilter',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':timeFilter': timeFilter
      }
    };
    
    // Add filters
    if (!includeUnconfirmed) {
      scanParams.FilterExpression += ' AND (disasterConfirmed = :confirmed OR isDisaster = :confirmed)';
      scanParams.ExpressionAttributeValues[':confirmed'] = true;
    }
    
    if (minConfidence > 0) {
      scanParams.FilterExpression += ' AND (validationConfidence >= :minConf OR aiConfidence >= :minConf)';
      scanParams.ExpressionAttributeValues[':minConf'] = minConfidence;
    }
    
    const command = new ScanCommand(scanParams);
    const result = await docClient.send(command);
    const disasters = result.Items || [];
    
    // Filter by disaster types and severity levels
    const filteredDisasters = disasters.filter(disaster => {
      if (disasterTypes.length > 0 && !disasterTypes.includes(disaster.disasterType)) {
        return false;
      }
      
      if (severityLevels.length > 0) {
        const severity = disaster.validatedSeverity || disaster.aiSeverity || 'low';
        if (!severityLevels.includes(severity)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Process disasters into visualization formats
    const heatmapPoints = await generateHeatmapPoints(filteredDisasters);
    const markers = await generateMapMarkers(filteredDisasters);
    const regions = await generateDisasterRegions(filteredDisasters);
    const statistics = calculateVisualizationStatistics(filteredDisasters);
    
    return {
      totalCount: filteredDisasters.length,
      heatmapPoints,
      markers,
      regions,
      statistics,
      rawData: filteredDisasters
    };
    
  } catch (error) {
    logger.error('Error fetching disaster data:', error);
    throw error;
  }
}

function calculateTimeFilter(timeRange: string): number {
  const now = Date.now();
  const timeMap: { [key: string]: number } = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const duration = timeMap[timeRange] || timeMap['24h'];
  return now - duration;
}

async function generateHeatmapPoints(disasters: any[]): Promise<any[]> {
  const points = [];
  
  for (const disaster of disasters) {
    const coordinates = await getCoordinates(disaster);
    if (!coordinates) continue;
    
    const intensity = calculateHeatmapIntensity(disaster);
    
    points.push({
      location: { lat: coordinates.lat, lng: coordinates.lng },
      weight: intensity
    });
  }
  
  return points;
}

async function generateMapMarkers(disasters: any[]): Promise<any[]> {
  const markers = [];
  
  for (const disaster of disasters) {
    const coordinates = await getCoordinates(disaster);
    if (!coordinates) continue;
    
    const marker = {
      position: { lat: coordinates.lat, lng: coordinates.lng },
      title: disaster.title || `${disaster.disasterType} Alert`,
      icon: getMarkerIcon(disaster),
      data: {
        id: disaster.id,
        disasterType: disaster.disasterType,
        severity: disaster.validatedSeverity || disaster.aiSeverity,
        confidence: disaster.validationConfidence || disaster.aiConfidence,
        location: disaster.aiLocation || disaster.location,
        timestamp: disaster.timestamp,
        summary: disaster.aiSummary || disaster.title,
        officialAlerts: disaster.officialAlerts || [],
        validationSources: disaster.validationSources || []
      },
      infoWindow: {
        content: generateInfoWindowContent(disaster)
      }
    };
    
    markers.push(marker);
  }
  
  return markers;
}

async function generateDisasterRegions(disasters: any[]): Promise<any[]> {
  const regions = [];
  
  // Group disasters by geographic proximity
  const clusters = clusterDisastersByLocation(disasters);
  
  for (const cluster of clusters) {
    const bounds = calculateClusterBounds(cluster);
    const centerPoint = calculateClusterCenter(cluster);
    
    const region = {
      bounds: bounds,
      center: centerPoint,
      disasterCount: cluster.length,
      dominantType: findDominantDisasterType(cluster),
      maxSeverity: findMaxSeverity(cluster),
      avgConfidence: calculateAverageConfidence(cluster),
      polygon: {
        paths: generatePolygonPath(bounds),
        strokeColor: getRegionStrokeColor(cluster),
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: getRegionFillColor(cluster),
        fillOpacity: 0.35
      },
      infoWindow: {
        content: generateRegionInfoContent(cluster)
      }
    };
    
    regions.push(region);
  }
  
  return regions;
}

async function generateGoogleMapsConfig(disasterData: any, options: any): Promise<GoogleMapsIntegration> {
  const config: GoogleMapsIntegration = {
    mapId: process.env.GOOGLE_MAPS_MAP_ID || 'disaster-monitoring-map',
    apiKey: process.env.GOOGLE_MAPS_API_KEY!,
    heatmapLayer: null,
    markerLayer: null,
    polygonLayer: null
  };
  
  // Configure heatmap layer
  if (options.showHeatmap) {
    config.heatmapLayer = {
      data: disasterData.heatmapPoints,
      options: {
        radius: 50,
        opacity: 0.8,
        maxIntensity: 100,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(255, 127, 0, 1)',
          'rgba(255, 0, 0, 1)'
        ]
      }
    };
  }
  
  // Configure marker layer
  if (options.showMarkers) {
    config.markerLayer = {
      markers: disasterData.markers,
      clustering: {
        enabled: true,
        maxZoom: 12,
        gridSize: 60,
        styles: generateClusterStyles()
      }
    };
  }
  
  // Configure polygon layer for regions
  if (options.showRegions) {
    config.polygonLayer = {
      polygons: disasterData.regions.map((r: any) => r.polygon)
    };
  }
  
  return config;
}

async function generateMCPIntegration(disasterData: any): Promise<any> {
  return {
    serverEndpoint: `${process.env.MCP_SERVER_ENDPOINT || 'http://localhost:3001'}/maps`,
    capabilities: [
      'real-time-updates',
      'route-optimization',
      'emergency-navigation',
      'location-services'
    ],
    methods: {
      updateDisasterData: {
        method: 'POST',
        endpoint: '/update-disasters',
        params: ['disasterData']
      },
      optimizeEvacuationRoute: {
        method: 'POST',
        endpoint: '/optimize-route',
        params: ['origin', 'destination', 'disasterType', 'avoidAreas']
      },
      findNearbyEmergencyServices: {
        method: 'GET',
        endpoint: '/emergency-services',
        params: ['location', 'serviceType', 'radius']
      },
      getDisasterAlerts: {
        method: 'GET',
        endpoint: '/alerts',
        params: ['location', 'radius', 'severityLevel']
      }
    },
    websocketEndpoint: `${process.env.MCP_WEBSOCKET_ENDPOINT || 'ws://localhost:3001'}/maps-realtime`,
    authentication: {
      type: 'api-key',
      header: 'X-MCP-API-Key',
      value: process.env.MCP_API_KEY
    }
  };
}

function generateLayerConfiguration(disasterData: any, request: MapVisualizationRequest): any {
  return {
    heatmap: {
      enabled: request.showHeatmap !== false,
      zIndex: 1,
      data: disasterData.heatmapPoints
    },
    markers: {
      enabled: request.showMarkers !== false,
      zIndex: 2,
      data: disasterData.markers
    },
    regions: {
      enabled: request.showRegions === true,
      zIndex: 0,
      data: disasterData.regions
    },
    traffic: {
      enabled: false,
      zIndex: 3
    },
    transit: {
      enabled: false,
      zIndex: 4
    }
  };
}

function generateMapStyles(disasterData: any): any {
  return {
    mapTypeId: 'roadmap',
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ],
    options: {
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true
    }
  };
}

function generateControlsConfiguration(request: MapVisualizationRequest): any {
  return {
    layerControl: {
      enabled: true,
      position: 'TOP_RIGHT',
      layers: [
        { id: 'heatmap', name: 'Disaster Heatmap', enabled: request.showHeatmap !== false },
        { id: 'markers', name: 'Disaster Markers', enabled: request.showMarkers !== false },
        { id: 'regions', name: 'Affected Regions', enabled: request.showRegions === true }
      ]
    },
    filterControl: {
      enabled: true,
      position: 'TOP_LEFT',
      filters: [
        {
          type: 'dropdown',
          id: 'disasterType',
          label: 'Disaster Type',
          options: ['All', 'Earthquake', 'Flood', 'Hurricane', 'Tornado', 'Wildfire']
        },
        {
          type: 'dropdown',
          id: 'severity',
          label: 'Severity',
          options: ['All', 'Low', 'Medium', 'High', 'Critical']
        },
        {
          type: 'slider',
          id: 'timeRange',
          label: 'Time Range',
          min: 1,
          max: 30,
          value: 24,
          unit: 'hours'
        }
      ]
    },
    infoPanel: {
      enabled: true,
      position: 'BOTTOM_LEFT',
      collapsible: true,
      showStatistics: true,
      showLegend: true
    }
  };
}

function generateEventHandlers(): any {
  return {
    onMarkerClick: `
      function(marker, data) {
        // Show detailed disaster information
        const infoWindow = new google.maps.InfoWindow({
          content: marker.infoWindow.content
        });
        infoWindow.open(map, marker);
        
        // Update info panel with disaster details
        updateInfoPanel(data);
        
        // Trigger MCP event for emergency services
        if (data.severity === 'critical') {
          mcpClient.findNearbyEmergencyServices(marker.position, 'all', 50);
        }
      }
    `,
    onHeatmapClick: `
      function(event) {
        // Get disasters near click point
        const nearbyDisasters = findNearbyDisasters(event.latLng, 10);
        showNearbyDisastersPopup(event.latLng, nearbyDisasters);
      }
    `,
    onRegionClick: `
      function(polygon, regionData) {
        // Show region summary
        const infoWindow = new google.maps.InfoWindow({
          content: polygon.infoWindow.content,
          position: regionData.center
        });
        infoWindow.open(map);
        
        // Zoom to region bounds
        map.fitBounds(regionData.bounds);
      }
    `,
    onLayerToggle: `
      function(layerId, enabled) {
        // Toggle layer visibility
        toggleLayer(layerId, enabled);
        
        // Update URL parameters
        updateUrlParams({ [layerId]: enabled });
      }
    `,
    onFilterChange: `
      function(filterId, value) {
        // Apply filter and refresh data
        applyFilter(filterId, value);
        refreshMapData();
      }
    `
  };
}

async function getCoordinates(disaster: any): Promise<{ lat: number; lng: number } | null> {
  // Try to get coordinates from various fields
  if (disaster.affectedArea && disaster.affectedArea.center) {
    return disaster.affectedArea.center;
  }
  
  // If no coordinates, try to geocode location
  const location = disaster.aiLocation || disaster.location;
  if (location) {
    // This would call a geocoding service
    // For now, return null to skip
    return null;
  }
  
  return null;
}

function calculateHeatmapIntensity(disaster: any): number {
  let intensity = 0;
  
  // Base intensity from confidence
  const confidence = disaster.validationConfidence || disaster.aiConfidence || 0;
  intensity += confidence * 0.5;
  
  // Severity multiplier
  const severityWeights: { [key: string]: number } = { 
    low: 0.25, 
    medium: 0.5, 
    high: 0.75, 
    critical: 1.0 
  };
  const severity = disaster.validatedSeverity || disaster.aiSeverity || 'low';
  intensity += severityWeights[severity] * 30;
  
  // Official alerts boost
  const alertCount = (disaster.officialAlerts || []).length;
  intensity += Math.min(alertCount * 5, 20);
  
  return Math.min(Math.round(intensity), 100);
}

function getMarkerIcon(disaster: any): any {
  const severity = disaster.validatedSeverity || disaster.aiSeverity || 'low';
  const disasterType = disaster.disasterType || 'unknown';
  
  const iconConfig: { [key: string]: { color: string; size: number } } = {
    low: { color: '#4CAF50', size: 20 },
    medium: { color: '#FF9800', size: 25 },
    high: { color: '#F44336', size: 30 },
    critical: { color: '#9C27B0', size: 35 }
  };
  
  const config = iconConfig[severity] || iconConfig['low'];
  
  return {
    url: `https://maps.google.com/mapfiles/ms/icons/${getDisasterIconColor(disasterType)}-dot.png`,
    scaledSize: { width: config.size, height: config.size },
    origin: { x: 0, y: 0 },
    anchor: { x: config.size / 2, y: config.size / 2 }
  };
}

function getDisasterIconColor(disasterType: string): string {
  const colorMap: { [key: string]: string } = {
    earthquake: 'brown',
    tsunami: 'blue',
    flood: 'lightblue',
    hurricane: 'purple',
    tornado: 'yellow',
    wildfire: 'red',
    volcano: 'orange',
    landslide: 'green',
    blizzard: 'white'
  };
  
  return colorMap[disasterType] || 'gray';
}

function generateInfoWindowContent(disaster: any): string {
  const severity = disaster.validatedSeverity || disaster.aiSeverity || 'unknown';
  const confidence = disaster.validationConfidence || disaster.aiConfidence || 0;
  const alerts = disaster.officialAlerts || [];
  const sources = disaster.validationSources || [];
  
  return `
    <div class="disaster-info-window">
      <h3>${disaster.disasterType || 'Unknown'} Alert</h3>
      <div class="severity-badge severity-${severity}">${severity.toUpperCase()}</div>
      <p><strong>Location:</strong> ${disaster.aiLocation || disaster.location || 'Unknown'}</p>
      <p><strong>Confidence:</strong> ${confidence}%</p>
      <p><strong>Time:</strong> ${new Date(disaster.timestamp).toLocaleString()}</p>
      ${disaster.aiSummary ? `<p><strong>Summary:</strong> ${disaster.aiSummary}</p>` : ''}
      ${alerts.length > 0 ? `<p><strong>Official Alerts:</strong> ${alerts.length}</p>` : ''}
      ${sources.length > 0 ? `<p><strong>Validated by:</strong> ${sources.map((s: any) => s.source || s).join(', ')}</p>` : ''}
      <div class="actions">
        <button onclick="showDisasterDetails('${disaster.id}')">View Details</button>
        <button onclick="findEvacuationRoute('${disaster.id}')">Evacuation Route</button>
      </div>
    </div>
  `;
}

function generateRegionInfoContent(cluster: any[]): string {
  const disasterCount = cluster.length;
  const dominantType = findDominantDisasterType(cluster);
  const maxSeverity = findMaxSeverity(cluster);
  
  return `
    <div class="region-info-window">
      <h3>Disaster Region</h3>
      <p><strong>Disasters:</strong> ${disasterCount}</p>
      <p><strong>Dominant Type:</strong> ${dominantType}</p>
      <p><strong>Max Severity:</strong> ${maxSeverity}</p>
      <div class="actions">
        <button onclick="viewRegionDetails()">View All Disasters</button>
        <button onclick="planEvacuationForRegion()">Evacuation Planning</button>
      </div>
    </div>
  `;
}

function generateClusterStyles(): any[] {
  return [
    {
      textColor: 'white',
      url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m1.png',
      height: 53,
      width: 53
    },
    {
      textColor: 'white',
      url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m2.png',
      height: 56,
      width: 56
    },
    {
      textColor: 'white',
      url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m3.png',
      height: 66,
      width: 66
    }
  ];
}

// Helper functions for clustering and calculations
function clusterDisastersByLocation(disasters: any[]): any[][] {
  // Simple distance-based clustering
  const clusters = [];
  const processed = new Set();
  const CLUSTER_DISTANCE = 50; // kilometers
  
  for (const disaster of disasters) {
    if (processed.has(disaster.id)) continue;
    
    const cluster = [disaster];
    processed.add(disaster.id);
    
    // Find nearby disasters
    for (const other of disasters) {
      if (processed.has(other.id)) continue;
      
      const distance = calculateDistance(
        getCoordinatesSync(disaster),
        getCoordinatesSync(other)
      );
      
      if (distance <= CLUSTER_DISTANCE) {
        cluster.push(other);
        processed.add(other.id);
      }
    }
    
    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

function getCoordinatesSync(disaster: any): { lat: number; lng: number } | null {
  if (disaster.affectedArea && disaster.affectedArea.center) {
    return disaster.affectedArea.center;
  }
  return null;
}

function calculateDistance(coord1: { lat: number; lng: number } | null, coord2: { lat: number; lng: number } | null): number {
  if (!coord1 || !coord2) return Infinity;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateClusterBounds(cluster: any[]): any {
  const coordinates = cluster.map(d => getCoordinatesSync(d)).filter(c => c) as { lat: number; lng: number }[];
  if (coordinates.length === 0) return null;
  
  const lats = coordinates.map(c => c.lat);
  const lngs = coordinates.map(c => c.lng);
  
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
}

function calculateClusterCenter(cluster: any[]): { lat: number; lng: number } | null {
  const coordinates = cluster.map(d => getCoordinatesSync(d)).filter(c => c) as { lat: number; lng: number }[];
  if (coordinates.length === 0) return null;
  
  const avgLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
  const avgLng = coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length;
  
  return { lat: avgLat, lng: avgLng };
}

function findDominantDisasterType(cluster: any[]): string {
  const types = cluster.map(d => d.disasterType).filter(t => t);
  const frequency: { [key: string]: number } = {};
  
  for (const type of types) {
    frequency[type] = (frequency[type] || 0) + 1;
  }
  
  return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
}

function findMaxSeverity(cluster: any[]): string {
  const severities = cluster.map(d => d.validatedSeverity || d.aiSeverity || 'low');
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  
  return severities.reduce((max, current) => {
    const maxIndex = severityOrder.indexOf(max);
    const currentIndex = severityOrder.indexOf(current);
    return currentIndex > maxIndex ? current : max;
  }, 'low');
}

function calculateAverageConfidence(cluster: any[]): number {
  const confidences = cluster.map(d => d.validationConfidence || d.aiConfidence || 0);
  return Math.round(confidences.reduce((sum, c) => sum + c, 0) / confidences.length);
}

function calculateVisualizationStatistics(disasters: any[]): any {
  return {
    total: disasters.length,
    byType: disasters.reduce((acc, d) => {
      acc[d.disasterType] = (acc[d.disasterType] || 0) + 1;
      return acc;
    }, {}),
    bySeverity: disasters.reduce((acc, d) => {
      const severity = d.validatedSeverity || d.aiSeverity || 'low';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {}),
    avgConfidence: Math.round(
      disasters.reduce((sum, d) => sum + (d.validationConfidence || d.aiConfidence || 0), 0) / disasters.length
    )
  };
}

function generatePolygonPath(bounds: any): any[] {
  return [
    { lat: bounds.north, lng: bounds.west },
    { lat: bounds.north, lng: bounds.east },
    { lat: bounds.south, lng: bounds.east },
    { lat: bounds.south, lng: bounds.west }
  ];
}

function getRegionStrokeColor(cluster: any[]): string {
  const maxSeverity = findMaxSeverity(cluster);
  const colors: { [key: string]: string } = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
    critical: '#9C27B0'
  };
  return colors[maxSeverity] || '#808080';
}

function getRegionFillColor(cluster: any[]): string {
  return getRegionStrokeColor(cluster);
}
