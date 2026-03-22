import {renderHook, act} from '@testing-library/react-native';
import {
  useVibeStore,
  selectFilteredEvents,
  selectCurrentCard,
  selectSavedEventObjects,
} from '../store/useVibeStore';
import mockEvents from '../data/mockEvents';

// Reset store state between tests
beforeEach(() => {
  const store = useVibeStore.getState();
  store.setFilters([]);
  useVibeStore.setState({savedEvents: [], currentIndex: 0});
});

describe('useVibeStore — events slice', () => {
  it('initializes with all mock events', () => {
    const {result} = renderHook(() => useVibeStore());
    expect(result.current.events).toHaveLength(mockEvents.length);
  });

  it('starts at index 0', () => {
    const {result} = renderHook(() => useVibeStore());
    expect(result.current.currentIndex).toBe(0);
  });

  it('advanceCard increments currentIndex', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => result.current.advanceCard());
    expect(result.current.currentIndex).toBe(1);
  });

  it('advanceCard does not exceed events.length - 1', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => {
      for (let i = 0; i < mockEvents.length + 5; i++) {
        result.current.advanceCard();
      }
    });
    expect(result.current.currentIndex).toBe(mockEvents.length - 1);
  });

  it('resetDeck sets currentIndex back to 0', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => result.current.advanceCard());
    act(() => result.current.advanceCard());
    act(() => result.current.resetDeck());
    expect(result.current.currentIndex).toBe(0);
  });
});

describe('useVibeStore — user slice', () => {
  it('saveEvent adds an id to savedEvents', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => result.current.saveEvent('evt-001'));
    expect(result.current.savedEvents).toContain('evt-001');
  });

  it('saveEvent does not add duplicates', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => {
      result.current.saveEvent('evt-001');
      result.current.saveEvent('evt-001');
    });
    expect(
      result.current.savedEvents.filter(id => id === 'evt-001'),
    ).toHaveLength(1);
  });

  it('unsaveEvent removes an id from savedEvents', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => result.current.saveEvent('evt-002'));
    act(() => result.current.unsaveEvent('evt-002'));
    expect(result.current.savedEvents).not.toContain('evt-002');
  });

  it('setLocation stores lat/lng', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => result.current.setLocation(37.77, -122.42));
    expect(result.current.lastLocation).toEqual({lat: 37.77, lng: -122.42});
  });

  it('toggleFilter adds a vibe when not present', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => result.current.toggleFilter('Hype'));
    expect(result.current.filters).toContain('Hype');
  });

  it('toggleFilter removes a vibe when already present', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => result.current.toggleFilter('Hype'));
    act(() => result.current.toggleFilter('Hype'));
    expect(result.current.filters).not.toContain('Hype');
  });

  it('setFilters replaces the whole filter list', () => {
    const {result} = renderHook(() => useVibeStore());
    act(() => result.current.setFilters(['Chill', 'Creative']));
    expect(result.current.filters).toEqual(['Chill', 'Creative']);
  });
});

describe('store selectors', () => {
  it('selectFilteredEvents returns all events when no filters active', () => {
    useVibeStore.setState({filters: []});
    const state = useVibeStore.getState();
    expect(selectFilteredEvents(state)).toHaveLength(mockEvents.length);
  });

  it('selectFilteredEvents respects active filters', () => {
    useVibeStore.setState({filters: ['Hype']});
    const state = useVibeStore.getState();
    const filtered = selectFilteredEvents(state);
    expect(filtered.every(e => e.vibe === 'Hype')).toBe(true);
  });

  it('selectCurrentCard returns undefined when deck is exhausted', () => {
    useVibeStore.setState({currentIndex: mockEvents.length});
    const state = useVibeStore.getState();
    expect(selectCurrentCard(state)).toBeUndefined();
  });

  it('selectSavedEventObjects returns matching event objects', () => {
    useVibeStore.setState({savedEvents: ['evt-001', 'evt-003']});
    const state = useVibeStore.getState();
    const saved = selectSavedEventObjects(state);
    expect(saved.map(e => e.id)).toEqual(
      expect.arrayContaining(['evt-001', 'evt-003']),
    );
    expect(saved).toHaveLength(2);
  });
});
