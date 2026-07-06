import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/database/database_helper.dart';
import '../models/user_model.dart';
import '../services/api_client.dart';

final apiClientProvider = Provider((ref) => ApiClient());

class AuthNotifier extends StateNotifier<UserModel?> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(null) {
    _loadUser();
  }

  void _loadUser() {
    final cached = DatabaseHelper.getUserData();
    if (cached != null) {
      state = UserModel.fromJson(cached);
    }
  }

  /// Register new user
  Future<String?> signup({required String email, required String password, required String name}) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.post('/api/auth/signup', data: {
        'email': email,
        'password': password,
        'name': name,
      });

      if (response.data['success'] == true) {
        final user = UserModel.fromJson(response.data['user']);
        final accessToken = response.data['tokens']['accessToken'] as String;
        final refreshToken = response.data['tokens']['refreshToken'] as String;

        await DatabaseHelper.saveTokens(accessToken, refreshToken);
        await DatabaseHelper.saveUserData(user.toJson());
        state = user;
        return null; // success
      }
    } on DioException catch (e) {
      return e.response?.data?['message'] ?? 'Registration failed. Please check network.';
    }
    return 'Something went wrong.';
  }

  /// Login user
  Future<String?> login({required String email, required String password}) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.data['success'] == true) {
        final user = UserModel.fromJson(response.data['user']);
        final accessToken = response.data['tokens']['accessToken'] as String;
        final refreshToken = response.data['tokens']['refreshToken'] as String;

        await DatabaseHelper.saveTokens(accessToken, refreshToken);
        await DatabaseHelper.saveUserData(user.toJson());
        state = user;
        return null; // success
      }
    } on DioException catch (e) {
      return e.response?.data?['message'] ?? 'Login failed. Please verify credentials.';
    }
    return 'Something went wrong.';
  }

  /// Request Forgot Password OTP
  Future<String?> forgotPassword(String email) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.post('/api/auth/forgot-password', data: {'email': email});
      if (response.data['success'] == true) {
        return null;
      }
    } on DioException catch (e) {
      return e.response?.data?['message'] ?? 'Request failed.';
    }
    return 'Something went wrong.';
  }

  /// Verify OTP code
  Future<String?> verifyOtp(String email, String code) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.post('/api/auth/verify-otp', data: {'email': email, 'code': code});
      if (response.data['success'] == true) {
        return null;
      }
    } on DioException catch (e) {
      return e.response?.data?['message'] ?? 'Invalid verification code.';
    }
    return 'Something went wrong.';
  }

  /// Reset Password with OTP
  Future<String?> resetPassword(String email, String code, String newPassword) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.post('/api/auth/reset-password', data: {
        'email': email,
        'code': code,
        'newPassword': newPassword,
      });
      if (response.data['success'] == true) {
        return null;
      }
    } on DioException catch (e) {
      return e.response?.data?['message'] ?? 'Password reset failed.';
    }
    return 'Something went wrong.';
  }

  /// Update Profile
  Future<String?> updateProfile({String? name, String? profilePicture}) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.put('/api/auth/profile', data: {
        if (name != null) 'name': name,
        if (profilePicture != null) 'profilePicture': profilePicture,
      });

      if (response.data['success'] == true) {
        final user = UserModel.fromJson(response.data['user']);
        await DatabaseHelper.saveUserData(user.toJson());
        state = user;
        return null;
      }
    } on DioException catch (e) {
      return e.response?.data?['message'] ?? 'Profile update failed.';
    }
    return 'Something went wrong.';
  }

  /// Change Password (when logged in)
  Future<String?> changePassword(String currentPassword, String newPassword) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.put('/api/auth/change-password', data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });
      if (response.data['success'] == true) {
        return null;
      }
    } on DioException catch (e) {
      return e.response?.data?['message'] ?? 'Password change failed.';
    }
    return 'Something went wrong.';
  }

  /// Logout
  Future<void> logout() async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      await client.post('/api/auth/logout');
    } catch (_) {}
    await DatabaseHelper.clearAuthData();
    state = null;
  }

  /// Delete Account
  Future<String?> deleteAccount() async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.delete('/api/auth/delete-account');
      if (response.data['success'] == true) {
        await DatabaseHelper.clearAuthData();
        state = null;
        return null;
      }
    } on DioException catch (e) {
      return e.response?.data?['message'] ?? 'Failed to delete account.';
    }
    return 'Something went wrong.';
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, UserModel?>((ref) {
  return AuthNotifier(ref);
});
