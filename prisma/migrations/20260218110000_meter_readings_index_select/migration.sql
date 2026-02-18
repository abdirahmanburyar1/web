-- Composite index for meter list: orderBy meterNumber asc with tenantId filter
CREATE INDEX "meters_tenantId_meterNumber_idx" ON "meters"("tenantId", "meterNumber" ASC);

-- Composite index for meter readings list: filter by meterId, order by recordedAt desc
CREATE INDEX "meter_readings_meterId_recordedAt_idx" ON "meter_readings"("meterId", "recordedAt" DESC);
