'use client';

import { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Typography,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  CloudDone,
  CloudOff,
  Info,
  ExpandMore,
  ExpandLess,
  Settings,
} from '@mui/icons-material';

interface DataSourceIndicatorProps {
  isUsingRealData?: boolean;
  backendStatus?: 'connected' | 'disconnected' | 'error';
  lastUpdated?: Date;
}

export default function DataSourceIndicator({
  isUsingRealData = false,
  backendStatus = 'disconnected',
  lastUpdated
}: DataSourceIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Auto-show details when there's an issue
    if (backendStatus === 'error' || backendStatus === 'disconnected') {
      setShowDetails(true);
    }
  }, [backendStatus]);

  const getStatusIcon = () => {
    switch (backendStatus) {
      case 'connected':
        return <CloudDone color="success" />;
      case 'error':
        return <CloudOff color="error" />;
      default:
        return <CloudOff color="warning" />;
    }
  };

  const getStatusColor = (): 'success' | 'warning' | 'error' => {
    if (isUsingRealData && backendStatus === 'connected') return 'success';
    if (backendStatus === 'error') return 'error';
    return 'warning';
  };

  const getMainMessage = () => {
    if (isUsingRealData && backendStatus === 'connected') {
      return '🌐 Live Data Connected';
    } else if (backendStatus === 'error') {
      return '🔥 Backend Configuration Error';
    } else {
      return '🎭 Using Enhanced Mock Data';
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity={getStatusColor()} 
        icon={getStatusIcon()}
        action={
          <Box display="flex" alignItems="center" gap={1}>
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary">
                Updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
            )}
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              aria-label="toggle details"
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>{getMainMessage()}</AlertTitle>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Chip
            label={isUsingRealData ? 'Real Data' : 'Mock Data'}
            color={isUsingRealData ? 'success' : 'default'}
            size="small"
          />
          <Chip
            label={`Backend: ${backendStatus}`}
            color={backendStatus === 'connected' ? 'success' : 'default'}
            size="small"
          />
        </Box>
      </Alert>

      <Collapse in={expanded}>
        <Alert severity="info" sx={{ mt: 1 }}>
          <AlertTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Info fontSize="small" />
              Data Source Information
            </Box>
          </AlertTitle>
          
          {isUsingRealData && backendStatus === 'connected' ? (
            <Typography variant="body2">
              ✅ Successfully connected to AWS Lambda backend<br />
              📡 Real-time data from Reddit, OpenWeather, and AWS Bedrock AI<br />
              🔄 Data refreshes every 30 seconds
            </Typography>
          ) : backendStatus === 'error' ? (
            <Typography variant="body2">
              ❌ Backend service is unavailable (500/502 errors)<br />
              🔧 <strong>To fix:</strong> Configure AWS credentials and environment variables<br />
              📋 Required: BEDROCK_MODEL_ID, OPENWEATHER_API_KEY, GOOGLE_MAPS_API_KEY<br />
              💡 Check backend logs and ensure all services are deployed correctly
            </Typography>
          ) : (
            <Typography variant="body2">
              🔄 Connecting to real data sources...<br />
              � Attempting to connect to AWS Lambda backend<br />
              🌐 Configure AWS credentials and deploy backend with environment variables
            </Typography>
          )}

          <Box mt={2} display="flex" alignItems="center" gap={1}>
            <Settings fontSize="small" />
            <Typography variant="caption" color="text.secondary">
              Environment: {process.env.NODE_ENV} | 
              API: {process.env.NEXT_PUBLIC_API_BASE_URL?.replace('https://', '').split('.')[0]}...
            </Typography>
          </Box>
        </Alert>
      </Collapse>
    </Box>
  );
}
