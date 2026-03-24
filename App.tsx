/**
 * VibeTrack — Gesture-driven event discovery app
 */
import './src/global.css';
import React from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import {useEventsLoader} from './src/hooks/useEventsLoader';

/** Thin wrapper so useEventsLoader can run inside the component tree */
function AppLoader(): React.JSX.Element {
  useEventsLoader();
  return <RootNavigator />;
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppLoader />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
