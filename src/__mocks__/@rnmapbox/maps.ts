// Mock @rnmapbox/maps for Jest
import React from 'react';
import {View} from 'react-native';

// setCamera spy — exported so tests can assert on it.
export const mockSetCamera = jest.fn();

const CameraWithRef = React.forwardRef<
  {setCamera: jest.Mock},
  Record<string, unknown>
>((_props, ref) => {
  React.useImperativeHandle(ref, () => ({setCamera: mockSetCamera}), []);
  return null;
});
CameraWithRef.displayName = 'Camera';

const MapboxGL = {
  MapView: (props: Record<string, unknown>) => React.createElement(View, props),
  Camera: CameraWithRef,
  PointAnnotation: (props: Record<string, unknown>) =>
    React.createElement(View, props),
  ShapeSource: (props: Record<string, unknown>) =>
    React.createElement(View, props),
  HeatmapLayer: () => null,
  CircleLayer: () => null,
  SymbolLayer: () => null,
  setAccessToken: jest.fn(),
  StyleURL: {
    Dark: 'mapbox://styles/mapbox/dark-v11',
    Street: 'mapbox://styles/mapbox/streets-v12',
  },
  UserTrackingMode: {Follow: 'follow'},
};

export default MapboxGL;
