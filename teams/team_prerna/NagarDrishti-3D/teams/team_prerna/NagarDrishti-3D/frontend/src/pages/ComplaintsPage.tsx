import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, FileWarning, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { fetchProjectLookups, fetchProjects } from '../lib/projectData';
import type { Complaint, Project } from '../types/domain';

const CATEGORIES = [
  { value: 'potholes_damaged_roads', label: 'Potholes & Damaged Roads' },
  { value: 'broken_streetlights', label: 'Broken Streetlights' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'water_leakage', label: 'Water Leakage' },
  { value: 'blocked_drains', label: 'Blocked Drains' },
  { value: 'waterlogging', label: 'Waterlogging' },
  { value: 'damaged_infrastructure', label: 'Damaged Infrastructure' },
  { value: 'other', label: 'Other Civic Issues' },
];

export function ComplaintsPage() {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updates, setUpdates] = useState<Array<{ id: string; actor_role: string; new_status: string; comment: string; created_at: string; attachment_storage_path?: string | null }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New complaint form
  const [form, setForm] = useState({
    category: 'potholes_damaged_roads',
    title: '',
    description: '',
    address_text: '',
    ward: 'Ward 30',
    latitude: '20.2896',
    longitude: '85.8435',
    related_project_id: '',
    priority: 'medium',
  });
  const [photo, setPhoto] = useState<File | null>(null);

  // Officer assignment form
  const [assignContractorId, setAssignContractorId] = useState('');
  const [assignDeadline, setAssignDeadline] = useState(
    new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 10)
  );
  const [assignInstructions, setAssignInstructions] = useState('');

  // Contractor progress form
  const [contractorStatus, setContractorStatus] = useState<'In Progress' | 'Resolved Awaiting Verification'>('In Progress');
  const [contractorComment, setContractorComment] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);

  const loadComplaints = useCallback(async () => {
    try {
      const [pRes, metaRes] = await Promise.all([fetchProjects(), fetchProjectLookups()]);
      setProjects(pRes.projects);
      setContractors(metaRes.contractors);
      if (metaRes.contractors[0] && !assignContractorId) {
        setAssignContractorId(metaRes.contractors[0].id);
      }

      if (profile) {
        const cRes = await apiFetch<{ complaints: Complaint[] }>('/complaints');
        setComplaints(cRes.complaints);
      }
    } catch (err) {
      setProjects([]);
      setContractors([]);
      setComplaints([]);
      setError(err instanceof Error ? err.message : 'Failed to load complaints');
    }
  }, [profile, assignContractorId]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const openDetails = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    try {
      const res = await apiFetch<{ complaint: Complaint; updates: typeof updates }>(`/complaints/${complaint.id}`);
      setSelectedComplaint(res.complaint);
      setUpdates(res.updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch complaint history');
    }
  };

  const useDeviceGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((prev) => ({
        ...prev,
        latitude: pos.coords.latitude.toFixed(6),
        longitude: pos.coords.longitude.toFixed(6),
      }));
    });
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v) fd.append(k, v);
    });
    if (photo) fd.append('photo', photo);

    try {
      const res = await apiFetch<{ complaint: Complaint }>('/complaints', {
        method: 'POST',
        body: fd,
        isFormData: true,
      });
      setFeedback(`Complaint submitted! Tracking ID: ${res.complaint.complaint_code}`);
      setForm((prev) => ({ ...prev, title: '', description: '', address_text: '' }));
      setPhoto(null);
      await loadComplaints();
      await openDetails(res.complaint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit complaint');
    }
  };

  const reviewComplaint = async (status: 'Under Review' | 'Verified' | 'Rejected') => {
    if (!selectedComplaint) return;
    const comment = window.prompt(`Comment for marking complaint as "${status}":`) || status;
    let rejectionReason: string | undefined;
    if (status === 'Rejected') {
      rejectionReason = window.prompt('Enter rejection reason (required):') || '';
      if (!rejectionReason.trim()) return;
    }
    try {
      await apiFetch(`/complaints/${selectedComplaint.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment, rejection_reason: rejectionReason }),
      });
      await loadComplaints();
      await openDetails(selectedComplaint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review update failed');
    }
  };

  const assignComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      await apiFetch(`/complaints/${selectedComplaint.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          contractor_id: assignContractorId,
          deadline_at: assignDeadline,
          instructions: assignInstructions,
        }),
      });
      setAssignInstructions('');
      await loadComplaints();
      await openDetails(selectedComplaint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    }
  };

  const submitContractorProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    const fd = new FormData();
    fd.append('status', contractorStatus);
    fd.append('comment', contractorComment);
    if (completionPhoto) fd.append('photo', completionPhoto);
    try {
      await apiFetch(`/complaints/${selectedComplaint.id}/contractor-progress`, {
        method: 'PATCH',
        body: fd,
        isFormData: true,
      });
      setContractorComment('');
      setCompletionPhoto(null);
      await loadComplaints();
      await openDetails(selectedComplaint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Contractor update failed');
    }
  };

  const verifyClosure = async (status: 'Closed' | 'In Progress') => {
    if (!selectedComplaint) return;
    const comment = window.prompt(`Verification notes for marking "${status}":`) || status;
    try {
      await apiFetch(`/complaints/${selectedComplaint.id}/verify-closure`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment }),
      });
      await loadComplaints();
      await openDetails(selectedComplaint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Closure verification failed');
    }
  };

  const openComplaintPhoto = async (storagePath?: string) => {
    if (!selectedComplaint) return;
    try {
      const q = storagePath ? `?path=${encodeURIComponent(storagePath)}` : '';
      const res = await apiFetch<{ signedUrl: string }>(`/complaints/${selectedComplaint.id}/photo-url${q}`);
      window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch signed photo URL');
    }
  };

  const isStaff = profile && profile.accountStatus === 'active' && ['officer', 'admin'].includes(profile.role);
  const isContractor = profile && profile.accountStatus === 'active' && profile.role === 'contractor';

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-charcoal/10 p-5">
        <h1 className="text-xl lg:text-2xl font-semibold text-forest-green">Citizen Complaint Management</h1>
        <p className="text-sm text-dark-blue-grey">
          Private, role-scoped issue reporting, officer verification, contractor assignment, and resolution proof.
        </p>
      </div>

      {error && <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta p-3 rounded-lg text-sm">{error}</div>}
      {feedback && <div className="bg-success-green/10 border border-success-green/30 text-success-green p-3 rounded-lg text-sm">{feedback}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Submit Complaint Form */}
        <form onSubmit={submitComplaint} className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-forest-green">Report Civic Issue</h2>
          {!profile && (
            <p className="text-xs text-terracotta bg-terracotta/10 p-2.5 rounded">
              Please sign in to submit or track a private complaint. Submissions are only accepted when the database is available.
            </p>
          )}
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm bg-white"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input
            required
            placeholder="Issue title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={3}
            placeholder="Describe the problem and landmark..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <input
              placeholder="Ward (e.g. Ward 30)"
              value={form.ward}
              onChange={(e) => setForm({ ...form, ward: e.target.value })}
              className="rounded-lg border border-charcoal/20 px-3 py-2"
            />
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border border-charcoal/20 px-3 py-2 bg-white"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              required
              placeholder="Latitude"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              className="rounded-lg border border-charcoal/20 px-3 py-2"
            />
            <input
              required
              placeholder="Longitude"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              className="rounded-lg border border-charcoal/20 px-3 py-2"
            />
          </div>
          <button
            type="button"
            onClick={useDeviceGps}
            className="inline-flex items-center gap-1.5 text-xs text-muted-blue font-medium hover:underline"
          >
            <MapPin className="w-3.5 h-3.5" /> Use Current GPS Location
          </button>

          <select
            value={form.related_project_id}
            onChange={(e) => setForm({ ...form, related_project_id: e.target.value })}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm bg-white"
          >
            <option value="">Link to Project (Optional)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>
            ))}
          </select>

          <div className="text-xs">
            <label className="block font-medium mb-1">Photograph Evidence (JPG/PNG/WEBP)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>

          <button
            type="submit"
            disabled={!profile}
            className="w-full py-2.5 rounded-lg bg-champagne text-charcoal font-semibold text-sm disabled:opacity-50"
          >
            Submit Complaint
          </button>
        </form>

        {/* Complaints Queue & Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-forest-green">
              {isStaff ? 'All Citizen Complaints' : isContractor ? 'Assigned Work Orders' : 'My Submitted Complaints'} ({complaints.length})
            </h2>
            {complaints.length === 0 ? (
              <p className="text-sm text-dark-blue-grey">
                {profile ? 'No complaints are visible for your account yet.' : 'No private complaint records are shown in this demo preview.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {complaints.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openDetails(c)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedComplaint?.id === c.id ? 'border-secondary-green bg-secondary-green/10' : 'border-charcoal/10 hover:bg-warm-ivory'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-muted-blue">{c.complaint_code}</span>
                      <span className="px-2 py-0.5 rounded bg-warm-ivory font-medium">{c.status}</span>
                    </div>
                    <div className="font-medium text-sm text-forest-green mt-1">{c.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedComplaint && (
            <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-muted-blue font-semibold">{selectedComplaint.complaint_code}</span>
                  <h3 className="text-lg font-semibold text-forest-green">{selectedComplaint.title}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-champagne/25">
                  {selectedComplaint.status}
                </span>
              </div>

              <p className="text-sm text-charcoal/85">{selectedComplaint.description}</p>
              {selectedComplaint.rejection_reason && (
                <div className="p-2.5 rounded-lg bg-terracotta/10 text-xs text-terracotta flex items-center gap-2">
                  <FileWarning className="w-4 h-4 shrink-0" />
                  <span>Rejection reason: {selectedComplaint.rejection_reason}</span>
                </div>
              )}

              {selectedComplaint.photo_storage_path && (
                <button
                  type="button"
                  onClick={() => openComplaintPhoto(selectedComplaint.photo_storage_path || undefined)}
                  className="px-3 py-1.5 rounded bg-muted-blue text-white text-xs font-medium"
                >
                  View Private Complaint Photo (Signed URL)
                </button>
              )}

              {/* Officer Actions */}
              {isStaff && (
                <div className="border-t border-charcoal/10 pt-3 space-y-3">
                  <div className="text-xs font-semibold uppercase text-dark-blue-grey">Officer Review &amp; Assignment</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => reviewComplaint('Under Review')} className="px-3 py-1.5 rounded bg-muted-blue text-white text-xs">Mark Under Review</button>
                    <button type="button" onClick={() => reviewComplaint('Verified')} className="px-3 py-1.5 rounded bg-success-green text-white text-xs">Verify Issue</button>
                    <button type="button" onClick={() => reviewComplaint('Rejected')} className="px-3 py-1.5 rounded bg-terracotta text-white text-xs">Reject with Reason</button>
                    {selectedComplaint.status === 'Resolved Awaiting Verification' && (
                      <>
                        <button type="button" onClick={() => verifyClosure('Closed')} className="px-3 py-1.5 rounded bg-forest-green text-white text-xs">Verify Completion &amp; Close</button>
                        <button type="button" onClick={() => verifyClosure('In Progress')} className="px-3 py-1.5 rounded bg-champagne text-charcoal text-xs">Reopen Work</button>
                      </>
                    )}
                  </div>

                  <form onSubmit={assignComplaint} className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <select value={assignContractorId} onChange={(e) => setAssignContractorId(e.target.value)} className="rounded border border-charcoal/20 px-2.5 py-2 bg-white">
                      {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="date" value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)} className="rounded border border-charcoal/20 px-2.5 py-2" />
                    <input required placeholder="Work instructions..." value={assignInstructions} onChange={(e) => setAssignInstructions(e.target.value)} className="rounded border border-charcoal/20 px-2.5 py-2" />
                    <button type="submit" className="sm:col-span-3 py-2 rounded bg-forest-green text-white font-medium">
                      Assign Contractor &amp; Deadline
                    </button>
                  </form>
                </div>
              )}

              {/* Contractor Action */}
              {isContractor && (
                <form onSubmit={submitContractorProgress} className="border-t border-charcoal/10 pt-3 space-y-2 text-xs">
                  <div className="font-semibold uppercase text-dark-blue-grey">Contractor Work Update</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select value={contractorStatus} onChange={(e) => setContractorStatus(e.target.value as 'In Progress' | 'Resolved Awaiting Verification')} className="rounded border border-charcoal/20 px-2.5 py-2 bg-white">
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved Awaiting Verification">Resolved Awaiting Verification</option>
                    </select>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCompletionPhoto(e.target.files?.[0] || null)} />
                  </div>
                  <input required placeholder="Progress or completion notes..." value={contractorComment} onChange={(e) => setContractorComment(e.target.value)} className="w-full rounded border border-charcoal/20 px-2.5 py-2" />
                  <button type="submit" className="px-4 py-2 rounded bg-champagne text-charcoal font-semibold">
                    Submit Work Update
                  </button>
                </form>
              )}

              {/* Timeline */}
              <div className="border-t border-charcoal/10 pt-3 space-y-2">
                <div className="text-xs font-semibold uppercase text-dark-blue-grey">Status History</div>
                {updates.map((u) => (
                  <div key={u.id} className="text-xs bg-warm-ivory p-2.5 rounded-lg flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold inline-flex items-center gap-1">
                        {u.new_status === 'Closed' ? <CheckCircle2 className="w-3.5 h-3.5 text-success-green" /> : <Clock className="w-3.5 h-3.5 text-muted-blue" />}
                        {u.new_status}
                      </span>{' '}
                      <span className="text-dark-blue-grey">({u.actor_role})</span> — {u.comment}
                    </div>
                    {u.attachment_storage_path && (
                      <button
                        type="button"
                        onClick={() => openComplaintPhoto(u.attachment_storage_path!)}
                        className="text-muted-blue underline shrink-0"
                      >
                        Photo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
