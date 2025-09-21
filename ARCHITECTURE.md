# SmartEAS System Architecture

## 🏗️ **Complete System Architecture**

This document provides a comprehensive overview of the SmartEAS (Smart Emergency Alert System) architecture based on the current implementation.

## 📊 **High-Level Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL DATA SOURCES                             │
│  🌐 Reddit API    📡 NOAA Weather    🌍 USGS Earthquake    🗺️ Google Maps  │
│  📱 Twitter API   ☁️ OpenWeather     🌊 Flood Data         📍 Geocoding     │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
                  │ API Calls & Data Ingestion
                  │
┌─────────────────▼───────────────────────────────────────────────────────────┐
│                        AWS LAMBDA MICROSERVICES                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ Reddit Scraper  │ │ AI Analyzer     │ │ Weather Validator               │ │
│ │ - Monitors r/   │ │ - Bedrock Nova  │ │ - NOAA Integration              │ │
│ │   news, weather │ │   Pro LLM       │ │ - USGS Cross-reference          │ │
│ │ - 5min schedule │ │ - NLP Analysis  │ │ - Data Validation               │ │
│ │ - Keyword filter│ │ - Severity Score│ │ - Alert Prioritization          │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ Data Pipeline   │ │ Heatmap Gen     │ │ Route Optimizer                 │ │
│ │ - Event Aggreg  │ │ - Intensity Map │ │ - Google Maps API               │ │
│ │ - Data Cleaning │ │ - Geospatial    │ │ - Traffic Integration           │ │
│ │ - Deduplication │ │ - Visualization │ │ - Safe Route Planning           │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ Dashboard API   │ │ Maps Integration│ │ Health Monitor                  │ │
│ │ - Data Aggreg   │ │ - Geocoding     │ │ - System Status                 │ │
│ │ - Real-time API │ │ - Route Display │ │ - Performance Metrics           │ │
│ │ - Status Updates│ │ - Layer Management│ │ - Error Tracking               │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
                  │ REST API (CORS-enabled)
                  │ https://oeqsffqyzg.execute-api.us-east-1.amazonaws.com/dev
                  │
┌─────────────────▼───────────────────────────────────────────────────────────┐
│                      AWS INFRASTRUCTURE LAYER                               │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ API Gateway     │ │ DynamoDB        │ │ Amazon Bedrock                  │ │
│ │ - REST endpoints│ │ - Event storage │ │ - Nova Pro Model                │ │
│ │ - CORS headers  │ │ - Alert history │ │ - Natural Language Processing   │ │
│ │ - Rate limiting │ │ - User data     │ │ - Disaster Classification       │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ CloudWatch      │ │ S3 Storage      │ │ Auto Scaling                    │ │
│ │ - Logs & Metrics│ │ - Static assets │ │ - Lambda scaling                │ │
│ │ - Monitoring    │ │ - Backup data   │ │ - Cost optimization             │ │
│ │ - Alerting      │ │ - Media files   │ │ - Performance tuning            │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
                  │ HTTPS API Calls
                  │
┌─────────────────▼───────────────────────────────────────────────────────────┐
│                      NEXT.JS 15 FRONTEND                                    │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ Emergency Home  │ │ Developer Dash  │ │ Emergency Map                   │ │
│ │ - Public alerts │ │ - System metrics│ │ - Disaster heatmap              │ │
│ │ - Action buttons│ │ - API monitoring│ │ - Route visualization           │ │
│ │ - Status cards  │ │ - Performance   │ │ - Interactive mapping           │ │
│ │ Path: /         │ │ Path: /developer│ │ Path: /map                      │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ API Test Suite  │ │ Navigation      │ │ Component Library               │ │
│ │ - Endpoint test │ │ - App routing   │ │ - Material-UI v7                │ │
│ │ - Debug tools   │ │ - Breadcrumbs   │ │ - Responsive design             │ │
│ │ - Response view │ │ - User auth     │ │ - Theme management              │ │
│ │ Path: /test     │ │ Global component│ │ Shared components               │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────────────┐
│                       DEPLOYMENT & CI/CD                                    │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ AWS Amplify     │ │ GitHub Actions  │ │ Environment Management          │ │
│ │ - Frontend host │ │ - Auto deploy   │ │ - Dev/Staging/Prod              │ │
│ │ - CDN delivery  │ │ - Build pipeline│ │ - Config management             │ │
│ │ - SSL/TLS       │ │ - Testing suite │ │ - Secret management             │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 **Component Breakdown**

### **1. Data Sources Integration**
- **Reddit API**: Monitors disaster-related subreddits (r/news, r/weather, r/emergencies)
- **Weather APIs**: NOAA (official weather data), OpenWeather (current conditions)
- **Geological APIs**: USGS (earthquake data, flood monitoring)
- **Mapping APIs**: Google Maps (geocoding, routing, traffic data)

### **2. AWS Lambda Microservices**
Each Lambda function handles a specific responsibility:

#### **Data Collection Layer**
- `enhanced-reddit-scraper.ts`: Automated Reddit monitoring with keyword filtering
- `weather-disaster-validator.ts`: Cross-references social reports with official data

#### **AI Processing Layer**
- `ai-disaster-analyzer.ts`: Amazon Bedrock Nova Pro integration for NLP analysis
- `data-pipeline-processor.ts`: Event aggregation and data cleaning

#### **Visualization Layer**
- `heatmap-data-generator.ts`: Creates disaster intensity maps
- `route-optimizer.ts`: Safe route planning with traffic integration
- `google-maps-integration.ts`: Maps API coordination

#### **API Layer**
- `dashboard-data-aggregator.ts`: Compiles real-time dashboard data
- `health-check.ts`: System monitoring and status reporting

### **3. Frontend Architecture (Next.js 15)**

#### **Page Structure**
- **Emergency Home (`/`)**: Public-facing emergency alert interface
- **Developer Dashboard (`/developer`)**: Technical monitoring and metrics
- **Emergency Map (`/map`)**: Interactive disaster mapping and routing
- **API Testing (`/test`)**: Development tools and endpoint testing

#### **Component Architecture**
- **Material-UI v7**: Component library for consistent design
- **Real-time Polling**: Automatic data refresh every 2 minutes
- **Responsive Design**: Mobile-first approach for emergency accessibility
- **TypeScript**: Type safety and development efficiency

### **4. Data Flow Architecture**

```
Data Collection → AI Analysis → Validation → Storage → Aggregation → Frontend Display
      ↓              ↓            ↓          ↓           ↓              ↓
   Reddit API → Bedrock Nova → Weather APIs → DynamoDB → Dashboard API → React UI
```

## 🚀 **Deployment Architecture**

### **Backend Deployment**
- **Framework**: Serverless Framework v3
- **Runtime**: Node.js 18.x
- **Region**: us-east-1 (Virginia)
- **Scaling**: Auto-scaling based on demand
- **Monitoring**: CloudWatch logs and metrics

### **Frontend Deployment**
- **Platform**: AWS Amplify
- **Build**: Next.js static generation
- **CDN**: CloudFront distribution
- **SSL**: Automatic HTTPS termination
- **Environment**: Multi-stage deployment (dev/prod)

## 📊 **Performance Characteristics**

### **Backend Performance**
- **Cold Start**: <3 seconds for Lambda functions
- **API Response**: <500ms average response time
- **Throughput**: 1000+ concurrent requests supported
- **Availability**: 99.9% uptime target

### **Frontend Performance**
- **First Load**: <2 seconds via CDN
- **Subsequent Loads**: <500ms with caching
- **Real-time Updates**: 2-minute polling interval
- **Mobile Performance**: Optimized for 3G+ networks

## 🔒 **Security Architecture**

### **API Security**
- **CORS**: Properly configured for cross-origin requests
- **Rate Limiting**: API Gateway throttling
- **Environment Variables**: Secure credential management
- **HTTPS**: End-to-end encryption

### **Data Security**
- **DynamoDB**: Encrypted at rest and in transit
- **API Keys**: Stored in AWS environment variables
- **No Sensitive Data**: No PII stored in frontend

## 📈 **Monitoring & Observability**

### **Backend Monitoring**
- **CloudWatch Logs**: Centralized logging for all Lambda functions
- **Performance Metrics**: Response times, error rates, invocation counts
- **Health Checks**: Automated system status monitoring

### **Frontend Monitoring**
- **Real-time Status**: Backend connectivity indicators
- **Error Handling**: Graceful degradation for offline scenarios
- **User Experience**: Performance tracking and optimization

This architecture provides a robust, scalable, and maintainable emergency alert system capable of handling real-time disaster monitoring and response coordination.
