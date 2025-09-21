import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Health Check Handler
 * Simple endpoint to verify backend is running
 */
export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }

  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'SmartEAS Backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      region: process.env.AWS_REGION || 'us-east-1',
      stage: process.env.STAGE || 'dev',
      tables: {
        eventsTable: process.env.DYNAMODB_TABLE_PREFIX ? `${process.env.DYNAMODB_TABLE_PREFIX}-events` : 'not-configured',
        alertsTable: process.env.DYNAMODB_TABLE_PREFIX ? `${process.env.DYNAMODB_TABLE_PREFIX}-alerts` : 'not-configured',
        connectionsTable: process.env.DYNAMODB_TABLE_PREFIX ? `${process.env.DYNAMODB_TABLE_PREFIX}-connections` : 'not-configured'
      },
      apis: {
        reddit: process.env.REDDIT_CLIENT_ID ? 'configured' : 'not-configured',
        openweather: process.env.OPENWEATHER_API_KEY ? 'configured' : 'not-configured',
        bedrock: process.env.BEDROCK_MODEL_ID ? 'configured' : 'not-configured',
        googleMaps: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'not-configured'
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(healthData),
    };
  } catch (error) {
    console.error('Health check error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
    };
  }
};