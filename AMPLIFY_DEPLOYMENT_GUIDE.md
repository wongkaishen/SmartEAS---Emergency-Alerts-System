# AWS Amplify CLI Deployment Guide

## Prerequisites
✅ AWS CLI configured with credentials
✅ Amplify CLI installed: `npm install -g @aws-amplify/cli-core`
✅ Project with amplify/ folder configured

## Step 1: Sandbox Development
```bash
cd smarteas-nextjs
npx ampx sandbox --name smarteas-dev
```
This creates a personal development backend for testing.

## Step 2: Production Deployment Options

### Option A: AWS Amplify Console (Recommended)
1. Push code to GitHub
2. Go to AWS Amplify Console
3. Connect GitHub repo
4. Select branch: main
5. App root: smarteas-nextjs
6. amplify.yml will be auto-detected

### Option B: Manual CLI Steps
```bash
# 1. Generate deployment configuration
npx ampx generate

# 2. Check your AWS configuration
aws sts get-caller-identity

# 3. Deploy via CI/CD pipeline
# (This requires setting up AWS CodeCommit or GitHub Actions)
```

## Environment Variables
Make sure to set these in AWS Amplify Console:
- NEXT_PUBLIC_API_BASE_URL
- NEXT_PUBLIC_WS_URL  
- NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- NODE_ENV=production

## Build Configuration
Your amplify.yml is configured for subfolder deployment:
- Build commands run in smarteas-nextjs/
- Output from smarteas-nextjs/.next/
- Cache includes node_modules and .next/cache

## Verification
After deployment, test:
- Main page: /
- Developer dashboard: /developer  
- API test page: /test
- Map visualization: /map
