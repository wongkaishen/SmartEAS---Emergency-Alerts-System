/**
 * SmartEAS API Service for Next.js
 * Connects to deployed AWS Lambda backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://oeqsffqyzg.execute-api.us-east-1.amazonaws.com/dev';
const DEBUG_API = process.env.NEXT_PUBLIC_DEBUG_API === 'true';

// Track backend availability
const backendStatus = {
  isAvailable: true,
  lastChecked: 0,
  checkInterval: 60000 // Check every minute
};

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  relevanceScore: number;
  url: string;
  created: string;
}

export interface DisasterEvent {
  id: string;
  title: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  timestamp: string;
  description: string;
  confidence: number;
}

export interface HeatmapData {
  lat: number;
  lng: number;
  intensity: number;
  type: string;
  timestamp: string;
}

export interface RouteOptimization {
  origin: string;
  destination: string;
  routes: Array<{
    distance: string;
    duration: string;
    steps: Array<{
      instruction: string;
      distance: string;
      duration: string;
    }>;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  recommendations: string[];
}

export interface APIHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime?: number;
}

export interface ValidatedEvent {
  id: string;
  title: string;
  type: string;
  severity: string;
  confidence: number;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  timestamp: number;
  validated: boolean;
  description: string;
  source: string;
  alertLevel: string;
  affectedRadius: number;
  estimatedImpact: number;
}

export interface AIAnalyzedEvent {
  id: string;
  title: string;
  analysisType: string;
  confidence: number;
  findings: string[];
  timestamp: number;
  priority: string;
  correlatedEvents: number;
  processingTime: number;
  dataPoints: number;
}

export interface DashboardHeatmapData {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
  radius: number;
  type: string;
  timestamp: number;
  confidence: number;
  location: string;
  weight: number;
}

export interface RecentAlert {
  id: string;
  type: string;
  urgency: string;
  title: string;
  message: string;
  timestamp: number;
  isActive: boolean;
  affectedAreas: number;
  estimatedDuration: string;
}

export interface DashboardRedditPost {
  id: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  score: number;
  timestamp: number;
  relevanceScore: number;
}

export interface SystemStats {
  totalAlerts: number;
  activeDisasters: number;
  systemHealth: number;
  lastUpdate: string;
  avgResponseTime: string;
  dataProcessingRate: string;
  aiAccuracy: string;
  uptimePercentage: string;
}

export interface ValidationStats {
  totalProcessed: number;
  validated: number;
  pending: number;
  rejected: number;
}

export interface DashboardApiHealth {
  status: string;
  reddit: string;
  aiAnalyzer: string;
  validator: string;
  dataAggregator: string;
}

export interface DashboardData {
  timestamp: string;
  status: string;
  dataSource: string;
  validatedEvents: ValidatedEvent[];
  aiAnalyzedEvents: AIAnalyzedEvent[];
  heatmapData: DashboardHeatmapData[];
  recentAlerts: RecentAlert[];
  redditPosts: DashboardRedditPost[];
  systemStats: SystemStats;
  validationStats: ValidationStats;
  apiHealth: DashboardApiHealth;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  conditions: string;
  visibility: number;
  pressure: number;
  timestamp: number;
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  startTime: number;
  endTime: number;
  area: string;
  instructions?: string;
}

export interface MapLayer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  data: unknown;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  type: string;
  severity?: string;
}

class SmartEASAPI {
  private async fetchAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const now = Date.now();
    
    // Check backend status periodically
    if (now - backendStatus.lastChecked > backendStatus.checkInterval) {
      backendStatus.lastChecked = now;
    }
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      if (DEBUG_API) console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, defaultOptions);
      
      if (DEBUG_API) console.log(`📡 API Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        if (DEBUG_API) console.error(`❌ API Error ${response.status}:`, errorText);
        
        // Handle specific error cases
        if (response.status === 502) {
          backendStatus.isAvailable = false;
          throw new Error(`Backend service unavailable (502): Check AWS Lambda configuration`);
        } else if (response.status === 500) {
          backendStatus.isAvailable = false;
          throw new Error(`Backend configuration error (500): Missing environment variables`);
        } else if (response.status === 403) {
          throw new Error(`Access forbidden (403): ${endpoint}`);
        } else if (response.status === 404) {
          throw new Error(`Endpoint not found (404): ${endpoint}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      // Backend is working
      if (!backendStatus.isAvailable) {
        backendStatus.isAvailable = true;
        console.log('✅ Backend service restored');
      }
      
      const result = await response.json();
      if (DEBUG_API) console.log(`✅ API Success:`, result);
      return result;
      
    } catch (error) {
      // Handle network/CORS errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        backendStatus.isAvailable = false;
        if (DEBUG_API) console.error(`🚫 Network/CORS Error for ${endpoint}:`, error.message);
        throw new Error(`Network error: Unable to connect to backend service`);
      }
      
      if (DEBUG_API) console.error(`💥 API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Reddit scraper endpoint
  async scrapeRedditData(subreddits: string[] = []): Promise<RedditPost[]> {
    try {
      console.log('🔄 Fetching real Reddit data from backend...');
      const response = await this.fetchAPI('/scrape/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits,
          limit: 50,
          timeRange: 'day'
        }),
      });
      console.log('✅ Successfully retrieved real Reddit data!');
      return response.posts || [];
    } catch (error) {
      console.error('❌ Failed to fetch Reddit data from backend:', error);
      throw new Error('Unable to fetch Reddit data. Please check backend connection.');
    }
  }

  // AI disaster analyzer endpoint
  async analyzeDisaster(text: string): Promise<{
    events: DisasterEvent[];
    summary: string;
    confidence: number;
  }> {
    try {
      console.log('🔄 Performing real AI disaster analysis from backend...');
      const response = await this.fetchAPI('/analyze/disaster', {
        method: 'POST',
        body: JSON.stringify({ 
          text,
          includeLocationData: true,
          confidenceThreshold: 0.6
        }),
      });
      console.log('✅ Successfully retrieved real AI disaster analysis!');
      return response;
    } catch (error) {
      console.error('❌ Failed to perform AI disaster analysis:', error);
      throw new Error('Unable to perform AI disaster analysis. Please check backend connection.');
    }
  }

  // Weather validator endpoint
  async validateWeatherData(location: { lat: number; lng: number }): Promise<{
    current: WeatherData;
    forecast: WeatherData[];
    alerts: WeatherAlert[];
  }> {
    const response = await this.fetchAPI('/weather-validator', {
      method: 'POST',
      body: JSON.stringify(location),
    });
    return response;
  }

  // Heatmap data endpoint
  async getHeatmapData(options: {
    timeRange?: string;
    minConfidence?: number;
    disasterTypes?: string[];
  } = {}): Promise<HeatmapData[]> {
    try {
      const params = new URLSearchParams();
      if (options.timeRange) {
        params.append('timeRange', options.timeRange);
      }
      if (options.minConfidence) {
        params.append('minConfidence', options.minConfidence.toString());
      }
      if (options.disasterTypes?.length) {
        params.append('disasterTypes', options.disasterTypes.join(','));
      }

      console.log('🔄 Fetching real heatmap data from backend...');
      const response = await this.fetchAPI(`/heatmap/data?${params.toString()}`);
      console.log('✅ Successfully retrieved real heatmap data!');
      return response.heatmapData || [];
    } catch (error) {
      console.error('❌ Failed to fetch heatmap data from backend:', error);
      throw new Error('Unable to fetch heatmap data. Please check backend connection.');
    }
  }

  // Route optimizer endpoint
  async optimizeRoute(
    origin: string,
    destination: string,
    options: {
      avoidDisasters?: boolean;
      vehicleType?: string;
    } = {}
  ): Promise<RouteOptimization> {
    try {
      console.log('🔄 Fetching real route optimization from backend...');
      const response = await this.fetchAPI('/routes/optimize', {
        method: 'POST',
        body: JSON.stringify({
          origin,
          destination,
          ...options,
        }),
      });
      console.log('✅ Successfully retrieved real route optimization!');
      return response;
    } catch (error) {
      console.error('❌ Failed to optimize route from backend:', error);
      throw new Error('Unable to optimize route. Please check backend connection.');
    }
  }

  // Maps visualization endpoint
  async getMapsVisualization(options: {
    lat: number;
    lng: number;
    zoom?: number;
    timeRange?: string;
  }): Promise<{
    layers: MapLayer[];
    markers: MapMarker[];
    heatmapData: HeatmapData[];
  }> {
    try {
      console.log('🔄 Fetching real maps visualization from backend...');
      const response = await this.fetchAPI('/maps/visualization', {
        method: 'POST',
        body: JSON.stringify(options),
      });
      console.log('✅ Successfully retrieved real maps visualization!');
      return response;
    } catch (error) {
      console.error('❌ Failed to get maps visualization from backend:', error);
      throw new Error('Unable to get maps visualization. Please check backend connection.');
    }
  }

  // Health check endpoint
  async healthCheck(): Promise<APIHealth> {
    const startTime = Date.now();
    try {
      await this.fetchAPI('/health');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
      };
    } catch {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
      };
    }
  }

  // Get comprehensive dashboard data from centralized endpoint
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await this.fetchAPI('/dashboard/data');
      return response;
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      // Return empty fallback data structure on error
      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        dataSource: 'fallback',
        validatedEvents: [],
        aiAnalyzedEvents: [],
        heatmapData: [],
        recentAlerts: [],
        redditPosts: [],
        systemStats: {
          totalAlerts: 0,
          activeDisasters: 0,
          systemHealth: 0,
          lastUpdate: new Date().toLocaleTimeString(),
          avgResponseTime: '0s',
          dataProcessingRate: '0 events/min',
          aiAccuracy: '0%',
          uptimePercentage: '0%'
        },
        validationStats: {
          totalProcessed: 0,
          validated: 0,
          pending: 0,
          rejected: 0
        },
        apiHealth: {
          status: 'down',
          reddit: 'down',
          aiAnalyzer: 'down',
          validator: 'down',
          dataAggregator: 'down'
        }
      };
    }
  }

  // Legacy dashboard method for backward compatibility  
  async getLegacyDashboardData(): Promise<{
    events: DisasterEvent[];
    redditPosts: RedditPost[];
    heatmapData: HeatmapData[];
    apiHealth: APIHealth;
  }> {
    try {
      const [events, redditPosts, heatmapData, apiHealth] = await Promise.allSettled([
        this.analyzeDisaster('general disaster monitoring'),
        this.scrapeRedditData(['emergency', 'disaster']),
        this.getHeatmapData({ timeRange: '24h' }),
        this.healthCheck(),
      ]);

      return {
        events: events.status === 'fulfilled' ? events.value.events || [] : [],
        redditPosts: redditPosts.status === 'fulfilled' ? redditPosts.value : [],
        heatmapData: heatmapData.status === 'fulfilled' ? heatmapData.value : [],
        apiHealth: apiHealth.status === 'fulfilled' ? apiHealth.value : { status: 'down', lastCheck: new Date().toISOString() },
      };
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      return {
        events: [],
        redditPosts: [],
        heatmapData: [],
        apiHealth: { status: 'down', lastCheck: new Date().toISOString() },
      };
    }
  }
}

// Export singleton instance
export const smartEASAPI = new SmartEASAPI();
export default smartEASAPI;
