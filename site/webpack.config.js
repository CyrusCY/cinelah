const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: [
    './index.js'
  ],
  output: {
    filename: process.env.NODE_ENV === 'production' ?
      '../public/bundle.js' :
      'bundle.js'
  },
  devServer: {
    disableHostCheck: true,
    host: '0.0.0.0',
    historyApiFallback: true,
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: process.env.NODE_ENV === 'production' ?
          ExtractTextPlugin.extract({ use: ['css-loader', 'sass-loader'] }) :
          ['style-loader', 'css-loader', 'sass-loader']
      }
    ],
  },
  plugins: [
    new ExtractTextPlugin('../public/style.css'),
    new CopyWebpackPlugin([
      { from: 'index.html', to: '../public/index.html' },
    ])
  ]
};
