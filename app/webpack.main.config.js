const TerserPlugin = require("terser-webpack-plugin");
const Obfuscate = require("webpack-obfuscator");
module.exports = () => {
  return {
    mode:"production",
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
        }),
      ],
    },
    entry: "./app/main.js",
    module: {
      rules: require("./webpack.rules"),
    },
    plugins: [
      new Obfuscate({
        rotateUnicodeArray: true,
        deadCodeInjection: true,
      }),
    ],
  };
};
