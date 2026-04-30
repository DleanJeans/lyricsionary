/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      build:
        'xcodebuild -workspace ios/lyricsionary.xcworkspace -scheme lyricsionary -configuration Release -sdk iphonesimulator -arch x86_64 -derivedDataPath ios/build',
      binaryPath:
        'ios/build/Build/Products/Release-iphonesimulator/lyricsionary.app',
    },
    'ios.debug': {
      type: 'ios.app',
      build:
        'xcodebuild -workspace ios/lyricsionary.xcworkspace -scheme lyricsionary -configuration Debug -sdk iphonesimulator -arch x86_64 -derivedDataPath ios/build',
      binaryPath:
        'ios/build/Build/Products/Debug-iphonesimulator/lyricsionary.app',
    },
    'android.release': {
      type: 'android.apk',
      build:
        'cd android && ./gradlew :app:assembleRelease :app:assembleAndroidTest -DtestBuildType=release && cd ..',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
    },
    'android.debug': {
      type: 'android.apk',
      build:
        'cd android && ./gradlew :app:assembleDebug :app:assembleAndroidTest -DtestBuildType=debug && cd ..',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
    },
    'android.local': {
      type: 'android.apk',
      binaryPath: './lyricsionary.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
  },
  configurations: {
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.attached': {
      device: 'attached',
      app: 'android.local',
    },
  },
};
