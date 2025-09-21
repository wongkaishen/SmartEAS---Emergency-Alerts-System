# SmartEAS Configuration Guide

## Prerequisites

### 1. AWS Account Setup
- Create an AWS account if you don't have one
- Install AWS CLI: `aws configure`
- Ensure you have permissions for:
  - Lambda functions
  - DynamoDB
  - S3
  - API Gateway
  - CloudFront
  - Amazon Bedrock
  - EventBridge

### 2. Amazon Bedrock Access
- Request access to Amazon Nova Pro model in AWS Console
- Go to Amazon Bedrock > Model access
- Request access to `amazon.nova-pro-v1:0`
- Wait for approval (usually within 24 hours)

### 3. API Keys Required

#### Reddit API
1. Go to https://www.reddit.com/prefs/apps
2. Create a new application (script type)
3. Note down:
   - Client ID
   - Client Secret
   - Set User Agent as "SmartEAS/1.0"

#### Twitter API (X API)
1. Go to https://developer.twitter.com
2. Create a new app
3. Generate Bearer Token
4. Note down:
   - Bearer Token
   - API Key
   - API Secret

#### Google Maps API
1. Go to https://console.cloud.google.com
2. Enable the following APIs:
   - Maps JavaScript API
   - Directions API
   - Places API
   - Geocoding API
3. Create API key
4. Restrict key to your domain/IP

#### Weather APIs
1. OpenWeatherMap: https://openweathermap.org/api
   - Sign up for free API key
   - Choose appropriate plan for your usage

2. NOAA API: https://www.ncdc.noaa.gov/cdo-web/webservices/v2
   - Request API key

3. USGS API: https://earthquake.usgs.gov/fdsnws/
   - Usually no key required for basic usage

## Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Required Variables

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Amazon Bedrock
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0
BEDROCK_REGION=us-east-1

# Social Media APIs
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=SmartEAS/1.0

TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret

# Weather APIs
OPENWEATHER_API_KEY=your_openweather_key
NOAA_API_KEY=your_noaa_key
USGS_API_KEY=your_usgs_key

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
API_BASE_URL=https://your-api-domain.com
```

## Deployment Steps

### 1. Quick Deployment
```bash
chmod +x deploy.sh
./deploy.sh
```

### 2. Manual Deployment

#### Install Dependencies
```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd infrastructure && npm install && cd ..
cd mcp-server && npm install && cd ..
```

#### Build All Components
```bash
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
cd infrastructure && npm run build && cd ..
```

#### Deploy Infrastructure
```bash
cd infrastructure
cdk bootstrap  # Only needed once per AWS account/region
cdk deploy
cd ..
```

#### Deploy Frontend
```bash
cd frontend
aws s3 sync build/ s3://your-frontend-bucket --delete
cd ..
```

## Post-Deployment Configuration

### 1. Test Social Media Scrapers
```bash
# Test Reddit scraper
aws lambda invoke \
  --function-name smarteas-reddit-scraper \
  --payload '{}' \
  response.json

# Test Twitter scraper
aws lambda invoke \
  --function-name smarteas-twitter-scraper \
  --payload '{}' \
  response.json
```

### 2. Verify DynamoDB Tables
```bash
# Check events table
aws dynamodb scan \
  --table-name smarteas-events \
  --max-items 5

# Check alerts table
aws dynamodb scan \
  --table-name smarteas-alerts \
  --max-items 5
```

### 3. Test Route Optimization
```bash
curl -X POST https://your-api-endpoint/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 37.7749, "lng": -122.4194},
    "destination": {"lat": 37.3382, "lng": -121.8863},
    "disasterType": "earthquake",
    "urgency": "high"
  }'
```

## Monitoring and Maintenance

### 1. CloudWatch Logs
Monitor Lambda function logs:
- `/aws/lambda/smarteas-reddit-scraper`
- `/aws/lambda/smarteas-twitter-scraper`
- `/aws/lambda/smarteas-disaster-analyzer`
- `/aws/lambda/smarteas-route-optimizer`

### 2. DynamoDB Metrics
Monitor table performance:
- Read/Write capacity
- Throttling events
- Item count growth

### 3. API Gateway Metrics
Monitor API usage:
- Request count
- Error rates
- Latency

### 4. Cost Optimization
- Review Lambda execution duration
- Monitor DynamoDB read/write units
- Check S3 storage usage
- Review API call costs (external APIs)

## Troubleshooting

### Common Issues

#### 1. Bedrock Access Denied
```
Solution: Request model access in AWS Console
Go to Bedrock > Model access > Request access
```

#### 2. Lambda Timeout
```
Solution: Increase timeout in serverless.yml
timeout: 300  # 5 minutes
```

#### 3. DynamoDB Throttling
```
Solution: Enable auto-scaling or increase capacity
aws dynamodb update-table \
  --table-name smarteas-events \
  --billing-mode PAY_PER_REQUEST
```

#### 4. API Rate Limits
```
Solution: Implement exponential backoff
Add retry logic with jitter
Consider upgrading API plans
```

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Health Checks

Test system health:
```bash
# API health
curl https://your-api-endpoint/health

# Frontend health
curl https://your-frontend-url

# Lambda function status
aws lambda get-function --function-name smarteas-reddit-scraper
```

## Security Considerations

### 1. API Key Management
- Store sensitive keys in AWS Secrets Manager
- Use IAM roles instead of access keys when possible
- Rotate keys regularly

### 2. Network Security
- Use VPC for Lambda functions if needed
- Enable CloudFront for DDoS protection
- Implement rate limiting

### 3. Data Protection
- Enable DynamoDB encryption at rest
- Use HTTPS for all communications
- Implement proper CORS policies

## Scaling Considerations

### 1. Lambda Concurrency
- Monitor concurrent executions
- Set reserved concurrency if needed
- Consider provisioned concurrency for critical functions

### 2. Database Scaling
- Use DynamoDB auto-scaling
- Consider read replicas for heavy read workloads
- Implement proper partition key design

### 3. API Scaling
- Use API Gateway caching
- Implement proper pagination
- Consider using Lambda@Edge for global distribution

## Backup and Recovery

### 1. DynamoDB Backups
```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name smarteas-events \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### 2. Code Backups
- Use Git for version control
- Tag releases for easy rollback
- Maintain infrastructure as code

### 3. Configuration Backups
- Export environment variables
- Document configuration changes
- Maintain deployment scripts
