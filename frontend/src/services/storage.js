const SETTINGS_KEY = '@peter_laka:settings';
const ACCESS_TOKEN_KEY = '@peter_laka:accessToken';
const REFRESH_TOKEN_KEY = '@peter_laka:refreshToken';
const USER_KEY = '@peter_laka:user';

export const DatabaseHelper = {
  /**
   * Save Settings
   */
  saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  /**
   * Get Settings
   */
  getSettings() {
    const defaults = {
      apiUrl: 'https://roshan-backend.globalrns.com',
      themeMode: 'dark',
      speechLanguage: 'en-IN',
      useBiometricLock: false,
      passcode: '',
    };
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        let updated = false;
        if (parsed.apiUrl === 'http://localhost:5000' || parsed.apiUrl === 'http://localhost:8990') {
          parsed.apiUrl = 'https://roshan-backend.globalrns.com';
          updated = true;
        }
        if (parsed.speechLanguage === 'en-US') {
          parsed.speechLanguage = 'en-IN';
          updated = true;
        }
        if (updated) {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
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
  saveTokens(accessToken, refreshToken) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (e) {
      console.error('Error saving tokens', e);
    }
  },

  /**
   * Get Access Token
   */
  getAccessToken() {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (e) {
      console.error('Error reading access token', e);
      return null;
    }
  },

  /**
   * Get Refresh Token
   */
  getRefreshToken() {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.error('Error reading refresh token', e);
      return null;
    }
  },

  /**
   * Clear Auth Data (Wipe tokens and user details)
   */
  clearAuthData() {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Error clearing auth data', e);
    }
  },

  /**
   * Save User Profile Data
   */
  saveUserData(userMap) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(userMap));
    } catch (e) {
      console.error('Error saving user data', e);
    }
  },

  /**
   * Get User Profile Data
   */
  getUserData() {
    try {
      const data = localStorage.getItem(USER_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading user data', e);
    }
    return null;
  },
};
