import axios from 'axios';
import { DatabaseHelper } from './storage';

const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach dynamic Base URL and Access Token
apiClient.interceptors.request.use(
  async (config) => {
    const settings = await DatabaseHelper.getSettings();
    config.baseURL = settings.apiUrl;

    const token = await DatabaseHelper.getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Auto token rotation on expired accessToken
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and not a retry attempt
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data &&
      error.response.data.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const success = await rotateTokens();
        if (success) {
          const newToken = await DatabaseHelper.getAccessToken();
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          
          const settings = await DatabaseHelper.getSettings();
          originalRequest.baseURL = settings.apiUrl;

          return apiClient(originalRequest);
        }
      } catch (retryErr) {
        return Promise.reject(retryErr);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Perform token rotation via refresh endpoint
 */
async function rotateTokens() {
  const refreshToken = await DatabaseHelper.getRefreshToken();
  if (!refreshToken) return false;

  const settings = await DatabaseHelper.getSettings();
  const url = `${settings.apiUrl}/api/auth/refresh-token`;

  try {
    const response = await axios.post(url, { refreshToken });
    if (response.status === 200 && response.data.success === true) {
      const accessToken = response.data.tokens.accessToken;
      const newRefresh = response.data.tokens.refreshToken;

      await DatabaseHelper.saveTokens(accessToken, newRefresh);
      return true;
    }
  } catch (e) {
    console.error('[apiClient] Refresh token rotation failed', e);
    await DatabaseHelper.clearAuthData();
  }
  return false;
}

export default apiClient;
