import { useDispatch, useSelector } from 'react-redux'
import { deleteSaved, openSaved } from '../store/rcaSlice'

export default function SavedList() {
  const d = useDispatch()
  const { saved, id } = useSelector((s) => s.rca)
  return (
    <div className="panel">
      <h2>Saved investigations</h2>
      {saved.length === 0 && <p className="hint">Nothing saved yet. Saved investigations appear here.</p>}
      <ul className="saved">
        {saved.map((r) => (
          <li key={r.id} className={r.id === id ? 'cur' : ''}>
            <button className="link" onClick={() => d(openSaved(r.id))}>
              <strong>{r.deviation_id || `#${r.id}`}</strong> {r.title || r.product_name || 'Untitled'}
              <span className="meta">{r.status}{r.severity ? ' · ' + r.severity : ''}</span>
            </button>
            <button className="x" aria-label="Delete" onClick={() => window.confirm('Delete this investigation?') && d(deleteSaved(r.id))}>×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
