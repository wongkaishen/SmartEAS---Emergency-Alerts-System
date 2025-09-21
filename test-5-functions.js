#!/usr/bin/env node

/**
 * Comprehensive Testing Script for SmartEAS 5-Function Disaster Detection System
 * 
 * Tests:
 * 1. Enhanced Reddit Scraper
 * 2. AI Disaster Analyzer  
 * 3. Weather/Meteorological Validator
 * 4. Heatmap Data Generator
 * 5. Google Maps Integration
 */

const https = require('https');

const API_BASE = 'ukndtkm3qc.execute-api.us-east-1.amazonaws.com';
const TEST_STAGE = 'dev';

class SmartEASFunctionTester {
    constructor() {
        this.results = {
            function1: { name: 'Enhanced Reddit Scraper', status: 'pending', data: null, error: null },
            function2: { name: 'AI Disaster Analyzer', status: 'pending', data: null, error: null },
            function3: { name: 'Weather Validator', status: 'pending', data: null, error: null },
            function4: { name: 'Heatmap Data Generator', status: 'pending', data: null, error: null },
            function5: { name: 'Google Maps Integration', status: 'pending', data: null, error: null }
        };
    }

    async runAllTests() {
        console.log('🚀 Starting SmartEAS 5-Function Test Suite');
        console.log('==========================================\n');

        try {
            // Test Function 1: Enhanced Reddit Scraper
            await this.testFunction1();
            
            // Wait for data to be processed
            console.log('⏳ Waiting for AI analysis to process...');
            await this.delay(10000); // 10 seconds
            
            // Test Function 2: AI Disaster Analyzer (triggered by DynamoDB streams)
            await this.testFunction2();
            
            // Wait for validation to process
            console.log('⏳ Waiting for weather validation to process...');
            await this.delay(10000); // 10 seconds
            
            // Test Function 3: Weather Validator (triggered by DynamoDB streams)
            await this.testFunction3();
            
            // Test Function 4: Heatmap Data Generator
            await this.testFunction4();
            
            // Test Function 5: Google Maps Integration
            await this.testFunction5();
            
            // Generate final report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    async testFunction1() {
        console.log('📰 Testing Function 1: Enhanced Reddit Scraper');
        console.log('==============================================');
        
        try {
            const testData = {
                limit: 50,
                timeRange: 'day',
                subreddits: ['worldnews', 'earthquake', 'flood', 'wildfire'],
                keywords: ['earthquake', 'tsunami', 'flood', 'emergency']
            };
            
            const response = await this.makeRequest('/dev/scrape/reddit-enhanced', 'POST', testData);
            
            if (response.status === 200) {
                this.results.function1.status = 'success';
                this.results.function1.data = response.data;
                
                console.log('✅ Enhanced Reddit Scraper: SUCCESS');
                console.log(`   📊 Total posts found: ${response.data.results?.totalPosts || 0}`);
                console.log(`   💾 Unique posts saved: ${response.data.results?.savedToDynamoDB || 0}`);
                console.log(`   📑 Subreddits processed: ${response.data.results?.processedSubreddits || 0}`);
                console.log(`   ⚠️  Errors: ${response.data.results?.errors?.length || 0}`);
                
                if (response.data.results?.posts?.length > 0) {
                    const samplePost = response.data.results.posts[0];
                    console.log(`   📄 Sample post: "${samplePost.title}"`);
                    console.log(`   🎯 Relevance score: ${samplePost.relevanceScore}`);
                    console.log(`   📍 Location: ${samplePost.location || 'Not detected'}`);
                    console.log(`   🚨 Urgency: ${samplePost.urgency}`);
                }
                
            } else {
                this.results.function1.status = 'failed';
                this.results.function1.error = `HTTP ${response.status}`;
                console.log(`❌ Enhanced Reddit Scraper: FAILED (${response.status})`);
            }
            
        } catch (error) {
            this.results.function1.status = 'error';
            this.results.function1.error = error.message;
            console.log(`❌ Enhanced Reddit Scraper: ERROR - ${error.message}`);
        }
        
        console.log('');
    }

    async testFunction2() {
        console.log('🤖 Testing Function 2: AI Disaster Analyzer');
        console.log('===========================================');
        
        try {
            // This function is triggered by DynamoDB streams, so we test indirectly
            // by checking if the posts from Function 1 have been AI analyzed
            
            const testData = {
                posts: [
                    {
                        id: 'test_earthquake_001',
                        title: 'BREAKING: 7.2 Magnitude Earthquake Hits California Coast',
                        content: 'A powerful 7.2 magnitude earthquake struck off the California coast this morning, causing widespread damage and triggering tsunami warnings. Emergency services are responding to reports of collapsed buildings in San Francisco.',
                        location: 'California, USA',
                        platform: 'reddit',
                        subreddit: 'earthquake'
                    },
                    {
                        id: 'test_flood_002',
                        title: 'Flash Flood Emergency in Houston',
                        content: 'Heavy rainfall has caused severe flooding in Houston area. Multiple rescues underway. Authorities urge residents to avoid travel.',
                        location: 'Houston, Texas',
                        platform: 'reddit',
                        subreddit: 'news'
                    }
                ]
            };
            
            const response = await this.makeRequest('/dev/analyze/disaster-ai', 'POST', testData);
            
            if (response.status === 200) {
                this.results.function2.status = 'success';
                this.results.function2.data = response.data;
                
                console.log('✅ AI Disaster Analyzer: SUCCESS');
                
                if (response.data.analyses) {
                    for (const analysis of response.data.analyses) {
                        console.log(`   🔍 Post: "${analysis.title}"`);
                        console.log(`   🤖 AI Assessment: ${analysis.isDisaster ? 'DISASTER' : 'NOT DISASTER'}`);
                        console.log(`   📊 Confidence: ${analysis.confidence}%`);
                        console.log(`   🏷️  Type: ${analysis.disasterType || 'N/A'}`);
                        console.log(`   ⚡ Severity: ${analysis.severity}`);
                        console.log(`   📍 Location: ${analysis.location || 'Not extracted'}`);
                        console.log('   ---');
                    }
                }
                
            } else {
                this.results.function2.status = 'failed';
                this.results.function2.error = `HTTP ${response.status}`;
                console.log(`❌ AI Disaster Analyzer: FAILED (${response.status})`);
            }
            
        } catch (error) {
            this.results.function2.status = 'error';
            this.results.function2.error = error.message;
            console.log(`❌ AI Disaster Analyzer: ERROR - ${error.message}`);
        }
        
        console.log('');
    }

    async testFunction3() {
        console.log('🌤️ Testing Function 3: Weather/Meteorological Validator');
        console.log('========================================================');
        
        try {
            const testData = {
                events: [
                    {
                        id: 'test_validation_001',
                        disasterType: 'earthquake',
                        location: 'San Francisco, CA',
                        timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
                        aiConfidence: 85
                    },
                    {
                        id: 'test_validation_002',
                        disasterType: 'flood',
                        location: 'Houston, TX',
                        timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
                        aiConfidence: 75
                    }
                ]
            };
            
            const response = await this.makeRequest('/dev/validate/weather-meteorological', 'POST', testData);
            
            if (response.status === 200) {
                this.results.function3.status = 'success';
                this.results.function3.data = response.data;
                
                console.log('✅ Weather Validator: SUCCESS');
                
                if (response.data.validations) {
                    for (const validation of response.data.validations) {
                        console.log(`   🔍 Event: ${validation.eventId}`);
                        console.log(`   ✔️  Validated: ${validation.disasterConfirmed ? 'CONFIRMED' : 'NOT CONFIRMED'}`);
                        console.log(`   📊 Confidence: ${validation.confidence}%`);
                        console.log(`   🏢 Sources: ${validation.validationSources?.map(s => s.source).join(', ') || 'None'}`);
                        console.log(`   🚨 Official Alerts: ${validation.officialAlerts?.length || 0}`);
                        console.log(`   🌡️  Weather Data: ${validation.meteorologicalData?.length || 0} sources`);
                        console.log(`   🌍 Seismic Data: ${validation.seismicData?.length || 0} sources`);
                        console.log(`   ⚡ Severity: ${validation.severity}`);
                        console.log('   ---');
                    }
                }
                
            } else {
                this.results.function3.status = 'failed';
                this.results.function3.error = `HTTP ${response.status}`;
                console.log(`❌ Weather Validator: FAILED (${response.status})`);
            }
            
        } catch (error) {
            this.results.function3.status = 'error';
            this.results.function3.error = error.message;
            console.log(`❌ Weather Validator: ERROR - ${error.message}`);
        }
        
        console.log('');
    }

    async testFunction4() {
        console.log('🗺️ Testing Function 4: Heatmap Data Generator');
        console.log('=============================================');
        
        try {
            const testData = {
                timeRange: '24h',
                minConfidence: 60,
                disasterTypes: ['earthquake', 'flood', 'hurricane'],
                severityLevels: ['medium', 'high', 'critical'],
                includeUnconfirmed: false
            };
            
            const response = await this.makeRequest('/dev/generate/heatmap-data', 'POST', testData);
            
            if (response.status === 200) {
                this.results.function4.status = 'success';
                this.results.function4.data = response.data;
                
                console.log('✅ Heatmap Data Generator: SUCCESS');
                console.log(`   📍 Data points: ${response.data.heatmapData?.length || 0}`);
                console.log(`   🌍 Regions: ${response.data.regions?.length || 0}`);
                console.log(`   📊 Total disasters: ${response.data.statistics?.totalDisasters || 0}`);
                
                if (response.data.statistics) {
                    console.log(`   📈 By Type: ${JSON.stringify(response.data.statistics.byType)}`);
                    console.log(`   ⚡ By Severity: ${JSON.stringify(response.data.statistics.bySeverity)}`);
                    console.log(`   🎯 Avg Confidence: ${response.data.statistics.avgConfidence}%`);
                    console.log(`   🟢 Active: ${response.data.statistics.activeDisasters}`);
                    console.log(`   ✅ Validated: ${response.data.statistics.validatedDisasters}`);
                }
                
                if (response.data.configuration) {
                    console.log(`   🎨 Heatmap configured with radius: ${response.data.configuration.heatmapOptions?.radius}`);
                    console.log(`   🎯 Max intensity: ${response.data.configuration.heatmapOptions?.maxIntensity}`);
                }
                
            } else {
                this.results.function4.status = 'failed';
                this.results.function4.error = `HTTP ${response.status}`;
                console.log(`❌ Heatmap Data Generator: FAILED (${response.status})`);
            }
            
        } catch (error) {
            this.results.function4.status = 'error';
            this.results.function4.error = error.message;
            console.log(`❌ Heatmap Data Generator: ERROR - ${error.message}`);
        }
        
        console.log('');
    }

    async testFunction5() {
        console.log('🗺️ Testing Function 5: Google Maps Integration');
        console.log('=============================================');
        
        try {
            const testData = {
                center: { lat: 39.8283, lng: -98.5795 }, // Center USA
                zoom: 6,
                timeRange: '24h',
                disasterTypes: ['earthquake', 'flood', 'hurricane'],
                showHeatmap: true,
                showMarkers: true,
                showRegions: true,
                includeUnconfirmed: false,
                minConfidence: 60
            };
            
            const response = await this.makeRequest('/dev/maps/google-visualization', 'POST', testData);
            
            if (response.status === 200) {
                this.results.function5.status = 'success';
                this.results.function5.data = response.data;
                
                console.log('✅ Google Maps Integration: SUCCESS');
                
                if (response.data.mapConfiguration) {
                    console.log(`   🗺️  Map ID: ${response.data.mapConfiguration.mapId}`);
                    console.log(`   🔥 Heatmap points: ${response.data.disasterData?.heatmapPoints?.length || 0}`);
                    console.log(`   📍 Markers: ${response.data.disasterData?.markers?.length || 0}`);
                    console.log(`   🌍 Regions: ${response.data.disasterData?.regions?.length || 0}`);
                }
                
                if (response.data.mcpIntegration) {
                    console.log(`   🔗 MCP Server: ${response.data.mcpIntegration.serverEndpoint}`);
                    console.log(`   ⚡ Capabilities: ${response.data.mcpIntegration.capabilities?.join(', ')}`);
                    console.log(`   📡 WebSocket: ${response.data.mcpIntegration.websocketEndpoint}`);
                }
                
                if (response.data.visualization) {
                    console.log(`   🎨 Layers configured: ${Object.keys(response.data.visualization.layers).length}`);
                    console.log(`   🎛️  Controls enabled: ${response.data.visualization.controls ? 'Yes' : 'No'}`);
                }
                
                console.log(`   📊 Total disasters: ${response.data.metadata?.totalDisasters || 0}`);
                console.log(`   🕒 Generated: ${response.data.metadata?.generated}`);
                
            } else {
                this.results.function5.status = 'failed';
                this.results.function5.error = `HTTP ${response.status}`;
                console.log(`❌ Google Maps Integration: FAILED (${response.status})`);
            }
            
        } catch (error) {
            this.results.function5.status = 'error';
            this.results.function5.error = error.message;
            console.log(`❌ Google Maps Integration: ERROR - ${error.message}`);
        }
        
        console.log('');
    }

    generateReport() {
        console.log('📋 SmartEAS 5-Function Test Report');
        console.log('=====================================\n');
        
        let successCount = 0;
        let totalCount = 0;
        
        for (const [key, result] of Object.entries(this.results)) {
            totalCount++;
            const status = result.status === 'success' ? '✅' : 
                          result.status === 'failed' ? '❌' : 
                          result.status === 'error' ? '💥' : '⏳';
            
            console.log(`${status} ${result.name}: ${result.status.toUpperCase()}`);
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            
            if (result.status === 'success') {
                successCount++;
            }
        }
        
        console.log(`\n📊 Overall Results: ${successCount}/${totalCount} functions working`);
        console.log(`Success Rate: ${Math.round((successCount / totalCount) * 100)}%\n`);
        
        if (successCount === totalCount) {
            console.log('🎉 All functions are working perfectly!');
            console.log('🚀 Your SmartEAS disaster detection system is fully operational.');
        } else if (successCount > 0) {
            console.log('⚠️  Some functions need attention, but core functionality is working.');
        } else {
            console.log('🚨 System needs debugging - no functions are working properly.');
        }
        
        console.log('\n🔗 Next Steps:');
        console.log('1. Deploy the updated functions to AWS Lambda');
        console.log('2. Configure DynamoDB streams for Functions 2 & 3');
        console.log('3. Set up API Gateway endpoints for all functions');
        console.log('4. Configure MCP server for Google Maps integration');
        console.log('5. Test the complete end-to-end workflow');
    }

    async makeRequest(path, method = 'POST', data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: API_BASE,
                port: 443,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                const dataString = JSON.stringify(data);
                options.headers['Content-Length'] = dataString.length;
            }

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        resolve({
                            status: res.statusCode,
                            data: parsed
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            data: responseData
                        });
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the test suite
const tester = new SmartEASFunctionTester();
tester.runAllTests().catch(console.error);
