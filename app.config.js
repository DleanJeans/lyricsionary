const { expo } = require('./app.json');

const isDevelopment = process.env.APP_VARIANT === 'development';

module.exports = {
  ...expo,
  name: isDevelopment ? 'Lyricsionary Dev' : expo.name,
  ios: {
    ...expo.ios,
    bundleIdentifier: isDevelopment ? `${expo.ios.bundleIdentifier}.dev` : expo.ios.bundleIdentifier,
  },
  android: {
    ...expo.android,
    package: isDevelopment ? `${expo.android.package}.dev` : expo.android.package,
  },
};
