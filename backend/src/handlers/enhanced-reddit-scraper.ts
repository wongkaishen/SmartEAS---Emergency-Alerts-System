import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import snoowrap from 'snoowrap';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const dynamoClient = new DynamoDBClient({ region: process.env.BEDROCK_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Enhanced disaster-related subreddits and keywords
const DISASTER_SUBREDDITS = [
  // General news and world events
  'worldnews', 'news', 'breakingnews', 'live',
  
  // Natural disasters
  'earthquake', 'tsunami', 'floods', 'wildfire', 'hurricane',
  'tornado', 'weather', 'storms', 'naturaldisasters',
  
  // Emergency and rescue
  'emergency', 'firstresponders', 'rescue', 'preparedness',
  
  // Location-specific (high disaster areas)
  'california', 'florida', 'texas', 'japan', 'philippines',
  'indonesia', 'italy', 'turkey', 'mexico', 'chile',
  
  // Climate and weather
  'climate', 'weathergifs', 'extremeweather', 'flooding',
  'drought', 'heatwave', 'blizzard'
];

const DISASTER_KEYWORDS = [
  // Primary disaster types
  'earthquake', 'tsunami', 'flood', 'wildfire', 'hurricane', 'tornado',
  'landslide', 'avalanche', 'volcano', 'cyclone', 'typhoon', 'blizzard',
  'drought', 'heatwave', 'storm', 'thunderstorm', 'mudslide',
  
  // Emergency indicators
  'magnitude', 'richter', 'evacuation', 'emergency', 'disaster',
  'crisis', 'catastrophe', 'rescue', 'casualties', 'fatalities',
  'missing', 'trapped', 'damage', 'destroyed', 'collapsed',
  
  // Alert terms
  'alert', 'warning', 'advisory', 'watch', 'urgent',
  'breaking', 'developing', 'ongoing', 'active',
  
  // Impact terms
  'power outage', 'road closure', 'bridge down', 'airport closed',
  'shelter', 'displaced', 'homeless', 'relief', 'aid',
  
  // Weather terms
  'severe weather', 'extreme weather', 'flash flood', 'storm surge',
  'high winds', 'heavy rain', 'snow storm', 'ice storm'
];

const EVENTS_TABLE_NAME = process.env.DYNAMODB_TABLE || (process.env.DYNAMODB_TABLE_PREFIX ? `${process.env.DYNAMODB_TABLE_PREFIX}-events` : undefined);
logger.info(`DEBUG: DYNAMODB_TABLE_PREFIX=${process.env.DYNAMODB_TABLE_PREFIX}, EVENTS_TABLE_NAME=${EVENTS_TABLE_NAME}`);
if (!EVENTS_TABLE_NAME) {
  logger.error('EVENTS_TABLE_NAME is undefined. Set DYNAMODB_TABLE or DYNAMODB_TABLE_PREFIX in your .env.');
}

/**
 * Function 1: Simple Reddit Scraper
 * Scrapes ALL Reddit posts without any filtering - just pure data collection
 */
export const handler: APIGatewayProxyHandler = async (event) => {
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
    logger.info('Starting simple Reddit scraping (no filtering)...');
    
    // Parse request parameters - support both GET and POST
    const queryParams = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const params = { ...queryParams, ...body };
    
    const limit = parseInt(params.limit || '10');
    const timeRange = params.timeRange || 'day'; // hour, day, week, month
    const subreddit = params.subreddit || 'news';
    const keywords = params.keywords ? params.keywords.split(',') : [];
    
    // Check if Reddit credentials are available
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      logger.warn('Reddit credentials not configured, returning mock data');
      
      const mockResponse = {
        success: true,
        totalPosts: 5,
        processedSubreddits: 1,
        errors: [],
        posts: generateMockRedditPosts(limit, subreddit, keywords),
        duplicates: 0,
        savedToDynamoDB: 0,
        source: 'mock',
        message: 'Reddit API credentials not configured - showing mock data'
      };
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(mockResponse),
      };
    }
    
    // Initialize Reddit client
    const reddit = await initializeRedditClient();
    
    // Use specific subreddit or default disaster-related ones
    const subredditsToScrape = subreddit ? [subreddit] : DISASTER_SUBREDDITS.slice(0, 3);
    
    const scrapingResults: {
      totalPosts: number;
      processedSubreddits: number;
      errors: string[];
      posts: any[];
      duplicates: number;
      savedToDynamoDB: number;
    } = {
      totalPosts: 0,
      processedSubreddits: 0,
      errors: [],
      posts: [],
      duplicates: 0,
      savedToDynamoDB: 0
    };
    
    // Track processed post IDs to avoid duplicates
    const processedPostIds = new Set();
    
    // Simply scrape from subreddits - NO FILTERING
    for (const subreddit of subredditsToScrape) {
      try {
        logger.info(`Scraping subreddit: r/${subreddit}`);
        
        const posts = await scrapeSubredditSimple(reddit, subreddit, limit, timeRange);
        
        for (const post of posts) {
          if (!processedPostIds.has(post.id)) {
            processedPostIds.add(post.id);
            scrapingResults.posts.push(post);
            
            // Save ALL posts to DynamoDB (Function 2 will filter)
            await savePostToDynamoDB(post);
            scrapingResults.savedToDynamoDB++;
          } else {
            scrapingResults.duplicates++;
          }
        }
        
        scrapingResults.processedSubreddits++;
        scrapingResults.totalPosts += posts.length;
        
        // Rate limiting
        await delay(1000);
        
      } catch (error) {
        logger.error(`Error scraping subreddit ${subreddit}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        scrapingResults.errors.push(`${subreddit}: ${errorMessage}`);
      }
    }
    
    logger.info(`Reddit scraping completed. Found ${scrapingResults.totalPosts} total posts, saved ${scrapingResults.savedToDynamoDB} unique posts`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Simple Reddit scraping completed (no filtering)',
        results: scrapingResults,
        summary: {
          totalPostsFound: scrapingResults.totalPosts,
          uniquePostsSaved: scrapingResults.savedToDynamoDB,
          duplicatesSkipped: scrapingResults.duplicates,
          subredditsProcessed: scrapingResults.processedSubreddits,
          errorCount: scrapingResults.errors.length,
          note: 'All posts saved - Function 2 will analyze and filter'
        }
      })
    };
    
  } catch (error) {
    logger.error('Reddit scraper error:', error);
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
        error: 'Reddit scraping failed',
        message: errorMessage
      })
    };
  }
};

async function initializeRedditClient(): Promise<snoowrap> {
  const redditConfig: any = {
    userAgent: process.env.REDDIT_USER_AGENT || 'SmartEAS/2.0',
    clientId: process.env.REDDIT_CLIENT_ID!,
    clientSecret: process.env.REDDIT_CLIENT_SECRET!
  };

  if (process.env.REDDIT_REFRESH_TOKEN) {
    redditConfig.refreshToken = process.env.REDDIT_REFRESH_TOKEN;
  } else if (process.env.REDDIT_USERNAME && process.env.REDDIT_PASSWORD) {
    redditConfig.username = process.env.REDDIT_USERNAME;
    redditConfig.password = process.env.REDDIT_PASSWORD;
  } else {
    throw new Error('Reddit authentication required');
  }

  const reddit = new snoowrap(redditConfig);
  reddit.config({ requestDelay: 1000, continueAfterRatelimitError: true });
  
  return reddit;
}

async function scrapeSubredditSimple(reddit: snoowrap, subredditName: string, limit: number, timeRange: string): Promise<any[]> {
  const posts = [];
  
  try {
    const subreddit = reddit.getSubreddit(subredditName);
    
    // Convert string timeRange to valid type
    const validTimeRange = ['hour', 'day', 'week', 'month', 'year', 'all'].includes(timeRange) 
      ? timeRange as 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
      : 'day';
    
    // Get hot, new, and top posts - NO FILTERING
    const [hotPosts, newPosts, topPosts] = await Promise.all([
      subreddit.getHot({ limit: Math.floor(limit / 3) }),
      subreddit.getNew({ limit: Math.floor(limit / 3) }),
      subreddit.getTop({ time: validTimeRange, limit: Math.floor(limit / 3) })
    ]);
    
    const allPosts = [...hotPosts, ...newPosts, ...topPosts];
    
    for (const post of allPosts) {
      const processedPost = await processRedditPostSimple(post, subredditName);
      if (processedPost) {
        posts.push(processedPost);
      }
    }
    
  } catch (error) {
    logger.error(`Error accessing subreddit ${subredditName}:`, error);
    throw error;
  }
  
  return posts;
}

async function searchRedditForKeyword(reddit: snoowrap, keyword: string, limit: number, timeRange: string): Promise<any[]> {
  const posts = [];
  
  try {
    // Convert string timeRange to valid type
    const validTimeRange = ['hour', 'day', 'week', 'month', 'year', 'all'].includes(timeRange) 
      ? timeRange as 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
      : 'day';
      
    const searchResults = await reddit.search({
      query: keyword,
      time: validTimeRange,
      sort: 'relevance',
      limit: limit
    });
    
    for (const post of searchResults) {
      const processedPost = await processRedditPost(post, 'search', [keyword]);
      if (processedPost && processedPost.relevanceScore > 0) {
        posts.push(processedPost);
      }
    }
    
  } catch (error) {
    logger.error(`Error searching for keyword ${keyword}:`, error);
    throw error;
  }
  
  return posts;
}

// Simple location extraction (basic implementation)
function extractLocationFromText(text: string): string | null {
  // Basic location patterns - could be enhanced later
  const locationPatterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/, // City, State
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)\b/, // City, Country
    /\b([A-Z]{2})\b/, // State codes
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

// Simple post processing without filtering or scoring
async function processRedditPostSimple(post: any, subredditName: string): Promise<any> {
  try {
    const title = post.title || '';
    const content = post.selftext || '';
    const url = post.url || '';
    const createdTime = post.created_utc ? new Date(post.created_utc * 1000) : new Date();
    
    return {
      id: post.id,
      title,
      content,
      url,
      author: post.author ? post.author.name : '[deleted]',
      subreddit: subredditName,
      created_utc: post.created_utc,
      created_time: createdTime.toISOString(),
      score: post.score || 0,
      num_comments: post.num_comments || 0,
      upvote_ratio: post.upvote_ratio || 0,
      timestamp: Date.now(),
      location: extractLocationFromText(title + ' ' + content),
      // No relevance score or keyword matching - just raw data
      processed: false // Will be processed by Function 2
    };
  } catch (error) {
    logger.error('Error processing Reddit post:', error);
    return null;
  }
}

// Original function with filtering (kept for reference but not used)
async function processRedditPost(post: any, subredditName: string, keywords: string[]): Promise<any> {
  try {
    const title = post.title || '';
    const content = post.selftext || '';
    const fullText = `${title} ${content}`.toLowerCase();
    
    // Calculate relevance score
    const relevanceScore = calculateRelevanceScore(fullText, keywords);
    
    // Only process posts with some relevance
    if (relevanceScore === 0) {
      return null;
    }
    
    // Extract location if possible
    const location = extractLocation(fullText);
    
    // Determine urgency based on keywords
    const urgency = determineUrgency(fullText);
    
    return {
      id: post.id,
      title: title,
      content: content,
      url: `https://reddit.com${post.permalink}`,
      subreddit: post.subreddit?.display_name || subredditName,
      author: post.author?.name || 'unknown',
      score: post.score || 0,
      upvotes: post.ups || 0,
      downvotes: post.downs || 0,
      numComments: post.num_comments || 0,
      created: new Date(post.created_utc * 1000).toISOString(),
      relevanceScore: relevanceScore,
      matchedKeywords: getMatchedKeywords(fullText, keywords),
      location: location,
      urgency: urgency,
      platform: 'reddit',
      type: 'social_media_post',
      timestamp: Date.now(),
      processed: false,
      aiAnalyzed: false,
      weatherValidated: false
    };
    
  } catch (error) {
    logger.error('Error processing Reddit post:', error);
    return null;
  }
}

function calculateRelevanceScore(text: string, keywords: string[]): number {
  let score = 0;
  const urgentKeywords = ['breaking', 'urgent', 'emergency', 'evacuation', 'rescue'];
  const highImpactKeywords = ['magnitude', 'richter', 'casualties', 'fatalities', 'destroyed'];
  const disasterKeywords = ['earthquake', 'tsunami', 'hurricane', 'tornado', 'flood', 'wildfire'];
  
  // Base score for disaster keywords
  for (const keyword of disasterKeywords) {
    if (text.includes(keyword)) score += 3;
  }
  
  // Higher score for urgent keywords
  for (const keyword of urgentKeywords) {
    if (text.includes(keyword)) score += 4;
  }
  
  // Highest score for high impact keywords
  for (const keyword of highImpactKeywords) {
    if (text.includes(keyword)) score += 5;
  }
  
  // Additional score for other disaster keywords
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) score += 1;
  }
  
  // Bonus for recent timestamps in title/content
  if (text.includes('now') || text.includes('currently') || text.includes('happening')) {
    score += 2;
  }
  
  return Math.min(score, 10); // Cap at 10
}

function getMatchedKeywords(text: string, keywords: string[]): string[] {
  return keywords.filter(keyword => text.includes(keyword.toLowerCase()));
}

function extractLocation(text: string): string | null {
  // Simple location extraction - can be enhanced with NLP
  const locationPatterns = [
    /in ([A-Z][a-z]+ [A-Z][a-z]+)/g, // "in New York"
    /([A-Z][a-z]+), ([A-Z][a-z]+)/g,  // "California, USA"
    /([A-Z][a-z]+ [A-Z][a-z]+) area/g // "Los Angeles area"
  ];
  
  for (const pattern of locationPatterns) {
    const match = pattern.exec(text);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return null;
}

function determineUrgency(text: string): 'low' | 'medium' | 'high' | 'critical' {
  const criticalWords = ['emergency', 'evacuation', 'rescue', 'trapped', 'casualties'];
  const highWords = ['breaking', 'urgent', 'active', 'ongoing', 'developing'];
  const mediumWords = ['alert', 'warning', 'advisory', 'watch'];
  
  for (const word of criticalWords) {
    if (text.includes(word)) return 'critical';
  }
  
  for (const word of highWords) {
    if (text.includes(word)) return 'high';
  }
  
  for (const word of mediumWords) {
    if (text.includes(word)) return 'medium';
  }
  
  return 'low';
}

function generateMockRedditPosts(limit: number, subreddit: string, keywords: string[]): any[] {
  const mockPosts = [];
  const keywordFilter = keywords.length > 0 ? keywords[0] : 'emergency';
  
  for (let i = 0; i < Math.min(limit, 5); i++) {
    mockPosts.push({
      id: `mock_${i}_${Date.now()}`,
      title: `Mock ${keywordFilter} post ${i + 1} from r/${subreddit}`,
      content: `This is a mock Reddit post about ${keywordFilter} events. Reddit API credentials are not configured.`,
      url: `https://reddit.com/r/${subreddit}/mock_post_${i}`,
      author: 'mock_user',
      score: Math.floor(Math.random() * 1000),
      created_utc: Math.floor(Date.now() / 1000) - (i * 3600),
      num_comments: Math.floor(Math.random() * 100),
      subreddit: subreddit,
      is_disaster_related: true,
      disaster_type: keywordFilter,
      urgency: 'medium',
      confidence: 0.7,
      location: 'Mock Location'
    });
  }
  
  return mockPosts;
}

async function savePostToDynamoDB(post: any): Promise<void> {
  try {
    if (!EVENTS_TABLE_NAME) {
      throw new Error('EVENTS_TABLE_NAME is undefined (missing env: DYNAMODB_TABLE or DYNAMODB_TABLE_PREFIX)');
    }
    const putCommand = new PutCommand({
      TableName: EVENTS_TABLE_NAME,
      Item: {
        id: post.id,
        ...post
      }
    });
    await docClient.send(putCommand);
  } catch (error) {
    logger.error('Error saving post to DynamoDB:', error);
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
