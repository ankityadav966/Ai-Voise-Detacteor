import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';

import App from './App.jsx';
import { store } from './redux/store';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReduxProvider store={store}>
      <SettingsProvider>
        <AuthProvider>
          <PlayerProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </PlayerProvider>
        </AuthProvider>
      </SettingsProvider>
    </ReduxProvider>
  </React.StrictMode>
);
