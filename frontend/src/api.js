async function req(path, opts = {}) {
  const res = await fetch('/api' + path, opts)
  if (!res.ok) {
    let msg = res.statusText
    try { const j = await res.json(); msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail) } catch {}
    throw new Error(msg)
  }
  return res.json()
}
const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const api = {
  fileToText: (file) => { const fd = new FormData(); fd.append('file', file); return req('/documents/extract-text', { method: 'POST', body: fd }) },
  extract: (text) => req('/ai/extract', json({ text })),
  investigate: (text, form) => req('/ai/investigate', json({ text, form })),
  list: () => req('/investigations'),
  get: (id) => req('/investigations/' + id),
  save: (payload) => req('/investigations', json(payload)),
  remove: (id) => req('/investigations/' + id, { method: 'DELETE' }),
}
