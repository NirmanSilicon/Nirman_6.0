import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: 'citizen' | 'officer' | 'contractor' | 'admin';
  requested_role: string | null;
  account_status: 'active' | 'pending_approval' | 'suspended';
  department_id: string | null;
  contractor_id: string | null;
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [contractors, setContractors] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [logs, setLogs] = useState<Array<{ id: string; actor_role: string; action: string; entity_type: string; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [uRes, metaRes, logRes] = await Promise.all([
        apiFetch<{ users: AdminUserRow[] }>('/admin/users'),
        apiFetch<{ departments: Array<{ id: string; name: string }>; contractors: Array<{ id: string; name: string }> }>('/projects/meta/lookups'),
        apiFetch<{ logs: typeof logs }>('/admin/audit-logs'),
      ]);
      setUsers(uRes.users);
      setDepartments(metaRes.departments);
      setContractors(metaRes.contractors);
      setLogs(logRes.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin console');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateUser = async (
    u: AdminUserRow,
    patch: Partial<Pick<AdminUserRow, 'role' | 'account_status' | 'department_id' | 'contractor_id'>>
  ) => {
    setError(null);
    setFeedback(null);
    try {
      await apiFetch(`/admin/users/${u.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: patch.role ?? u.role,
          account_status: patch.account_status ?? u.account_status,
          department_id: patch.department_id !== undefined ? patch.department_id : u.department_id,
          contractor_id: patch.contractor_id !== undefined ? patch.contractor_id : u.contractor_id,
        }),
      });
      setFeedback(`Updated permissions for ${u.email}`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-forest-green" />
        <div>
          <h1 className="text-xl font-semibold text-forest-green">Administrator Governance Console</h1>
          <p className="text-sm text-dark-blue-grey">
            Approve Officer and Contractor accounts, assign organizations, and review immutable audit logs.
          </p>
        </div>
      </div>

      {error && <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta p-3 rounded-lg text-sm">{error}</div>}
      {feedback && <div className="bg-success-green/10 border border-success-green/30 text-success-green p-3 rounded-lg text-sm">{feedback}</div>}

      <div className="bg-white rounded-xl border border-charcoal/10 p-5 overflow-x-auto space-y-3">
        <h2 className="text-base font-semibold text-forest-green">User Accounts &amp; Role Approvals</h2>
        <table className="w-full text-left text-xs min-w-[760px]">
          <thead>
            <tr className="border-b border-charcoal/15 text-dark-blue-grey">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Requested</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Department / Contractor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/10">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-dark-blue-grey">{u.email}</div>
                </td>
                <td className="py-2.5 pr-3 capitalize">{u.requested_role || 'citizen'}</td>
                <td className="py-2.5 pr-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u, { role: e.target.value as AdminUserRow['role'] })}
                    className="rounded border border-charcoal/20 px-2 py-1 bg-white"
                  >
                    <option value="citizen">citizen</option>
                    <option value="officer">officer</option>
                    <option value="contractor">contractor</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="py-2.5 pr-3">
                  <select
                    value={u.account_status}
                    onChange={(e) => updateUser(u, { account_status: e.target.value as AdminUserRow['account_status'] })}
                    className="rounded border border-charcoal/20 px-2 py-1 bg-white"
                  >
                    <option value="active">active</option>
                    <option value="pending_approval">pending_approval</option>
                    <option value="suspended">suspended</option>
                  </select>
                </td>
                <td className="py-2.5 pr-3 flex gap-2">
                  <select
                    value={u.department_id || ''}
                    onChange={(e) => updateUser(u, { department_id: e.target.value || null })}
                    className="rounded border border-charcoal/20 px-2 py-1 bg-white"
                  >
                    <option value="">No Dept</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select
                    value={u.contractor_id || ''}
                    onChange={(e) => updateUser(u, { contractor_id: e.target.value || null })}
                    className="rounded border border-charcoal/20 px-2 py-1 bg-white"
                  >
                    <option value="">No Contractor</option>
                    {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-2">
        <h2 className="text-base font-semibold text-forest-green">Recent Protected Audit Logs</h2>
        <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
          {logs.map((l) => (
            <div key={l.id} className="p-2 rounded bg-warm-ivory flex justify-between gap-2">
              <span><strong>{l.action}</strong> ({l.entity_type}) by {l.actor_role}</span>
              <span className="text-dark-blue-grey font-mono">{new Date(l.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
