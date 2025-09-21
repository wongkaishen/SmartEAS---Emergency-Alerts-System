# SmartEAS - AI-Driven Natural Disaster Emergency Alert System

An intelligent emergency alert and search & rescue system that leverages AI to monitor social media for natural disaster reports, cross-references with meteorological data, and provides optimized evacuation routes.

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/wongkaishen/SmartEAS.git
cd SmartEAS
npm run start

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Check configuration
npm run check-env

# 4. Test core functionality (no API keys needed)
npm run test:weather
npm run test:scraper

# 5. Start development environment
npm run dev

# 6. Open dashboard
# http://localhost:3000
```

## ✨ Features

- **🌐 Real-time Social Media Monitoring**: Scrapes Reddit for disaster keywords and locations
- **🤖 AI-Powered Analysis**: Uses Amazon Bedrock Nova Pro to validate disaster reports
- **🌡️ Weather Data Validation**: Cross-references with NOAA/USGS APIs (no API keys required)
- **🗺️ Smart Routing**: MCP integration with Google Maps for optimal evacuation routes
- **📊 Disaster Heatmaps**: Real-time visualization of earthquake, flood, and wildfire data
- **🚨 Real-time Alerts**: Instant notifications for verified disaster events
- **📱 Mobile-Ready Dashboard**: Responsive interface for emergency management

## 🏗️ Current Architecture

```
                     ┌─────────────────────────────────────────────────────┐
                     │                DATA SOURCES                         │
                     │  🌐 Reddit API    📡 NOAA API    🌍 USGS API       │
                     │  📱 Twitter API   ☁️ OpenWeather  🗺️ Google Maps   │
                     └─────────────────┬───────────────────────────────────┘
                                       │
                     ┌─────────────────▼───────────────────────────────────┐
                     │               AWS LAMBDA FUNCTIONS                   │
                     │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
                     │ │Reddit       │ │AI Disaster  │ │Weather Disaster │ │
                     │ │Scraper      │ │Analyzer     │ │Validator        │ │
                     │ │(5min cron)  │ │(Bedrock)    │ │(NOAA/USGS)     │ │
                     │ └─────────────┘ └─────────────┘ └─────────────────┘ │
                     │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
                     │ │Data Pipeline│ │Heatmap Data │ │Route Optimizer  │ │
                     │ │Processor    │ │Generator    │ │(Google Maps)    │ │
                     │ └─────────────┘ └─────────────┘ └─────────────────┘ │
                     │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
                     │ │Dashboard    │ │Google Maps  │ │Health Check     │ │
                     │ │Aggregator   │ │Integration  │ │Monitor          │ │
                     │ └─────────────┘ └─────────────┘ └─────────────────┘ │
                     └─────────────────┬───────────────────────────────────┘
                                       │
                     ┌─────────────────▼───────────────────────────────────┐
                     │                AWS SERVICES                         │
                     │  💾 DynamoDB      🤖 Bedrock Nova Pro               │
                     │  🌐 API Gateway   📊 CloudWatch Logs               │
                     │  🔗 CORS Headers  ⚡ Auto-scaling                   │
                     └─────────────────┬───────────────────────────────────┘
                                       │
                                       │ REST API Endpoints
                                       │ https://oeqsffqyzg.execute-api.us-east-1.amazonaws.com/dev
                                       │
                     ┌─────────────────▼───────────────────────────────────┐
                     │              FRONTEND (Next.js 15)                  │
                     │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
                     │ │Emergency    │ │Developer    │ │Emergency Map    │ │
                     │ │Alert Home   │ │Dashboard    │ │& Heatmap View   │ │
                     │ │(/)          │ │(/developer) │ │(/map)           │ │
                     │ └─────────────┘ └─────────────┘ └─────────────────┘ │
                     │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
                     │ │API Testing  │ │Real-time    │ │Material-UI      │ │
                     │ │Interface    │ │Data Refresh │ │Components       │ │
                     │ │(/test)      │ │Auto-polling │ │Responsive       │ │
                     │ └─────────────┘ └─────────────┘ └─────────────────┘ │
                     └─────────────────┬───────────────────────────────────┘
                                       │
                     ┌─────────────────▼───────────────────────────────────┐
                     │               DEPLOYMENT                            │
                     │  ☁️ AWS Amplify   📦 Next.js Build                 │
                     │  🔄 GitHub CI/CD  🌍 CDN Distribution              │
                     │  📋 amplify.yml   🔒 Environment Variables          │
                     └─────────────────────────────────────────────────────┘
```

### 🔧 **Technical Implementation Details**

#### **Backend Architecture (AWS Lambda + Serverless Framework)**
- **9 Lambda Functions** deployed via Serverless Framework
- **API Gateway** with CORS-enabled REST endpoints
- **DynamoDB** for persistent event storage
- **Amazon Bedrock Nova Pro** for AI disaster analysis
- **Scheduled Functions** (Reddit scraper runs every 5 minutes)
- **Environment Variables** for API keys and configuration

#### **Frontend Architecture (Next.js 15 + Material-UI)**
- **App Router** with TypeScript
- **4 Main Pages**: Home, Developer, Map, Test
- **Real-time Data Polling** from backend APIs
- **Material-UI v7** for component library
- **Responsive Design** for mobile and desktop

#### **Data Flow**
1. **Reddit Scraper** → monitors disaster-related posts every 5 minutes
2. **AI Analyzer** → processes posts through Bedrock Nova Pro
3. **Weather Validator** → cross-references with NOAA/USGS APIs
4. **Data Pipeline** → aggregates and stores validated events
5. **Frontend** → polls backend APIs and displays real-time data

#### **API Endpoints Structure**
```
/scrape/reddit          - Reddit monitoring and data collection
/analyze/disaster       - AI-powered disaster event analysis
/validate/weather       - Weather data cross-validation
/process/pipeline       - Data aggregation and processing
/generate/heatmap       - Disaster intensity mapping
/optimize/route         - Safe route planning
/integrate/googlemaps   - Maps API integration
/aggregate/dashboard    - Dashboard data compilation
/health                 - System health monitoring
```

## 🛠️ Tech Stack

### Backend
- **AWS Lambda**: Serverless functions for processing
- **Amazon Bedrock Nova Pro**: Large Language Model for analysis
- **DynamoDB**: NoSQL database for events and alerts
- **API Gateway**: REST API endpoints
- **S3**: File storage for logs and media
- **CloudWatch**: Monitoring and logging

### Data Sources
- **Reddit API**: Monitor disaster-related subreddits
- **Twitter API**: Track disaster keywords and hashtags
- **OpenWeatherMap API**: Weather data validation
- **NOAA API**: Official meteorological data
- **USGS API**: Earthquake and geological data

### Integration
- **MCP (Model Context Protocol)**: Google Maps API integration
- **WebSockets**: Real-time client updates
- **Google Maps API**: Route optimization and mapping

### Frontend
- **React.js**: Modern web interface
- **Material-UI**: Component library
- **Leaflet/MapBox**: Interactive maps
- **Socket.io**: Real-time communications

### DevOps
- **AWS CDK**: Infrastructure as Code
- **GitHub Actions**: CI/CD pipeline
- **Docker**: Containerization
- **Terraform**: Alternative IaC option

## 📁 Current Project Structure

```
SmartEAS---Emergency-Alerts-System/
├── 📁 backend/                          # AWS Lambda Backend
│   ├── 📄 serverless.yml               # Serverless Framework config
│   ├── 📄 package.json                 # Backend dependencies
│   ├── 📄 webpack.config.js            # Build configuration
│   ├── 📄 tsconfig.json                # TypeScript config
│   └── 📁 src/
│       ├── 📁 handlers/                 # 9 Lambda Functions
│       │   ├── enhanced-reddit-scraper.ts
│       │   ├── ai-disaster-analyzer.ts
│       │   ├── weather-disaster-validator.ts
│       │   ├── data-pipeline-processor.ts
│       │   ├── heatmap-data-generator.ts
│       │   ├── route-optimizer.ts
│       │   ├── google-maps-integration.ts
│       │   ├── dashboard-data-aggregator.ts
│       │   └── health-check.ts
│       └── 📁 utils/
│           └── logger.ts                # Logging utilities
├── 📁 smarteas-nextjs/                  # Next.js Frontend
│   ├── 📄 package.json                 # Frontend dependencies
│   ├── 📄 next.config.ts               # Next.js configuration
│   ├── 📄 tsconfig.json                # TypeScript config
│   ├── 📄 amplify.yml                  # AWS Amplify deployment
│   ├── 📄 .env                         # Environment variables
│   └── 📁 src/
│       ├── 📁 app/                      # Next.js App Router
│       │   ├── page.tsx                # 🏠 Emergency Alert Home
│       │   ├── layout.tsx              # App layout wrapper
│       │   ├── 📁 developer/
│       │   │   └── page.tsx            # 👨‍💻 Developer Dashboard
│       │   ├── 📁 map/
│       │   │   └── page.tsx            # 🗺️ Emergency Map & Heatmap
│       │   └── 📁 test/
│       │       └── page.tsx            # 🧪 API Testing Interface
│       ├── 📁 components/
│       │   ├── Navigation.tsx          # App navigation
│       │   ├── MaterialUIProvider.tsx  # Theme provider
│       │   ├── BackendStatusIndicator.tsx
│       │   └── DataSourceIndicator.tsx
│       └── 📁 lib/
│           └── api.ts                  # Backend API integration
├── 📁 docs/                            # Documentation
│   ├── CONFIGURATION.md
│   ├── CONTRIBUTING.md
│   └── REDDIT_SETUP.md
├── 📁 scripts/                         # Utility scripts
├── 📄 README.md                        # Project documentation
├── 📄 LICENSE                          # MIT License
├── 📄 .env.example                     # Environment template
└── 📄 AMPLIFY_DEPLOYMENT_GUIDE.md      # Deployment instructions
```

### 🚀 **Deployment Architecture**

#### **Backend (AWS Lambda)**
- **Deployed URL**: `https://oeqsffqyzg.execute-api.us-east-1.amazonaws.com/dev`
- **9 Functions** running Node.js 18.x runtime
- **Auto-scaling** based on demand
- **5-minute scheduled** Reddit scraping
- **CORS-enabled** API Gateway

#### **Frontend (Next.js 15)**
- **AWS Amplify** hosting with CDN
- **Server-Side Rendering** for SEO
- **Static Generation** for performance
- **Real-time polling** for live data updates
- **Responsive design** for all devices

#### **Environment Configuration**
- **Backend**: AWS environment variables via Serverless
- **Frontend**: Next.js environment variables via Amplify
- **APIs**: Reddit, Weather, Google Maps, Bedrock integration

## 🚀 Quick Start

1. **Clone and Setup**
   ```bash
   git clone https://github.com/wongkaishen/SmartEAS.git
   cd SmartEAS
   npm install
   ```

2. **Configure AWS**
   ```bash
   aws configure
   npm run deploy:infrastructure
   ```

3. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Deploy Functions**
   ```bash
   npm run deploy:lambda
   npm run deploy:frontend
   ```

## 📊 Key Components

### 1. Social Media Monitoring
- Reddit API integration for r/news, r/weather, r/emergencies
- Twitter API for hashtag tracking (#earthquake, #flood, #wildfire)
- Real-time streaming and keyword filtering

### 2. AI Analysis Engine
- Amazon Bedrock Nova Pro for natural language processing
- Sentiment analysis and disaster classification
- Location extraction and geocoding

### 3. Meteorological Validation
- Cross-reference social media reports with official data
- Weather pattern analysis
- Alert priority scoring

### 4. Route Optimization
- MCP server for Google Maps integration
- Real-time traffic and road closure data
- Multi-modal evacuation planning

## 🧪 Testing & Development

### Quick Tests (No API Keys Required)
```bash
# Test NOAA/USGS weather APIs
npm run test:weather

# Test disaster keyword detection
npm run test:scraper

# Check environment configuration
npm run check-env
```

### Full Testing Suite
```bash
# Test individual components
npm run test:backend
npm run test:frontend
npm run test:ai

# Run integration tests
npm run test:integration

# Test the complete pipeline
npm run test
```

### Manual Testing Scenarios
1. **Earthquake Detection**: Monitor USGS data and social media correlation
2. **Weather Validation**: Cross-reference NOAA alerts with social posts
3. **Route Planning**: Test evacuation routes with disaster-specific safety scoring

### Development Environment
```bash
# Start all services locally
npm run dev

# Access points:
# - Frontend Dashboard: http://localhost:3000
# - Backend API: http://localhost:3001
# - Real-time WebSocket connections
# - MCP Google Maps integration
```

For detailed setup instructions, see [SETUP.md](SETUP.md).

## 🔧 Configuration

See `docs/CONFIGURATION.md` for detailed setup instructions.

## 🤝 Contributing

See `docs/CONTRIBUTING.md` for contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Emergency Contacts

For system issues during active disasters, contact: emergency@smarteas.ai
