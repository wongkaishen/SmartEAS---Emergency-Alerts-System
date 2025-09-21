# Reddit API Setup Guide

## Overview
The SmartEAS Reddit scraper uses the Snoowrap library to monitor disaster-related posts across multiple subreddits in real-time.

## Reddit API Configuration

### 1. Create Reddit Application
1. Go to [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click "Create App" or "Create Another App"
3. Fill in the form:
   - **Name**: SmartEAS Disaster Monitor
   - **App type**: Script
   - **Description**: Disaster monitoring and emergency response system
   - **About URL**: (optional)
   - **Redirect URI**: `http://localhost:8080` (required even for script apps)
4. Click "Create app"

### 2. Get API Credentials
After creating the app, you'll see:
- **Client ID**: Located under the app name (14-character string)
- **Client Secret**: Listed as "secret" (27-character string)

### 3. Environment Variables
Add these to your `.env` file:

```bash
# Reddit API Configuration
REDDIT_CLIENT_ID=your_14_character_client_id
REDDIT_CLIENT_SECRET=your_27_character_secret
REDDIT_USER_AGENT=SmartEAS/1.0
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
```

### 4. Generate Refresh Token (Alternative)
If you prefer using refresh tokens instead of username/password:

```javascript
// Run this script once to get refresh token
const snoowrap = require('snoowrap');

const r = new snoowrap({
  userAgent: 'SmartEAS/1.0',
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  username: 'your_username',
  password: 'your_password'
});

r.getMe().then(() => {
  console.log('Refresh Token:', r.refreshToken);
});
```

Then use `REDDIT_REFRESH_TOKEN` instead of username/password.

## Monitored Subreddits

The scraper monitors these subreddits for disaster-related content:

### News & Current Events
- r/news, r/worldnews, r/BreakingNews

### Weather & Natural Disasters  
- r/weather, r/NaturalDisasters, r/TropicalWeather
- r/Wildfire, r/earthquake, r/flooding, r/tornado, r/hurricane

### Emergency & Preparedness
- r/emergency, r/preppers, r/EmergencyManagement, r/DisasterRelief

### Location-Specific
- r/California, r/Florida, r/Texas, r/Japan, r/australia

### General Content
- r/pics, r/videos, r/PublicFreakout, r/CatastrophicFailure

## Disaster Keywords

The system searches for these keywords:

**Natural Disasters**: earthquake, tsunami, flood, wildfire, hurricane, tornado, landslide, avalanche, volcano, cyclone, typhoon, blizzard, drought, heatwave, storm, thunderstorm

**Emergency Terms**: emergency, evacuation, disaster, crisis, catastrophe, rescue, casualties, damage, destroyed, alert, warning

**Severity Indicators**: severe, extreme, dangerous, critical, urgent, immediate, breaking, developing

## Features

### Smart Filtering
- **Relevance Scoring**: Posts are scored based on keyword matches, Reddit score, subreddit type, and content quality
- **Time Filtering**: Only recent posts (6-24 hours) are processed
- **Location Extraction**: Attempts to extract location information from post text
- **Duplicate Prevention**: Uses Reddit post IDs to avoid processing duplicates

### Rate Limiting
- 1-second delay between requests to avoid Reddit API limits
- Continues after rate limit errors
- Processes up to 50 posts per subreddit

### Data Storage
Posts are stored in DynamoDB with:
- Original Reddit metadata
- Extracted location information
- Relevance scores and matched keywords
- Processing flags for AI analysis pipeline

## Testing

Test the Reddit scraper:

```bash
# Start the backend
cd backend
npm run dev

# Trigger scraper (in another terminal)
curl -X POST http://localhost:3002/dev/scrape-reddit
```

## Monitoring

Check logs for:
- Successful connections to Reddit API
- Number of posts found per subreddit
- Rate limiting or authentication errors
- Data storage confirmations

## Security Notes

- Store API credentials securely in environment variables
- Consider using Reddit refresh tokens instead of passwords
- Monitor API usage to stay within Reddit's rate limits
- Implement proper error handling for production deployments

## Troubleshooting

**Authentication Errors**:
- Verify CLIENT_ID and CLIENT_SECRET are correct
- Check that username/password or refresh token is valid
- Ensure USER_AGENT is descriptive and unique

**Rate Limiting**:
- Reduce number of monitored subreddits
- Increase request delay in Snoowrap config
- Implement exponential backoff for retries

**No Posts Found**:
- Check if keywords match current events
- Verify subreddits are active and accessible
- Review time filtering (posts might be too old)
