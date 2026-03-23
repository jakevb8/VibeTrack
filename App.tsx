/**
 * VibeTrack — Gesture-driven event discovery app
 */
import './src/global.css';
import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
