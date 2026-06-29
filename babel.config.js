module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated v3 requires this plugin to be last
      'react-native-reanimated/plugin',
    ],
  };
};
