import React, { useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import EditorScreen from '../screens/EditorScreen';
import WebScreen from '../screens/WebScreen';
import LearnScreen from '../screens/LearnScreen';
import SongsScreen from '../screens/SongsScreen';
import WordsScreen from '../screens/WordsScreen';
import WordLookupScreen from '../screens/WordLookupScreen';
import CustomTabBar from './CustomTabBar';
import DrawerContent from './DrawerContent';
import { RootTabParamList } from '../types';
import { WIDE_BREAKPOINT } from '../hooks/useLayout';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Drawer = createDrawerNavigator();

// Songs counts every song's words, which takes a moment with many songs. It's drawn out of sight soon
// after the app opens, while the review that starts it or the first screen is up, so it's ready when opened.
const PRELOAD_DELAY_MS = 800;

function PreloadSongs({ navigation, children }: { navigation: { preload: (screen: 'Songs') => void }; children: React.ReactNode }) {
  const preload = useRef(navigation.preload);
  preload.current = navigation.preload;
  useEffect(() => {
    const timer = setTimeout(() => preload.current('Songs'), PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return <>{children}</>;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      layout={({ navigation, children }) => <PreloadSongs navigation={navigation}>{children}</PreloadSongs>}
    >
      <Tab.Screen name="Editor" component={EditorScreen} />
      <Tab.Screen name="Web" component={WebScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="Songs" component={SongsScreen} />
      <Tab.Screen name="Words" component={WordsScreen} />
      <Tab.Screen
        name="WordLookup"
        component={WordLookupScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
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
        drawerPosition: 'right',
        drawerStyle: {
          width: 280,
        },
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="Tabs" component={TabNavigator} />
    </Drawer.Navigator>
  );
}
