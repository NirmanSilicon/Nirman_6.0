// Stores profile data encrypted on this device and in the optional Firestore backend.
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_profile.dart';
import 'auth_service.dart';
import 'crypto_service.dart';

class ProfileService {
  static const _localProfile = 'manas_profile_encrypted';

  static Future<void> save(UserProfile profile) async {
    final uid = await AuthService.userId();
    if (uid == null) throw StateError('No signed-in account.');
    final encrypted = await CryptoService.encryptText(jsonEncode(profile.toJson()));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_localProfile:$uid', encrypted);
    if (AuthService.firebaseEnabled) {
      await FirebaseFirestore.instance.collection('profiles').doc(uid).set({
        'encryptedProfile': encrypted,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }
  }

  static Future<UserProfile?> load() async {
    final uid = await AuthService.userId();
    if (uid == null) return null;
    final prefs = await SharedPreferences.getInstance();
    final encrypted = prefs.getString('$_localProfile:$uid');
    if (encrypted == null) return null;
    final json = jsonDecode(await CryptoService.decryptText(encrypted));
    return UserProfile.fromJson(json as Map<String, dynamic>);
  }
}
