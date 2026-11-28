// Draws a lightweight static circuit pattern for the cinematic app background.
import 'dart:math' as math;
import 'package:flutter/material.dart';

class CyberBackground extends StatelessWidget {
  const CyberBackground({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xff071322), Color(0xff030712), Color(0xff090a1b)],
          ),
        ),
        child: CustomPaint(
          painter: _CircuitPainter(),
          child: SizedBox.expand(child: child),
        ),
      );
}

class _CircuitPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = const Color(0xff15b9e8).withValues(alpha: .14)
      ..strokeWidth = 1;
    final glow = Paint()
      ..color = const Color(0xff28cfff).withValues(alpha: .5)
      ..style = PaintingStyle.fill;
    for (var i = 0; i < 13; i++) {
      final y = (i * 73.0) % size.height;
      final x = (i * 109.0) % size.width;
      final direction = i.isEven ? 1.0 : -1.0;
      final path = Path()
        ..moveTo(x, y)
        ..lineTo(x + direction * 34, y)
        ..lineTo(x + direction * 34, y + 22)
        ..lineTo(x + direction * 78, y + 22);
      canvas.drawPath(path, line);
      final metric = path.computeMetrics().first;
      final tangent = metric.getTangentForOffset(metric.length);
      if (tangent != null) canvas.drawCircle(tangent.position, 2, glow);
    }
    final random = math.Random(19);
    for (var i = 0; i < 22; i++) {
      final x = random.nextDouble() * size.width;
      final y = random.nextDouble() * size.height;
      canvas.drawRect(
        Rect.fromLTWH(x, y, 2.5, 2.5),
        Paint()..color = const Color(0xff26c9f4).withValues(alpha: .22),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
