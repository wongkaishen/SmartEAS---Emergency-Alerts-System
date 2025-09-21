import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const dynamoClient = new DynamoDBClient({ 
  region: process.env.BEDROCK_REGION || 'us-east-1',
  // AWS Lambda automatically provides credentials via IAM role
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table name configuration - Updated to match actual table names
const EVENTS_TABLE_NAME = process.env.DYNAMODB_TABLE || process.env.DYNAMODB_EVENTS_TABLE || 'smarteas-dev-dev-events';

interface HeatmapDataPoint {
  id: string;
  coordinates: { lat: number; lng: number };
  disasterType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  timestamp: number;
  location: string;
  affectedRadius: number; // in kilometers
  intensity: number; // 0-100 for heatmap visualization
  alerts: number; // number of alerts for this location
  validationSources: string[];
  isActive: boolean;
}

interface HeatmapRegion {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  centerPoint: { lat: number; lng: number };
  disasterCount: number;
  dominantDisasterType: string;
  maxSeverity: string;
  avgConfidence: number;
  dataPoints: HeatmapDataPoint[];
}

/**
 * Function 4: Disaster Heatmap Data Aggregator
 * Prepares validated disaster data for Google Maps heatmap visualization
 */
export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    const response: APIGatewayProxyResult = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
    return response;
  }

  try {
    logger.info('Generating disaster heatmap data...');
    
    // Parse request parameters
    const queryParams = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const params = { ...queryParams, ...body };
    
    const timeRange = params.timeRange || '24h'; // 1h, 6h, 24h, 7d, 30d
    const minConfidence = parseInt(params.minConfidence || '60');
    const disasterTypes = params.disasterTypes ? params.disasterTypes.split(',') : [];
    const severityLevels = params.severityLevels ? params.severityLevels.split(',') : [];
    const bounds = params.bounds ? JSON.parse(params.bounds) : null; // {north, south, east, west}
    const includeUnconfirmed = params.includeUnconfirmed === 'true';
    
    // Calculate time filter
    const timeFilter = calculateTimeFilter(timeRange);
    
    // Get validated disaster events from DynamoDB
    const disasters = await getValidatedDisasters(timeFilter, minConfidence, includeUnconfirmed);
    
    // Filter by disaster type and severity if specified
    const filteredDisasters = filterDisasters(disasters, disasterTypes, severityLevels);
    
    // Convert to heatmap data points
    const heatmapData = await convertToHeatmapData(filteredDisasters);
    
    // Filter by geographic bounds if specified
    const boundedData = bounds ? filterByBounds(heatmapData, bounds) : heatmapData;
    
    // Generate regional aggregations for better visualization
    const regions = generateRegionalData(boundedData);
    
    // Calculate statistics
    const statistics = calculateStatistics(boundedData);
    
    const response = {
      heatmapData: boundedData,
      regions: regions,
      statistics: statistics,
      metadata: {
        timeRange: timeRange,
        minConfidence: minConfidence,
        totalPoints: boundedData.length,
        dataGenerated: new Date().toISOString(),
        filters: {
          disasterTypes: disasterTypes.length > 0 ? disasterTypes : 'all',
          severityLevels: severityLevels.length > 0 ? severityLevels : 'all',
          bounds: bounds,
          includeUnconfirmed: includeUnconfirmed
        }
      },
      configuration: {
        heatmapOptions: {
          radius: 20,
          maxIntensity: 100,
          gradient: {
            0.0: 'rgba(0, 255, 255, 0)',
            0.2: 'rgba(0, 255, 255, 1)',
            0.4: 'rgba(0, 191, 255, 1)',
            0.6: 'rgba(0, 127, 255, 1)',
            0.8: 'rgba(255, 127, 0, 1)',
            1.0: 'rgba(255, 0, 0, 1)'
          }
        },
        markerStyles: {
          low: { color: '#4CAF50', radius: 8 },
          medium: { color: '#FF9800', radius: 12 },
          high: { color: '#F44336', radius: 16 },
          critical: { color: '#9C27B0', radius: 20 }
        }
      }
    };
    
    logger.info(`Heatmap data generated: ${boundedData.length} points, ${regions.length} regions`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Cache-Control': 'max-age=300' // 5 minutes cache
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    logger.error('Heatmap data generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to generate heatmap data',
        message: errorMessage
      })
    };
  }
};

function calculateTimeFilter(timeRange: string): number {
  const now = Date.now();
  const timeMap: Record<'1h' | '6h' | '24h' | '7d' | '30d', number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  const duration = timeMap[timeRange as keyof typeof timeMap] ?? timeMap['24h'];
  return now - duration;
}

async function getValidatedDisasters(timeFilter: number, minConfidence: number, includeUnconfirmed: boolean): Promise<any[]> {
  try {
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
    
    // Add confidence filter if specified
    if (minConfidence > 0) {
      scanParams.FilterExpression += ' AND (validationConfidence >= :minConfidence OR aiConfidence >= :minConfidence)';
      scanParams.ExpressionAttributeValues[':minConfidence'] = minConfidence;
    }
    
    // Add disaster confirmation filter unless including unconfirmed
    if (!includeUnconfirmed) {
      scanParams.FilterExpression += ' AND (disasterConfirmed = :confirmed OR isDisaster = :confirmed)';
      scanParams.ExpressionAttributeValues[':confirmed'] = true;
    }
    
    const command = new ScanCommand(scanParams);
    const result = await docClient.send(command);
    
    return result.Items || [];
    
  } catch (error) {
    logger.error('Error fetching disasters from DynamoDB:', error);
    throw error;
  }
}

function filterDisasters(disasters: any[], disasterTypes: string[], severityLevels: string[]): any[] {
  return disasters.filter(disaster => {
    // Filter by disaster type
    if (disasterTypes.length > 0) {
      const disasterType = disaster.disasterType;
      if (!disasterType || !disasterTypes.includes(disasterType.toLowerCase())) {
        return false;
      }
    }
    
    // Filter by severity level
    if (severityLevels.length > 0) {
      const severity = disaster.validatedSeverity || disaster.aiSeverity || disaster.severity;
      if (!severity || !severityLevels.includes(severity.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
}

async function convertToHeatmapData(disasters: any[]): Promise<HeatmapDataPoint[]> {
  const heatmapPoints: HeatmapDataPoint[] = [];
  
  for (const disaster of disasters) {
    try {
      // Extract coordinates
      let coordinates = null;
      
      if (disaster.affectedArea && disaster.affectedArea.center) {
        coordinates = disaster.affectedArea.center;
      } else if (disaster.aiLocation || disaster.location) {
        // Geocode location if we don't have coordinates
        coordinates = await geocodeLocation(disaster.aiLocation || disaster.location);
      }
      
      if (!coordinates) continue;
      
      // Calculate intensity based on confidence, severity, and validation
      const intensity = calculateIntensity(disaster);
      
      // Determine affected radius based on disaster type and severity
      const affectedRadius = calculateAffectedRadius(disaster);
      
      // Count alerts and validation sources
      const alertCount = (disaster.officialAlerts || []).length;
      const validationSources = (disaster.validationSources || []).map((s: any) => 
        typeof s === 'string' ? s : s.source
      );
      
      const dataPoint: HeatmapDataPoint = {
        id: disaster.id,
        coordinates: coordinates,
        disasterType: disaster.disasterType || 'unknown',
        severity: disaster.validatedSeverity || disaster.aiSeverity || disaster.severity || 'low',
        confidence: disaster.validationConfidence || disaster.aiConfidence || 0,
        timestamp: disaster.validationTimestamp || disaster.aiAnalysisTimestamp || disaster.timestamp,
        location: disaster.aiLocation || disaster.location || 'Unknown',
        affectedRadius: affectedRadius,
        intensity: intensity,
        alerts: alertCount,
        validationSources: validationSources,
        isActive: isDisasterActive(disaster)
      };
      
      heatmapPoints.push(dataPoint);
      
    } catch (error) {
      logger.error(`Error processing disaster ${disaster.id}:`, error);
    }
  }
  
  return heatmapPoints;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (!location) return null;
  
  try {
    // Use a geocoding service (Google Maps, OpenStreetMap, etc.)
    // This is a simplified version - you'd want to implement proper geocoding
    
    // For now, return null to skip items without coordinates
    return null;
    
  } catch (error) {
    logger.error('Geocoding error:', error);
    return null;
  }
}

function calculateIntensity(disaster: any): number {
  let intensity = 0;
  
  // Base intensity from confidence
  const confidence = disaster.validationConfidence || disaster.aiConfidence || 0;
  intensity += confidence * 0.4; // 40% weight to confidence
  
  // Severity multiplier
  const severityWeights: Record<'low' | 'medium' | 'high' | 'critical', number> = {
    low: 0.2,
    medium: 0.5,
    high: 0.8,
    critical: 1.0
  };
  let severity: string = disaster.validatedSeverity || disaster.aiSeverity || 'low';
  if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
    severity = 'low';
  }
  intensity += severityWeights[severity as 'low' | 'medium' | 'high' | 'critical'] * 30; // 30% weight to severity
  
  // Official alerts boost
  const alertCount = (disaster.officialAlerts || []).length;
  intensity += Math.min(alertCount * 10, 20); // Up to 20% boost for alerts
  
  // Multiple validation sources boost
  const sourceCount = (disaster.validationSources || []).length;
  intensity += Math.min(sourceCount * 5, 10); // Up to 10% boost for multiple sources
  
  return Math.min(Math.round(intensity), 100);
}

function calculateAffectedRadius(disaster: any): number {
  const baseRadius: Record<'earthquake' | 'tsunami' | 'hurricane' | 'tornado' | 'flood' | 'wildfire' | 'volcano' | 'landslide' | 'blizzard', number> = {
    earthquake: 50,
    tsunami: 100,
    hurricane: 200,
    tornado: 25,
    flood: 75,
    wildfire: 60,
    volcano: 150,
    landslide: 30,
    blizzard: 100
  };
  
  const disasterType: keyof typeof baseRadius = (disaster.disasterType as keyof typeof baseRadius) || 'earthquake';
  let radius = baseRadius[disasterType] ?? 40;
  
  // Adjust based on severity
  const severityMultipliers = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
    critical: 2.0
  };
  
  let severity: keyof typeof severityMultipliers = (disaster.validatedSeverity || disaster.aiSeverity || 'medium') as keyof typeof severityMultipliers;
  if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
    severity = 'medium';
  }
  radius *= severityMultipliers[severity];
  
  // Consider specific data (like earthquake magnitude)
  if (disaster.seismicData && disaster.seismicData.length > 0) {
    const maxMagnitude = Math.max(...disaster.seismicData.map((s: any) => s.magnitude || 0));
    if (maxMagnitude > 0) {
      radius = Math.max(radius, maxMagnitude * 20); // 20km per magnitude unit
    }
  }
  
  return Math.round(radius);
}

function isDisasterActive(disaster: any): boolean {
  const now = Date.now();
  const disasterTime = disaster.validationTimestamp || disaster.aiAnalysisTimestamp || disaster.timestamp;
  const timeDiff = now - disasterTime;
  
  // Consider disaster active based on type and time
  const activeThresholds = {
    earthquake: 24 * 60 * 60 * 1000, // 24 hours
    tsunami: 12 * 60 * 60 * 1000,    // 12 hours
    hurricane: 7 * 24 * 60 * 60 * 1000, // 7 days
    tornado: 6 * 60 * 60 * 1000,     // 6 hours
    flood: 3 * 24 * 60 * 60 * 1000,  // 3 days
    wildfire: 14 * 24 * 60 * 60 * 1000, // 14 days
    volcano: 30 * 24 * 60 * 60 * 1000   // 30 days
  };
  
  const allowedTypes = ['earthquake', 'tsunami', 'hurricane', 'tornado', 'flood', 'wildfire', 'volcano'] as const;
  type DisasterType = typeof allowedTypes[number];
  const disasterType: DisasterType = allowedTypes.includes(disaster.disasterType) ? disaster.disasterType as DisasterType : 'earthquake';
  const threshold = activeThresholds[disasterType] || 24 * 60 * 60 * 1000; // Default 24 hours
  
  return timeDiff <= threshold;
}

function filterByBounds(data: HeatmapDataPoint[], bounds: any): HeatmapDataPoint[] {
  return data.filter(point => {
    const { lat, lng } = point.coordinates;
    return lat >= bounds.south && lat <= bounds.north && 
           lng >= bounds.west && lng <= bounds.east;
  });
}

function generateRegionalData(data: HeatmapDataPoint[]): HeatmapRegion[] {
  if (data.length === 0) return [];
  
  // Simple grid-based clustering for regional data
  const gridSize = 1.0; // 1 degree grid
  const regionMap = new Map<string, HeatmapDataPoint[]>();
  
  for (const point of data) {
    const gridLat = Math.floor(point.coordinates.lat / gridSize) * gridSize;
    const gridLng = Math.floor(point.coordinates.lng / gridSize) * gridSize;
    const key = `${gridLat},${gridLng}`;
    
    if (!regionMap.has(key)) {
      regionMap.set(key, []);
    }
    regionMap.get(key)!.push(point);
  }
  
  const regions: HeatmapRegion[] = [];
  
  for (const [key, points] of regionMap) {
    if (points.length === 0) continue;
    
    const [gridLat, gridLng] = key.split(',').map(Number);
    
    // Calculate region statistics
    const disasterTypes = points.map(p => p.disasterType);
    const dominantType = findMostFrequent(disasterTypes);
    
    const severities = points.map(p => p.severity);
    const maxSeverity = findMaxSeverity(severities);
    
    const avgConfidence = points.reduce((sum, p) => sum + p.confidence, 0) / points.length;
    
    const region: HeatmapRegion = {
      bounds: {
        north: gridLat + gridSize,
        south: gridLat,
        east: gridLng + gridSize,
        west: gridLng
      },
      centerPoint: {
        lat: gridLat + gridSize / 2,
        lng: gridLng + gridSize / 2
      },
      disasterCount: points.length,
      dominantDisasterType: dominantType,
      maxSeverity: maxSeverity,
      avgConfidence: Math.round(avgConfidence),
      dataPoints: points
    };
    
    regions.push(region);
  }
  
  return regions.sort((a, b) => b.disasterCount - a.disasterCount);
}

function findMostFrequent<T>(array: T[]): T {
  const frequency = new Map<T, number>();
  for (const item of array) {
    frequency.set(item, (frequency.get(item) || 0) + 1);
  }
  
  let maxCount = 0;
  let mostFrequent = array[0];
  for (const [item, count] of frequency) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = item;
    }
  }
  
  return mostFrequent;
}

function findMaxSeverity(severities: string[]): string {
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  return severities.reduce((max, current) => {
    const maxIndex = severityOrder.indexOf(max);
    const currentIndex = severityOrder.indexOf(current);
    return currentIndex > maxIndex ? current : max;
  }, 'low');
}

function calculateStatistics(data: HeatmapDataPoint[]): any {
  if (data.length === 0) {
    return {
      totalDisasters: 0,
      byType: {},
      bySeverity: {},
      avgConfidence: 0,
      activeDisasters: 0,
      validatedDisasters: 0
    };
  }
  
  const byType: { [key: string]: number } = {};
  const bySeverity: { [key: string]: number } = {};
  let totalConfidence = 0;
  let activeCount = 0;
  let validatedCount = 0;
  
  for (const point of data) {
    // Count by disaster type
    byType[point.disasterType] = (byType[point.disasterType] || 0) + 1;
    
    // Count by severity
    bySeverity[point.severity] = (bySeverity[point.severity] || 0) + 1;
    
    // Sum confidence for average
    totalConfidence += point.confidence;
    
    // Count active disasters
    if (point.isActive) activeCount++;
    
    // Count validated disasters (with official sources)
    if (point.validationSources.length > 0) validatedCount++;
  }
  
  return {
    totalDisasters: data.length,
    byType: byType,
    bySeverity: bySeverity,
    avgConfidence: Math.round(totalConfidence / data.length),
    activeDisasters: activeCount,
    validatedDisasters: validatedCount,
    coverageArea: calculateCoverageArea(data),
    timeRange: {
      earliest: Math.min(...data.map(p => p.timestamp)),
      latest: Math.max(...data.map(p => p.timestamp))
    }
  };
}

function calculateCoverageArea(data: HeatmapDataPoint[]): any {
  if (data.length === 0) return null;
  
  const lats = data.map(p => p.coordinates.lat);
  const lngs = data.map(p => p.coordinates.lng);
  
  return {
    bounds: {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    },
    center: {
      lat: (Math.max(...lats) + Math.min(...lats)) / 2,
      lng: (Math.max(...lngs) + Math.min(...lngs)) / 2
    }
  };
}
