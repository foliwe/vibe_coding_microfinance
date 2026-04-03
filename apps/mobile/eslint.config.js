// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const path = require("path");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    settings: {
      "import/resolver": {
        typescript: {
          project: path.join(__dirname, "tsconfig.json"),
        },
      },
    },
    ignores: ["dist/*"],
  }
]);
