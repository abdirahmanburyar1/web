-- Add composite indexes on payments for tenant-scoped list and filter queries.
-- (tenantId, recordedAt DESC): list/filter by date range, ORDER BY recordedAt DESC
-- (tenantId, status): filter by status, groupBy status for summary cards

CREATE INDEX IF NOT EXISTS "payments_tenantId_recordedAt_idx" ON "payments"("tenantId", "recordedAt" DESC);

CREATE INDEX IF NOT EXISTS "payments_tenantId_status_idx" ON "payments"("tenantId", "status");
