import { DynamoDBStreamHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';
import { logger } from '../utils/logger';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table name configuration
const EVENTS_TABLE_NAME = process.env.DYNAMODB_TABLE || (process.env.DYNAMODB_TABLE_PREFIX ? `${process.env.DYNAMODB_TABLE_PREFIX}-events` : undefined);

interface WeatherValidationResult {
  isValidated: boolean;
  disasterConfirmed: boolean;
  confidence: number; // 0-100
  validationSources: ValidationSource[];
  officialAlerts: OfficialAlert[];
  meteorologicalData: MeteorologicalData[];
  seismicData: SeismicData[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedArea: {
    center: { lat: number; lng: number };
    radius: number; // in kilometers
  } | null;
  validationTimestamp: number;
  recommendations: string[];
}

interface ValidationSource {
  source: string;
  confirmed: boolean;
  confidence: number;
  data: any;
  timestamp: number;
}

interface OfficialAlert {
  source: string;
  alertType: string;
  severity: string;
  area: string;
  issuedAt: string;
  message: string;
}

interface MeteorologicalData {
  source: string;
  location: { lat: number; lng: number };
  conditions: {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    visibility: number;
  };
  alerts: any[];
  timestamp: number;
}

interface SeismicData {
  source: string;
  magnitude: number;
  depth: number;
  location: { lat: number; lng: number };
  place: string;
  time: number;
  tsunami: boolean;
}

/**
 * Function 3: Multi-Source Weather and Disaster Validation
 * Cross-references social media reports with official meteorological data
 */
export const handler: DynamoDBStreamHandler = async (event) => {
  try {
    logger.info(`Processing ${event.Records.length} DynamoDB stream records for weather validation`);
    
    const validationStats = {
      processed: 0,
      confirmed: 0,
      rejected: 0,
      errors: 0
    };
    
    for (const record of event.Records) {
      if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
        const newItem = record.dynamodb?.NewImage;
        
        // Only process AI-confirmed disasters that haven't been weather validated
        if (newItem?.aiAnalyzed?.BOOL === true && 
            newItem?.isDisaster?.BOOL === true &&
            newItem?.weatherValidated?.BOOL !== true &&
            newItem?.aiConfidence?.N && 
            parseFloat(newItem.aiConfidence.N) > 60) {
          
          try {
            const result = await validateWithOfficialSources(newItem);
            
            if (result.disasterConfirmed) {
              validationStats.confirmed++;
            } else {
              validationStats.rejected++;
            }
            
            validationStats.processed++;
            
          } catch (error) {
            logger.error(`Error validating event ${newItem.id.S}:`, error);
            validationStats.errors++;
          }
        }
      }
    }
    
    logger.info(`Weather validation completed. Processed: ${validationStats.processed}, Confirmed: ${validationStats.confirmed}, Rejected: ${validationStats.rejected}`);
    
  } catch (error) {
    logger.error('Weather validator error:', error);
    throw error;
  }
};

async function validateWithOfficialSources(item: any): Promise<WeatherValidationResult> {
  try {
    const eventId = item.id.S;
    const disasterType = item.disasterType?.S;
    const location = item.aiLocation?.S || item.location?.S;
    const timestamp = parseInt(item.aiAnalysisTimestamp?.N || item.timestamp?.N || '0');
    
    logger.info(`Validating event ${eventId} - Type: ${disasterType}, Location: ${location}`);
    
    const validation: WeatherValidationResult = {
      isValidated: true,
      disasterConfirmed: false,
      confidence: 0,
      validationSources: [],
      officialAlerts: [],
      meteorologicalData: [],
      seismicData: [],
      severity: 'low',
      affectedArea: null,
      validationTimestamp: Date.now(),
      recommendations: []
    };
    
    // Parse location to coordinates
    const coordinates = await geocodeLocation(location);
    
    if (!coordinates) {
      logger.warn(`Unable to geocode location: ${location}`);
      validation.recommendations.push('Unable to validate - location not found');
      await updateEventWithValidation(eventId, validation);
      return validation;
    }
    
    // Validate based on disaster type using multiple sources
    switch (disasterType?.toLowerCase()) {
      case 'earthquake':
        await validateEarthquake(coordinates, timestamp, validation);
        break;
      case 'tsunami':
        // TODO: Implement tsunami validation
        validation.validationSources.push({
          source: 'tsunami-warning-centers',
          confirmed: true,
          confidence: 50,
          data: { type: 'placeholder' },
          timestamp: Date.now()
        });
        validation.disasterConfirmed = true;
        validation.confidence = 50;
        break;
      case 'flood':
      case 'hurricane':
      case 'tornado':
      case 'storm':
        await validateWeatherDisaster(coordinates, timestamp, validation, disasterType);
        break;
      case 'wildfire':
        await validateWildfire(coordinates, timestamp, validation);
        break;
      default:
        await validateGenericDisaster(coordinates, timestamp, validation, disasterType);
    }
    
    // Calculate overall confidence and confirmation
    validation.confidence = calculateOverallConfidence(validation);
    validation.disasterConfirmed = validation.confidence > 70;
    
    // Determine severity based on validation data
    validation.severity = determineSeverity(validation);
    
    // Generate recommendations
    validation.recommendations = generateRecommendations(validation, disasterType);
    
    // Update the event with validation results
    await updateEventWithValidation(eventId, validation);
    
    // If disaster is confirmed with high confidence, create official alert
    if (validation.disasterConfirmed && validation.confidence > 80) {
      await createValidatedAlert(eventId, item, validation);
    }
    
    logger.info(`Validation completed for ${eventId}: ${validation.disasterConfirmed ? 'CONFIRMED' : 'NOT_CONFIRMED'} (confidence: ${validation.confidence}%)`);
    
    return validation;
    
  } catch (error) {
    logger.error('Error in weather validation:', error);
    throw error;
  }
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (!location) return null;
  
  try {
    // Try Google Maps Geocoding API first
    if (process.env.GOOGLE_MAPS_API_KEY) {
      const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: {
          address: location,
          key: process.env.GOOGLE_MAPS_API_KEY
        },
        timeout: 5000
      });
      
      const googleData = response.data as { status: string; results: Array<{ geometry: { location: { lat: number; lng: number } } }> };
      if (googleData.status === 'OK' && googleData.results.length > 0) {
        const { lat, lng } = googleData.results[0].geometry.location;
        return { lat, lng };
      }
    }
    
    // Fallback to OpenStreetMap Nominatim API
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: location,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'SmartEAS/2.0'
      },
      timeout: 5000
    });
    
    const osmData = response.data as Array<{ lat: string; lon: string }>;
    if (Array.isArray(osmData) && osmData.length > 0) {
      return {
        lat: parseFloat(osmData[0].lat),
        lng: parseFloat(osmData[0].lon)
      };
    }
    
  } catch (error) {
    logger.error('Geocoding error:', error);
  }
  
  return null;
}

async function validateEarthquake(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult): Promise<void> {
  // USGS Earthquake API
  await validateWithUSGS(coordinates, timestamp, validation);
  
  // EMSC (European-Mediterranean Seismological Centre)
  await validateWithEMSC(coordinates, timestamp, validation);
  
  // Global earthquake monitoring
  await validateWithGlobalSeismic(coordinates, timestamp, validation);
}

async function validateWithUSGS(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult): Promise<void> {
  try {
    const timeWindow = 2 * 60 * 60 * 1000; // 2 hours before and after
    const startTime = new Date(timestamp - timeWindow).toISOString();
    const endTime = new Date(timestamp + timeWindow).toISOString();
    
    const response = await axios.get('https://earthquake.usgs.gov/fdsnws/event/1/query', {
      params: {
        format: 'geojson',
        starttime: startTime,
        endtime: endTime,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        maxradiuskm: 500, // 500km radius
        minmagnitude: 4.0
      },
      timeout: 10000
    });
    
    const earthquakes = (response.data as any)?.features || [];
    
    for (const earthquake of earthquakes) {
      const magnitude = earthquake.properties.mag;
      const place = earthquake.properties.place;
      const time = earthquake.properties.time;
      const [lng, lat, depth] = earthquake.geometry.coordinates;
      
      const seismicData: SeismicData = {
        source: 'USGS',
        magnitude,
        depth: depth || 0,
        location: { lat, lng },
        place,
        time,
        tsunami: earthquake.properties.tsunami === 1
      };
      
      validation.seismicData.push(seismicData);
      
      // Calculate distance and confidence
      const distance = calculateDistance(coordinates, { lat, lng });
      let confidence = 90;
      
      if (distance > 100) confidence -= (distance - 100) / 10;
      if (magnitude < 5.0) confidence -= (5.0 - magnitude) * 10;
      
      validation.validationSources.push({
        source: 'USGS',
        confirmed: magnitude >= 4.0 && distance <= 500,
        confidence: Math.max(confidence, 0),
        data: seismicData,
        timestamp: Date.now()
      });
    }
    
  } catch (error) {
    logger.error('USGS validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    validation.validationSources.push({
      source: 'USGS',
      confirmed: false,
      confidence: 0,
      data: { error: errorMessage },
      timestamp: Date.now()
    });
  }
}

async function validateWithEMSC(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult): Promise<void> {
  try {
    // EMSC API for recent earthquakes
    const response = await axios.get('https://www.seismicportal.eu/fdsnws/event/1/query', {
      params: {
        format: 'json',
        limit: 50,
        orderby: 'time',
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        maxradius: 5 // 5 degrees radius
      },
      timeout: 10000
    });
    
    const emscData = response.data as { features?: any[] };
    if (emscData && emscData.features) {
      // Process EMSC earthquake data similar to USGS
      for (const earthquake of emscData.features) {
        // Add EMSC-specific processing
        validation.validationSources.push({
          source: 'EMSC',
          confirmed: true,
          confidence: 85,
          data: earthquake,
          timestamp: Date.now()
        });
      }
    }
    
  } catch (error) {
    logger.error('EMSC validation error:', error);
  }
}

async function validateWithGlobalSeismic(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult): Promise<void> {
  // Add other seismic data sources like GFZ, IRIS, etc.
  // This is a placeholder for additional seismic validation sources
}

async function validateWeatherDisaster(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult, disasterType: string): Promise<void> {
  // NOAA/NWS Weather API
  await validateWithNOAA(coordinates, timestamp, validation, disasterType);
  
  // OpenWeatherMap API
  await validateWithOpenWeather(coordinates, timestamp, validation, disasterType);
  
  // Weather.gov alerts
  await validateWithWeatherGov(coordinates, timestamp, validation);
}

async function validateWithNOAA(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult, disasterType: string): Promise<void> {
  try {
    // Get weather alerts from weather.gov
    const alertsResponse = await axios.get(`https://api.weather.gov/alerts/active`, {
      params: {
        point: `${coordinates.lat},${coordinates.lng}`
      },
      timeout: 10000
    });
    
    const alerts = (alertsResponse.data as any)?.features || [];
    
    for (const alert of alerts) {
      const alertData: OfficialAlert = {
        source: 'NOAA/NWS',
        alertType: alert.properties.event,
        severity: alert.properties.severity,
        area: alert.properties.areaDesc,
        issuedAt: alert.properties.sent,
        message: alert.properties.headline
      };
      
      validation.officialAlerts.push(alertData);
      
      // Check if alert matches disaster type
      const alertMatches = checkAlertMatch(alert.properties.event, disasterType);
      
      validation.validationSources.push({
        source: 'NOAA',
        confirmed: alertMatches,
        confidence: alertMatches ? 95 : 20,
        data: alertData,
        timestamp: Date.now()
      });
    }
    
  } catch (error) {
    logger.error('NOAA validation error:', error);
  }
}

async function validateWithOpenWeather(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult, disasterType: string): Promise<void> {
  if (!process.env.OPENWEATHER_API_KEY) return;
  
  try {
    // Current weather data
    const weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
      params: {
        lat: coordinates.lat,
        lon: coordinates.lng,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric'
      },
      timeout: 5000
    });
    
    const weatherData = weatherResponse.data as {
      main: { temp: number; humidity: number; pressure: number };
      wind?: { speed?: number; deg?: number };
      rain?: { '1h'?: number };
      snow?: { '1h'?: number };
      visibility?: number;
      weather?: Array<{ main?: string; description?: string }>;
    };
    
    const meteoData: MeteorologicalData = {
      source: 'OpenWeather',
      location: coordinates,
      conditions: {
        temperature: weatherData.main.temp,
        humidity: weatherData.main.humidity,
        pressure: weatherData.main.pressure,
        windSpeed: weatherData.wind?.speed || 0,
        windDirection: weatherData.wind?.deg || 0,
        precipitation: weatherData.rain?.['1h'] || weatherData.snow?.['1h'] || 0,
        visibility: weatherData.visibility || 10000
      },
      alerts: [],
      timestamp: Date.now()
    };
    
    validation.meteorologicalData.push(meteoData);
    
    // Check for severe weather conditions
    const isSevere = checkSevereWeather(weatherData, disasterType);
    
    validation.validationSources.push({
      source: 'OpenWeather',
      confirmed: isSevere,
      confidence: isSevere ? 80 : 30,
      data: meteoData,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('OpenWeather validation error:', error);
  }
}

async function validateWithWeatherGov(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult): Promise<void> {
  try {
    // Get grid point for coordinates
    const pointResponse = await axios.get(`https://api.weather.gov/points/${coordinates.lat},${coordinates.lng}`, {
      timeout: 5000
    });
    
    if ((pointResponse.data as any)?.properties) {
      const forecastUrl = (pointResponse.data as any).properties.forecast;
      
      // Get forecast data
      const forecastResponse = await axios.get(forecastUrl, {
        timeout: 5000
      });
      
      // Process forecast for severe weather indicators
      const periods = (forecastResponse.data as any)?.properties?.periods || [];
      
      for (const period of periods) {
        if (period.detailedForecast.toLowerCase().includes('severe') ||
            period.detailedForecast.toLowerCase().includes('warning') ||
            period.detailedForecast.toLowerCase().includes('advisory')) {
          
          validation.validationSources.push({
            source: 'Weather.gov',
            confirmed: true,
            confidence: 85,
            data: period,
            timestamp: Date.now()
          });
        }
      }
    }
    
  } catch (error) {
    logger.error('Weather.gov validation error:', error);
  }
}

async function validateWildfire(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult): Promise<void> {
  // NASA FIRMS (Fire Information for Resource Management System)
  await validateWithFIRMS(coordinates, timestamp, validation);
  
  // NIFC (National Interagency Fire Center)
  await validateWithNIFC(coordinates, timestamp, validation);
}

async function validateWithFIRMS(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult): Promise<void> {
  try {
    // NASA FIRMS active fire data
    const response = await axios.get('https://firms.modaps.eosdis.nasa.gov/active_fire/text/Global_MCD14DL_NRT.txt', {
      timeout: 15000
    });
    
    // Parse CSV data for recent fires near coordinates
    const lines = String(response.data).split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length && i < 1000; i++) { // Limit processing
      const values = lines[i].split(',');
      if (values.length >= 6) {
        const lat = parseFloat(values[0]);
        const lng = parseFloat(values[1]);
        const confidence = parseFloat(values[8] || '0');
        
        const distance = calculateDistance(coordinates, { lat, lng });
        
        if (distance <= 50 && confidence > 30) { // 50km radius, 30% confidence
          validation.validationSources.push({
            source: 'NASA FIRMS',
            confirmed: true,
            confidence: Math.min(confidence, 90),
            data: { lat, lng, distance, confidence },
            timestamp: Date.now()
          });
        }
      }
    }
    
  } catch (error) {
    logger.error('FIRMS validation error:', error);
  }
}

async function validateWithNIFC(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult): Promise<void> {
  // NIFC incident data - this would require their API access
  // Placeholder for NIFC validation
}

async function validateGenericDisaster(coordinates: { lat: number; lng: number }, timestamp: number, validation: WeatherValidationResult, disasterType: string): Promise<void> {
  // Generic validation using available weather and alert APIs
  await validateWithNOAA(coordinates, timestamp, validation, disasterType);
  await validateWithOpenWeather(coordinates, timestamp, validation, disasterType);
}

function calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function checkAlertMatch(alertType: string, disasterType: string): boolean {
  const alertMap: { [key: string]: string[] } = {
    'tornado': ['Tornado Warning', 'Tornado Watch', 'Severe Thunderstorm Warning'],
    'hurricane': ['Hurricane Warning', 'Hurricane Watch', 'Tropical Storm Warning'],
    'flood': ['Flood Warning', 'Flash Flood Warning', 'Flood Watch'],
    'storm': ['Severe Thunderstorm Warning', 'Winter Storm Warning']
  };
  
  const matchingAlerts = alertMap[disasterType.toLowerCase()] || [];
  return matchingAlerts.some((alert: string) => alertType.includes(alert));
}

function checkSevereWeather(weatherData: any, disasterType: string): boolean {
  const conditions = weatherData.weather?.[0]?.main?.toLowerCase() || '';
  const description = weatherData.weather?.[0]?.description?.toLowerCase() || '';
  const windSpeed = weatherData.wind?.speed || 0;
  
  switch (disasterType.toLowerCase()) {
    case 'storm':
    case 'tornado':
      return conditions.includes('thunderstorm') || windSpeed > 15 || description.includes('severe');
    case 'hurricane':
      return windSpeed > 33 || conditions.includes('hurricane');
    case 'flood':
      return conditions.includes('rain') && (weatherData.rain?.['1h'] || 0) > 10;
    default:
      return false;
  }
}

function calculateOverallConfidence(validation: WeatherValidationResult): number {
  if (validation.validationSources.length === 0) return 0;
  
  let totalConfidence = 0;
  let confirmedSources = 0;
  
  for (const source of validation.validationSources) {
    if (source.confirmed) {
      totalConfidence += source.confidence;
      confirmedSources++;
    }
  }
  
  if (confirmedSources === 0) return 0;
  
  const avgConfidence = totalConfidence / confirmedSources;
  
  // Boost confidence if multiple sources confirm
  if (confirmedSources > 1) {
    return Math.min(avgConfidence + (confirmedSources - 1) * 10, 95);
  }
  
  return avgConfidence;
}

function determineSeverity(validation: WeatherValidationResult): 'low' | 'medium' | 'high' | 'critical' {
  if (validation.confidence < 50) return 'low';
  
  // Check for critical indicators
  const hasCriticalAlerts = validation.officialAlerts.some(alert => 
    alert.severity.toLowerCase().includes('extreme') || 
    alert.alertType.toLowerCase().includes('warning')
  );
  
  const hasHighMagnitude = validation.seismicData.some(data => data.magnitude > 7.0);
  
  if (hasCriticalAlerts || hasHighMagnitude) return 'critical';
  if (validation.confidence > 85) return 'high';
  if (validation.confidence > 70) return 'medium';
  
  return 'low';
}

function generateRecommendations(validation: WeatherValidationResult, disasterType: string): string[] {
  const recommendations = [];
  
  if (validation.disasterConfirmed) {
    recommendations.push('Monitor official emergency channels');
    recommendations.push('Follow local evacuation orders if issued');
    
    switch (disasterType?.toLowerCase()) {
      case 'earthquake':
        recommendations.push('Prepare for aftershocks');
        recommendations.push('Check for structural damage');
        break;
      case 'hurricane':
        recommendations.push('Secure outdoor items');
        recommendations.push('Stock emergency supplies');
        break;
      case 'tornado':
        recommendations.push('Seek immediate shelter');
        recommendations.push('Avoid windows and upper floors');
        break;
      case 'flood':
        recommendations.push('Move to higher ground');
        recommendations.push('Avoid driving through flooded roads');
        break;
    }
  } else {
    recommendations.push('Continue monitoring for updates');
    recommendations.push('Verify information through official sources');
  }
  
  return recommendations;
}

async function updateEventWithValidation(eventId: string, validation: WeatherValidationResult): Promise<void> {
  try {
    const updateCommand = new UpdateCommand({
      TableName: EVENTS_TABLE_NAME,
      Key: { id: eventId },
      UpdateExpression: `
        SET 
          weatherValidated = :validated,
          disasterConfirmed = :confirmed,
          validationConfidence = :confidence,
          validationSources = :sources,
          officialAlerts = :alerts,
          meteorologicalData = :meteoData,
          seismicData = :seismicData,
          validatedSeverity = :severity,
          affectedArea = :area,
          validationTimestamp = :timestamp,
          validationRecommendations = :recommendations
      `,
      ExpressionAttributeValues: {
        ':validated': validation.isValidated,
        ':confirmed': validation.disasterConfirmed,
        ':confidence': validation.confidence,
        ':sources': validation.validationSources,
        ':alerts': validation.officialAlerts,
        ':meteoData': validation.meteorologicalData,
        ':seismicData': validation.seismicData,
        ':severity': validation.severity,
        ':area': validation.affectedArea,
        ':timestamp': validation.validationTimestamp,
        ':recommendations': validation.recommendations
      }
    });
    
    await docClient.send(updateCommand);
    
  } catch (error) {
    logger.error('Error updating event with validation:', error);
    throw error;
  }
}

async function createValidatedAlert(eventId: string, originalItem: any, validation: WeatherValidationResult): Promise<void> {
  try {
    const alertId = `alert_${eventId}_${Date.now()}`;
    
    const alert = {
      id: alertId,
      type: 'validated_disaster_alert',
      originalEventId: eventId,
      disasterType: originalItem.disasterType?.S,
      severity: validation.severity,
      confidence: validation.confidence,
      location: originalItem.aiLocation?.S || originalItem.location?.S,
      coordinates: validation.affectedArea?.center,
      affectedArea: validation.affectedArea,
      officialAlerts: validation.officialAlerts,
      validationSources: validation.validationSources.map(s => s.source),
      recommendations: validation.recommendations,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      status: 'active',
      priority: validation.severity === 'critical' ? 'immediate' : 
                validation.severity === 'high' ? 'high' : 'medium'
    };
    
    const putCommand = new PutCommand({
      TableName: EVENTS_TABLE_NAME,
      Item: alert
    });
    
    await docClient.send(putCommand);
    
    logger.info(`Created validated alert ${alertId} for event ${eventId}`);
    
  } catch (error) {
    logger.error('Error creating validated alert:', error);
    throw error;
  }
}
