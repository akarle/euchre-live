// Autogenerated by Mojolicious-Plugin-Webpack 0.13 for gloat
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';
const outDir = process.env.WEBPACK_OUT_DIR || path.resolve(__dirname, './public/asset');
const sassIncludePaths = (process.env.SASS_INCLUDE_PATHS || '').split(':');
const shareDir = process.env.WEBPACK_SHARE_DIR || './assets';
const sourceMap = process.env.WEBPACK_SOURCE_MAPS ? true : isDev ? true : false;

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HashOutput = require('webpack-plugin-hash-output');

const config = {
  mode: isDev ? 'development' : 'production',
  module: {
    rules: []
  },
  optimization: {
    minimizer: []
  },
  output: {
    filename: isDev ? '[name].development.js' : '[name].production.js',
    path: outDir
  },
  plugins: [
    new HashOutput(),
    new HtmlWebpackPlugin({
      cache: true,
      filename: './webpack.' + (process.env.WEBPACK_CUSTOM_NAME ? process.env.WEBPACK_CUSTOM_NAME : isDev ? 'development' : 'production') + '.html',
      hash: false,
      inject: 'head',
      minify: false,
      showErrors: true,
      template: shareDir + '/webpack.html',
      xhtml: false
    }),
  ]
};

if (process.env.WEBPACK_RULE_FOR_JS) {
  const TerserPlugin = require('terser-webpack-plugin');
  config.optimization.minimizer.push(new TerserPlugin({cache: true, parallel: true, sourceMap: sourceMap}));
  config.module.rules.push({
    test: /\.js$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/react'],
        plugins: [
          '@babel/plugin-proposal-class-properties'
        ]
      }
    }
  });
}

if (process.env.WEBPACK_RULE_FOR_CSS || process.env.WEBPACK_RULE_FOR_SASS) {
  var MiniCssExtractPlugin = require('mini-css-extract-plugin');
  config.plugins.push(new MiniCssExtractPlugin({
    filename: isDev ? '[name].development.css' : '[name].production.css',
  }));

  const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
  config.optimization.minimizer.push(new OptimizeCSSAssetsPlugin({}));
}

if (process.env.WEBPACK_RULE_FOR_CSS) {
  config.module.rules.push({
    test: /\.css$/,
    use: [
      MiniCssExtractPlugin.loader,
      {loader: 'css-loader', options: {sourceMap: true}}
    ]
  });
}

if (process.env.WEBPACK_RULE_FOR_SASS) {
  config.module.rules.push({
    test: /\.s(a|c)ss$/,
    use: [
      MiniCssExtractPlugin.loader,
      {loader: 'css-loader', options: {sourceMap: sourceMap}},
      {loader: 'sass-loader', options: {sassOptions: {includePaths: sassIncludePaths}, sourceMap: sourceMap}}
    ]
  });
}

if (process.env.WEBPACK_RULE_FOR_VUE) {
  const { VueLoaderPlugin } = require('vue-loader')
  config.plugins.push(new VueLoaderPlugin());
  config.module.rules.push({
    test: /\.vue$/,
    use: 'vue-loader'
  });
}

require('./assets/webpack.' + (process.env.WEBPACK_CUSTOM_NAME || 'custom') + '.js')(config);

module.exports = config;
