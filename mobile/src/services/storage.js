import * as SecureStore from 'expo-secure-store';

const SETTINGS_KEY = 'peter_laka_settings';
const ACCESS_TOKEN_KEY = 'peter_laka_accessToken';
const REFRESH_TOKEN_KEY = 'peter_laka_refreshToken';
const USER_KEY = 'peter_laka_user';

export const DatabaseHelper = {
  /**
   * Save Settings
   */
  async saveSettings(settings) {
    try {
      await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  /**
   * Get Settings
   */
  async getSettings() {
    const defaults = {
      apiUrl: 'http://192.168.1.24:9990',
      themeMode: 'dark',
      speechLanguage: 'en-IN',
      useBiometricLock: false,
      passcode: '',
    };
    try {
      const data = await SecureStore.getItemAsync(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.error('Error reading settings', e);
    }
    return defaults;
  },

  /**
   * Save Auth Tokens
   */
  async saveTokens(accessToken, refreshToken) {
    try {
      if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch (e) {
      console.error('Error saving tokens', e);
    }
  },

  /**
   * Get Access Token
   */
  async getAccessToken() {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (e) {
      console.error('Error reading access token', e);
      return null;
    }
  },

  /**
   * Get Refresh Token
   */
  async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.error('Error reading refresh token', e);
      return null;
    }
  },

  /**
   * Clear Auth Data
   */
  async clearAuthData() {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (e) {
      console.error('Error clearing auth data', e);
    }
  },

  /**
   * Save User Profile Data
   */
  async saveUserData(userMap) {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userMap));
    } catch (e) {
      console.error('Error saving user data', e);
    }
  },

  /**
   * Get User Profile Data
   */
  async getUserData() {
    try {
      const data = await SecureStore.getItemAsync(USER_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading user data', e);
    }
    return null;
  },
};
