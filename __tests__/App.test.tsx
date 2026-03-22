/**
 * @format
 * Integration smoke test: renders the full navigator tree and verifies
 * the Discover screen (default tab) appears without crashing.
 *
 * This catches runtime JS errors in navigation setup such as:
 * - Missing/undefined exports from react-native-screens
 * - Incompatible @react-navigation version mismatches
 * - Broken screen component imports
 */
import React from 'react';
import {render} from '@testing-library/react-native';
import App from '../App';

describe('App / Navigator', () => {
  it('renders without crashing', () => {
    const {toJSON} = render(<App />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the Discover tab screen by default', () => {
    const {getByTestId} = render(<App />);
    expect(getByTestId('discover-screen')).toBeTruthy();
  });
});
