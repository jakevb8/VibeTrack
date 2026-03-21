import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapPin, Clock, Users, Bookmark, BookmarkCheck, Share2 } from 'lucide-react-native';
import { useVibeStore } from '../store/useVibeStore';
import { VIBE_COLORS, formatEventTime } from '../utils/vibeUtils';
import type { RootStackParamList } from '../types';

type EventDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen({ route }: EventDetailScreenProps): React.JSX.Element {
  const { eventId } = route.params;

  const events = useVibeStore(s => s.events);
  const savedEvents = useVibeStore(s => s.savedEvents);
  const saveEvent = useVibeStore(s => s.saveEvent);
  const unsaveEvent = useVibeStore(s => s.unsaveEvent);

  const event = events.find(e => e.id === eventId);
  const isSaved = savedEvents.includes(eventId);

  const handleToggleSave = useCallback(() => {
    if (isSaved) {
      unsaveEvent(eventId);
    } else {
      saveEvent(eventId);
    }
  }, [isSaved, eventId, saveEvent, unsaveEvent]);

  const handleShare = useCallback(async () => {
    if (!event) return;
    try {
      await Share.share({
        title: event.title,
        message: `Check out "${event.title}" by ${event.organizer}!\n${event.location.address}`,
      });
    } catch (_err) {
      // User cancelled or error — ignore
    }
  }, [event]);

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Event not found.</Text>
      </SafeAreaView>
    );
  }

  const vibeColor = VIBE_COLORS[event.vibe];

  return (
    <SafeAreaView style={styles.container} testID="event-detail-screen">
      <ScrollView bounces contentContainerStyle={styles.scroll}>
        {/* Hero image */}
        <Image
          source={{ uri: event.imageUrl }}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityLabel={`Image for ${event.title}`}
        />

        {/* Vibe pill */}
        <View style={styles.vibePillContainer}>
          <View style={[styles.vibePill, { backgroundColor: vibeColor }]}>
            <Text style={styles.vibeText}>{event.vibe.toUpperCase()}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.organizer}>{event.organizer}</Text>

          <View style={styles.metaRow}>
            <Clock color="#9CA3AF" size={16} />
            <Text style={styles.metaText}>{formatEventTime(event.startTime)}</Text>
          </View>
          <View style={styles.metaRow}>
            <MapPin color="#9CA3AF" size={16} />
            <Text style={styles.metaText}>{event.location.address}</Text>
          </View>
          <View style={styles.metaRow}>
            <Users color="#9CA3AF" size={16} />
            <Text style={styles.metaText}>{event.attendeeCount} attending</Text>
          </View>

          <Text style={styles.sectionHeading}>About</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.saveBtn, isSaved && { backgroundColor: vibeColor }]}
          onPress={handleToggleSave}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save event'}
          testID="save-toggle-btn">
          {isSaved ? (
            <BookmarkCheck color="#fff" size={20} />
          ) : (
            <Bookmark color="#F9FAFB" size={20} />
          )}
          <Text style={styles.saveBtnText}>{isSaved ? 'Saved' : 'Save Event'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share event"
          testID="share-btn">
          <Share2 color="#9CA3AF" size={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scroll: {
    paddingBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: 260,
  },
  vibePillContainer: {
    position: 'absolute',
    top: 220,
    left: 16,
  },
  vibePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  vibeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  organizer: {
    color: '#9CA3AF',
    fontSize: 16,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaText: {
    color: '#D1D5DB',
    fontSize: 14,
    flex: 1,
  },
  sectionHeading: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  description: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 22,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: '#111827',
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  saveBtnText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  shareBtn: {
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 12,
  },
  notFound: {
    color: '#F9FAFB',
    textAlign: 'center',
    marginTop: 80,
    fontSize: 18,
  },
});
