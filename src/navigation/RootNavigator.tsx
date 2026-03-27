import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Map, Compass, BookmarkCheck} from 'lucide-react-native';
import type {RootStackParamList, MainTabParamList} from '../types';
import DiscoverScreen from '../screens/DiscoverScreen';
import MapScreen from '../screens/MapScreen';
import SavedScreen from '../screens/SavedScreen';
import EventDetailScreen from '../screens/EventDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function DiscoverIcon({color, size}: {color: string; size: number}) {
  return <Compass color={color} size={size} />;
}

function MapIcon({color, size}: {color: string; size: number}) {
  return <Map color={color} size={size} />;
}

function SavedIcon({color, size}: {color: string; size: number}) {
  return <BookmarkCheck color={color} size={size} />;
}

function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#374151',
        },
        tabBarActiveTintColor: '#A855F7',
        tabBarInactiveTintColor: '#6B7280',
      }}>
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: DiscoverIcon,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: MapIcon,
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          tabBarLabel: 'Saved',
          tabBarIcon: SavedIcon,
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{
            headerShown: true,
            title: 'Event',
            headerTintColor: '#fff',
            headerStyle: {backgroundColor: '#111827'},
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
