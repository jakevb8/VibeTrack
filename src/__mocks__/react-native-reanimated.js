// Full manual mock for react-native-reanimated
// Needed because v4 ships ESM-only source that Babel can't process without transform config.
const React = require('react');
const { View } = require('react-native');

const Animated = {
  View,
  Text: require('react-native').Text,
  Image: require('react-native').Image,
  ScrollView: require('react-native').ScrollView,
  createAnimatedComponent: (component) => component,
};

module.exports = {
  default: Animated,
  ...Animated,
  useSharedValue: (val) => ({ value: val }),
  useAnimatedStyle: (fn) => ({}),
  useAnimatedGestureHandler: (handlers) => handlers,
  useAnimatedScrollHandler: (handlers) => handlers,
  withSpring: (val) => val,
  withTiming: (val) => val,
  withDelay: (_delay, anim) => anim,
  withSequence: (...anims) => anims[anims.length - 1],
  withRepeat: (anim) => anim,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  interpolate: (_val, _input, _output) => 0,
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    bezier: () => (t) => t,
    in: (fn) => fn,
    out: (fn) => fn,
    inOut: (fn) => fn,
  },
  cancelAnimation: jest.fn(),
  makeMutable: (val) => ({ value: val }),
  useAnimatedRef: () => ({ current: null }),
  scrollTo: jest.fn(),
  measure: jest.fn(),
  FadeIn: { duration: jest.fn().mockReturnThis() },
  FadeOut: { duration: jest.fn().mockReturnThis() },
  SlideInRight: { duration: jest.fn().mockReturnThis() },
  SlideOutLeft: { duration: jest.fn().mockReturnThis() },
};
