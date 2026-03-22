import React, {useCallback} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import {PanGestureHandler} from 'react-native-gesture-handler';
import type {VibeEvent} from '../types';
import {VIBE_COLORS} from '../utils/vibeUtils';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const ROTATION_FACTOR = 15; // degrees at max swipe

interface SwipeCardProps {
  event: VibeEvent;
  onSwipeLeft: (eventId: string) => void;
  onSwipeRight: (eventId: string) => void;
  onPress: (eventId: string) => void;
  isTop: boolean;
}

export default function SwipeCard({
  event,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  isTop,
}: SwipeCardProps): React.JSX.Element {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const triggerLeft = useCallback(
    () => onSwipeLeft(event.id),
    [event.id, onSwipeLeft],
  );
  const triggerRight = useCallback(
    () => onSwipeRight(event.id),
    [event.id, onSwipeRight],
  );
  const triggerPress = useCallback(
    () => onPress(event.id),
    [event.id, onPress],
  );

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_evt, ctx: {startX: number; startY: number}) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (evt, ctx) => {
      translateX.value = ctx.startX + evt.translationX;
      translateY.value = ctx.startY + evt.translationY * 0.3;
    },
    onEnd: () => {
      if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, {duration: 250});
        runOnJS(triggerLeft)();
      } else if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, {duration: 250});
        runOnJS(triggerRight)();
      } else {
        translateX.value = withSpring(0, {damping: 15});
        translateY.value = withSpring(0, {damping: 15});
      }
    },
  });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-ROTATION_FACTOR, 0, ROTATION_FACTOR],
      Extrapolate.CLAMP,
    );
    return {
      transform: [
        {translateX: translateX.value},
        {translateY: translateY.value},
        {rotate: `${rotate}deg`},
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    ),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
  }));

  const vibeColor = VIBE_COLORS[event.vibe];

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} enabled={isTop}>
      <Animated.View
        testID="swipe-card"
        style={[styles.card, animatedCardStyle]}
        // Treat tap if swipe was minimal (handled via onPress prop below)
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${event.title}. Swipe right to save, left to skip.`}>
        {/* Vibe colour accent bar */}
        <View style={[styles.vibeBar, {backgroundColor: vibeColor}]} />

        <Image
          source={{uri: event.imageUrl}}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Swipe indicators */}
        <Animated.View style={[styles.badge, styles.likeBadge, likeOpacity]}>
          <Text style={styles.badgeText}>SAVE</Text>
        </Animated.View>
        <Animated.View style={[styles.badge, styles.passBadge, passOpacity]}>
          <Text style={styles.badgeText}>SKIP</Text>
        </Animated.View>

        {/* Info overlay */}
        <View style={styles.infoContainer}>
          <View style={[styles.vibePill, {backgroundColor: vibeColor}]}>
            <Text style={styles.vibeText}>{event.vibe.toUpperCase()}</Text>
          </View>
          <Text
            style={styles.title}
            onPress={triggerPress}
            accessibilityRole="button">
            {event.title}
          </Text>
          <Text style={styles.organizer}>{event.organizer}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {event.location.address}
          </Text>
          <Text style={styles.attendees}>{event.attendeeCount} going</Text>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  vibeBar: {
    height: 5,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '60%',
  },
  badge: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeBadge: {
    right: 20,
    borderColor: '#4ADE80',
  },
  passBadge: {
    left: 20,
    borderColor: '#F87171',
  },
  badgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  vibePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  vibeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  organizer: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 4,
  },
  address: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  attendees: {
    color: '#6B7280',
    fontSize: 13,
  },
});
