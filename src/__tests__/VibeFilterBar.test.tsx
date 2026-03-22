import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import VibeFilterBar from '../components/VibeFilterBar';
describe('VibeFilterBar', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    mockToggle.mockClear();
  });

  it('renders all four vibe filters', () => {
    const {getByTestId} = render(
      <VibeFilterBar activeFilters={[]} onToggle={mockToggle} />,
    );
    expect(getByTestId('filter-Hype')).toBeTruthy();
    expect(getByTestId('filter-Chill')).toBeTruthy();
    expect(getByTestId('filter-Social')).toBeTruthy();
    expect(getByTestId('filter-Creative')).toBeTruthy();
  });

  it('calls onToggle with the correct vibe when a pill is pressed', () => {
    const {getByTestId} = render(
      <VibeFilterBar activeFilters={[]} onToggle={mockToggle} />,
    );
    fireEvent.press(getByTestId('filter-Hype'));
    expect(mockToggle).toHaveBeenCalledWith('Hype');
  });

  it('calls onToggle once per press', () => {
    const {getByTestId} = render(
      <VibeFilterBar activeFilters={[]} onToggle={mockToggle} />,
    );
    fireEvent.press(getByTestId('filter-Chill'));
    fireEvent.press(getByTestId('filter-Social'));
    expect(mockToggle).toHaveBeenCalledTimes(2);
  });

  it('marks the active filter correctly via accessibilityState', () => {
    const {getByTestId} = render(
      <VibeFilterBar activeFilters={['Hype']} onToggle={mockToggle} />,
    );
    const hypeBtn = getByTestId('filter-Hype');
    expect(hypeBtn.props.accessibilityState?.selected).toBe(true);
    const chillBtn = getByTestId('filter-Chill');
    expect(chillBtn.props.accessibilityState?.selected).toBe(false);
  });
});
