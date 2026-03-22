import React, {useRef} from 'react';
import {View, StyleSheet} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import {MAPBOX_ACCESS_TOKEN} from '@env';
import {useVibeStore} from '../store/useVibeStore';
import {VIBE_COLORS} from '../utils/vibeUtils';
import type {VibeEvent} from '../types';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const SF_CENTER: [number, number] = [-122.4194, 37.7749];

const HEATMAP_LAYER_STYLE = {
  heatmapWeight: [
    'interpolate',
    ['linear'],
    ['get', 'attendeeCount'],
    0,
    0,
    1200,
    1,
  ],
  heatmapIntensity: 1.5,
  heatmapRadius: 30,
  heatmapOpacity: 0.8,
};

const CIRCLE_COLOR_EXPR = [
  'match',
  ['get', 'vibe'],
  'Hype',
  VIBE_COLORS.Hype,
  'Chill',
  VIBE_COLORS.Chill,
  'Social',
  VIBE_COLORS.Social,
  'Creative',
  VIBE_COLORS.Creative,
  '#fff',
];

const CIRCLE_LAYER_STYLE = {
  circleRadius: 8,
  circleColor: CIRCLE_COLOR_EXPR,
  circleStrokeWidth: 2,
  circleStrokeColor: '#fff',
  circleOpacity: 0.9,
};

function buildHeatmapFeatureCollection(events: VibeEvent[]) {
  return {
    type: 'FeatureCollection' as const,
    features: events.map(e => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [e.location.longitude, e.location.latitude],
      },
      properties: {
        id: e.id,
        vibe: e.vibe,
        attendeeCount: e.attendeeCount,
      },
    })),
  };
}

function markerStyle(vibe: keyof typeof VIBE_COLORS) {
  return [styles.marker, {backgroundColor: VIBE_COLORS[vibe]}] as const;
}

export default function MapScreen(): React.JSX.Element {
  const events = useVibeStore(s => s.events);
  const filters = useVibeStore(s => s.filters);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const filteredEvents =
    filters.length === 0
      ? events
      : events.filter(e => filters.includes(e.vibe));

  const featureCollection = buildHeatmapFeatureCollection(filteredEvents);

  return (
    <View style={styles.container} testID="map-screen">
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        compassEnabled
        attributionEnabled={false}
        logoEnabled={false}>
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={12}
          centerCoordinate={SF_CENTER}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* Heatmap layer */}
        <MapboxGL.ShapeSource id="events-source" shape={featureCollection}>
          <MapboxGL.HeatmapLayer
            id="events-heatmap"
            sourceID="events-source"
            style={HEATMAP_LAYER_STYLE}
          />
          <MapboxGL.CircleLayer
            id="events-circles"
            sourceID="events-source"
            minZoomLevel={12}
            style={CIRCLE_LAYER_STYLE}
          />
        </MapboxGL.ShapeSource>

        {/* Individual event annotations at higher zoom */}
        {filteredEvents.map(event => (
          <MapboxGL.PointAnnotation
            key={event.id}
            id={`annotation-${event.id}`}
            coordinate={[event.location.longitude, event.location.latitude]}>
            <View
              style={markerStyle(event.vibe)}
              accessibilityLabel={event.title}
            />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
