import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Plus, Upload, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { fetchProjectDetail, fetchProjectLookups, fetchProjects } from '../lib/projectData';
import type { Project } from '../types/domain';

interface ProjectDetailPayload {
  project: Project;
  sections: Array<{
    id: string;
    section_code: string;
    name: string;
    approved_length_m: number | null;
    approved_width_m: number | null;
    approved_area_sqm: number | null;
    approved_thickness_mm: number | null;
    status: string;
  }>;
  progress_history: Array<{
    id: string;
    reported_progress_pct: number;
    summary: string;
    source_type: string;
    reported_at: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    document_type: string;
    file_name: string;
    sha256_hash: string;
    extracted_text: string | null;
    source_name: string | null;
    created_at: string;
  }>;
}

export function ProjectsPage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [contractors, setContractors] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('selected'));
  const [detail, setDetail] = useState<ProjectDetailPayload | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create project form state (Admin only)
  const [newProj, setNewProj] = useState({
    project_code: '',
    name: '',
    description: '',
    department_id: '',
    contractor_id: '',
    category: 'road',
    ward: '',
    locality: '',
    pin_code: '',
    lat: '',
    lng: '',
    length_m: '',
    width_m: '',
    area_sqm: '',
    thickness_mm: '',
    budget_inr: '',
    source_name: '',
    source_url: '',
    data_classification: 'community',
  });

  // Progress update form state
  const [progressPct, setProgressPct] = useState('50');
  const [progressSummary, setProgressSummary] = useState('');

  // Document upload state
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('dpr');
  const [docFile, setDocFile] = useState<File | null>(null);

  const loadList = useCallback(async () => {
    setError(null);
    try {
      const [pRes, meta] = await Promise.all([fetchProjects(), fetchProjectLookups()]);
      setProjects(pRes.projects);
      setDepartments(meta.departments);
      setContractors(meta.contractors);
      if (meta.departments[0] && !newProj.department_id) {
        setNewProj((prev) => ({ ...prev, department_id: meta.departments[0].id }));
      }
      if (!selectedId && pRes.projects[0]) {
        setSelectedId(pRes.projects[0].id);
      }
    } catch (err) {
      setProjects([]);
      setDepartments([]);
      setContractors([]);
      setDetail(null);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  }, [selectedId, newProj.department_id]);

  useEffect(() => {
    loadList();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId) return;
    setDetail(null);
    fetchProjectDetail(selectedId)
      .then(setDetail)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load project details');
      });
  }, [selectedId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      const res = await apiFetch<{ project: { id: string } }>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          project_code: newProj.project_code,
          name: newProj.name,
          description: newProj.description,
          department_id: newProj.department_id,
          contractor_id: newProj.contractor_id || null,
          category: newProj.category,
          ward: newProj.ward,
          locality: newProj.locality,
          pin_code: newProj.pin_code,
          lat: Number(newProj.lat),
          lng: Number(newProj.lng),
          approved_specs: {
            length_m: Number(newProj.length_m) || undefined,
            width_m: Number(newProj.width_m) || undefined,
            area_sqm: Number(newProj.area_sqm) || undefined,
            thickness_mm: Number(newProj.thickness_mm) || undefined,
          },
          budget_inr: Number(newProj.budget_inr) || null,
          source_name: newProj.source_name,
          source_url: newProj.source_url,
          data_classification: newProj.data_classification,
        }),
      });
      setFeedback('Project created successfully.');
      setShowCreate(false);
      await loadList();
      setSelectedId(res.project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setFeedback(null);
    try {
      await apiFetch(`/projects/${selectedId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          reported_progress_pct: Number(progressPct),
          summary: progressSummary,
        }),
      });
      setProgressSummary('');
      setFeedback('Progress report recorded.');
      const refreshed = await apiFetch<ProjectDetailPayload>(`/projects/${selectedId}`);
      setDetail(refreshed);
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Progress update failed');
    }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !docFile) return;
    setError(null);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append('file', docFile);
      fd.append('title', docTitle);
      fd.append('document_type', docType);
      await apiFetch(`/projects/${selectedId}/documents`, {
        method: 'POST',
        body: fd,
        isFormData: true,
      });
      setDocTitle('');
      setDocFile(null);
      setFeedback('Document uploaded to private storage with SHA-256 hash.');
      const refreshed = await apiFetch<ProjectDetailPayload>(`/projects/${selectedId}`);
      setDetail(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document upload failed');
    }
  };

  const openDocument = async (docId: string) => {
    if (!selectedId) return;
    try {
      const res = await apiFetch<{ signedUrl: string }>(`/projects/${selectedId}/documents/${docId}/url`);
      window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not obtain signed document URL');
    }
  };

  const isAdmin = profile?.role === 'admin' && profile.accountStatus === 'active';
  const canUpdateProgress =
    profile && profile.accountStatus === 'active' && ['admin', 'officer', 'contractor'].includes(profile.role);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-forest-green">
            Government Project Monitoring
          </h1>
          <p className="text-sm text-dark-blue-grey">
            Project specifications, reported progress, supporting documents, and source provenance. Submitted sources are not independently verified.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-dark-blue-grey bg-warm-ivory px-3 py-1.5 rounded-lg border border-charcoal/10">
            Reference Portals: WAMIS Odisha · ORAMS · Tenders Odisha · PPMS (Manual / Document Import)
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate((s) => !s)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-champagne text-charcoal font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta p-3 rounded-lg text-sm">{error}</div>}
      {feedback && <div className="bg-success-green/10 border border-success-green/30 text-success-green p-3 rounded-lg text-sm">{feedback}</div>}
      {showCreate && isAdmin && (
        <form onSubmit={handleCreateProject} className="bg-white rounded-xl border border-charcoal/15 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-forest-green">Create Infrastructure Project</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <input required placeholder="Project Code (e.g. BBI-RD-2026-01)" value={newProj.project_code} onChange={(e) => setNewProj({ ...newProj, project_code: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input required placeholder="Project Name" value={newProj.name} onChange={(e) => setNewProj({ ...newProj, name: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 md:col-span-2" />
            <select value={newProj.department_id} onChange={(e) => setNewProj({ ...newProj, department_id: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 bg-white">
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={newProj.contractor_id} onChange={(e) => setNewProj({ ...newProj, contractor_id: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 bg-white">
              <option value="">Unassigned Contractor</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={newProj.data_classification} onChange={(e) => setNewProj({ ...newProj, data_classification: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 bg-white">
              <option value="community">Community/manual source (unverified)</option>
              <option value="official">Government source claimed (unverified)</option>
              <option value="demo">DEMO DATA — NOT OFFICIAL</option>
            </select>
            <input required placeholder="Ward" value={newProj.ward} onChange={(e) => setNewProj({ ...newProj, ward: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input required placeholder="Locality" value={newProj.locality} onChange={(e) => setNewProj({ ...newProj, locality: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input placeholder="PIN Code" value={newProj.pin_code} onChange={(e) => setNewProj({ ...newProj, pin_code: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input required placeholder="Latitude" value={newProj.lat} onChange={(e) => setNewProj({ ...newProj, lat: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input required placeholder="Longitude" value={newProj.lng} onChange={(e) => setNewProj({ ...newProj, lng: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input placeholder="Budget INR" value={newProj.budget_inr} onChange={(e) => setNewProj({ ...newProj, budget_inr: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input placeholder="Approved Length (m)" value={newProj.length_m} onChange={(e) => setNewProj({ ...newProj, length_m: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input placeholder="Approved Width (m)" value={newProj.width_m} onChange={(e) => setNewProj({ ...newProj, width_m: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input placeholder="Approved Area (sq.m)" value={newProj.area_sqm} onChange={(e) => setNewProj({ ...newProj, area_sqm: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <input required placeholder="Source name (state 'Unverified' if unknown)" value={newProj.source_name} onChange={(e) => setNewProj({ ...newProj, source_name: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 md:col-span-2" />
            <input placeholder="Source URL (optional)" value={newProj.source_url} onChange={(e) => setNewProj({ ...newProj, source_url: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2" />
            <textarea required placeholder="Project description & scope" value={newProj.description} onChange={(e) => setNewProj({ ...newProj, description: e.target.value })} className="rounded-lg border border-charcoal/20 px-3 py-2 md:col-span-3" rows={2} />
          </div>
          <button type="submit" className="px-5 py-2 rounded-lg bg-forest-green text-white text-sm font-medium">
            Save Project
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Project Selector List */}
        <div className="bg-white rounded-xl border border-charcoal/10 p-4 space-y-2.5 max-h-[700px] overflow-y-auto">
          <h2 className="text-sm font-semibold text-dark-blue-grey uppercase tracking-wider">
            Registered Projects ({projects.length})
          </h2>
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedId === p.id ? 'border-secondary-green bg-secondary-green/10' : 'border-charcoal/10 hover:bg-warm-ivory'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-blue font-semibold">{p.project_code}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-warm-ivory border border-charcoal/15">
                  {p.is_demo || p.data_classification === 'demo'
                    ? 'DEMO DATA'
                    : p.data_classification === 'official'
                      ? 'SOURCE CLAIM - UNVERIFIED'
                      : 'UNVERIFIED SOURCE'}
                </span>
              </div>
              <div className="font-medium text-sm text-forest-green mt-1">{p.name}</div>
              <div className="text-xs text-dark-blue-grey mt-1">
                {p.ward} · {p.official_progress_pct}% reported
              </div>
            </button>
          ))}
        </div>

        {/* Project Details */}
        <div className="lg:col-span-2 space-y-4">
          {detail ? (
            <>
              <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-muted-blue">{detail.project.project_code}</span>
                      {(detail.project.is_demo || detail.project.data_classification === 'demo') ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-champagne/25 border border-champagne">
                          DEMO DATA — NOT OFFICIAL GOVERNMENT DATA
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-warm-ivory border border-charcoal/15">
                          Source information not independently verified
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-forest-green mt-1">{detail.project.name}</h2>
                  </div>
                </div>

                <p className="text-sm text-charcoal/85">{detail.project.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-warm-ivory p-3.5 rounded-lg">
                  <div>
                    <span className="text-dark-blue-grey block">Length</span>
                    <span className="font-semibold">{detail.project.approved_specs?.length_m ?? 'N/A'} m</span>
                  </div>
                  <div>
                    <span className="text-dark-blue-grey block">Width</span>
                    <span className="font-semibold">{detail.project.approved_specs?.width_m ?? 'N/A'} m</span>
                  </div>
                  <div>
                    <span className="text-dark-blue-grey block">Area</span>
                    <span className="font-semibold">{detail.project.approved_specs?.area_sqm ?? 'N/A'} sq.m</span>
                  </div>
                  <div>
                    <span className="text-dark-blue-grey block">Thickness</span>
                    <span className="font-semibold">{detail.project.approved_specs?.thickness_mm ?? 'N/A'} mm</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-dark-blue-grey border-t border-charcoal/10 pt-3">
                  <span>Source provided: {detail.project.source_name} (not independently verified)</span>
                  {detail.project.source_url && (
                    <a href={detail.project.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-blue hover:underline">
                      Open reference URL <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Progress History & Update */}
              <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-4">
                <h3 className="font-semibold text-forest-green">Progress History &amp; Reporting</h3>
                {canUpdateProgress && (
                  <form onSubmit={handleProgressSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={progressPct}
                      onChange={(e) => setProgressPct(e.target.value)}
                      placeholder="%"
                      className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
                    />
                    <input
                      required
                      value={progressSummary}
                      onChange={(e) => setProgressSummary(e.target.value)}
                      placeholder="Work summary..."
                      className="sm:col-span-2 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded-lg bg-champagne text-charcoal font-semibold text-sm px-4 py-2">
                      Update Progress
                    </button>
                  </form>
                )}

                <div className="space-y-2 text-xs">
                  {detail.progress_history.length === 0 ? (
                    <p className="text-dark-blue-grey">No progress updates recorded yet.</p>
                  ) : (
                    detail.progress_history.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-lg bg-warm-ivory flex items-center justify-between gap-3">
                        <div>
                          <span className="font-semibold">{item.reported_progress_pct}%</span> — {item.summary}
                        </div>
                        <span className="text-dark-blue-grey shrink-0">{item.source_type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-4">
                <h3 className="font-semibold text-forest-green">Supporting Documents</h3>
                {profile && ['admin', 'officer'].includes(profile.role) && profile.accountStatus === 'active' && (
                  <form onSubmit={handleDocUpload} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      required
                      placeholder="Document title"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
                    />
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm bg-white"
                    >
                      <option value="dpr">DPR</option>
                      <option value="tender">Tender</option>
                      <option value="work_order">Work Order</option>
                      <option value="specification">Specification</option>
                      <option value="inspection_report">Inspection Report</option>
                    </select>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.csv"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="text-xs py-1.5"
                    />
                    <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-forest-green text-white text-sm font-medium px-3 py-2">
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                  </form>
                )}

                {detail.documents.length === 0 ? (
                  <p className="text-xs text-dark-blue-grey">No uploaded documents yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.documents.map((doc) => (
                      <div key={doc.id} className="p-3 rounded-lg border border-charcoal/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-semibold text-forest-green flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> {doc.title} ({doc.document_type})
                          </div>
                          <div className="text-dark-blue-grey font-mono text-[11px] mt-0.5">
                            SHA-256: {doc.sha256_hash.slice(0, 20)}...
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDocument(doc.id)}
                          className="px-3 py-1.5 rounded bg-muted-blue text-white font-medium"
                        >
                          Signed Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-charcoal/10 p-8 text-sm text-dark-blue-grey">
              Select a project to view its approved specifications and documentation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
