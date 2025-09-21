import { DynamoDBStreamHandler, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../utils/logger';
import axios from 'axios';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

// Table name configuration
const EVENTS_TABLE_NAME = process.env.DYNAMODB_TABLE || (process.env.DYNAMODB_TABLE_PREFIX ? `${process.env.DYNAMODB_TABLE_PREFIX}-events` : undefined);

// Comprehensive disaster keywords organized by category
const DISASTER_DETECTION_KEYWORDS = {
  // Seismic events
  seismic: [
    'earthquake', 'quake', 'tremor', 'seismic', 'magnitude', 'richter',
    'aftershock', 'epicenter', 'fault line', 'tectonic'
  ],
  
  // Water-related disasters
  water: [
    'tsunami', 'flood', 'flooding', 'flash flood', 'storm surge',
    'dam break', 'levee', 'overflow', 'inundation', 'deluge'
  ],
  
  // Weather disasters
  weather: [
    'hurricane', 'typhoon', 'cyclone', 'tornado', 'twister',
    'thunderstorm', 'severe weather', 'hailstorm', 'lightning storm'
  ],
  
  // Fire disasters
  fire: [
    'wildfire', 'forest fire', 'brush fire', 'fire storm',
    'arson', 'explosion', 'blaze', 'inferno'
  ],
  
  // Winter disasters
  winter: [
    'blizzard', 'snowstorm', 'ice storm', 'avalanche',
    'freezing rain', 'whiteout', 'snow emergency'
  ],
  
  // Geological disasters
  geological: [
    'landslide', 'mudslide', 'rockslide', 'sinkhole',
    'volcanic eruption', 'lava flow', 'ash cloud'
  ],
  
  // Impact indicators
  impact: [
    'casualties', 'fatalities', 'deaths', 'injured', 'missing',
    'trapped', 'displaced', 'evacuated', 'homeless', 'damage',
    'destroyed', 'collapsed', 'devastated'
  ],
  
  // Emergency indicators
  emergency: [
    'emergency', 'crisis', 'disaster', 'catastrophe',
    'evacuation', 'rescue', 'relief', 'aid', 'shelter',
    'state of emergency', 'martial law'
  ],
  
  // Alert indicators
  alerts: [
    'alert', 'warning', 'watch', 'advisory', 'urgent',
    'breaking', 'developing', 'ongoing', 'active'
  ]
};

interface DisasterAnalysis {
  isDisaster: boolean;
  disasterType: string | null;
  disasterCategory: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  location: string | null;
  coordinates: { lat: number; lng: number } | null;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  affectedPopulation: number | null;
  timeframe: 'historical' | 'current' | 'imminent';
  summary: string;
  keyIndicators: string[];
  recommendations: string[];
  extractedEntities: {
    locations: string[];
    numbers: string[];
    dates: string[];
    organizations: string[];
  };
}

/**
 * HTTP API Handler for direct disaster analysis requests
 */
export const httpHandler: APIGatewayProxyHandler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    const response: APIGatewayProxyResult = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
    return response;
  }

  try {
    logger.info('Processing direct disaster analysis request...');
    
    const body = event.body ? JSON.parse(event.body) : {};
    const { text, source = 'api' } = body;
    
    if (!text) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          error: 'Missing required field: text'
        })
      };
    }

    // Analyze the text using AI
    const analysis = await analyzeTextWithAI(text);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        text,
        source,
        analysis,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('HTTP disaster analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Disaster analysis failed',
        message: errorMessage
      })
    };
  }
};

/**
 * Analyze text for disaster content (simplified version for HTTP API)
 */
async function analyzeTextWithAI(text: string): Promise<any> {
  try {
    // First, do keyword-based pre-analysis
    const preAnalysis = performKeywordAnalysis(text, '');
    
    // If pre-analysis indicates potential disaster, use AI for detailed analysis
    if (preAnalysis.potentialDisaster) {
      // Use AI LLM for detailed analysis
      return await performAIAnalysis(text, '', 'api', 'api', preAnalysis);
    } else {
      // Return simplified analysis
      return {
        isDisaster: false,
        disasterType: null,
        disasterCategory: null,
        severity: 'low',
        confidence: preAnalysis.confidence,
        location: preAnalysis.location,
        summary: 'No disaster indicators detected',
        keyIndicators: preAnalysis.matchedKeywords
      };
    }
  } catch (error) {
    logger.error('Error in analyzeTextWithAI:', error);
    throw error;
  }
}

/**
 * Function 2: AI-Powered Disaster Detection and Analysis
 * Uses LLM to analyze posts and determine if they relate to natural disasters
 */
export const handler: DynamoDBStreamHandler = async (event) => {
  try {
    logger.info(`Processing ${event.Records.length} DynamoDB stream records for AI analysis`);
    
    const processedCount = {
      total: 0,
      disasters: 0,
      nonDisasters: 0,
      errors: 0
    };
    
    for (const record of event.Records) {
      if (record.eventName === 'INSERT' && record.dynamodb?.NewImage) {
        const newItem = record.dynamodb.NewImage;
        
        // Only process unanalyzed social media posts
        if (newItem.type?.S === 'social_media_post' && 
            newItem.aiAnalyzed?.BOOL !== true &&
            newItem.relevanceScore?.N && 
            parseFloat(newItem.relevanceScore.N) > 0) {
          
          try {
            await analyzePostWithAI(newItem);
            processedCount.total++;
          } catch (error) {
            logger.error(`Error processing post ${newItem.id.S}:`, error);
            processedCount.errors++;
          }
        }
      }
    }
    
    logger.info(`AI analysis completed. Processed: ${processedCount.total}, Errors: ${processedCount.errors}`);
    
  } catch (error) {
    logger.error('AI disaster analyzer error:', error);
    throw error;
  }
};

async function analyzePostWithAI(item: any): Promise<void> {
  try {
    const eventId = item.id.S;
    const title = item.title?.S || '';
    const content = item.content?.S || '';
    const subreddit = item.subreddit?.S || '';
    const platform = item.platform?.S || 'reddit';
    
    logger.info(`Analyzing post ${eventId} from r/${subreddit}`);
    
    // First, do keyword-based pre-analysis
    const preAnalysis = performKeywordAnalysis(title, content);
    
    // If pre-analysis indicates potential disaster, use AI for detailed analysis
    let finalAnalysis: DisasterAnalysis;
    
    if (preAnalysis.potentialDisaster) {
      // Use AI LLM for detailed analysis
      finalAnalysis = await performAIAnalysis(title, content, subreddit, platform, preAnalysis);
    } else {
      // Mark as non-disaster based on keyword analysis
      finalAnalysis = {
        isDisaster: false,
        disasterType: null,
        disasterCategory: null,
        severity: 'low',
        confidence: preAnalysis.confidence,
        location: preAnalysis.location,
        coordinates: null,
        urgency: 'low',
        affectedPopulation: null,
        timeframe: 'current',
        summary: 'No disaster indicators detected',
        keyIndicators: preAnalysis.matchedKeywords,
        recommendations: [],
        extractedEntities: preAnalysis.entities
      };
    }
    
    // Update the event with AI analysis results
    await updateEventWithAIAnalysis(eventId, finalAnalysis);
    
    // If confirmed disaster with high confidence, trigger further processing
    if (finalAnalysis.isDisaster && finalAnalysis.confidence > 70) {
      await triggerWeatherValidation(eventId, finalAnalysis);
    }
    
    logger.info(`AI analysis completed for ${eventId}: ${finalAnalysis.isDisaster ? 'DISASTER' : 'NOT_DISASTER'} (confidence: ${finalAnalysis.confidence}%)`);
    
  } catch (error) {
    logger.error('Error in AI analysis:', error);
    throw error;
  }
}

function performKeywordAnalysis(title: string, content: string): any {
  const fullText = `${title} ${content}`.toLowerCase();
  const entities = extractEntities(fullText);
  
  let score = 0;
  let matchedKeywords: string[] = [];
  let disasterCategory: string | null = null;
  
  // Check each disaster category
  for (const [category, keywords] of Object.entries(DISASTER_DETECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        score += getCategoryWeight(category);
        matchedKeywords.push(keyword);
        if (!disasterCategory) disasterCategory = category;
      }
    }
  }
  
  // Boost score for emergency indicators
  if (entities.numbers.some((num: any) => num.includes('magnitude') || num.includes('richter'))) {
    score += 10;
  }
  
  // Location boost
  const location = extractDetailedLocation(fullText);
  if (location) score += 5;
  
  return {
    potentialDisaster: score >= 15, // Threshold for AI analysis
    confidence: Math.min(score * 5, 95), // Convert to percentage
    matchedKeywords,
    disasterCategory,
    location,
    entities
  };
}

function getCategoryWeight(category: string): number {
  const weights: { [key: string]: number } = {
    seismic: 8,
    water: 7,
    weather: 6,
    fire: 7,
    winter: 6,
    geological: 7,
    impact: 5,
    emergency: 4,
    alerts: 3
  };
  return weights[category] || 1;
}

async function performAIAnalysis(title: string, content: string, subreddit: string, platform: string, preAnalysis: any): Promise<DisasterAnalysis> {
  try {
    const prompt = createDetailedAnalysisPrompt(title, content, subreddit, platform, preAnalysis);
    
    // Call Amazon Bedrock Nova Pro for analysis
    const aiResponse = await invokeBedrockNova(prompt);
    
    // Parse and validate AI response
    return parseAIResponse(aiResponse, preAnalysis);
    
  } catch (error) {
    logger.error('Error in AI analysis:', error);
    
    // Fallback to keyword-based analysis
    return createFallbackAnalysis(preAnalysis);
  }
}

function createDetailedAnalysisPrompt(title: string, content: string, subreddit: string, platform: string, preAnalysis: any): string {
  return `
You are an expert disaster monitoring AI with extensive knowledge of natural disasters, emergency situations, and crisis management. Analyze the following social media post to determine if it reports a real natural disaster or emergency situation.

Context:
- Platform: ${platform}
- Subreddit: r/${subreddit}
- Pre-analysis detected: ${preAnalysis.disasterCategory || 'potential disaster'}
- Matched keywords: ${preAnalysis.matchedKeywords.join(', ')}

Post Content:
Title: ${title}
Content: ${content}

Your task is to provide a comprehensive analysis. Consider:

1. **Disaster Classification**: Is this a real natural disaster report?
2. **Disaster Type**: Earthquake, flood, hurricane, wildfire, tornado, etc.
3. **Severity Assessment**: Based on described impacts and scope
4. **Location Analysis**: Extract specific geographic locations
5. **Temporal Context**: Is this happening now, recently, or historically?
6. **Credibility Assessment**: Does this seem like a reliable report?
7. **Impact Assessment**: Scale and scope of potential damage/casualties

Provide your analysis in this exact JSON format:
{
  "isDisaster": boolean,
  "disasterType": "earthquake|tsunami|flood|hurricane|tornado|wildfire|volcano|landslide|blizzard|drought|other|null",
  "severity": "low|medium|high|critical",
  "confidence": number (0-100),
  "location": "extracted location string or null",
  "urgency": "low|medium|high|immediate",
  "affectedPopulation": number or null,
  "timeframe": "historical|current|imminent",
  "summary": "2-3 sentence analysis summary",
  "keyIndicators": ["list", "of", "key", "disaster", "indicators"],
  "recommendations": ["list", "of", "recommended", "actions"]
}

Be precise and analytical. Only mark as disaster if there's strong evidence of a real natural disaster event.
`;
}

async function invokeBedrockNova(prompt: string): Promise<any> {
  try {
    logger.info('Invoking Amazon Bedrock Nova Pro for disaster analysis');
    
    const modelId = process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0';
    
    const requestBody = {
      messages: [
        {
          role: "user",
          content: [{ text: prompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 1500,
        temperature: 0.1,
        topP: 0.9
      }
    };
    
    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json'
    });
    
    const response = await bedrockClient.send(command);
    
    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    logger.info('Bedrock Nova analysis completed successfully');
    return responseBody;
    
  } catch (error) {
    logger.error('Error invoking Bedrock Nova:', error);
    throw error;
  }
}

function parseAIResponse(aiResponse: any, preAnalysis: any): DisasterAnalysis {
  try {
    // Extract JSON from AI response
    const content = aiResponse.output?.message?.content?.[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        isDisaster: parsed.isDisaster || false,
        disasterType: parsed.disasterType || null,
        disasterCategory: preAnalysis.disasterCategory,
        severity: parsed.severity || 'low',
        confidence: Math.min(parsed.confidence || 0, 100),
        location: parsed.location || preAnalysis.location,
        coordinates: null, // Will be geocoded later
        urgency: parsed.urgency || 'low',
        affectedPopulation: parsed.affectedPopulation || null,
        timeframe: parsed.timeframe || 'current',
        summary: parsed.summary || '',
        keyIndicators: parsed.keyIndicators || preAnalysis.matchedKeywords,
        recommendations: parsed.recommendations || [],
        extractedEntities: preAnalysis.entities
      };
    }
    
  } catch (error) {
    logger.error('Error parsing AI response:', error);
  }
  
  // Fallback to pre-analysis
  return createFallbackAnalysis(preAnalysis);
}

function createFallbackAnalysis(preAnalysis: any): DisasterAnalysis {
  return {
    isDisaster: preAnalysis.potentialDisaster,
    disasterType: mapCategoryToType(preAnalysis.disasterCategory),
    disasterCategory: preAnalysis.disasterCategory,
    severity: preAnalysis.confidence > 70 ? 'medium' : 'low',
    confidence: preAnalysis.confidence,
    location: preAnalysis.location,
    coordinates: null,
    urgency: preAnalysis.confidence > 80 ? 'medium' : 'low',
    affectedPopulation: null,
    timeframe: 'current',
    summary: `Potential ${preAnalysis.disasterCategory} disaster detected based on keyword analysis`,
    keyIndicators: preAnalysis.matchedKeywords,
    recommendations: ['Monitor for official updates', 'Verify through additional sources'],
    extractedEntities: preAnalysis.entities
  };
}

function mapCategoryToType(category: string): string | null {
  const mapping: { [key: string]: string } = {
    seismic: 'earthquake',
    water: 'flood',
    weather: 'storm',
    fire: 'wildfire',
    winter: 'blizzard',
    geological: 'landslide'
  };
  return mapping[category] || null;
}

function extractEntities(text: string): any {
  return {
    locations: extractLocations(text),
    numbers: extractNumbers(text),
    dates: extractDates(text),
    organizations: extractOrganizations(text)
  };
}

function extractLocations(text: string): string[] {
  const locationPatterns = [
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:County|City|State|Province|Country))?\b/g,
    /\b(?:in|near|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
  ];
  
  const locations: string[] = [];
  for (const pattern of locationPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      locations.push(...matches);
    }
  }
  
  return [...new Set(locations)]; // Remove duplicates
}

function extractNumbers(text: string): string[] {
  const numberPatterns = [
    /\b\d+\.?\d*\s*(?:magnitude|richter|casualties|deaths|injured|missing|displaced)\b/gi,
    /\b(?:magnitude|richter)\s+\d+\.?\d*\b/gi
  ];
  
  const numbers: string[] = [];
  for (const pattern of numberPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      numbers.push(...matches);
    }
  }
  
  return numbers;
}

function extractDates(text: string): string[] {
  const datePatterns = [
    /\b(?:today|yesterday|now|currently|this\s+(?:morning|afternoon|evening))\b/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
  ];
  
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }
  
  return dates;
}

function extractOrganizations(text: string): string[] {
  const orgPatterns = [
    /\b(?:FEMA|USGS|NOAA|NWS|Red Cross|Emergency Services|Fire Department|Police|National Guard)\b/gi
  ];
  
  const orgs: string[] = [];
  for (const pattern of orgPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      orgs.push(...matches);
    }
  }
  
  return orgs;
}

function extractDetailedLocation(text: string): string | null {
  const locationPatterns = [
    /(?:in|near|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s*,\s*[A-Z][A-Z])?)/g,
    /([A-Z][a-z]+\s+(?:County|City|State|Province))/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+area/g
  ];
  
  for (const pattern of locationPatterns) {
    const match = pattern.exec(text);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

async function updateEventWithAIAnalysis(eventId: string, analysis: DisasterAnalysis): Promise<void> {
  try {
    const updateCommand = new UpdateCommand({
      TableName: EVENTS_TABLE_NAME,
      Key: { id: eventId },
      UpdateExpression: `
        SET 
          aiAnalyzed = :aiAnalyzed,
          isDisaster = :isDisaster,
          disasterType = :disasterType,
          aiSeverity = :severity,
          aiConfidence = :confidence,
          aiLocation = :location,
          urgency = :urgency,
          affectedPopulation = :affectedPopulation,
          timeframe = :timeframe,
          aiSummary = :summary,
          keyIndicators = :keyIndicators,
          recommendations = :recommendations,
          extractedEntities = :extractedEntities,
          aiAnalysisTimestamp = :timestamp
      `,
      ExpressionAttributeValues: {
        ':aiAnalyzed': true,
        ':isDisaster': analysis.isDisaster,
        ':disasterType': analysis.disasterType,
        ':severity': analysis.severity,
        ':confidence': analysis.confidence,
        ':location': analysis.location,
        ':urgency': analysis.urgency,
        ':affectedPopulation': analysis.affectedPopulation,
        ':timeframe': analysis.timeframe,
        ':summary': analysis.summary,
        ':keyIndicators': analysis.keyIndicators,
        ':recommendations': analysis.recommendations,
        ':extractedEntities': analysis.extractedEntities,
        ':timestamp': Date.now()
      }
    });
    
    await docClient.send(updateCommand);
    
  } catch (error) {
    logger.error('Error updating event with AI analysis:', error);
    throw error;
  }
}

async function triggerWeatherValidation(eventId: string, analysis: DisasterAnalysis): Promise<void> {
  // This will be processed by the weather validator
  logger.info(`Triggering weather validation for confirmed disaster: ${eventId}`);
}
