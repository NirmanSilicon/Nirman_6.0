import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Layers, Map as MapIcon, Search, ExternalLink } from 'lucide-react';
import { CityMap2D } from '../components/CityMap2D';
import { CityMap3D } from '../components/CityMap3D';
import { fetchProjectLookups, fetchProjects } from '../lib/projectData';
import type { Project } from '../types/domain';

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}

export function MapExplorerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (departmentId) params.set('departmentId', departmentId);
      if (category) params.set('category', category);
      if (status) params.set('status', status);

      const [projRes, metaRes] = await Promise.all([
        fetchProjects(params.toString() ? `?${params.toString()}` : ''),
        fetchProjectLookups(),
      ]);

      setProjects(projRes.projects);
      setDepartments(metaRes.departments.map((department) => ({
        ...department,
        code: department.code ?? '',
      })));
      if (projRes.projects.length > 0 && !selectedProject) {
        setSelectedProject(projRes.projects[0]);
      }
    } catch (err) {
      setProjects([]);
      setDepartments([]);
      setSelectedProject(null);
      setError(err instanceof Error ? err.message : 'Failed to load spatial data');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, departmentId, category, status, selectedProject]);

  useEffect(() => {
    loadData();
  }, [departmentId, category, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setFlyToCoords({ lat: project.lat, lng: project.lng });
  }, []);

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-charcoal/10 p-4 lg:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-forest-green">
              Interactive 3D City Infrastructure Map
            </h1>
            <p className="text-sm text-dark-blue-grey">
              Explore projects across Bhubaneswar by ward, locality, PIN code, department, and verification status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBoundaries((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${
                showBoundaries
                  ? 'bg-secondary-green text-white border-secondary-green'
                  : 'bg-white text-charcoal border-charcoal/20'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Boundaries
            </button>

            <div className="inline-flex rounded-lg border border-charcoal/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('3d')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${
                  mode === '3d' ? 'bg-forest-green text-white' : 'bg-white text-charcoal'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                3D Cesium
              </button>
              <button
                type="button"
                onClick={() => setMode('2d')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${
                  mode === '2d' ? 'bg-forest-green text-white' : 'bg-white text-charcoal'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                2D Fallback
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData();
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          <div className="lg:col-span-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-dark-blue-grey absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, ward, locality, PIN (e.g. 751007, Patia)..."
                className="w-full rounded-lg border border-charcoal/20 pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-champagne text-charcoal font-semibold text-sm hover:opacity-90"
            >
              Search
            </button>
          </div>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Categories</option>
            <option value="road">Road</option>
            <option value="drainage">Drainage</option>
            <option value="streetlight">Streetlight</option>
            <option value="park">Park &amp; Green</option>
            <option value="water_supply">Water Supply</option>
            <option value="building">Building</option>
            <option value="public_transport">Public Transport</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed_claimed">Completed (Claimed)</option>
            <option value="under_verification">Under Verification</option>
            <option value="verified">Verified</option>
            <option value="halted">Halted</option>
          </select>
        </form>
      </div>

      {error && (
        <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta text-sm rounded-lg p-3">
          {error}
        </div>
      )}
      {/* Map + Details Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-xl border border-charcoal/10 p-3">
          {mode === '3d' ? (
            <CityMap3D
              projects={projects}
              selectedProjectId={selectedProject?.id ?? null}
              onSelectProject={handleSelectProject}
              showBoundaries={showBoundaries}
              flyToCoords={flyToCoords}
            />
          ) : (
            <CityMap2D
              projects={projects}
              selectedProjectId={selectedProject?.id ?? null}
              onSelectProject={handleSelectProject}
              showBoundaries={showBoundaries}
              flyToCoords={flyToCoords}
            />
          )}
        </div>

        <div className="space-y-4">
          {/* Selected Project Inspector */}
          <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3">
            {selectedProject ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono text-muted-blue font-semibold">
                      {selectedProject.project_code}
                    </span>
                    <h2 className="text-lg font-semibold text-forest-green leading-snug mt-0.5">
                      {selectedProject.name}
                    </h2>
                  </div>
                  {(selectedProject.is_demo || selectedProject.data_classification === 'demo') ? (
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-champagne/25 text-charcoal border border-champagne">
                      DEMO DATA
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-warm-ivory text-charcoal border border-charcoal/15">
                      SOURCE UNVERIFIED
                    </span>
                  )}
                </div>

                <p className="text-xs text-charcoal/80 leading-relaxed">{selectedProject.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs bg-warm-ivory p-3 rounded-lg">
                  <div>
                    <span className="text-dark-blue-grey block">Ward / Locality</span>
                    <span className="font-medium">{selectedProject.ward} · {selectedProject.locality}</span>
                  </div>
                  <div>
                    <span className="text-dark-blue-grey block">PIN Code</span>
                    <span className="font-medium">{selectedProject.pin_code || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-dark-blue-grey block">Reported Progress (unverified)</span>
                    <span className="font-semibold text-forest-green">{selectedProject.official_progress_pct}%</span>
                  </div>
                  <div>
                    <span className="text-dark-blue-grey block">Status</span>
                    <span className="font-medium capitalize">{selectedProject.status.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-dark-blue-grey block">Department</span>
                    <span className="font-medium">{selectedProject.department_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-dark-blue-grey block">Budget (INR)</span>
                    <span className="font-medium">
                      {selectedProject.budget_inr
                        ? `₹${Number(selectedProject.budget_inr).toLocaleString('en-IN')}`
                        : 'Unavailable'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-dark-blue-grey border-t border-charcoal/10 pt-2.5 space-y-1">
                  <div>
                    <strong>Source provided (unverified):</strong> {selectedProject.source_name}
                  </div>
                  {selectedProject.source_url && (
                    <a
                      href={selectedProject.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-muted-blue hover:underline"
                    >
                      Open reference URL <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    to={`/projects?selected=${selectedProject.id}`}
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-forest-green text-white text-xs font-medium hover:bg-secondary-green"
                  >
                    Full Project Record
                  </Link>
                  <Link
                    to={`/evidence?projectId=${selectedProject.id}`}
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-champagne text-charcoal text-xs font-semibold hover:opacity-90"
                  >
                    Verify / Evidence
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-dark-blue-grey">
                {loading ? 'Loading map features...' : 'Select a project marker or polygon on the map.'}
              </p>
            )}
          </div>

          {/* Matching Projects Quick List */}
          <div className="bg-white rounded-xl border border-charcoal/10 p-4 space-y-2 max-h-[260px] overflow-y-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-dark-blue-grey">
              Matching Projects ({projects.length})
            </div>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProject(p)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                  selectedProject?.id === p.id
                    ? 'border-secondary-green bg-secondary-green/10'
                    : 'border-charcoal/10 hover:bg-warm-ivory'
                }`}
              >
                <div className="font-semibold text-forest-green truncate">{p.name}</div>
                <div className="text-dark-blue-grey mt-0.5">
                  {p.ward} · {p.locality} · {p.official_progress_pct}% reported
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
