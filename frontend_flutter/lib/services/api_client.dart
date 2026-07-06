import 'package:dio/dio.dart';
import '../core/database/database_helper.dart';

class ApiClient {
  late final Dio dio;

  ApiClient() {
    dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        contentType: Headers.jsonContentType,
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          // Dynamically fetch base URL from Hive settings cache
          final settings = DatabaseHelper.getSettings();
          options.baseUrl = settings.apiUrl;

          // Append access token if cached
          final token = DatabaseHelper.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Handle access token expiration and refresh automatically
          if (error.response?.statusCode == 401 && 
              error.response?.data?['code'] == 'TOKEN_EXPIRED') {
            
            final success = await _rotateTokens();
            if (success) {
              // Retry original request with new access token
              final requestOptions = error.requestOptions;
              final newToken = DatabaseHelper.getAccessToken();
              requestOptions.headers['Authorization'] = 'Bearer $newToken';
              
              // Set dynamically updated base url
              final settings = DatabaseHelper.getSettings();
              requestOptions.baseUrl = settings.apiUrl;

              try {
                final response = await dio.fetch(requestOptions);
                return handler.resolve(response);
              } on DioException catch (retryErr) {
                return handler.next(retryErr);
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  /// Lock client, query backend to refresh JWT access keys, and save.
  Future<bool> _rotateTokens() async {
    final refreshKey = DatabaseHelper.getRefreshToken();
    if (refreshKey == null) return false;

    final settings = DatabaseHelper.getSettings();
    final url = '${settings.apiUrl}/api/auth/refresh-token';

    try {
      // Use clean Dio instance to bypass interceptors loop
      final rotateClient = Dio();
      final response = await rotateClient.post(
        url,
        data: {'refreshToken': refreshKey},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final accessToken = response.data['tokens']['accessToken'] as String;
        final newRefresh = response.data['tokens']['refreshToken'] as String;

        await DatabaseHelper.saveTokens(accessToken, newRefresh);
        return true;
      }
    } catch (e) {
      // Refresh token is expired or revoked. Wipe local tokens to force login redirection.
      await DatabaseHelper.clearAuthData();
    }
    return false;
  }
}
