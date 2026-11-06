import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AIPanel from './components/AIPanel'
import RCAForm from './components/RCAForm'
import SavedList from './components/SavedList'
import { A, loadSaved } from './store/rcaSlice'

export default function App() {
  const d = useDispatch()
  const { error, notice, id, form } = useSelector((s) => s.rca)
  useEffect(() => { d(loadSaved()) }, [d])
  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Root Cause Analysis</h1>
          <p>{id ? `Editing investigation #${id}${form.deviation_id ? ' · ' + form.deviation_id : ''}` : 'New investigation · API manufacturing'}</p>
        </div>
        <button className="ghost" onClick={() => { d(A.newInvestigation()); d(loadSaved()) }}>New investigation</button>
      </header>
      {(error || notice) && (
        <div className={'banner ' + (error ? 'err' : 'ok')} role="status">
          <span>{error || notice}</span><button onClick={() => d(A.dismiss())} aria-label="Dismiss">×</button>
        </div>
      )}
      <main className="grid">
        <aside className="left"><AIPanel /><SavedList /></aside>
        <section className="right"><RCAForm /></section>
      </main>
    </div>
  )
}
