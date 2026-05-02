import 'expo-dev-client';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { AppRegistry, Platform } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// Register headless task for react-native-android-notification-listener
// This runs in the background when a notification is posted and caches the last media info
if (Platform.OS === 'android') {
  const { RNAndroidNotificationListenerHeadlessJsName } = require('react-native-android-notification-listener');
  const { handleNotificationEvent } = require('./src/services/mediaNotification');
  AppRegistry.registerHeadlessTask(RNAndroidNotificationListenerHeadlessJsName, () => async (notification: any) => {
    handleNotificationEvent(notification);
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
