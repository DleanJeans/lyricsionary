import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import EditorScreen from '../screens/EditorScreen';
import WebScreen from '../screens/WebScreen';
import LearnScreen from '../screens/LearnScreen';
import LyricsScreen from '../screens/LyricsScreen';
import WordsScreen from '../screens/WordsScreen';
import CustomTabBar from './CustomTabBar';
import DrawerContent from './DrawerContent';
import { RootTabParamList } from '../types';
import { WIDE_BREAKPOINT } from '../hooks/useLayout';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Drawer = createDrawerNavigator();

function TabNavigator() {
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

export default function AppNavigator() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  // On wide screens, use tab navigator with built-in sidebar
  // On narrow screens, wrap with drawer navigator
  if (isWide) {
    return <TabNavigator />;
  }

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen name="Tabs" component={TabNavigator} />
    </Drawer.Navigator>
  );
}
