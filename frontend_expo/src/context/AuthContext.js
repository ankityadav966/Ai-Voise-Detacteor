import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { DatabaseHelper } from '../services/storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Auth state from AsyncStorage cache
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const cachedUser = await DatabaseHelper.getUserData();
        const token = await DatabaseHelper.getAccessToken();

        if (cachedUser && token) {
          setUser(cachedUser);
          setIsAuthenticated(true);
          
          // Perform background verification
          apiClient.get('/api/auth/profile')
            .then(async (res) => {
              if (res.data && res.data.success === true) {
                setUser(res.data.user);
                await DatabaseHelper.saveUserData(res.data.user);
              }
            })
            .catch(() => {
              // Token expired or server offline - keep cached session for offline resilience
            });
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  /**
   * Log In
   */
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      if (response.data && response.data.success === true) {
        const { user: userData, tokens } = response.data;
        
        await DatabaseHelper.saveTokens(tokens.accessToken, tokens.refreshToken);
        await DatabaseHelper.saveUserData(userData);
        
        setUser(userData);
        setIsAuthenticated(true);
        return null; // Return null on success
      }
      return response.data?.message || 'Login failed';
    } catch (e) {
      return e.response?.data?.message || e.message;
    }
  };

  /**
   * Sign Up
   */
  const signup = async (email, password, name) => {
    try {
      const response = await apiClient.post('/api/auth/register', { email, password, name });
      if (response.data && response.data.success === true) {
        const { user: userData, tokens } = response.data;

        await DatabaseHelper.saveTokens(tokens.accessToken, tokens.refreshToken);
        await DatabaseHelper.saveUserData(userData);

        setUser(userData);
        setIsAuthenticated(true);
        return null;
      }
      return response.data?.message || 'Registration failed';
    } catch (e) {
      return e.response?.data?.message || e.message;
    }
  };

  /**
   * Request Reset Code OTP (Forgot Password)
   */
  const forgotPassword = async (email) => {
    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });
      if (response.data && response.data.success === true) {
        return { success: true, otp: response.data.otp };
      }
      return { success: false, error: response.data?.message || 'Failed to send reset code' };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || e.message };
    }
  };

  /**
   * Verify Reset Code OTP and Update Password
   */
  const resetPassword = async (email, code, newPassword) => {
    try {
      const response = await apiClient.post('/api/auth/reset-password', {
        email,
        code,
        newPassword,
      });
      if (response.data && response.data.success === true) {
        return null;
      }
      return response.data?.message || 'Reset password failed';
    } catch (e) {
      return e.response?.data?.message || e.message;
    }
  };

  /**
   * Update Profile Details (Name)
   */
  const updateProfile = async ({ name }) => {
    try {
      const response = await apiClient.patch('/api/auth/profile', { name });
      if (response.data && response.data.success === true) {
        const updatedUser = { ...user, name };
        await DatabaseHelper.saveUserData(updatedUser);
        setUser(updatedUser);
        return null;
      }
      return response.data?.message || 'Failed to update profile name';
    } catch (e) {
      return e.response?.data?.message || e.message;
    }
  };

  /**
   * Log Out
   */
  const logout = async () => {
    await DatabaseHelper.clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
  };

  /**
   * Delete Account
   */
  const deleteAccount = async () => {
    try {
      const response = await apiClient.delete('/api/auth/profile');
      if (response.data && response.data.success === true) {
        await logout();
        return null;
      }
      return response.data?.message || 'Failed to delete account';
    } catch (e) {
      return e.response?.data?.message || e.message;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        signup,
        forgotPassword,
        resetPassword,
        updateProfile,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
