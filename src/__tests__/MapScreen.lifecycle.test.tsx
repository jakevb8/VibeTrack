/**
 * Tests for MapScreen imperative camera lifecycle.
 *
 * The key invariant: the camera is NEVER driven by declarative JSX props.
 * Instead, setCamera() is called imperatively only after the map surface
 * signals it is ready (onDidFinishLoadingMap / onDidFinishRenderingMapFully).
 */
import React from 'react';
import {render, act, fireEvent} from '@testing-library/react-native';
import {mockSetCamera} from '../__mocks__/@rnmapbox/maps';
import MapScreen, {geocodeLocation} from '../screens/MapScreen';

// --- navigation mock ---
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const mockReact = require('react');
  return {
    ...actual,
    useNavigation: () => ({navigate: mockNavigate}),
    useFocusEffect: (cb: () => void) => {
      // Call the effect synchronously on mount, like a focused tab.
      mockReact.useEffect(cb, [cb]);
    },
  };
});

// --- store mock ---
jest.mock('../store/useVibeStore', () => ({
  useVibeStore: (selector: (s: object) => unknown) => {
    const state = {
      events: [],
      filters: [],
      lastLocation: null,
      locationMode: 'gps',
      setLocationManual: jest.fn(),
      resetToGps: jest.fn(),
      fetchEvents: jest.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
}));

describe('geocodeLocation (unit)', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns [lng, lat] for a valid query', async () => {
    const mockCenter: [number, number] = [-122.4194, 37.7749];
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({features: [{center: mockCenter}]}),
    } as Response);
    const result = await geocodeLocation('San Francisco', 'test-token');
    expect(result).toEqual(mockCenter);
  });

  it('returns null when features array is empty', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({features: []}),
    } as Response);
    expect(await geocodeLocation('nowhere', 'test-token')).toBeNull();
  });

  it('returns null when response is not ok', async () => {
    fetchSpy.mockResolvedValueOnce({ok: false} as Response);
    expect(await geocodeLocation('anywhere', 'test-token')).toBeNull();
  });

  it('propagates network errors', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));
    await expect(geocodeLocation('bad', 'test-token')).rejects.toThrow(
      'Network error',
    );
  });
});

describe('MapScreen — imperative camera lifecycle', () => {
  beforeEach(() => {
    mockSetCamera.mockClear();
    mockNavigate.mockClear();
  });

  it('renders the map screen without crashing', () => {
    const {getByTestId} = render(<MapScreen />);
    expect(getByTestId('map-screen')).toBeTruthy();
  });

  it('calls setCamera imperatively when onDidFinishLoadingMap fires', async () => {
    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear(); // clear any calls from useFocusEffect on mount

    const mapView = getByTestId('map-view');
    await act(async () => {
      fireEvent(mapView, 'didFinishLoadingMap');
    });

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        animationMode: 'none',
        animationDuration: 0,
      }),
    );
  });

  it('setCamera is called with centerCoordinate and zoomLevel', async () => {
    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear();

    const mapView = getByTestId('map-view');
    await act(async () => {
      fireEvent(mapView, 'didFinishLoadingMap');
    });

    const call = mockSetCamera.mock.calls[0]?.[0];
    expect(call).toHaveProperty('centerCoordinate');
    expect(call).toHaveProperty('zoomLevel');
    expect(Array.isArray(call.centerCoordinate)).toBe(true);
    expect(call.centerCoordinate).toHaveLength(2);
  });

  it('zoom in button increases zoom level via setCamera', async () => {
    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear();

    await act(async () => {
      fireEvent.press(getByTestId('map-zoom-in'));
    });

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({zoomLevel: 13}),
    );
  });

  it('zoom out button decreases zoom level via setCamera', async () => {
    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear();

    await act(async () => {
      fireEvent.press(getByTestId('map-zoom-out'));
    });

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({zoomLevel: 11}),
    );
  });

  it('zoom in clamps at maximum zoom level 20', async () => {
    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear();

    // Press zoom-in 20 times to saturate
    await act(async () => {
      for (let i = 0; i < 20; i++) {
        fireEvent.press(getByTestId('map-zoom-in'));
      }
    });

    const lastCall =
      mockSetCamera.mock.calls[mockSetCamera.mock.calls.length - 1][0];
    expect(lastCall.zoomLevel).toBe(20);
  });

  it('zoom out clamps at minimum zoom level 1', async () => {
    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear();

    // Press zoom-out 20 times to bottom out
    await act(async () => {
      for (let i = 0; i < 20; i++) {
        fireEvent.press(getByTestId('map-zoom-out'));
      }
    });

    const lastCall =
      mockSetCamera.mock.calls[mockSetCamera.mock.calls.length - 1][0];
    expect(lastCall.zoomLevel).toBe(1);
  });

  it('search bar and button are rendered', () => {
    const {getByTestId} = render(<MapScreen />);
    expect(getByTestId('map-search-bar')).toBeTruthy();
    expect(getByTestId('map-search-input')).toBeTruthy();
    expect(getByTestId('map-search-button')).toBeTruthy();
  });

  it('shows search error when location is not found', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({features: []}),
    } as Response);

    const {getByTestId, findByTestId} = render(<MapScreen />);
    fireEvent.changeText(getByTestId('map-search-input'), 'nowhere12345');
    await act(async () => {
      fireEvent.press(getByTestId('map-search-button'));
    });

    const errorBanner = await findByTestId('map-search-error');
    expect(errorBanner).toBeTruthy();
  });

  it('calls setCamera when onDidFinishRenderingMapFully fires for the first time', async () => {
    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear();

    const mapView = getByTestId('map-view');
    await act(async () => {
      fireEvent(mapView, 'didFinishRenderingMapFully');
    });

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        animationMode: 'none',
        animationDuration: 0,
      }),
    );
  });

  it('does not call setCamera again on subsequent onDidFinishRenderingMapFully frames (one-shot)', async () => {
    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear();

    const mapView = getByTestId('map-view');
    await act(async () => {
      fireEvent(mapView, 'didFinishRenderingMapFully');
      fireEvent(mapView, 'didFinishRenderingMapFully');
      fireEvent(mapView, 'didFinishRenderingMapFully');
    });

    // Should only have been called once despite three render-complete events
    expect(mockSetCamera).toHaveBeenCalledTimes(1);
  });

  it('calls setCamera with flyTo animation after a successful search', async () => {
    const coords: [number, number] = [-118.2437, 34.0522];
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({features: [{center: coords}]}),
    } as Response);

    const {getByTestId} = render(<MapScreen />);
    mockSetCamera.mockClear();

    fireEvent.changeText(getByTestId('map-search-input'), 'Los Angeles');
    await act(async () => {
      fireEvent.press(getByTestId('map-search-button'));
    });

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        centerCoordinate: coords,
        animationMode: 'flyTo',
      }),
    );
  });
});
