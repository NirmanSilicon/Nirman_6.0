// Handles demo OTP sign-in and optional Firebase phone authentication.
import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const demoOtp = '459459';
  static const firebaseEnabled =
      bool.fromEnvironment('FIREBASE_ENABLED', defaultValue: false);
  static const _sessionKey = 'manas_user_id';

  static Future<String?> sendOtp(
    String phone, {
    required void Function() onAutoVerified,
  }) async {
    if (!firebaseEnabled) return null;
    final completer = Completer<String?>();
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: '+91$phone',
      verificationCompleted: (credential) async {
        try {
          await FirebaseAuth.instance.signInWithCredential(credential);
          final uid = FirebaseAuth.instance.currentUser?.uid;
          if (uid == null) {
            throw StateError('Phone sign-in did not return a user.');
          }
          await _rememberSession(uid);
          onAutoVerified();
          if (!completer.isCompleted) completer.complete(null);
        } catch (error, stackTrace) {
          if (!completer.isCompleted) completer.completeError(error, stackTrace);
        }
      },
      verificationFailed: (error) {
        if (!completer.isCompleted) completer.completeError(error);
      },
      codeSent: (verificationId, _) {
        if (!completer.isCompleted) completer.complete(verificationId);
      },
      codeAutoRetrievalTimeout: (verificationId) {
        if (!completer.isCompleted) completer.complete(verificationId);
      },
      timeout: const Duration(seconds: 60),
    );
    return completer.future;
  }

  static Future<void> verifyOtp(
    String phone,
    String code,
    String? verificationId,
  ) async {
    if (firebaseEnabled) {
      if (verificationId == null) {
        throw StateError('Wait for a text code or try sending it again.');
      }
      final credential = PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: code,
      );
      final user = (await FirebaseAuth.instance.signInWithCredential(credential))
          .user;
      if (user == null) throw StateError('Phone sign-in did not return a user.');
      await _rememberSession(user.uid);
      return;
    }
    if (code != demoOtp) throw const FormatException('Incorrect demo OTP.');
    await _rememberSession('demo_$phone');
  }

  static Future<String?> userId() async {
    if (firebaseEnabled) return FirebaseAuth.instance.currentUser?.uid;
    return (await SharedPreferences.getInstance()).getString(_sessionKey);
  }

  static Future<bool> hasSession() async => (await userId()) != null;

  static Future<void> signOut() async {
    if (firebaseEnabled) await FirebaseAuth.instance.signOut();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
  }

  static Future<void> _rememberSession(String uid) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionKey, uid);
  }
}
