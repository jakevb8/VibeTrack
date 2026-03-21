// Mock react-native-gesture-handler for Jest
import React from 'react';
import { View } from 'react-native';
import RN from 'react-native';

export const GestureHandlerRootView = View;
export const PanGestureHandler = ({ children }: { children: React.ReactNode }) =>
  React.createElement(View, {}, children);
export const TapGestureHandler = ({ children }: { children: React.ReactNode }) =>
  React.createElement(View, {}, children);
export const LongPressGestureHandler = ({ children }: { children: React.ReactNode }) =>
  React.createElement(View, {}, children);
export const ScrollView = RN.ScrollView;
export const FlatList = RN.FlatList;
export const Switch = RN.Switch;
export const TextInput = RN.TextInput;
export const DrawerLayoutAndroid = RN.DrawerLayoutAndroid;
export const TouchableHighlight = RN.TouchableHighlight;
export const TouchableNativeFeedback = RN.TouchableNativeFeedback;
export const TouchableOpacity = RN.TouchableOpacity;
export const TouchableWithoutFeedback = RN.TouchableWithoutFeedback;
export const Directions = {};
export const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};
