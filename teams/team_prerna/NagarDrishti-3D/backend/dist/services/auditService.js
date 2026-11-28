import { getSupabaseAdmin } from '../config/supabase.js';
export async function recordAuditLog(entry) {
    const admin = getSupabaseAdmin();
    if (!admin)
        return;
    const { error } = await admin.from('audit_logs').insert({
        actor_id: entry.actorId ?? null,
        actor_role: entry.actorRole,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        metadata: entry.metadata ?? {},
        ip_address: entry.ipAddress ?? null,
    });
    if (error) {
        console.error('[AuditLog] Failed to insert audit log:', error.message);
    }
}
export async function createNotification(params) {
    const admin = getSupabaseAdmin();
    if (!admin)
        return;
    const { error } = await admin.from('notifications').insert({
        user_id: params.userId,
        title: params.title,
        body: params.body,
        category: params.category,
        reference_type: params.referenceType ?? null,
        reference_id: params.referenceId ?? null,
    });
    if (error) {
        console.error('[Notifications] Failed to create notification:', error.message);
    }
}
