// Encrypts locally cached profile data and the Firestore profile payload.
import 'dart:convert';
import 'package:encrypt/encrypt.dart' as encryption;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class CryptoService {
  static const _storage = FlutterSecureStorage();
  static const _keyName = 'manas_profile_encryption_key';

  static Future<String> encryptText(String plainText) async {
    final key = await _key();
    final iv = encryption.IV.fromSecureRandom(12);
    final encrypted = encryption.Encrypter(
      encryption.AES(key, mode: encryption.AESMode.gcm),
    ).encrypt(plainText, iv: iv);
    return '${base64Encode(iv.bytes)}:${encrypted.base64}';
  }

  static Future<String> decryptText(String value) async {
    final parts = value.split(':');
    if (parts.length != 2) throw const FormatException('Invalid encrypted data.');
    final iv = encryption.IV(base64Decode(parts[0]));
    return encryption.Encrypter(
      encryption.AES(await _key(), mode: encryption.AESMode.gcm),
    ).decrypt64(parts[1], iv: iv);
  }

  static Future<encryption.Key> _key() async {
    var encoded = await _storage.read(key: _keyName);
    if (encoded == null) {
      final key = encryption.Key.fromSecureRandom(32);
      encoded = base64Encode(key.bytes);
      await _storage.write(key: _keyName, value: encoded);
    }
    return encryption.Key(base64Decode(encoded));
  }
}
