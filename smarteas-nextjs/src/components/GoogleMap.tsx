'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Alert } from '@mui/material';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  heatmapData?: Array<{
    lat: number;
    lng: number;
    intensity: number;
    type: string;
  }>;
  routes?: Array<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    waypoints?: Array<{ lat: number; lng: number }>;
  }>;
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  center = { lat: 39.8283, lng: -98.5795 }, // Center of USA
  zoom = 4,
  height = '520px',
  heatmapData = [],
  routes = []
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not found');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Load Google Maps API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      setError('Failed to load Google Maps API');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  // Initialize map when API is loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    try {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry.fill',
            stylers: [{ color: '#f5f5f5' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#c9c9c9' }]
          }
        ]
      });

      setMap(mapInstance);
    } catch (err) {
      setError('Failed to initialize Google Maps');
      console.error('Google Maps initialization error:', err);
    }
  }, [isLoaded, center, zoom]);

  // Add heatmap overlay
  useEffect(() => {
    if (!map || !isLoaded || heatmapData.length === 0) return;

    try {
      // Create heatmap data points
      const heatmapPoints = heatmapData.map(point => ({
        location: new google.maps.LatLng(point.lat, point.lng),
        weight: point.intensity * 100
      }));

      // Create heatmap layer
      const heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapPoints,
        map: map,
        radius: 50,
        opacity: 0.7,
        gradient: [
          'rgba(0, 255, 0, 0)',
          'rgba(255, 255, 0, 1)',
          'rgba(255, 165, 0, 1)',
          'rgba(255, 0, 0, 1)'
        ]
      });

      // Add markers for high-intensity points
      heatmapData
        .filter(point => point.intensity > 0.6)
        .forEach(point => {
          const marker = new google.maps.Marker({
            position: { lat: point.lat, lng: point.lng },
            map: map,
            title: `${point.type} - Intensity: ${(point.intensity * 100).toFixed(0)}%`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: point.intensity > 0.8 ? '#d32f2f' : '#f57c00',
              fillOpacity: 0.8,
              strokeWeight: 2,
              strokeColor: '#ffffff'
            }
          });

          // Add info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <strong>${point.type}</strong><br/>
                Intensity: ${(point.intensity * 100).toFixed(0)}%<br/>
                Location: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        });

      return () => {
        heatmap.setMap(null);
      };
    } catch (err) {
      console.error('Error creating heatmap:', err);
    }
  }, [map, heatmapData, isLoaded]);

  // Add route overlays
  useEffect(() => {
    if (!map || !isLoaded || routes.length === 0) return;

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderers: google.maps.DirectionsRenderer[] = [];

    routes.forEach((route, index) => {
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: index === 0 ? '#4CAF50' : '#FF9800',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      directionsService.route({
        origin: route.origin,
        destination: route.destination,
        waypoints: route.waypoints?.map(wp => ({ location: wp, stopover: false })) || [],
        travelMode: google.maps.TravelMode.DRIVING,
        avoidHighways: true, // Prefer safer routes
        avoidTolls: false
      }, (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
        }
      });

      directionsRenderers.push(directionsRenderer);
    });

    return () => {
      directionsRenderers.forEach(renderer => renderer.setMap(null));
    };
  }, [map, routes, isLoaded]);

  if (error) {
    return (
      <Alert severity="error" sx={{ height }}>
        {error}
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <Box sx={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        border: '2px dashed #ccc',
        borderRadius: 1
      }}>
        Loading Google Maps...
      </Box>
    );
  }

  return (
    <Box sx={{ height, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
};

export default GoogleMap;
