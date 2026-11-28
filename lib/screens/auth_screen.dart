// Collects a mobile number and verifies the demo or Firebase phone OTP.
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../widgets/cyber_background.dart';
import 'register_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  bool _otpSent = false;
  bool _busy = false;
  String? _verificationId;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    if (!RegExp(r'^\d{10}$').hasMatch(_phone.text.trim())) {
      setState(() => _error = 'Enter a valid 10-digit mobile number.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await AuthService.sendOtp(
        _phone.text.trim(),
        onAutoVerified: () => _continueToRegistration(),
      );
      if (!mounted) return;
      setState(() {
        _verificationId = id;
        _otpSent = id != null || !AuthService.firebaseEnabled;
      });
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await AuthService.verifyOtp(
        _phone.text.trim(),
        _otp.text.trim(),
        _verificationId,
      );
      await _continueToRegistration();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _continueToRegistration() async {
    if (!mounted) return;
    await Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => RegisterScreen(phone: _phone.text.trim()),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: CyberBackground(
          child: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 430),
                  child: Card(
                    color: const Color(0xff09182a).withValues(alpha: .93),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                      side: BorderSide(
                        color: const Color(0xff27c8f2).withValues(alpha: .3),
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(26),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Icon(Icons.memory,
                              size: 52, color: Color(0xff50d8ff)),
                          const SizedBox(height: 12),
                          const Text(
                            'MANAS',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 28,
                              letterSpacing: 7,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Mindful Assistance – Nurturing and Safety, '
                            'Every Step of the Way',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.white70),
                          ),
                          const SizedBox(height: 28),
                          TextField(
                            controller: _phone,
                            keyboardType: TextInputType.phone,
                            maxLength: 10,
                            decoration: const InputDecoration(
                              labelText: 'Mobile number',
                              prefixText: '+91 ',
                              counterText: '',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          if (_otpSent) ...[
                            const SizedBox(height: 12),
                            TextField(
                              controller: _otp,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              decoration: InputDecoration(
                                labelText: AuthService.firebaseEnabled
                                    ? 'Enter SMS code'
                                    : 'Demo OTP (459459)',
                                counterText: '',
                                border: const OutlineInputBorder(),
                              ),
                            ),
                          ],
                          if (_error != null) ...[
                            const SizedBox(height: 10),
                            Text(_error!,
                                style: const TextStyle(color: Colors.redAccent)),
                          ],
                          const SizedBox(height: 18),
                          FilledButton(
                            onPressed: _busy
                                ? null
                                : _otpSent
                                    ? _verify
                                    : _sendCode,
                            child: _busy
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : Text(_otpSent ? 'Verify and continue' : 'Get OTP'),
                          ),
                          if (!AuthService.firebaseEnabled) ...[
                            const SizedBox(height: 12),
                            const Text(
                              'Prototype mode: use OTP 459459.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.white54),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}
