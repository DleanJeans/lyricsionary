import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import EditorScreen from '../screens/EditorScreen';
import WebScreen from '../screens/WebScreen';
import LearnScreen from '../screens/LearnScreen';
import LyricsScreen from '../screens/LyricsScreen';
import WordsScreen from '../screens/WordsScreen';
import CustomTabBar from './CustomTabBar';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Editor" component={EditorScreen} />
      <Tab.Screen name="Web" component={WebScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="Lyrics" component={LyricsScreen} />
      <Tab.Screen name="Words" component={WordsScreen} />
    </Tab.Navigator>
  );
}
