export type VibeType = 'Hype' | 'Chill' | 'Social' | 'Creative';

export interface VibeEvent {
  id: string;
  title: string;
  organizer: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vibe: VibeType;
  imageUrl: string;
  startTime: string;
  attendeeCount: number;
}

export interface UserState {
  savedEvents: string[];
  lastLocation: {lat: number; lng: number} | null;
  filters: VibeType[];
}

export type RootStackParamList = {
  Main: undefined;
  EventDetail: {eventId: string};
};

export type MainTabParamList = {
  Discover: undefined;
  Map: undefined;
  Saved: undefined;
};
