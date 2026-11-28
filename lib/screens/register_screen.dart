// Registers the user and chosen trusted contact after mobile verification.
import 'package:flutter/material.dart';
import '../models/user_profile.dart';
import '../services/auth_service.dart';
import '../services/profile_service.dart';
import '../services/push_notification_service.dart';
import '../widgets/cyber_background.dart';
import 'home_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, required this.phone});
  final String phone;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _proxy = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _proxy.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ProfileService.save(UserProfile(
        name: _name.text.trim(),
        phone: widget.phone,
        email: _email.text.trim(),
        proxyPhone: _proxy.text.trim(),
      ));
      Object? pushError;
      if (AuthService.firebaseEnabled) {
        try {
          await PushNotificationService.registerThisDevice();
        } catch (error) {
          pushError = error;
        }
      }
      if (!mounted) return;
      if (pushError != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Push alerts are not enabled: $pushError')),
        );
      }
      await Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute<void>(builder: (_) => const HomeScreen()),
          (_) => false);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _phoneValidator(String? value) =>
      value != null && RegExp(r'^\d{10}$').hasMatch(value.trim())
          ? null
          : 'Enter a 10-digit number.';

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Create your profile')),
        body: CyberBackground(
          child: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(22),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Card(
                    color: const Color(0xff09182a).withValues(alpha: .94),
                    child: Padding(
                      padding: const EdgeInsets.all(22),
                      child: Form(
                        key: _form,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Your details stay private.',
                              style: TextStyle(
                                fontSize: 21,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 18),
                            TextFormField(
                              controller: _name,
                              textCapitalization: TextCapitalization.words,
                              decoration: const InputDecoration(
                                  labelText: 'Full name'),
                              validator: (value) => value == null ||
                                      value.trim().length < 2
                                  ? 'Enter your name.'
                                  : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              initialValue: widget.phone,
                              readOnly: true,
                              decoration: const InputDecoration(
                                  labelText: 'Verified mobile number'),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _email,
                              keyboardType: TextInputType.emailAddress,
                              decoration:
                                  const InputDecoration(labelText: 'Email'),
                              validator: (value) => value != null &&
                                      RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                                          .hasMatch(value.trim())
                                  ? null
                                  : 'Enter a valid email address.',
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _proxy,
                              keyboardType: TextInputType.phone,
                              maxLength: 10,
                              decoration: const InputDecoration(
                                labelText: 'Proxy (trusted contact) number',
                                prefixText: '+91 ',
                                counterText: '',
                              ),
                              validator: _phoneValidator,
                            ),
                            const SizedBox(height: 8),
                            if (_error != null)
                              Text(_error!,
                                  style:
                                      const TextStyle(color: Colors.redAccent)),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: _saving ? null : _register,
                              child: _saving
                                  ? const CircularProgressIndicator()
                                  : const Text('Save profile'),
                            ),
                          ],
                        ),
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
