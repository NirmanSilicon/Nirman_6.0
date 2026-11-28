import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { injectTrainDelay, resetCorridor } from '../services/api';
import { getStationsForCorridor } from '../services/mockFallback';
import { useRailStore } from '../stores/useRailStore';

const MapWebView = WebView as unknown as React.ComponentType<any>;
type MapViewPreset = 'my_train' | 'delays_ahead' | 'full_journey';

export const MapScreen: React.FC = () => {
  const {
    activeCorridorId,
    activeSnapshot,
    backendOrigin,
    selectedTrain,
    wsConnected,
    injectLocalDelay,
    resetLocalSim,
  } = useRailStore();
  const webViewRef = useRef<any>(null);
  const [cameraView, setCameraView] = useState<MapViewPreset>('full_journey');
  const trains = activeSnapshot.trains ?? [];
  const stations = useMemo(
    () => getStationsForCorridor(activeCorridorId),
    [activeCorridorId]
  );

  const htmlContent = useMemo(() => {
    const stationsJson = JSON.stringify(stations);
    const initialTrainsJson = JSON.stringify(trains);
    const isKolkata = activeCorridorId === 'SER_HWH_KGP';
    const centerLng = isKolkata ? 87.83 : 85.95;
    const centerLat = isKolkata ? 22.45 : 20.46;
    const zoom = isKolkata ? 8.8 : 8.2;

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F8FAFC; font-family: sans-serif; }
    .train-pill {
      padding: 4px 8px;
      border-radius: 999px;
      color: #fff;
      font-weight: 800;
      font-size: 11px;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      white-space: nowrap;
    }
    .stn-label {
      background: rgba(255,255,255,0.94);
      color: #0F294A;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid #CBD5E1;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const STATIONS = ${stationsJson};
    const INIT_TRAINS = ${initialTrainsJson};

    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [${centerLng}, ${centerLat}],
      zoom: ${zoom},
      attributionControl: false
    });

    const trainMarkers = {};

    function updateTrains(list) {
      list.forEach((t) => {
        const lng = t.lon || ${centerLng};
        const lat = t.lat || ${centerLat};
        const bg = t.current_delay_mins >= 10 ? '#D92D20' : (t.priority_rank === 1 ? '#D97706' : '#059669');
        const label = t.train_no + ' (' + Math.round(t.speed_kmph) + ' km/h)';
        if (!trainMarkers[t.train_no]) {
          const el = document.createElement('div');
          el.className = 'train-pill';
          el.style.background = bg;
          el.textContent = label;
          trainMarkers[t.train_no] = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);
        } else {
          const m = trainMarkers[t.train_no];
          m.setLngLat([lng, lat]);
          m.getElement().style.background = bg;
          m.getElement().textContent = label;
        }
      });
    }

    map.on('load', () => {
      map.addSource('corridor-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: STATIONS.map(s => [s.lon, s.lat])
          }
        }
      });
      map.addLayer({
        id: 'corridor-line-layer',
        type: 'line',
        source: 'corridor-line',
        paint: { 'line-color': '#0F294A', 'line-width': 3.5 }
      });

      STATIONS.forEach((s) => {
        const el = document.createElement('div');
        el.className = 'stn-label';
        el.textContent = s.station_code;
        new maplibregl.Marker({ element: el })
          .setLngLat([s.lon, s.lat])
          .addTo(map);
      });

      updateTrains(INIT_TRAINS);
    });

    function handleMessage(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.type === 'TRAINS_UPDATE' && Array.isArray(msg.trains)) {
          updateTrains(msg.trains);
        } else if (msg && msg.type === 'FOCUS_COORDS') {
          map.flyTo({ center: [msg.lon, msg.lat], zoom: msg.zoom || 9.8, duration: 700 });
        }
      } catch (e) {}
    }
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  </script>
</body>
</html>`;
  }, [activeCorridorId, stations]);

  useEffect(() => {
    const payload = JSON.stringify({ type: 'TRAINS_UPDATE', trains });
    webViewRef.current?.postMessage(payload);
  }, [trains]);

  const handleCameraPreset = (preset: MapViewPreset) => {
    setCameraView(preset);
    const isKolkata = activeCorridorId === 'SER_HWH_KGP';
    if (preset === 'my_train') {
      const target = trains.find((t) => t.train_no === selectedTrain) ?? trains[0];
      if (target?.lat && target?.lon) {
        webViewRef.current?.postMessage(
          JSON.stringify({ type: 'FOCUS_COORDS', lat: target.lat, lon: target.lon, zoom: 10.2 })
        );
      }
    } else if (preset === 'delays_ahead') {
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'FOCUS_COORDS',
          lat: isKolkata ? 22.42 : 20.43,
          lon: isKolkata ? 87.86 : 85.86,
          zoom: 10.5,
        })
      );
    } else {
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'FOCUS_COORDS',
          lat: isKolkata ? 22.45 : 20.46,
          lon: isKolkata ? 87.83 : 85.95,
          zoom: isKolkata ? 8.8 : 8.2,
        })
      );
    }
  };

  const handleDelay = () => {
    injectLocalDelay(selectedTrain, 15);
    if (wsConnected) {
      injectTrainDelay(backendOrigin, selectedTrain, 15).catch(() => {});
    }
  };

  const handleReset = () => {
    resetLocalSim();
    if (wsConnected) {
      resetCorridor(backendOrigin).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Camera Preset Bar (Matches Website CorridorMap) */}
      <View style={styles.cameraBar}>
        {(
          [
            { id: 'my_train', label: 'My Train' },
            { id: 'delays_ahead', label: 'Delays Ahead' },
            { id: 'full_journey', label: 'Full Corridor' },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => handleCameraPreset(item.id)}
            style={[
              styles.camBtn,
              cameraView === item.id && styles.camBtnActive,
            ]}
          >
            <Text
              style={[
                styles.camBtnText,
                cameraView === item.id && styles.camBtnTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <MapWebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
      />

      <View style={styles.overlayBar}>
        <View style={styles.legendRow}>
          <Text style={styles.overlayTitle}>
            MapLibre Radar · {trains.length} Trains · {activeSnapshot.mode}
          </Text>
          <Text style={styles.legendText}>🔴 Delayed  🟡 Priority  🟢 On Time</Text>
        </View>
        <View style={styles.btnRow}>
          <Pressable style={styles.delayBtn} onPress={handleDelay}>
            <Text style={styles.delayBtnText}>+15m Delay ({selectedTrain})</Text>
          </Pressable>
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  cameraBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  camBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  camBtnActive: { backgroundColor: '#0F294A' },
  camBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  camBtnTextActive: { color: '#FFFFFF' },
  map: { flex: 1 },
  overlayBar: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendRow: { marginBottom: 8 },
  overlayTitle: { fontSize: 12, fontWeight: '800', color: '#0F294A' },
  legendText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 8 },
  delayBtn: { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  delayBtnText: { color: '#D92D20', fontSize: 12, fontWeight: '800' },
  resetBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  resetBtnText: { color: '#0F294A', fontSize: 12, fontWeight: '800' },
});
