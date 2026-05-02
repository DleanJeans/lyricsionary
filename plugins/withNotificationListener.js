const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin that registers the NotificationListenerService
 * required by react-native-android-notification-listener, and resolves
 * the allowBackup manifest merge conflict the library introduces.
 */
const withNotificationListener = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;
    const application = manifest.application[0];

    // Add the tools namespace if not already present so we can use tools:replace
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // react-native-android-notification-listener sets allowBackup=false in its manifest.
    // Adding tools:replace tells the merger to use our app's value instead.
    if (!application.$['tools:replace']) {
      application.$['tools:replace'] = 'android:allowBackup';
    } else if (!application.$['tools:replace'].includes('android:allowBackup')) {
      application.$['tools:replace'] += ',android:allowBackup';
    }

    if (!application.service) {
      application.service = [];
    }

    const serviceName = 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener';
    const alreadyAdded = application.service.some(
      (s) => s.$['android:name'] === serviceName
    );

    if (!alreadyAdded) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:label': '@string/app_name',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'false',
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
