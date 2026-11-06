import { useDispatch, useSelector } from 'react-redux'
import { A, saveInvestigation } from '../store/rcaSlice'

const lines = (v) => v.split('\n').map((x) => x.trim()).filter(Boolean)

function Field({ k, label, area, rows = 3, children }) {
  const d = useDispatch()
  const { form, aiFields } = useSelector((s) => s.rca)
  const ai = aiFields.includes(k)
  const props = { id: k, value: form[k] || '', onChange: (e) => d(A.setField({ key: k, value: e.target.value })) }
  return (
    <div className={'field' + (ai ? ' ai' : '')}>
      <label htmlFor={k}>{label}{ai && <em className="tag">AI filled</em>}</label>
      {children ? children(props) : area ? <textarea rows={rows} {...props} /> : <input {...props} />}
    </div>
  )
}

function Section({ title, note, children }) {
  return <section className="card"><h3>{title}</h3>{note && <p className="hint">{note}</p>}{children}</section>
}

export default function RCAForm() {
  const d = useDispatch()
  const r = useSelector((s) => s.rca)
  const { analysis, capas, analysed, status, confirmedBy, busy } = r
  const allConfirmed = analysis.root_causes.length > 0 && analysis.root_causes.every((x) => x.confirmed)

  const save = (target) => {
    d(A.setStatus(target))
    d(saveInvestigation({
      id: r.id, status: target, confirmed_by: confirmedBy, source_text: r.sourceText,
      form: r.form, analysis, capas,
    }))
  }

  return (
    <div className="form">
      <Section title="Deviation details">
        <div className="cols">
          <Field k="deviation_id" label="Deviation ID" />
          <Field k="severity" label="Severity">
            {(p) => <select {...p}><option value="">Select…</option><option>Minor</option><option>Major</option><option>Critical</option></select>}
          </Field>
        </div>
        <Field k="title" label="Title" />
        <div className="cols">
          <Field k="product_name" label="Product" />
          <Field k="batch_number" label="Batch number" />
        </div>
        <div className="cols">
          <Field k="process_step" label="Process step / equipment" />
          <Field k="date_detected" label="Date detected" />
        </div>
        <Field k="reported_by" label="Reported by" />
      </Section>

      <Section title="Event description">
        <Field k="description" label="What happened" area rows={5} />
        <Field k="immediate_action" label="Immediate action / containment" area />
        <Field k="impact_assessment" label="Impact assessment" area />
        <div className={'field' + (r.aiFields.includes('evidence_available') ? ' ai' : '')}>
          <label htmlFor="ev">Evidence available (one per line)</label>
          <textarea id="ev" rows={3} value={r.form.evidence_available.join('\n')}
            onChange={(e) => d(A.setField({ key: 'evidence_available', value: lines(e.target.value) }))} />
        </div>
      </Section>

      {!analysed && (
        <div className="empty">Run step 2 in the AI assistant to get the 5 Whys, fishbone, root cause suggestions, missing evidence and CAPA.</div>
      )}

      {analysed && <>
        <Section title="5 Whys" note="Edit any answer. Evidence shows what in the source supports the step.">
          <table className="t">
            <thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Evidence</th><th></th></tr></thead>
            <tbody>
              {analysis.why_analysis.map((w, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {['question', 'answer', 'evidence'].map((f) => (
                    <td key={f}><textarea rows={2} value={w[f]} onChange={(e) => d(A.editItem({ key: 'why_analysis', index: i, patch: { [f]: e.target.value } }))} /></td>
                  ))}
                  <td><button className="x" aria-label="Remove" onClick={() => d(A.removeItem({ key: 'why_analysis', index: i }))}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="ghost" onClick={() => d(A.addItem({ key: 'why_analysis', item: { level: analysis.why_analysis.length + 1, question: '', answer: '', evidence: '' } }))}>Add why</button>
        </Section>

        <Section title="Fishbone (Ishikawa)" note="One cause per line.">
          <div className="fish">
            {analysis.fishbone.map((f) => (
              <div key={f.category} className="bone">
                <label htmlFor={'fb' + f.category}>{f.category}</label>
                <textarea id={'fb' + f.category} rows={4} value={f.causes.join('\n')}
                  onChange={(e) => d(A.setFishbone({ category: f.category, causes: lines(e.target.value) }))} />
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="cf">Contributing factors (one per line)</label>
            <textarea id="cf" rows={3} value={analysis.contributing_factors.join('\n')} onChange={(e) => d(A.setContributing(lines(e.target.value)))} />
          </div>
        </Section>

        <Section title="Probable root causes" note="AI suggestions only. Tick Confirm once a qualified person has verified the cause against evidence.">
          {analysis.root_causes.map((rc, i) => (
            <div key={i} className={'rc ' + (rc.confirmed ? 'done' : '')}>
              <div className="rc-head">
                <span className={'badge ' + (rc.confirmed ? 'good' : 'warn')}>{rc.confirmed ? 'Confirmed' : 'AI suggestion'}</span>
                <span className={'badge ' + (rc.supported_by_evidence ? 'good' : 'mute')}>{rc.supported_by_evidence ? 'Evidence in document' : 'No direct evidence'}</span>
                <select value={rc.confidence} onChange={(e) => d(A.editItem({ key: 'root_causes', index: i, patch: { confidence: e.target.value } }))} aria-label="Confidence">
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
                <button className="x" aria-label="Remove" onClick={() => d(A.removeItem({ key: 'root_causes', index: i }))}>×</button>
              </div>
              <textarea rows={2} value={rc.cause} aria-label="Root cause" onChange={(e) => d(A.editItem({ key: 'root_causes', index: i, patch: { cause: e.target.value, confirmed: false } }))} />
              <textarea rows={2} value={rc.evidence_support} placeholder="Supporting evidence" aria-label="Evidence"
                onChange={(e) => d(A.editItem({ key: 'root_causes', index: i, patch: { evidence_support: e.target.value } }))} />
              <label className="chk"><input type="checkbox" checked={rc.confirmed}
                onChange={(e) => d(A.editItem({ key: 'root_causes', index: i, patch: { confirmed: e.target.checked, status: e.target.checked ? 'Confirmed' : 'AI Suggestion' } }))} />
                Confirm as root cause (verified against evidence)</label>
            </div>
          ))}
          <button className="ghost" onClick={() => d(A.addItem({ key: 'root_causes', item: { cause: '', category: '', evidence_support: '', supported_by_evidence: false, confidence: 'Low', confirmed: false, status: 'AI Suggestion' } }))}>Add root cause</button>
        </Section>

        <Section title="Missing evidence" note="Information still needed to close the investigation.">
          <ul className="miss">
            {analysis.missing_evidence.map((m, i) => (
              <li key={i}>
                <input value={m.item} aria-label="Missing item" onChange={(e) => d(A.editItem({ key: 'missing_evidence', index: i, patch: { item: e.target.value } }))} />
                <input value={m.reason} aria-label="Why needed" placeholder="Why it is needed" onChange={(e) => d(A.editItem({ key: 'missing_evidence', index: i, patch: { reason: e.target.value } }))} />
                <button className="x" aria-label="Remove" onClick={() => d(A.removeItem({ key: 'missing_evidence', index: i }))}>×</button>
              </li>
            ))}
          </ul>
          <button className="ghost" onClick={() => d(A.addItem({ key: 'missing_evidence', item: { item: '', reason: '' } }))}>Add item</button>
        </Section>

        <Section title="CAPA recommendations" note="Corrective actions fix this event. Preventive actions stop recurrence.">
          <table className="t">
            <thead><tr><th>Type</th><th>Action</th><th>Why</th><th>Owner</th><th>Days</th><th></th></tr></thead>
            <tbody>
              {capas.map((c, i) => (
                <tr key={i}>
                  <td><select value={c.type} onChange={(e) => d(A.editItem({ key: 'capas', index: i, patch: { type: e.target.value } }))}><option>Corrective</option><option>Preventive</option></select></td>
                  <td><textarea rows={3} value={c.action} onChange={(e) => d(A.editItem({ key: 'capas', index: i, patch: { action: e.target.value } }))} /></td>
                  <td><textarea rows={3} value={c.explanation} onChange={(e) => d(A.editItem({ key: 'capas', index: i, patch: { explanation: e.target.value } }))} /></td>
                  <td><input value={c.owner_role || ''} onChange={(e) => d(A.editItem({ key: 'capas', index: i, patch: { owner_role: e.target.value } }))} /></td>
                  <td><input type="number" min="0" className="num" value={c.due_in_days ?? ''} onChange={(e) => d(A.editItem({ key: 'capas', index: i, patch: { due_in_days: e.target.value === '' ? null : Number(e.target.value) } }))} /></td>
                  <td><button className="x" aria-label="Remove" onClick={() => d(A.removeItem({ key: 'capas', index: i }))}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="ghost" onClick={() => d(A.addItem({ key: 'capas', item: { type: 'Corrective', action: '', explanation: '', linked_root_cause: '', owner_role: '', due_in_days: null } }))}>Add CAPA</button>
        </Section>
      </>}

      <div className="savebar">
        <div className="field inline">
          <label htmlFor="cb">Reviewed by (qualified person)</label>
          <input id="cb" value={confirmedBy} onChange={(e) => d(A.setConfirmedBy(e.target.value))} placeholder="Name and role" />
        </div>
        <span className="status">Status: {status}</span>
        <button className="ghost" disabled={!!busy || !r.form.description} onClick={() => save(analysed ? 'Pending Review' : 'Draft')}>
          {busy === 'save' ? 'Saving…' : 'Save draft'}
        </button>
        <button className="primary" disabled={!!busy || !allConfirmed || !confirmedBy.trim()} onClick={() => save('Confirmed')}
          title={allConfirmed ? '' : 'Confirm every root cause and name the reviewer first'}>
          Save confirmed investigation
        </button>
      </div>
    </div>
  )
}
