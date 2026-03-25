import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useShallow} from 'zustand/react/shallow';
import {useVibeStore, selectFilteredEvents} from '../store/useVibeStore';
import SwipeCard from '../components/SwipeCard';
import VibeFilterBar from '../components/VibeFilterBar';
import type {RootStackParamList, VibeType} from '../types';

type DiscoverNav = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function DiscoverScreen(): React.JSX.Element {
  const navigation = useNavigation<DiscoverNav>();

  const filteredEvents = useVibeStore(useShallow(selectFilteredEvents));
  const currentIndex = useVibeStore(s => s.currentIndex);
  const activeFilters = useVibeStore(s => s.filters);
  const advanceCard = useVibeStore(s => s.advanceCard);
  const saveEvent = useVibeStore(s => s.saveEvent);
  const toggleFilter = useVibeStore(s => s.toggleFilter);
  const isLoading = useVibeStore(s => s.isLoading);
  const eventsError = useVibeStore(s => s.eventsError);

  const handleSwipeLeft = useCallback(
    (_id: string) => {
      advanceCard();
    },
    [advanceCard],
  );

  const handleSwipeRight = useCallback(
    (id: string) => {
      saveEvent(id);
      advanceCard();
    },
    [saveEvent, advanceCard],
  );

  const handlePress = useCallback(
    (id: string) => {
      navigation.navigate('EventDetail', {eventId: id});
    },
    [navigation],
  );

  const handleToggleFilter = useCallback(
    (vibe: VibeType) => {
      toggleFilter(vibe);
    },
    [toggleFilter],
  );

  const visibleCards = filteredEvents.slice(currentIndex, currentIndex + 3);
  const isDeckEmpty = visibleCards.length === 0;

  return (
    <SafeAreaView style={styles.container} testID="discover-screen">
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      <Text style={styles.heading}>Discover</Text>

      <VibeFilterBar
        activeFilters={activeFilters}
        onToggle={handleToggleFilter}
      />

      {isLoading ? (
        <View style={styles.statusContainer} testID="discover-loading">
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.statusText}>Finding events near you…</Text>
        </View>
      ) : eventsError ? (
        <View style={styles.statusContainer} testID="discover-error">
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Couldn't load events</Text>
          <Text style={styles.statusText}>{eventsError}</Text>
        </View>
      ) : isDeckEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilters.length > 0
              ? 'Try adjusting your filters.'
              : 'No more events to discover.'}
          </Text>
        </View>
      ) : (
        <View style={styles.deckContainer}>
          {/* Render cards in reverse so top card is last (highest z-index) */}
          {[...visibleCards].reverse().map((event, reversedIdx) => {
            const stackIdx = visibleCards.length - 1 - reversedIdx;
            const isTop = stackIdx === 0;
            return (
              <View
                key={event.id}
                style={[
                  styles.cardWrapper,
                  {
                    zIndex: visibleCards.length - stackIdx,
                    transform: [
                      {scale: 1 - stackIdx * 0.04},
                      {translateY: stackIdx * 12},
                    ],
                  },
                ]}>
                <SwipeCard
                  event={event}
                  isTop={isTop}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onPress={handlePress}
                />
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          Swipe right to save • Swipe left to skip
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  heading: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  statusText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  errorIcon: {
    color: '#F87171',
    fontSize: 36,
    fontWeight: '800',
  },
  errorTitle: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    paddingBottom: 16,
    alignItems: 'center',
  },
  hintText: {
    color: '#4B5563',
    fontSize: 12,
  },
});
