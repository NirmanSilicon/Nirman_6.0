import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Camera, CheckCircle2, MapPin, Ruler, Satellite, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { fetchEvidenceComparisons, fetchProjects } from '../lib/projectData';
import type { ComparisonResult, EvidenceRecord, Project } from '../types/domain';

export function EvidencePage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('projectId') || '');
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // GPS Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [captureNotes, setCaptureNotes] = useState('');

  // Independent Survey Form state (Officer/Admin)
  const [survey, setSurvey] = useState({
    surveyor_name: '',
    survey_date: new Date().toISOString().slice(0, 10),
    method: 'dgps',
    measured_length_m: '',
    measured_width_m: '',
    measured_area_sqm: '',
    measured_thickness_mm: '',
    material_test_summary: '',
    notes: '',
  });

  // Satellite module state
  const [satResult, setSatResult] = useState<{ configured: boolean; message?: string; scenes?: Array<{ id: string; datetime: string; cloud_cover_pct: number }>; limitations?: string[] } | null>(null);
  const [beforeDate, setBeforeDate] = useState('2025-11-01');
  const [afterDate, setAfterDate] = useState('2026-10-30');

  const loadData = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetchProjects(),
        fetchEvidenceComparisons(selectedProjectId || undefined),
      ]);
      setProjects(pRes.projects);
      setComparisons(cRes.comparisons);
      if (!selectedProjectId && pRes.projects[0]) {
        setSelectedProjectId(pRes.projects[0].id);
      }

      if (profile) {
        const eRes = await apiFetch<{ evidence: EvidenceRecord[] }>(
          `/evidence${selectedProjectId ? `?projectId=${selectedProjectId}` : ''}`
        );
        setEvidenceList(eRes.evidence);
      }
    } catch (err) {
      setProjects([]);
      setComparisons([]);
      setEvidenceList([]);
      setError(err instanceof Error ? err.message : 'Failed to load evidence & comparisons');
    }
  }, [selectedProjectId, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startGpsCamera = async () => {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (geoErr) => {
        setError(`GPS permission error: ${geoErr.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
      } catch {
        setError('Camera stream unavailable; you can still upload a freshly captured image file below.');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedPreview(URL.createObjectURL(blob));
        }
      },
      'image/jpeg',
      0.9
    );
    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  const submitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedBlob || !coords || !selectedProjectId) {
      setError('Select a project, capture a photograph, and allow GPS coordinates first.');
      return;
    }
    setError(null);
    setFeedback(null);

    const fd = new FormData();
    fd.append('photo', capturedBlob, `evidence_${Date.now()}.jpg`);
    fd.append('project_id', selectedProjectId);
    fd.append('capture_timestamp', new Date().toISOString());
    fd.append('latitude', String(coords.lat));
    fd.append('longitude', String(coords.lng));
    fd.append('gps_accuracy_m', String(coords.accuracy));
    fd.append('notes', captureNotes);

    try {
      const res = await apiFetch<{ evidence: EvidenceRecord; authenticity_notice: string }>('/evidence', {
        method: 'POST',
        body: fd,
        isFormData: true,
      });
      setFeedback(
        `Evidence uploaded (SHA-256: ${res.evidence.sha256_hash.slice(0, 16)}...). Inside boundary: ${
          res.evidence.within_boundary === null
            ? 'No boundary polygon'
            : res.evidence.within_boundary
              ? 'YES'
              : 'NO'
        }.`
      );
      setCapturedBlob(null);
      setCapturedPreview(null);
      setCaptureNotes('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evidence upload failed');
    }
  };

  const submitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      await apiFetch('/evidence/surveys', {
        method: 'POST',
        body: JSON.stringify({
          project_id: selectedProjectId,
          surveyor_name: survey.surveyor_name,
          survey_date: survey.survey_date,
          method: survey.method,
          measured_length_m: survey.measured_length_m ? Number(survey.measured_length_m) : null,
          measured_width_m: survey.measured_width_m ? Number(survey.measured_width_m) : null,
          measured_area_sqm: survey.measured_area_sqm ? Number(survey.measured_area_sqm) : null,
          measured_thickness_mm: survey.measured_thickness_mm ? Number(survey.measured_thickness_mm) : null,
          material_test_summary: survey.material_test_summary,
          notes: survey.notes,
        }),
      });
      setFeedback('Independent survey recorded and comparison engine updated.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save survey');
    }
  };

  const reviewEvidence = async (id: string, status: 'verified' | 'flagged' | 'rejected') => {
    const notes = window.prompt(`Enter review notes for marking evidence as ${status}:`) || 'Reviewed by officer';
    try {
      await apiFetch(`/evidence/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status: status, review_notes: notes }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    }
  };

  const verifyComparison = async (id: string) => {
    const notes = window.prompt('Enter officer verification notes:') || 'Verified after field review';
    try {
      await apiFetch(`/evidence/comparisons/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ result_status: 'verified_by_officer', review_notes: notes }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const runSatelliteCheck = async () => {
    setError(null);
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;
    const bbox: [number, number, number, number] = [proj.lng - 0.01, proj.lat - 0.01, proj.lng + 0.01, proj.lat + 0.01];
    try {
      const res = await apiFetch<typeof satResult>('/evidence/satellite/compare', {
        method: 'POST',
        body: JSON.stringify({ project_id: proj.id, bbox, before_date: beforeDate, after_date: afterDate }),
      });
      setSatResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Satellite check failed');
    }
  };

  const isStaff = profile && profile.accountStatus === 'active' && ['officer', 'admin'].includes(profile.role);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-forest-green">
            Independent Evidence &amp; Comparison Engine
          </h1>
          <p className="text-sm text-dark-blue-grey">
            Compare submitted project specifications against GPS field observations and independent physical surveys. Source specifications may be unverified.
          </p>
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm bg-white min-w-[260px]"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_code} — {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mandatory Integrity Disclaimer */}
      <div className="bg-warm-ivory border border-champagne rounded-xl p-3.5 text-xs text-charcoal flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
        <div>
          <strong>Verification Safeguard:</strong> GPS coordinates, timestamps, photographs, and SHA-256 hashes establish upload integrity only and do <strong>not</strong> prove real-world authenticity. Discrepancies indicate measurement variance requiring human officer inspection—never an automatic accusation of misconduct.
        </div>
      </div>

      {error && <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta p-3 rounded-lg text-sm">{error}</div>}
      {feedback && <div className="bg-success-green/10 border border-success-green/30 text-success-green p-3 rounded-lg text-sm">{feedback}</div>}

      {/* Comparison Results Table */}
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3 overflow-x-auto">
        <h2 className="text-lg font-semibold text-forest-green">Specification vs. Independent Measurement Comparison</h2>
        <table className="w-full text-left text-xs border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-charcoal/15 text-dark-blue-grey">
              <th className="py-2 pr-3">Project / Metric</th>
              <th className="py-2 pr-3">Source Spec (unverified)</th>
              <th className="py-2 pr-3">Measured</th>
              <th className="py-2 pr-3">Difference</th>
              <th className="py-2 pr-3">Coverage</th>
              <th className="py-2 pr-3">Result Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/10">
            {comparisons.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="py-3 pr-3">
                  <div className="font-semibold text-forest-green">{c.project_name || 'Project'}</div>
                  <div className="text-charcoal/80">{c.metric_name}</div>
                  <div className="text-[11px] text-dark-blue-grey mt-1 max-w-md">{c.limitations}</div>
                </td>
                <td className="py-3 pr-3 font-medium">
                  {c.official_value !== null ? `${c.official_value} ${c.unit}` : 'N/A'}
                </td>
                <td className="py-3 pr-3 font-medium">
                  {c.measured_value !== null ? `${c.measured_value} ${c.unit}` : 'Pending'}
                </td>
                <td className="py-3 pr-3">
                  {c.difference_value !== null ? `${c.difference_value > 0 ? '+' : ''}${c.difference_value} ${c.unit}` : '—'}
                </td>
                <td className="py-3 pr-3 font-semibold">
                  {c.coverage_pct !== null ? `${c.coverage_pct}%` : '—'}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded font-medium ${
                      c.result_status === 'verified_by_officer' || c.result_status === 'consistent'
                        ? 'bg-success-green/15 text-success-green'
                        : c.result_status === 'possible_discrepancy'
                          ? 'bg-terracotta/15 text-terracotta'
                          : 'bg-champagne/25 text-charcoal'
                    }`}
                  >
                    {c.result_status === 'possible_discrepancy' && <AlertTriangle className="w-3 h-3" />}
                    {c.result_status === 'verified_by_officer' && <CheckCircle2 className="w-3 h-3" />}
                    {c.result_status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-3">
                  {isStaff && c.result_status !== 'verified_by_officer' && (
                    <button
                      type="button"
                      onClick={() => verifyComparison(c.id)}
                      className="px-2.5 py-1 rounded bg-forest-green text-white font-medium"
                    >
                      Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* GPS Camera Capture */}
        <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-4">
          <div className="flex items-center gap-2 text-forest-green">
            <Camera className="w-5 h-5" />
            <h2 className="text-lg font-semibold">GPS Camera Evidence Capture</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startGpsCamera}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-forest-green text-white text-xs font-medium"
            >
              <MapPin className="w-3.5 h-3.5" />
              Request Camera &amp; GPS
            </button>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-charcoal/20 text-xs font-medium cursor-pointer hover:bg-warm-ivory">
              Upload Fresh Photo File
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setCapturedBlob(f);
                    setCapturedPreview(URL.createObjectURL(f));
                  }
                }}
              />
            </label>
          </div>

          {coords && (
            <div className="text-xs bg-warm-ivory rounded-lg p-2.5 font-mono">
              GPS: {coords.lat}, {coords.lng} (±{coords.accuracy}m)
            </div>
          )}

          {cameraActive && (
            <div className="space-y-2">
              <video ref={videoRef} className="w-full rounded-lg bg-black max-h-60 object-cover" muted playsInline />
              <button type="button" onClick={capturePhoto} className="px-4 py-2 rounded-lg bg-champagne text-charcoal text-xs font-semibold">
                Capture Frame
              </button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {capturedPreview && (
            <img src={capturedPreview} alt="Captured evidence preview" className="w-full max-h-56 object-cover rounded-lg border border-charcoal/15" />
          )}

          <form onSubmit={submitEvidence} className="space-y-3">
            <textarea
              value={captureNotes}
              onChange={(e) => setCaptureNotes(e.target.value)}
              placeholder="Field observation notes (visible surface condition, chainage, landmarks)..."
              className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
              rows={2}
            />
            <button
              type="submit"
              disabled={!profile || !capturedBlob || !coords}
              className="px-4 py-2 rounded-lg bg-champagne text-charcoal font-semibold text-sm disabled:opacity-50"
            >
              {profile ? 'Submit Evidence to Private Vault' : 'Sign in to Submit Evidence'}
            </button>
          </form>

          {evidenceList.length > 0 && (
            <div className="border-t border-charcoal/10 pt-3 space-y-2">
              <div className="text-xs font-semibold text-dark-blue-grey uppercase">Recorded Evidence ({evidenceList.length})</div>
              {evidenceList.map((ev) => (
                <div key={ev.id} className="p-2.5 rounded-lg bg-warm-ivory text-xs space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>{ev.file_name}</span>
                    <span className="capitalize">{ev.verification_status.replace('_', ' ')}</span>
                  </div>
                  <div className="font-mono text-[11px] text-dark-blue-grey">
                    SHA-256: {ev.sha256_hash.slice(0, 18)}... | In Boundary: {String(ev.within_boundary)}
                  </div>
                  {isStaff && ev.verification_status === 'pending_review' && (
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => reviewEvidence(ev.id, 'verified')} className="px-2 py-1 rounded bg-success-green text-white">Verify</button>
                      <button type="button" onClick={() => reviewEvidence(ev.id, 'flagged')} className="px-2 py-1 rounded bg-champagne text-charcoal">Flag</button>
                      <button type="button" onClick={() => reviewEvidence(ev.id, 'rejected')} className="px-2 py-1 rounded bg-terracotta text-white">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Independent Survey + Optional Sentinel-2 Module */}
        <div className="space-y-5">
          {isStaff && (
            <form onSubmit={submitSurvey} className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-forest-green">
                <Ruler className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Record Independent Survey Measurement</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <input required placeholder="Surveyor Name / Team" value={survey.surveyor_name} onChange={(e) => setSurvey({ ...survey, surveyor_name: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
                <input required type="date" value={survey.survey_date} onChange={(e) => setSurvey({ ...survey, survey_date: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
                <select value={survey.method} onChange={(e) => setSurvey({ ...survey, method: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 bg-white">
                  <option value="dgps">DGPS Survey</option>
                  <option value="total_station">Total Station</option>
                  <option value="measuring_wheel">Measuring Wheel</option>
                  <option value="core_cut_test">Core Cut Test</option>
                  <option value="laser_distometer">Laser Distometer</option>
                </select>
                <input placeholder="Measured Length (m)" type="number" step="0.01" value={survey.measured_length_m} onChange={(e) => setSurvey({ ...survey, measured_length_m: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
                <input placeholder="Measured Width (m)" type="number" step="0.01" value={survey.measured_width_m} onChange={(e) => setSurvey({ ...survey, measured_width_m: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
                <input placeholder="Measured Area (sq.m)" type="number" step="0.01" value={survey.measured_area_sqm} onChange={(e) => setSurvey({ ...survey, measured_area_sqm: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
                <input placeholder="Thickness (mm)" type="number" step="0.01" value={survey.measured_thickness_mm} onChange={(e) => setSurvey({ ...survey, measured_thickness_mm: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 sm:col-span-2" />
                <textarea placeholder="Material tests & field notes" value={survey.notes} onChange={(e) => setSurvey({ ...survey, notes: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 sm:col-span-2" rows={2} />
              </div>
              <button type="submit" className="px-4 py-2 rounded-lg bg-forest-green text-white text-sm font-medium">
                Save Survey &amp; Compute Comparison
              </button>
            </form>
          )}

          {/* Optional Copernicus Sentinel-2 Observation */}
          <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-forest-green">
              <Satellite className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Copernicus Sentinel-2 Observation (Optional)</h2>
            </div>
            <p className="text-xs text-dark-blue-grey">
              Queries cloud-filtered Sentinel-2 scenes when Copernicus credentials are configured. Resolution (10m) cannot verify narrow roads or pavement quality.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label>
                Before Date
                <input type="date" value={beforeDate} onChange={(e) => setBeforeDate(e.target.value)} className="mt-1 w-full rounded border border-charcoal/20 px-2.5 py-1.5" />
              </label>
              <label>
                After Date
                <input type="date" value={afterDate} onChange={(e) => setAfterDate(e.target.value)} className="mt-1 w-full rounded border border-charcoal/20 px-2.5 py-1.5" />
              </label>
            </div>
            <button
              type="button"
              disabled={!profile || !selectedProjectId}
              onClick={runSatelliteCheck}
              className="px-4 py-2 rounded-lg bg-muted-blue text-white text-xs font-medium disabled:opacity-50"
            >
              Query Sentinel-2 Catalog
            </button>
            {satResult && (
              <div className="text-xs bg-warm-ivory p-3 rounded-lg space-y-1">
                <div className="font-semibold">{satResult.configured ? 'Copernicus Query Result' : 'Copernicus Unconfigured'}</div>
                {satResult.message && <p>{satResult.message}</p>}
                {satResult.scenes && (
                  <p>Cloud-filtered scenes found: {satResult.scenes.length}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
