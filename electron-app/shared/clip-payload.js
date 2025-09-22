const DEFAULT_MIME_TYPE = 'text/plain';

function normalizeClipPayload(input = {}) {
  if (!input || typeof input !== 'object') {
    throw new Error('Clip payload must be an object');
  }

  const type = input.type === 'url' ? 'url' : 'text';
  const content = typeof input.content === 'string' ? input.content : '';
  const title = typeof input.title === 'string' && input.title.trim() ? input.title : null;
  const mimeType = typeof input.mimeType === 'string' && input.mimeType ? input.mimeType : DEFAULT_MIME_TYPE;
  const source = typeof input.source === 'string' ? input.source : 'electron';
  const createdAt = input.createdAt || new Date().toISOString();

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Clip payload content is required');
  }
  if (trimmed.length > 10000) {
    throw new Error('Clip payload exceeds maximum supported length');
  }

  return {
    type,
    content: trimmed,
    title,
    mimeType,
    source,
    createdAt,
  };
}

module.exports = {
  DEFAULT_MIME_TYPE,
  normalizeClipPayload,
};
