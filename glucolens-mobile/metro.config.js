const { getDefaultConfig } = require('@metro-bundler/metro/config');

/** @type {import('@metro-bundler/metro/config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
