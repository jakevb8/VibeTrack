// Mock @rnmapbox/maps for Jest
import React from 'react';
import { View } from 'react-native';

const MapboxGL = {
  MapView: (props: Record<string, unknown>) => React.createElement(View, props),
  Camera: () => null,
  PointAnnotation: (props: Record<string, unknown>) => React.createElement(View, props),
  ShapeSource: (props: Record<string, unknown>) => React.createElement(View, props),
  HeatmapLayer: () => null,
  CircleLayer: () => null,
  setAccessToken: jest.fn(),
  StyleURL: {
    Dark: 'mapbox://styles/mapbox/dark-v11',
    Street: 'mapbox://styles/mapbox/streets-v12',
  },
  UserTrackingMode: { Follow: 'follow' },
};

export default MapboxGL;
