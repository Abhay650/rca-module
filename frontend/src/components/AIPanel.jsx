import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { A, extractForm, runInvestigation, uploadFile } from '../store/rcaSlice'

export default function AIPanel() {
  const d = useDispatch()
  const fileRef = useRef()
  const [drag, setDrag] = useState(false)
  const { sourceText, fileName, busy, form, aiFields, analysed } = useSelector((s) => s.rca)
  const formReady = aiFields.length > 0 || form.description.trim().length > 0

  const onFile = (f) => f && d(uploadFile(f))

  return (
    <div className="panel ai">
      <h2>AI assistant</h2>
      <p className="hint">Add the incident report, an email or pasted notes. The assistant fills the RCA form, then investigates.</p>

      <div
        className={'drop' + (drag ? ' on' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current.click()}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileRef.current.click()}
      >
        {busy === 'upload' ? 'Reading document…' : fileName ? `Loaded: ${fileName}` : 'Drop a PDF, .eml or .txt here, or click to browse'}
        <input ref={fileRef} type="file" accept=".pdf,.txt,.eml" hidden onChange={(e) => onFile(e.target.files[0])} />
      </div>

      <label htmlFor="src">Incident text or email</label>
      <textarea id="src" rows={11} value={sourceText} placeholder="Paste the deviation report, investigation notes or email thread…"
        onChange={(e) => d(A.setSourceText(e.target.value))} />

      <button className="primary" disabled={!sourceText.trim() || !!busy} onClick={() => d(extractForm(sourceText))}>
        {busy === 'extract' ? 'Extracting…' : '1 · Extract and fill the form'}
      </button>
      <button className="primary alt" disabled={!formReady || !!busy} onClick={() => d(runInvestigation({ text: sourceText, form }))}>
        {busy === 'investigate' ? 'Investigating (5 Whys, fishbone, CAPA)…' : analysed ? 'Re-run investigation with my edits' : '2 · Investigate root cause and recommend CAPA'}
      </button>
      <p className="hint small">AI output is a draft. Root causes need evidence and confirmation by a qualified person.</p>
    </div>
  )
}
