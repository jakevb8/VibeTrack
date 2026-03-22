import React, {useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BookmarkX} from 'lucide-react-native';
import {useVibeStore, selectSavedEventObjects} from '../store/useVibeStore';
import type {RootStackParamList, VibeEvent} from '../types';
import {VIBE_COLORS, formatEventTime} from '../utils/vibeUtils';

type SavedNav = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface SavedEventRowProps {
  event: VibeEvent;
  onPress: (id: string) => void;
  onUnsave: (id: string) => void;
}

function SavedEventRow({
  event,
  onPress,
  onUnsave,
}: SavedEventRowProps): React.JSX.Element {
  const color = VIBE_COLORS[event.vibe];
  return (
    <TouchableOpacity
      testID={`saved-row-${event.id}`}
      style={styles.row}
      onPress={() => onPress(event.id)}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${event.title}`}>
      <View style={[styles.vibeAccent, {backgroundColor: color}]} />
      <Image source={{uri: event.imageUrl}} style={styles.thumbnail} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.rowOrganizer}>{event.organizer}</Text>
        <Text style={styles.rowTime}>{formatEventTime(event.startTime)}</Text>
      </View>
      <TouchableOpacity
        style={styles.unsaveBtn}
        onPress={() => onUnsave(event.id)}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${event.title} from saved`}>
        <BookmarkX color="#6B7280" size={22} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SavedScreen(): React.JSX.Element {
  const navigation = useNavigation<SavedNav>();
  const savedEventObjects = useVibeStore(selectSavedEventObjects);
  const unsaveEvent = useVibeStore(s => s.unsaveEvent);

  const handlePress = useCallback(
    (id: string) => navigation.navigate('EventDetail', {eventId: id}),
    [navigation],
  );

  const handleUnsave = useCallback(
    (id: string) => unsaveEvent(id),
    [unsaveEvent],
  );

  return (
    <SafeAreaView style={styles.container} testID="saved-screen">
      <Text style={styles.heading}>Saved Events</Text>
      {savedEventObjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySubtitle}>
            Swipe right on events in Discover to save them here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedEventObjects}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <SavedEventRow
              event={item}
              onPress={handlePress}
              onUnsave={handleUnsave}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
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
  list: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  vibeAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  thumbnail: {
    width: 72,
    height: 72,
  },
  rowInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowTitle: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowOrganizer: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 2,
  },
  rowTime: {
    color: '#6B7280',
    fontSize: 12,
  },
  unsaveBtn: {
    padding: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
  },
});
