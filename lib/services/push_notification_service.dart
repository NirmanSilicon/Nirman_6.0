// Registers this Manas installation so trusted contacts can receive optional push alerts.
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class PushNotificationService {
  static Future<void> registerThisDevice() async {
    await FirebaseMessaging.instance.requestPermission();
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) await _registerToken(token);
    FirebaseMessaging.instance.onTokenRefresh.listen(
      (token) => _registerToken(token),
      onError: (Object error) {
        FlutterError.reportError(FlutterErrorDetails(
          exception: error,
          library: 'Manas push registration',
        ));
      },
    );
  }

  static Future<void> _registerToken(String token) async {
    await FirebaseFunctions.instance.httpsCallable('registerProxyDevice').call({
      'token': token,
    });
  }
}
