// Provides a cancelable SOS countdown, proxy SMS, station details, and 112 access.
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/user_profile.dart';
import '../services/profile_service.dart';
import '../services/sos_service.dart';
import '../widgets/cyber_background.dart';

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  final _service = SosService();
  Timer? _countdown;
  int _seconds = 3;
  bool _counting = false;
  bool _active = false;
  bool _busy = false;
  String? _status;
  String? _error;
  Position? _position;
  PoliceStation? _station;
  UserProfile? _profile;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await ProfileService.load();
      if (mounted) setState(() => _profile = profile);
    } catch (error) {
      if (mounted) setState(() => _error = 'Profile could not be loaded: $error');
    }
  }

  void _beginCountdown() {
    if (_profile == null) {
      setState(() => _error = 'Save your profile before using SOS.');
      return;
    }
    setState(() {
      _counting = true;
      _seconds = 3;
      _error = null;
      _status = 'SOS begins in 3 seconds. Tap cancel if this was accidental.';
    });
    _countdown?.cancel();
    _countdown = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_seconds <= 1) {
        timer.cancel();
        setState(() {
          _counting = false;
          _seconds = 0;
        });
        _activate();
      } else {
        setState(() => _seconds--);
      }
    });
  }

  Future<void> _activate() async {
    setState(() {
      _busy = true;
      _error = null;
      _status = 'Getting your location and contacting your trusted person…';
    });
    Position? position;
    try {
      position = await _service.currentLocation();
      if (mounted) setState(() => _position = position);
    } catch (error) {
      if (mounted) setState(() => _error = '$error Sending a plain alert instead.');
    }
    try {
      await _service.sendAlert(
        _profile!,
        position,
        message: 'I am not safe. Please contact me or get help.',
      );
      if (mounted) setState(() => _status = 'Alert sent to your trusted contact.');
    } catch (error) {
      if (mounted) {
        setState(() {
          _status = 'SOS is active. SMS delivery could not be fully confirmed.';
          _error = 'SMS or event logging issue: $error';
        });
      }
    }
    try {
      await _service.sendPushAlert(
        _profile!.proxyPhone,
        position == null
            ? 'I am not safe. Please contact me or get help.'
            : 'I am not safe. My live location: '
                'https://maps.google.com/?q=${position.latitude},${position.longitude}',
      );
    } catch (error) {
      if (mounted) setState(() => _error = 'Push alert could not be sent; SMS was attempted. $error');
    }
    if (position != null) {
      try {
        final station = await _service.nearestPoliceStation(position);
        if (mounted) setState(() => _station = station);
      } catch (error) {
        if (mounted) setState(() => _error = 'Station search unavailable: $error');
      }
      await _service.startLiveSharing(
        _profile!,
        (nextPosition) async {
          if (mounted) setState(() => _position = nextPosition);
        },
        (error) {
          if (mounted) {
            setState(() => _error = 'Live location update failed: $error');
          }
        },
      );
    }
    if (mounted) {
      setState(() {
        _active = true;
        _busy = false;
      });
    }
  }

  Future<void> _safe() async {
    await _service.stopLiveSharing();
    if (!mounted) return;
    setState(() {
      _active = false;
      _status = 'Live sharing stopped. Take a moment to breathe.';
    });
  }

  Future<void> _call(String number) async {
    final uri = Uri(scheme: 'tel', path: number);
    if (!await launchUrl(uri)) {
      if (mounted) setState(() => _error = 'Could not open the phone app.');
    }
  }

  @override
  void dispose() {
    _countdown?.cancel();
    _service.stopLiveSharing();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Safety support')),
        body: CyberBackground(
          child: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(22, 14, 22, 30),
              children: [
                const Text(
                  'Your trusted contact will be notified when you confirm SOS.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, height: 1.5),
                ),
                const SizedBox(height: 30),
                Center(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: 206,
                    height: 206,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xff641b30),
                      border: Border.all(
                          color: const Color(0xffff6270), width: 3),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xffff263d)
                              .withValues(alpha: _active ? .45 : .22),
                          blurRadius: _active ? 38 : 20,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        _counting ? '$_seconds' : 'SOS',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 42,
                          letterSpacing: 3,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (_counting)
                  OutlinedButton(
                    onPressed: () {
                      _countdown?.cancel();
                      setState(() {
                        _counting = false;
                        _status = 'SOS cancelled.';
                      });
                    },
                    child: const Text('Cancel'),
                  )
                else if (_active)
                  FilledButton(
                    onPressed: _busy ? null : _safe,
                    style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xff157e70)),
                    child: const Text('I am safe — stop sharing'),
                  )
                else
                  FilledButton(
                    onPressed: _busy ? null : _beginCountdown,
                    style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xffa51e39)),
                    child: _busy
                        ? const CircularProgressIndicator()
                        : const Text('Press and confirm SOS'),
                  ),
                if (_status != null) ...[
                  const SizedBox(height: 16),
                  Text(_status!, textAlign: TextAlign.center),
                ],
                if (_busy) const LinearProgressIndicator(),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xffffa7a7))),
                ],
                const SizedBox(height: 24),
                Card(
                  color: const Color(0xff0a1a2a).withValues(alpha: .95),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text('Emergency help',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.w600)),
                        if (_position != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            'Location: ${_position!.latitude.toStringAsFixed(5)}, '
                            '${_position!.longitude.toStringAsFixed(5)}',
                            style: const TextStyle(color: Colors.white70),
                          ),
                        ],
                        if (_station != null) ...[
                          const SizedBox(height: 12),
                          Text('Nearest police station: ${_station!.name}'),
                          Text(_station!.distanceMeters < 1000
                              ? '${_station!.distanceMeters.round()} m away'
                              : '${(_station!.distanceMeters / 1000).toStringAsFixed(1)} km away'),
                          TextButton.icon(
                            onPressed: () => _call('100'),
                            icon: const Icon(Icons.call),
                            label: const Text('Call station / police'),
                          ),
                        ],
                        const SizedBox(height: 8),
                        FilledButton.icon(
                          onPressed: () => _call('112'),
                          icon: const Icon(Icons.call),
                          label: const Text('Call 112 now'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'SOS sends an SMS after your confirmation. Keep this screen open '
                  'while live updates are active. Emergency calls and SMS may be '
                  'subject to network and device permissions.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      );
}
