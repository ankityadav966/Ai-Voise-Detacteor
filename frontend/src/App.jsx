import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages
import SplashPage from './pages/SplashPage';
import LockPage from './pages/LockPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import OtpPage from './pages/OtpPage';
import HomePage from './pages/HomePage';
import RecordingPage from './pages/RecordingPage';
import HistoryPage from './pages/HistoryPage';
import TranscriptPage from './pages/TranscriptPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

// Route Guard
import ProtectedRoute from './routes/ProtectedRoute';

// Global Styles & Theme CSS
import './styles/global.css';

// Common Components
import BottomPlayerPanel from './components/BottomPlayerPanel';

function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<SplashPage />} />
        <Route path="/lock" element={<LockPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/otp" element={<OtpPage />} />

        {/* Protected app routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recorder"
          element={
            <ProtectedRoute>
              <RecordingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transcript/:id"
          element={
            <ProtectedRoute>
              <TranscriptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Persistent global audio playback panel dock */}
      <BottomPlayerPanel />
    </>
  );
}

export default App;
