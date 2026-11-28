import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { AuditLogEntry } from '../../types/hospital';
import { EmptyState, SectionHeader, StatusText } from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

const CATEGORIES: ('All' | AuditLogEntry['category'])[] = [
  'All',
  'Record Access',
  'Alert Triage',
  'Referral Action',
  'Clinical Note',
  'Report Export',
  'Authentication',
];

export const AuditLogsView: React.FC = () => {
  const { appMode, auditLogs, currentUser, collectionStatuses, refreshAllSubscriptions } =
    useDashboard();
  const [categoryFilter, setCategoryFilter] = useState<'All' | AuditLogEntry['category']>('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return auditLogs.filter((entry) => {
      if (categoryFilter !== 'All' && entry.category !== categoryFilter) return false;
      if (q) {
        const hit =
          entry.id.toLowerCase().includes(q) ||
          entry.actorName.toLowerCase().includes(q) ||
          entry.action.toLowerCase().includes(q) ||
          entry.targetEntity.toLowerCase().includes(q) ||
          entry.authorizationBasis.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [auditLogs, categoryFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, safePage]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Audit Logs"
        subtitle={
          appMode === 'demo'
            ? 'Session governance trail in Demo Mode (stored locally; live Firestore auditLogs untouched).'
            : 'Chronological governance trail synced with the Firestore auditLogs collection.'
        }
        actions={
          <span className="text-xs text-[#665860] tabular-nums">
            <span className="font-semibold text-[#30232A]">{filteredLogs.length}</span> recorded events
          </span>
        }
      />

      <CollectionStateGate
        syncState={collectionStatuses.auditLogs}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading audit logs from Firestore..."
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#EAE9DC] rounded-md overflow-x-auto">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-[#890149] shadow-xs'
                      : 'text-[#665860] hover:text-[#30232A]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full xl:w-72">
            <Search className="w-4 h-4 text-[#665860] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor, record ID, action..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No audit events match your filter"
            description="Select All categories or clear your search input to inspect recorded activity."
          />
        ) : (
          <div className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                    <th className="py-3 px-5">Timestamp &amp; ID</th>
                    <th className="py-3 px-4">Staff / Role</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Recorded Action</th>
                    <th className="py-3 px-4">Target Record</th>
                    <th className="py-3 px-5">Authorization Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F3F3E7]/45">
                      <td className="py-3.5 px-5 whitespace-nowrap tabular-nums">
                        <p className="text-xs font-medium text-[#30232A]">{log.timestamp}</p>
                        <p className="text-[11px] text-[#665860]">{log.id}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-medium text-[#30232A]">{log.actorName}</p>
                        <p className="text-xs text-[#665860]">{log.actorRole}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText
                          label={log.category}
                          tone={
                            log.category === 'Alert Triage'
                              ? 'critical'
                              : log.category === 'Referral Action'
                              ? 'cherry'
                              : log.category === 'Record Access'
                              ? 'high'
                              : 'neutral'
                          }
                          className="text-xs"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#30232A] max-w-[260px]">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-[#30232A] tabular-nums whitespace-nowrap">
                        {log.targetEntity}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-[#665860] max-w-[240px]">
                        {log.authorizationBasis}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-[#EAE5D9] bg-[#FBFBF7] flex items-center justify-between text-xs text-[#665860]">
                <span className="tabular-nums">
                  Page <strong className="text-[#30232A]">{safePage}</strong> of {totalPages} ·{' '}
                  {filteredLogs.length} total events
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-white border border-[#DDD8CB] rounded hover:border-[#890149] disabled:opacity-45 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 bg-white border border-[#DDD8CB] rounded hover:border-[#890149] disabled:opacity-45 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </CollectionStateGate>
    </div>
  );
};
