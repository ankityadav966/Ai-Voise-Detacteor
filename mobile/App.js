import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import AppNavigator from './src/routes/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <Provider store={store}>
      <SettingsProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </AuthProvider>
      </SettingsProvider>
    </Provider>
  );
}
