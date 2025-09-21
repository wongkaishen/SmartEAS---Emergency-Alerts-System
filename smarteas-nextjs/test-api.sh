#!/bin/bash
# SmartEAS API Endpoint Testing Script

API_BASE="https://oeqsffqyzg.execute-api.us-east-1.amazonaws.com/dev"

echo "🧪 Testing SmartEAS API Endpoints"
echo "=================================="
echo "Base URL: $API_BASE"
echo ""

# Test 1: Heatmap Data (GET)
echo "📡 Test 1: Heatmap Data (GET /heatmap/data)"
echo "-------------------------------------------"
curl -X GET "$API_BASE/heatmap/data?timeRange=24h&minConfidence=0.7" \
  -H "Content-Type: application/json" \
  -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  -s -o heatmap_response.json
echo "Response saved to: heatmap_response.json"
echo ""

# Test 2: Reddit Scraper (POST)
echo "📡 Test 2: Reddit Scraper (POST /scrape/reddit)"
echo "----------------------------------------------"
curl -X POST "$API_BASE/scrape/reddit" \
  -H "Content-Type: application/json" \
  -d '{"subreddits":["emergency","disaster"],"limit":10,"timeRange":"day"}' \
  -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  -s -o reddit_response.json
echo "Response saved to: reddit_response.json"
echo ""

# Test 3: Disaster Analyzer (POST)
echo "📡 Test 3: Disaster Analyzer (POST /analyze/disaster)"
echo "----------------------------------------------------"
curl -X POST "$API_BASE/analyze/disaster" \
  -H "Content-Type: application/json" \
  -d '{"text":"general disaster monitoring"}' \
  -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  -s -o disaster_response.json
echo "Response saved to: disaster_response.json"
echo ""

# Test 4: Route Optimization (POST)
echo "📡 Test 4: Route Optimization (POST /routes/optimize)"
echo "----------------------------------------------------"
curl -X POST "$API_BASE/routes/optimize" \
  -H "Content-Type: application/json" \
  -d '{"origin":"Los Angeles, CA","destination":"San Francisco, CA","avoidDisasters":true}' \
  -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  -s -o route_response.json
echo "Response saved to: route_response.json"
echo ""

# Test 5: Maps Visualization (POST)
echo "📡 Test 5: Maps Visualization (POST /maps/visualization)"
echo "------------------------------------------------------"
curl -X POST "$API_BASE/maps/visualization" \
  -H "Content-Type: application/json" \
  -d '{"lat":34.0522,"lng":-118.2437,"zoom":10}' \
  -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  -s -o maps_response.json
echo "Response saved to: maps_response.json"
echo ""

echo "🔍 Summary - Check response files:"
echo "================================="
for file in *_response.json; do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file")
    echo "📄 $file ($size bytes)"
    echo "   Content preview:"
    head -c 200 "$file" | tr '\n' ' '
    echo ""
    echo ""
  fi
done

echo "✅ API testing complete!"
echo "💡 Check the JSON files for detailed responses"
