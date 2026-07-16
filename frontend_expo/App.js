import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Providers
import { store } from './src/redux/store';
import { SettingsProvider } from './src/context/SettingsContext';
import { AuthProvider } from './src/context/AuthContext';
import { PlayerProvider } from './src/context/PlayerContext';

// Screens
import RecordingScreen from './src/screens/RecordingScreen';
import TranscriptScreen from './src/screens/TranscriptScreen';

// Components
import BottomPlayerPanel from './src/components/BottomPlayerPanel';

const Stack = createNativeStackNavigator();

const AppContent = () => {
  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Recorder"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#090D1A' },
          }}
        >
          {/* Main recording module screen */}
          <Stack.Screen name="Recorder" component={RecordingScreen} />
          
          {/* Voice Analysis dashboard result screen */}
          <Stack.Screen name="Transcript" component={TranscriptScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Persistent global audio playback panel overlay dock */}
      <BottomPlayerPanel />
    </View>
  );
};

export default function App() {
  return (
    <ReduxProvider store={store}>
      <SettingsProvider>
        <AuthProvider>
          <PlayerProvider>
            <AppContent />
          </PlayerProvider>
        </AuthProvider>
      </SettingsProvider>
    </ReduxProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D1A',
  },
});
