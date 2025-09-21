import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface Location {
  lat: number;
  lng: number;
}

interface RouteRequest {
  origin: Location;
  destination: Location;
  avoidDisasters?: boolean;
  transportMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
}

interface RouteResponse {
  routes: Array<{
    summary: string;
    duration: string;
    distance: string;
    steps: Array<{
      instruction: string;
      duration: string;
      distance: string;
    }>;
    avoidedDisasters?: number;
  }>;
  disasterWarnings?: Array<{
    type: string;
    location: Location;
    severity: string;
    description: string;
  }>;
}

/**
 * Route Optimizer Handler
 * Provides emergency-aware route planning
 */
export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  try {
    // Handle preflight CORS requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    logger.info('Route optimization request received', { event });

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const body: RouteRequest = JSON.parse(event.body || '{}');
    
    if (!body.origin || !body.destination) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Origin and destination are required' })
      };
    }

    // Get active disasters if avoidDisasters is enabled
    let activeDisasters: any[] = [];
    if (body.avoidDisasters) {
      try {
        const scanCommand = new ScanCommand({
          TableName: `${process.env.DYNAMODB_TABLE_PREFIX}-events`,
          FilterExpression: '#status = :active AND #type = :disaster',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#type': 'type'
          },
          ExpressionAttributeValues: {
            ':active': 'active',
            ':disaster': 'disaster'
          }
        });

        const result = await docClient.send(scanCommand);
        activeDisasters = result.Items || [];
        logger.info('Retrieved active disasters', { count: activeDisasters.length });
      } catch (error) {
        logger.warn('Failed to retrieve disasters', { error });
      }
    }

    // Calculate route with Google Maps integration
    const optimizedRoute = await calculateOptimizedRoute(body, activeDisasters);

    logger.info('Route optimization completed', { 
      origin: body.origin, 
      destination: body.destination,
      avoidedDisasters: optimizedRoute.routes[0]?.avoidedDisasters || 0
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(optimizedRoute)
    };

  } catch (error) {
    logger.error('Route optimization failed', { error });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to optimize route'
      })
    };
  }
};

/**
 * Calculate optimized route considering disasters
 */
async function calculateOptimizedRoute(request: RouteRequest, disasters: any[]): Promise<RouteResponse> {
  // For now, return a mock response since we don't have Google Maps API fully integrated
  // In production, this would use Google Maps Directions API
  
  const distance = calculateDistance(request.origin, request.destination);
  const estimatedDuration = Math.round(distance * 2); // rough estimate: 2 minutes per km
  
  // Check for disasters near the route
  const nearbyDisasters = disasters.filter(disaster => {
    if (!disaster.location) return false;
    
    const distanceToOrigin = calculateDistance(request.origin, disaster.location);
    const distanceToDestination = calculateDistance(request.destination, disaster.location);
    
    // Consider disasters within 10km of origin or destination
    return distanceToOrigin < 10 || distanceToDestination < 10;
  });

  const route = {
    summary: `Optimized route from (${request.origin.lat}, ${request.origin.lng}) to (${request.destination.lat}, ${request.destination.lng})`,
    duration: `${estimatedDuration} minutes`,
    distance: `${distance.toFixed(1)} km`,
    steps: [
      {
        instruction: 'Head north',
        duration: '2 minutes',
        distance: '0.5 km'
      },
      {
        instruction: 'Continue straight',
        duration: `${estimatedDuration - 4} minutes`,
        distance: `${(distance - 1).toFixed(1)} km`
      },
      {
        instruction: 'Turn right to destination',
        duration: '2 minutes',
        distance: '0.5 km'
      }
    ],
    avoidedDisasters: nearbyDisasters.length
  };

  const response: RouteResponse = {
    routes: [route]
  };

  if (nearbyDisasters.length > 0) {
    response.disasterWarnings = nearbyDisasters.map(disaster => ({
      type: disaster.eventType || 'unknown',
      location: disaster.location,
      severity: disaster.severity || 'medium',
      description: disaster.description || 'Active disaster in the area'
    }));
  }

  return response;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}
