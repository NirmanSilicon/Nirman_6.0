// Starts Manas and shows setup errors clearly instead of failing silently.
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  Object? startupError;
  if (AuthService.firebaseEnabled) {
    try {
      await Firebase.initializeApp();
    } catch (error) {
      startupError = error;
    }
  }
  runApp(ManasApp(startupError: startupError));
}

class ManasApp extends StatelessWidget {
  const ManasApp({super.key, this.startupError});

  final Object? startupError;

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Manas',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xff050b16),
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xff30cfff),
            brightness: Brightness.dark,
          ),
          useMaterial3: true,
        ),
        home: startupError != null
            ? _StartupError(error: startupError!)
            : const SessionGate(),
      );
}

class SessionGate extends StatelessWidget {
  const SessionGate({super.key});

  @override
  Widget build(BuildContext context) => FutureBuilder<bool>(
        future: AuthService.hasSession(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return snapshot.data! ? const HomeScreen() : const AuthScreen();
        },
      );
}

class _StartupError extends StatelessWidget {
  const _StartupError({required this.error});
  final Object error;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Text(
              'Manas could not start its Firebase connection.\n\n$error\n\n'
              'Check the Firebase setup in README.md or run in demo mode.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
}
