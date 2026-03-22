import type {VibeEvent} from '../types';

const mockEvents: VibeEvent[] = [
  {
    id: 'evt-001',
    title: 'Rooftop Rave at Sunset',
    organizer: 'Bass Collective',
    description:
      'An underground rooftop experience with pounding bass, immersive lights, and sunset views over the city skyline.',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: '420 Mission St, San Francisco, CA',
    },
    vibe: 'Hype',
    imageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    startTime: '2026-03-28T22:00:00Z',
    attendeeCount: 312,
  },
  {
    id: 'evt-002',
    title: 'Golden Gate Morning Yoga',
    organizer: 'Bay Wellness',
    description:
      'Start your weekend right with a guided flow session on the lawn overlooking the bridge. All levels welcome.',
    location: {
      latitude: 37.8199,
      longitude: -122.4783,
      address: 'Golden Gate Park, San Francisco, CA',
    },
    vibe: 'Chill',
    imageUrl:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    startTime: '2026-03-29T09:00:00Z',
    attendeeCount: 45,
  },
  {
    id: 'evt-003',
    title: 'Mission District Mural Crawl',
    organizer: 'SF Arts Collective',
    description:
      'A self-paced guided tour through the vibrant street art and murals of the Mission neighborhood.',
    location: {
      latitude: 37.7599,
      longitude: -122.4148,
      address: '24th & Valencia, San Francisco, CA',
    },
    vibe: 'Creative',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
    startTime: '2026-03-29T14:00:00Z',
    attendeeCount: 88,
  },
  {
    id: 'evt-004',
    title: 'Tech Founders Happy Hour',
    organizer: 'SF Startup Scene',
    description:
      'Network with founders, engineers, and investors over craft cocktails in the heart of SoMa.',
    location: {
      latitude: 37.7786,
      longitude: -122.3893,
      address: '945 Market St, San Francisco, CA',
    },
    vibe: 'Social',
    imageUrl: 'https://images.unsplash.com/photo-1543269664-56d93c1b41a6?w=800',
    startTime: '2026-03-28T18:00:00Z',
    attendeeCount: 150,
  },
  {
    id: 'evt-005',
    title: 'Electronic Music Festival',
    organizer: 'Noise Factory',
    description:
      'Three stages, twelve DJs, and an immersive sound experience that runs until dawn.',
    location: {
      latitude: 37.7694,
      longitude: -122.4862,
      address: 'Ocean Beach, San Francisco, CA',
    },
    vibe: 'Hype',
    imageUrl:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    startTime: '2026-03-29T20:00:00Z',
    attendeeCount: 1200,
  },
  {
    id: 'evt-006',
    title: 'Jazz in Dolores Park',
    organizer: 'Dolores Sounds',
    description:
      'A relaxed Sunday afternoon of live jazz from local artists. Bring a blanket and a picnic.',
    location: {
      latitude: 37.759,
      longitude: -122.4267,
      address: 'Dolores Park, San Francisco, CA',
    },
    vibe: 'Chill',
    imageUrl:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    startTime: '2026-03-30T13:00:00Z',
    attendeeCount: 200,
  },
  {
    id: 'evt-007',
    title: 'Ceramics Workshop for Beginners',
    organizer: 'Clay & Fire Studio',
    description:
      'Learn to throw pots on a wheel in this beginner-friendly two-hour workshop. All materials included.',
    location: {
      latitude: 37.7833,
      longitude: -122.409,
      address: '1275 Sansome St, San Francisco, CA',
    },
    vibe: 'Creative',
    imageUrl:
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
    startTime: '2026-03-30T10:00:00Z',
    attendeeCount: 12,
  },
  {
    id: 'evt-008',
    title: 'Board Game Night',
    organizer: 'The Ludic Society',
    description:
      'Drop in for a casual evening of board games, card games, and good company. Beginners encouraged!',
    location: {
      latitude: 37.7955,
      longitude: -122.4028,
      address: '560 Pacific Ave, San Francisco, CA',
    },
    vibe: 'Social',
    imageUrl:
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800',
    startTime: '2026-03-28T19:00:00Z',
    attendeeCount: 35,
  },
];

export default mockEvents;
