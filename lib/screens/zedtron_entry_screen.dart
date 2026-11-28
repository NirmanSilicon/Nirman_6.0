// Displays the minimal Zedtron hologram and opens the consultant when tapped.
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'chat_screen.dart';

class ZedtronEntryScreen extends StatefulWidget {
  const ZedtronEntryScreen({super.key});

  @override
  State<ZedtronEntryScreen> createState() => _ZedtronEntryScreenState();
}

class _ZedtronEntryScreenState extends State<ZedtronEntryScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 9),
  )..repeat();

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => Navigator.of(context).push(
            PageRouteBuilder<void>(
              transitionDuration: const Duration(milliseconds: 350),
              pageBuilder: (_, animation, secondaryAnimation) =>
                  const ChatScreen(),
              transitionsBuilder: (_, animation, secondaryAnimation, child) =>
                  FadeTransition(opacity: animation, child: child),
            ),
          ),
          child: AnimatedBuilder(
            animation: _animation,
            builder: (context, child) => CustomPaint(
              painter: _HologramPainter(_animation.value),
              child: child,
            ),
            child: const Center(
              child: Text(
                'Zedtron',
                style: TextStyle(
                  color: Color(0xffc7f7ff),
                  fontSize: 34,
                  fontWeight: FontWeight.w300,
                  letterSpacing: 7,
                  shadows: [
                    Shadow(color: Color(0xff26cfff), blurRadius: 22),
                    Shadow(color: Color(0xff26cfff), blurRadius: 45),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

class _HologramPainter extends CustomPainter {
  _HologramPainter(this.progress);
  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * .47);
    final blue = Paint()
      ..color = const Color(0xff3ad9ff).withValues(alpha: .67)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.25;
    final soft = Paint()
      ..color = const Color(0xff2a9eff).withValues(alpha: .2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    final halo = Rect.fromCenter(
        center: center, width: 220, height: 220);
    canvas.drawOval(halo, soft);
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(progress * math.pi * 2);
    canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: 270, height: 82), blue);
    canvas.restore();
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(-progress * math.pi * 1.6);
    canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: 235, height: 112), blue);
    canvas.restore();

    final angle = progress * math.pi * 2;
    const side = 68.0;
    final points = <Offset>[
      Offset(center.dx + math.cos(angle) * side, center.dy - 76),
      Offset(center.dx + math.cos(angle + 1.4) * side, center.dy - 13),
      Offset(center.dx + math.cos(angle + 2.8) * side, center.dy + 34),
      Offset(center.dx + math.cos(angle + 4.2) * side, center.dy - 25),
    ];
    final cubePaint = Paint()
      ..color = const Color(0xff54e3ff).withValues(alpha: .7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final cube = Path()
      ..moveTo(points[0].dx, points[0].dy)
      ..lineTo(points[1].dx, points[1].dy)
      ..lineTo(points[2].dx, points[2].dy)
      ..lineTo(points[3].dx, points[3].dy)
      ..close()
      ..moveTo(points[0].dx, points[0].dy)
      ..lineTo(points[2].dx, points[2].dy)
      ..moveTo(points[1].dx, points[1].dy)
      ..lineTo(points[3].dx, points[3].dy);
    canvas.drawPath(cube, cubePaint);

    final platform = Paint()
      ..color = const Color(0xff36d5ff).withValues(alpha: .45)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawOval(
      Rect.fromCenter(center: Offset(center.dx, center.dy + 129), width: 230, height: 42),
      platform,
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(center.dx, center.dy + 133), width: 145, height: 15),
      soft,
    );
    final particles = Paint()
      ..color = const Color(0xff8ceaff).withValues(alpha: .56);
    for (var i = 0; i < 24; i++) {
      final phase = progress * math.pi * 2 + i * 2.4;
      final radius = 115 + (i % 5) * 13.0;
      final position = Offset(
        center.dx + math.cos(phase) * radius,
        center.dy + math.sin(phase * 1.23) * radius * .62,
      );
      canvas.drawRect(Rect.fromCenter(center: position, width: 2.5, height: 2.5), particles);
    }
  }

  @override
  bool shouldRepaint(covariant _HologramPainter oldDelegate) =>
      oldDelegate.progress != progress;
}
