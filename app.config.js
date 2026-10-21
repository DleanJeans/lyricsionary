const { expo } = require('./app.json');

const isDevelopment = process.env.APP_VARIANT === 'development';

module.exports = {
  ...expo,
  name: isDevelopment ? 'Lyricsionary Dev' : expo.name,
  // Only the dev build gets expo-dev-client's exp+lyricsionary scheme (used by the Metro QR code),
  // so scanning it opens the dev build without asking which app to use
  scheme: isDevelopment ? `${expo.scheme}-dev` : expo.scheme,
  plugins: expo.plugins.map((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'expo-dev-client'
      ? [plugin[0], { ...plugin[1], addGeneratedScheme: isDevelopment }]
      : plugin,
  ),
  ios: {
    ...expo.ios,
    bundleIdentifier: isDevelopment ? `${expo.ios.bundleIdentifier}.dev` : expo.ios.bundleIdentifier,
  },
  android: {
    ...expo.android,
    package: isDevelopment ? `${expo.android.package}.dev` : expo.android.package,
  },
};
