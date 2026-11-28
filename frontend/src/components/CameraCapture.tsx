import { useState, useRef, useEffect } from "react";
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"pending" | "granted" | "denied">("pending");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Start the camera
  useEffect(() => {
    async function startCamera() {
      try {
        setError(null);
        setPermissionState("pending");
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // prefer back camera on mobile
          audio: false,
        });
        setStream(mediaStream);
        setPermissionState("granted");
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setPermissionState("denied");
        setError(
          "Could not access camera. Please check permissions or make sure another app is not using it."
        );
      }
    }

    startCamera();

    // Cleanup stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture the photo from the video feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create a canvas to draw the frame
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Mirror if it's the front camera (we'll keep standard draw for simplicity)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onCapture(dataUrl);
      
      // Stop the camera stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      onClose();
    }
  };

  // Safe simulation for environments without a webcam (e.g. testing)
  const handleSimulateCapture = () => {
    // Generate a mock injury/prescription placeholder image
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw background
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, 400, 300);
      
      // Draw a crosshair or border
      ctx.strokeStyle = "#0d9488";
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 380, 280);
      
      // Draw medical symbol or text
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SIMULATED CLINICAL CAPTURE", 200, 120);
      
      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.fillText("Captured on: " + new Date().toLocaleTimeString(), 200, 150);
      
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(200, 200, 20, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("+", 200, 205);
      
      const dataUrl = canvas.toDataURL("image/jpeg");
      onCapture(dataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm">
      <div className="relative bg-navy-light border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-in text-white">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-teal animate-pulse" />
            <span className="font-display font-bold text-sm">Clinical Camera Capture</span>
          </div>
          <button 
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera Feed */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {permissionState === "pending" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950">
              <RefreshCw className="h-8 w-8 text-teal animate-spin" />
              <p className="text-xs text-white/60">Requesting camera access...</p>
            </div>
          )}

          {permissionState === "denied" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3 bg-slate-900">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <div>
                <p className="text-xs font-bold text-red-400">Camera Access Blocked</p>
                <p className="text-[10px] text-white/50 mt-1 max-w-[280px] mx-auto leading-relaxed">
                  {error || "Please allow camera access in your browser settings to take patient photos."}
                </p>
              </div>
              <button
                onClick={handleSimulateCapture}
                className="mt-2 bg-teal hover:bg-teal/90 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Simulate Sample Capture
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${permissionState === "granted" ? "block" : "hidden"}`}
          />

          {/* Guidelines HUD overlay */}
          {permissionState === "granted" && (
            <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none flex items-center justify-center">
              <div className="border border-white/30 border-dashed w-full h-full rounded flex items-center justify-center">
                <div className="text-[9px] font-mono text-white/50 bg-black/60 px-2 py-0.5 rounded uppercase tracking-wider">
                  Align Prescription / Injury Here
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-5 flex justify-between items-center gap-3 bg-navy-light/90">
          <button
            onClick={handleSimulateCapture}
            className="text-[11px] font-bold text-white/60 hover:text-white transition cursor-pointer"
          >
            Insert Mock Photo
          </button>
          
          {permissionState === "granted" ? (
            <button
              onClick={capturePhoto}
              className="bg-gradient-teal hover:opacity-95 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-glow-teal transition cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="h-4 w-4" /> Capture Photo
            </button>
          ) : (
            <button
              disabled
              className="bg-white/10 text-white/40 font-bold text-xs px-6 py-2.5 rounded-xl cursor-not-allowed"
            >
              Camera Offline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
