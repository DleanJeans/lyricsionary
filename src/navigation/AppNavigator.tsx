import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import EditorScreen from '../screens/EditorScreen';
import WebScreen from '../screens/WebScreen';
import LearnScreen from '../screens/LearnScreen';
import LyricsScreen from '../screens/LyricsScreen';
import WordsScreen from '../screens/WordsScreen';
import { Colors } from '../constants/theme';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Editor: { focused: 'create', default: 'create-outline' },
  Web: { focused: 'globe', default: 'globe-outline' },
  Learn: { focused: 'school', default: 'school-outline' },
  Lyrics: { focused: 'musical-notes', default: 'musical-notes-outline' },
  Words: { focused: 'book', default: 'book-outline' },
};

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.default;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Editor" component={EditorScreen} />
      <Tab.Screen name="Web" component={WebScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="Lyrics" component={LyricsScreen} />
      <Tab.Screen name="Words" component={WordsScreen} />
    </Tab.Navigator>
  );
}
