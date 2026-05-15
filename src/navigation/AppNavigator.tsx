import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import EditorScreen from '../screens/EditorScreen';
import WebScreen from '../screens/WebScreen';
import LearnScreen from '../screens/LearnScreen';
import SongsScreen from '../screens/SongsScreen';
import WordsScreen from '../screens/WordsScreen';
import WordLookupScreen from '../screens/WordLookupScreen';
import CustomTabBar from './CustomTabBar';
import DrawerContent from './DrawerContent';
import { RootTabParamList, RootStackParamList } from '../types';
import { WIDE_BREAKPOINT } from '../hooks/useLayout';

// Unmounts the screen's native view tree when the tab loses focus,
// preventing invisible screens from being picked up by the element inspector.
function withUnmountOnBlur<P extends object>(Screen: React.ComponentType<P>) {
  return function UnmountedScreen(props: P) {
    const isFocused = useIsFocused();
    return isFocused ? <Screen {...props} /> : null;
  };
}

const Tab = createBottomTabNavigator<RootTabParamList>();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Editor" component={withUnmountOnBlur(EditorScreen)} />
      <Tab.Screen name="Web" component={withUnmountOnBlur(WebScreen)} />
      <Tab.Screen name="Learn" component={withUnmountOnBlur(LearnScreen)} />
      <Tab.Screen name="Songs" component={withUnmountOnBlur(SongsScreen)} />
      <Tab.Screen name="Words" component={withUnmountOnBlur(WordsScreen)} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const tabs = isWide ? (
    <TabNavigator />
  ) : (
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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs">{() => tabs}</Stack.Screen>
      <Stack.Screen
        name="WordLookup"
        component={WordLookupScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
