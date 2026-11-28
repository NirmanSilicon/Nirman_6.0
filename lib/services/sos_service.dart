// Obtains location, sends explicitly requested SOS SMS, finds police stations, and logs events.
import 'dart:async';
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:telephony/telephony.dart';
import '../models/user_profile.dart';
import 'auth_service.dart';
import 'crypto_service.dart';

class PoliceStation {
  const PoliceStation({required this.name, required this.distanceMeters});
  final String name;
  final double distanceMeters;
}

class SosService {
  static const _placesKey = String.fromEnvironment('PLACES_API_KEY');
  Timer? _timer;
  Future<void> Function(Position position)? _onLocationUpdate;
  void Function(Object error)? _onLiveError;

  Future<Position> currentLocation() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw StateError('Turn on location services to share your location.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw StateError('Location permission is needed for location sharing.');
    }
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
  }

  Future<void> sendAlert(
    UserProfile profile,
    Position? position, {
    required String message,
  }) async {
    final sms = position == null
        ? message
        : '$message My live location: ${_mapsLink(position)}';
    final permissions = await Telephony.instance.requestSmsPermissions;
    if (permissions != true) {
      throw StateError(
        'SMS permission was not granted. Please call 112 or use the SMS app.',
      );
    }
    await Telephony.instance.sendSms(to: profile.proxyPhone, message: sms);
    await _logEvent(profile, position, sms);
  }

  Future<PoliceStation?> nearestPoliceStation(Position position) async {
    if (_placesKey.isEmpty) return null;
    final uri = Uri.https(
      'maps.googleapis.com',
      '/maps/api/place/nearbysearch/json',
      {
        'location': '${position.latitude},${position.longitude}',
        'radius': '8000',
        'type': 'police',
        'key': _placesKey,
      },
    );
    final response = await http.get(uri).timeout(const Duration(seconds: 10));
    if (response.statusCode != 200) {
      throw StateError('Police station search is unavailable right now.');
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final results = data['results'] as List<dynamic>? ?? [];
    if (results.isEmpty) return null;
    final first = results.first as Map<String, dynamic>;
    final location =
        (first['geometry'] as Map<String, dynamic>)['location']
            as Map<String, dynamic>;
    final meters = Geolocator.distanceBetween(
      position.latitude,
      position.longitude,
      (location['lat'] as num).toDouble(),
      (location['lng'] as num).toDouble(),
    );
    return PoliceStation(
      name: first['name'] as String? ?? 'Nearby police station',
      distanceMeters: meters,
    );
  }

  Future<void> startLiveSharing(
    UserProfile profile,
    Future<void> Function(Position position) onLocationUpdate,
    void Function(Object error) onError,
  ) async {
    _onLocationUpdate = onLocationUpdate;
    _onLiveError = onError;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) async {
      try {
        final position = await currentLocation();
        await _onLocationUpdate?.call(position);
        await sendAlert(
          profile,
          position,
          message: 'Manas safety update. I am still sharing my location.',
        );
        await sendPushAlert(
          profile.proxyPhone,
          'Manas safety update. ${_mapsLink(position)}',
        );
      } catch (error) {
        _onLiveError?.call(error);
      }
    });
  }

  Future<void> stopLiveSharing() async {
    _timer?.cancel();
    _timer = null;
    _onLocationUpdate = null;
    _onLiveError = null;
  }

  Future<void> sendPushAlert(String phone, String message) async {
    if (!AuthService.firebaseEnabled) return;
    await FirebaseFunctions.instance
        .httpsCallable('sendProxyPush')
        .call<void>({'phone': phone, 'message': message});
  }

  Future<void> _logEvent(
    UserProfile profile,
    Position? position,
    String message,
  ) async {
    if (!AuthService.firebaseEnabled) return;
    final uid = await AuthService.userId();
    if (uid == null) throw StateError('No signed-in Firebase account.');
    final encrypted = await CryptoService.encryptText(jsonEncode({
      'proxyPhone': profile.proxyPhone,
      'message': message,
      'latitude': position?.latitude,
      'longitude': position?.longitude,
    }));
    await FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .collection('sos_events')
        .add({
      'createdAt': FieldValue.serverTimestamp(),
        'encryptedPayload': encrypted,
    });
  }

  String _mapsLink(Position position) =>
      'https://maps.google.com/?q=${position.latitude},${position.longitude}';
}
