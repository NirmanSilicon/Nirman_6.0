import { useEffect, useState } from "react";
import { api, describeApiError } from "../api/client";

interface DemoVideo {
  id: string;
  name: string;
  size_bytes: number;
  stream_url: string;
}

export function DemoVideosPanel(): JSX.Element {
  const [videos, setVideos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    api<DemoVideo[]>("/media/videos")
      .then((list) => {
        if (mounted) setVideos(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (mounted) setError(describeApiError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section
      style={{
        marginBottom: "1.5rem",
        padding: "1rem",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        backgroundColor: "#f8fafc",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "1.1rem", color: "#0f172a" }}>
        Camera Feeds / Demo Videos
      </h2>

      {loading && <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading demo videos...</p>}
      {error && <p style={{ color: "#991b1b", fontSize: "0.875rem" }}>Error loading videos: {error}</p>}
      {!loading && !error && videos.length === 0 && (
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>No demo videos found in the data folder.</p>
      )}

      {!loading && !error && videos.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1rem",
          }}
        >
          {videos.map((v) => (
            <div
              key={v.id}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.75rem",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem", color: "#0f172a" }}>
                {v.name} ({(v.size_bytes / (1024 * 1024)).toFixed(2)} MB)
              </div>
              {videoErrors[v.id] ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#991b1b", backgroundColor: "#fef2f2", borderRadius: "6px" }}>
                  Video cannot be played
                </div>
              ) : (
                <video
                  src={v.stream_url}
                  controls
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onError={() => setVideoErrors((prev) => ({ ...prev, [v.id]: true }))}
                  style={{ width: "100%", borderRadius: "6px", backgroundColor: "#000000" }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
