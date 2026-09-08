// Tracks every uploaded case file so access can be authorised centrally and
// audited. Cloudinary itself already stores case files as `authenticated`
// (private) assets and downloads are short-lived signed URLs — see
// src/utils/filePolicy.js. This is the durable index of what exists.
const { pool, query } = require('../db/pool');
const records = require('../db/records');
const { nextId } = require('../utils/ids');
records.register('file_references');

async function record({ resourceType, resourceId, cloudinaryPublicId, resourceKind, accessMode = 'authenticated', category, stageType, bytes, uploadedBy }) {
  if (!resourceId || !cloudinaryPublicId) return null;
  const row = {
    id: nextId('file', 'FIL-'),
    resourceType: resourceType || 'job_order', resourceId: String(resourceId),
    cloudinaryPublicId, resourceKind: resourceKind || null, accessMode,
    category: category || null, stageType: stageType || null, bytes: bytes || null,
    uploadedBy: uploadedBy || null, createdAt: new Date()
  };
  try { await records.put('file_references', row); } catch {}
  if (pool) {
    try {
      await query(
        `INSERT INTO file_references (resource_type, resource_id, cloudinary_public_id, resource_kind, access_mode, category, stage_type, bytes, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [row.resourceType, row.resourceId, cloudinaryPublicId, row.resourceKind, accessMode, row.category, row.stageType, row.bytes,
         /^[0-9a-f-]{36}$/i.test(uploadedBy || '') ? uploadedBy : null]);
    } catch (e) { console.error('[file_references]', e.code || e.message); }
  }
  return row;
}

async function listFor(resourceType, resourceId) {
  if (pool) {
    return (await query('SELECT * FROM file_references WHERE resource_type=$1 AND resource_id=$2 ORDER BY created_at DESC', [resourceType, String(resourceId)])).rows;
  }
  return (await records.list('file_references', { limit: 1000 })).filter(f => f.resourceType === resourceType && f.resourceId === String(resourceId));
}

module.exports = { record, listFor };
