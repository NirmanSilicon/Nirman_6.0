const { withProjectBuildGradle } = require('expo/config-plugins');
module.exports = config => withProjectBuildGradle(config, config => {
  const marker = '// UQUAL local Android toolchain';
  if (!config.modResults.contents.includes(marker)) {
    config.modResults.contents = config.modResults.contents.replace(
      'apply plugin: "expo-root-project"',
      `${marker}\next.ndkVersion = "28.2.13676358"\napply plugin: "expo-root-project"`
    );
  }
  return config;
});
