import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {VibeType} from '../types';
import {ALL_VIBES, VIBE_COLORS, VIBE_ICONS} from '../utils/vibeUtils';

interface VibeFilterBarProps {
  activeFilters: VibeType[];
  onToggle: (vibe: VibeType) => void;
}

export default function VibeFilterBar({
  activeFilters,
  onToggle,
}: VibeFilterBarProps): React.JSX.Element {
  return (
    <View style={styles.container} testID="vibe-filter-bar">
      {ALL_VIBES.map(vibe => {
        const isActive = activeFilters.includes(vibe);
        const color = VIBE_COLORS[vibe];
        const Icon = VIBE_ICONS[vibe];
        return (
          <TouchableOpacity
            key={vibe}
            testID={`filter-${vibe}`}
            onPress={() => onToggle(vibe)}
            style={[
              styles.pill,
              isActive ? {backgroundColor: color} : styles.pillInactive,
            ]}
            accessibilityRole="button"
            accessibilityState={{selected: isActive}}
            accessibilityLabel={`${vibe} filter ${
              isActive ? 'active' : 'inactive'
            }`}>
            <Icon
              size={13}
              color={isActive ? '#fff' : '#9CA3AF'}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}>
              {vibe}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillInactive: {
    backgroundColor: '#374151',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
  },
  labelInactive: {
    color: '#9CA3AF',
  },
});
