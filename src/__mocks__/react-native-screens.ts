// Mock react-native-screens to avoid Fabric/codegenNativeComponent errors in Jest
import {View} from 'react-native';

export const enableScreens = jest.fn();
export const Screen = View;
export const ScreenContainer = View;
export const ScreenStack = View;
export const ScreenStackHeaderConfig = View;
export const NativeScreen = View;
export const NativeScreenContainer = View;
