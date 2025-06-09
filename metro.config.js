// metro.config.js
// ELIMINADA: const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const {getDefaultConfig} = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Opciones adicionales de configuración de Metro para Expo pueden ir aquí si las necesitas.
  // Por ejemplo:
  // resolver: {
  //   sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'mjs', 'cjs'], // Si alguna dependencia los usa
  // },
});

// ELIMINADA: module.exports = getSentryExpoConfig(__dirname, config);
// AHORA EXPORTA DIRECTAMENTE LA CONFIGURACIÓN DE EXPO:
module.exports = config;
