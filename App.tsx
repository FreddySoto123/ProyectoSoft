import React from 'react';
import { enableScreens } from 'react-native-screens';
enableScreens();

import AuthNavigator from './src/screens/navigation/AuthNavigator';

export default function App() {
  return <AuthNavigator />;
}
