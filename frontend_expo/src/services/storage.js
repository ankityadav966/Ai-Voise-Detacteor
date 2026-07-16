import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@peter_laka:settings';
const ACCESS_TOKEN_KEY = '@peter_laka:accessToken';
const REFRESH_TOKEN_KEY = '@peter_laka:refreshToken';
const USER_KEY = '@peter_laka:user';

export const DatabaseHelper = {
  /**
   * Save Settings
   */
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  /**
   * Get Settings
   */
  async getSettings() {
    const defaults = {
      apiUrl: 'http://localhost:9990',
      themeMode: 'dark',
      speechLanguage: 'en-IN',
      useBiometricLock: false,
      passcode: '',
    };
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        let updated = false;
        if (parsed.apiUrl === 'http://localhost:5000' || parsed.apiUrl === 'http://localhost:8990') {
          parsed.apiUrl = 'http://localhost:9990';
          updated = true;
        }
        if (parsed.speechLanguage === 'en-US') {
          parsed.speechLanguage = 'en-IN';
          updated = true;
        }
        if (updated) {
          await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
        }
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
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (e) {
      console.error('Error saving tokens', e);
    }
  },

  /**
   * Get Access Token
   */
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
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
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.error('Error reading refresh token', e);
      return null;
    }
  },

  /**
   * Clear Auth Data (Wipe tokens and user details)
   */
  async clearAuthData() {
    try {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Error clearing auth data', e);
    }
  },

  /**
   * Save User Profile Data
   */
  async saveUserData(userMap) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userMap));
    } catch (e) {
      console.error('Error saving user data', e);
    }
  },

  /**
   * Get User Profile Data
   */
  async getUserData() {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading user data', e);
    }
    return null;
  },
};
