/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {enableScreens} from 'react-native-screens';
import App from './App';
import {name as appName} from './app.json';

// Must be called before NavigationContainer mounts to properly initialize
// react-native-screens in Bridgeless / New Architecture mode.
enableScreens(true);

AppRegistry.registerComponent(appName, () => App);
