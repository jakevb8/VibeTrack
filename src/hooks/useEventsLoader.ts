/**
 * useEventsLoader
 *
 * Runs once on mount (app launch). Behaviour:
 * - If locationMode === 'manual' and lastLocation is set: use that location
 *   (user previously searched a city) and load events for it.
 * - Otherwise: request device GPS. On success, store the location and load
 *   events. On permission denial or error, fall back to lastLocation if
 *   available, otherwise fall back to SF defaults.
 *
 * Also re-fires whenever locationMode flips back to 'gps' (user taps
 * "Back to my location").
 */
import {useEffect, useRef} from 'react';
import Geolocation from 'react-native-geolocation-service';
import {Platform, PermissionsAndroid} from 'react-native';
import {useVibeStore} from '../store/useVibeStore';

// San Francisco fallback
const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

async function requestAndroidPermission(): Promise<boolean> {
  const permission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  if (!permission) {
    return false;
  }
  const granted = await PermissionsAndroid.request(permission, {
    title: 'Location Permission',
    message: 'VibeTrack needs your location to show events near you.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function useEventsLoader(): void {
  const locationMode = useVibeStore(s => s.locationMode);
  const lastLocation = useVibeStore(s => s.lastLocation);
  const setLocation = useVibeStore(s => s.setLocation);
  const fetchEvents = useVibeStore(s => s.fetchEvents);

  // Track whether we've already done the initial load for the current mode
  const hasLoaded = useRef(false);

  useEffect(() => {
    // When locationMode flips back to gps, allow a fresh load
    if (locationMode === 'gps') {
      hasLoaded.current = false;
    }
  }, [locationMode]);

  useEffect(() => {
    if (hasLoaded.current) {
      return;
    }
    hasLoaded.current = true;

    if (locationMode === 'manual' && lastLocation) {
      // User has pinned a location — use it directly
      fetchEvents(lastLocation.lat, lastLocation.lng).catch(() => {
        /* error handled in store */
      });
      return;
    }

    // GPS path
    const loadFromGps = async () => {
      if (Platform.OS === 'android') {
        const granted = await requestAndroidPermission();
        if (!granted) {
          // Fallback: use last known location or SF
          const lat = lastLocation?.lat ?? SF_LAT;
          const lng = lastLocation?.lng ?? SF_LNG;
          fetchEvents(lat, lng).catch(() => {});
          return;
        }
      }

      Geolocation.getCurrentPosition(
        position => {
          const {latitude, longitude} = position.coords;
          setLocation(latitude, longitude);
          fetchEvents(latitude, longitude).catch(() => {});
        },
        _error => {
          // Permission denied or timeout — use last known or SF
          const lat = lastLocation?.lat ?? SF_LAT;
          const lng = lastLocation?.lng ?? SF_LNG;
          fetchEvents(lat, lng).catch(() => {});
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    };

    loadFromGps().catch(() => {});
  }, [locationMode, lastLocation, setLocation, fetchEvents]);
}
