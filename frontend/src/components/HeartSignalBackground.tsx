import { useEffect, useRef } from "react";

interface HeartSignalBackgroundProps {
  className?: string;
}

export function HeartSignalBackground({ className = "" }: HeartSignalBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Waveform formulas
  const getECGValue = (phase: number): number => {
    const activeRatio = 0.4;
    if (phase > activeRatio) return 0;
    const p = phase / activeRatio;

    if (p < 0.1) return Math.sin((p / 0.1) * Math.PI) * 0.05;
    if (p < 0.15) return 0;
    if (p < 0.18) return -0.10 * ((p - 0.15) / 0.03);
    if (p < 0.22) return -0.10 + 0.90 * ((p - 0.18) / 0.04);
    if (p < 0.26) return 0.80 - 1.05 * ((p - 0.22) / 0.04);
    if (p < 0.30) return -0.25 + 0.25 * ((p - 0.26) / 0.04);
    if (p < 0.35) return 0;
    if (p < 0.55) return Math.sin(((p - 0.35) / 0.20) * Math.PI) * 0.18;
    return 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    // Buffer for EKG values
    let yBuffer: number[] = [];
    const bpm = 60; // Calm resting heart rate
    const beatDuration = 60 / bpm;
    let scanX = 0;
    let time = 0;
    let lastTime = performance.now();

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Initialize buffer
      yBuffer = new Array(Math.ceil(width)).fill(height * 0.5);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;
      time += dt;

      // Draw subtle background medical grid
      ctx.clearRect(0, 0, width, height);
      
      const gridSpacing = 30;
      ctx.strokeStyle = "rgba(13, 242, 217, 0.02)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major grid lines
      ctx.strokeStyle = "rgba(13, 242, 217, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSpacing * 5) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSpacing * 5) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Calculate sweeping EKG line
      const sweepDuration = 6.0;
      const speed = (width / sweepDuration) * dt;
      const nextScanX = (scanX + speed) % width;

      const yOffset = height * 0.5;
      const amplitude = height * 0.25;

      const startX = Math.floor(scanX);
      const endX = Math.floor(nextScanX);
      const steps = endX >= startX ? (endX - startX) : (Math.floor(width) - startX + endX);

      for (let i = 0; i <= steps; i++) {
        const x = (startX + i) % Math.floor(width);
        const ratio = steps > 0 ? i / steps : 1;
        const t = time - dt * (1 - ratio);
        const phase = (t / beatDuration) % 1.0;

        const ecgRaw = getECGValue(phase);
        const ecgNoise = (Math.random() - 0.5) * 0.001; // extremely subtle organic noise
        yBuffer[x] = - (ecgRaw + ecgNoise) * amplitude + yOffset;
      }

      scanX = nextScanX;

      // Draw sweeping line with linear gradient fade
      const currentScanX = Math.floor(scanX);
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      const p = currentScanX / width;

      // Create a gradient that fades out behind the sweeping head
      const stops = [
        { offset: 0.0, opacity: 1.0 },
        { offset: -0.02, opacity: 0.9 },
        { offset: -0.15, opacity: 0.5 },
        { offset: -0.4, opacity: 0.2 },
        { offset: -0.7, opacity: 0.05 },
        { offset: -0.95, opacity: 0.0 },
      ];

      const sortedStops = stops
        .map(s => ({ pos: (p + s.offset + 1.0) % 1.0, opacity: s.opacity }))
        .sort((a, b) => a.pos - b.pos);

      sortedStops.forEach(stop => {
        grad.addColorStop(stop.pos, `rgba(13, 242, 217, ${stop.opacity * 0.25})`);
      });

      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(13, 242, 217, 0.4)";
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      let pathStarted = false;
      const blankingGap = 40; // gap before the sweep line

      for (let x = 0; x < width; x++) {
        const age = (currentScanX - x + width) % width;
        if (age > width - blankingGap) {
          if (pathStarted) {
            ctx.stroke();
            ctx.beginPath();
            pathStarted = false;
          }
          continue;
        }
        if (!pathStarted) {
          ctx.moveTo(x, yBuffer[x] || yOffset);
          pathStarted = true;
        } else {
          ctx.lineTo(x, yBuffer[x] || yOffset);
        }
      }
      if (pathStarted) ctx.stroke();
      ctx.shadowBlur = 0;

      // Glowing dot at the head of the sweep
      const headY = yBuffer[currentScanX];
      if (headY !== undefined && currentScanX < width - 2) {
        ctx.beginPath();
        ctx.arc(currentScanX, headY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(13, 242, 217, 0.8)";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(drawLoop);
    };

    animationId = requestAnimationFrame(drawLoop);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-transparent ${className}`}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
