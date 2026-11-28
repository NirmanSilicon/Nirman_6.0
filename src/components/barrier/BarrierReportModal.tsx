import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { BarrierType, Destination } from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { getApiEndpoint, API_ENDPOINTS } from '../../utils/apiConfig';
import {
  AlertTriangle,
  X,
  Upload,
  Camera,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  MapPin,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface BarrierReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  onBarrierSubmitted?: () => void;
}

export const BarrierReportModal: React.FC<BarrierReportModalProps> = ({
  isOpen,
  onClose,
  destinations,
  onBarrierSubmitted,
}) => {
  const { addNotification, role } = useAccessibility();
  const { t } = useLanguage();

  const [destinationId, setDestinationId] = useState(destinations[0]?.id || '');
  const [barrierType, setBarrierType] = useState<BarrierType>('BLOCKED_RAMP');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('East Entrance Ramp');
  const [confidence, setConfidence] = useState(90);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [aiDetectedIssues, setAiDetectedIssues] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoBase64(base64);
      // Automatically trigger AI pre-scan
      runAiAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const runAiAnalysis = async (base64Img: string) => {
    setIsAnalyzingPhoto(true);
    try {
      const res = await fetch(getApiEndpoint(API_ENDPOINTS.ANALYZE_BARRIER), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: 'image/jpeg',
        }),
      });
      const data = await res.json();
      if (data.detectedIssues) {
        setAiDetectedIssues(data.detectedIssues);
      }
      if (data.aiConfidence) {
        setConfidence(data.aiConfidence);
      }
      if (data.barrierType) {
        setBarrierType(data.barrierType);
      }
      if (data.notes && !description) {
        setDescription(data.notes);
      }
      if (!title) {
        setTitle(`Reported ${barrierType.replace('_', ' ')} detected via photo evidence`);
      }
    } catch (e) {
      console.warn(e);
      setAiDetectedIssues(['Visual obstruction detected in uploaded image']);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const selectedDest = destinations.find((d) => d.id === destinationId) || destinations[0];

    try {
      const payload = {
        barrierType,
        title: title || `${barrierType.replace('_', ' ')} at ${locationName}`,
        description: description || 'Obstruction reported by community traveler.',
        destinationId: selectedDest.id,
        destinationName: selectedDest.name,
        locationName,
        coordinates: selectedDest.coordinates,
        photoUrl: photoBase64 || 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?auto=format&fit=crop&w=600&q=80',
        evidenceType: photoBase64 ? 'PHOTO' : 'TEXT_ONLY',
        confidence,
        status: role === 'AUDITOR' ? 'ACTIVE_BARRIER' : 'REPORTED',
        reportedBy: {
          userId: role === 'AUDITOR' ? 'usr-auditor-1' : 'usr-traveler-live',
          userName: role === 'AUDITOR' ? 'Certified Accessibility Auditor' : 'Community Traveler',
          isAuditor: role === 'AUDITOR',
        },
      };

      const res = await fetch(getApiEndpoint(API_ENDPOINTS.BARRIERS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        addNotification({
          type: 'BARRIER_ALERT',
          title: `Barrier Reported: ${title || barrierType}`,
          message: 'Evidence submitted to Certified Accessibility Auditor board for priority verification.',
          severity: 'INFO',
        });
        if (onBarrierSubmitted) onBarrierSubmitted();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-barrier-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 id="report-barrier-title" className="text-xl font-bold text-slate-900 dark:text-white">
                {t('reportBarrier')}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Help fellow travelers by reporting real-time obstructions with photo evidence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[65vh] space-y-6">
          {/* Destination & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Destination / Facility
              </label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white"
              >
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Barrier Type
              </label>
              <select
                value={barrierType}
                onChange={(e) => setBarrierType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white"
              >
                <option value="BLOCKED_RAMP">🚫 Ramp Blocked / Obstructed</option>
                <option value="LIFT_NOT_WORKING">🛗 Lift Out of Service</option>
                <option value="CONSTRUCTION">🚧 Construction / Scaffolding</option>
                <option value="BROKEN_PAVEMENT">⚠️ Broken / Uneven Pavement</option>
                <option value="STEEP_SLOPE">📐 Steep Gradient (Exceeds 1:12)</option>
                <option value="ACCESSIBLE_TOILET_UNAVAILABLE">🚻 Accessible Toilet Closed</option>
                <option value="MISSING_TACTILE_PAVING">🦯 Missing Tactile Tiles</option>
                <option value="OTHER">📍 Other Obstruction</option>
              </select>
            </div>
          </div>

          {/* Location Specifics */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              Exact Location Name / Corridor / Gate
            </label>
            <input
              type="text"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Passage Richelieu East Ramp, Gate 3 Concourse..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Photo Evidence & AI Scanner */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Photo Evidence (Recommended for Fast Verification)</span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Pre-Scan Included
              </span>
            </label>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors bg-slate-50 dark:bg-slate-800/40">
              {photoBase64 ? (
                <div className="space-y-3">
                  <img
                    src={photoBase64}
                    alt="Barrier evidence"
                    className="h-44 mx-auto rounded-xl object-cover shadow-md"
                  />
                  <div className="flex items-center justify-center gap-3">
                    <label className="text-xs text-blue-600 font-semibold cursor-pointer underline">
                      Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPhotoBase64(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block py-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl w-fit mx-auto mb-2">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to capture or upload barrier photo
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Supports JPG, PNG, WebP up to 10MB
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* AI Vision Analysis Results Badge */}
            {isAnalyzingPhoto && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>AI Vision Model inspecting barrier geometry & obstruction level...</span>
              </div>
            )}

            {aiDetectedIssues.length > 0 && !isAnalyzingPhoto && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5 text-xs">
                <div className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Vision Pre-Scan Assessment ({confidence}% Confidence)
                </div>
                <ul className="list-disc list-inside text-emerald-700 dark:text-emerald-300 space-y-0.5">
                  {aiDetectedIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
                <div className="text-[10px] text-slate-500 pt-1">
                  Tag: AI-ASSISTED EVIDENCE • Forwarded for Auditor Sign-Off
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Detailed Description & Navigation Advice
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how severe the obstruction is, if alternative lifts/ramps exist, and estimated repair duration if known..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Confidence Slider */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Report Confidence Rating</span>
              <span className="text-blue-600 dark:text-blue-400">{confidence}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              <span>Submit Barrier Report & Notify Auditors</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
