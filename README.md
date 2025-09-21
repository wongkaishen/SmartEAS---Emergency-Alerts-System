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

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Social Media  │────│   AWS Lambda     │────│   Bedrock Nova  │
│   Scrapers      │    │   Processors     │    │   Pro LLM       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌──────────────────┐             │
         │              │   DynamoDB       │             │
         │              │   Event Store    │             │
         │              └──────────────────┘             │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Weather APIs  │────│   Alert Engine   │────│   MCP Google    │
│   Integration   │    │   & Validator    │    │   Maps Router   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   React Frontend │
                       │   Real-time UI   │
                       └──────────────────┘
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

## 📁 Project Structure

```
SmartEAS/
├── infrastructure/          # AWS CDK/Terraform configs
├── backend/
│   ├── lambda-functions/    # AWS Lambda functions
│   ├── mcp-server/         # Model Context Protocol server
│   └── shared/             # Shared utilities
├── frontend/               # React.js application
├── scrapers/              # Social media scrapers
├── ai-models/             # Bedrock integration
├── apis/                  # External API integrations
├── docs/                  # Documentation
└── tests/                 # Test suites
```

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
