const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin that registers the NotificationListenerService
 * required by react-native-android-notification-listener.
 */
const withNotificationListener = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    if (!application.service) {
      application.service = [];
    }

    const serviceName = 'com.kevinresol.react_native_notification_listener.NotificationListener';
    const alreadyAdded = application.service.some(
      (s) => s.$['android:name'] === serviceName
    );

    if (!alreadyAdded) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:label': '@string/app_name',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withNotificationListener;
