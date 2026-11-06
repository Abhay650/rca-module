import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '../api'

export const FISHBONE = ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment']
export const emptyForm = {
  deviation_id: '', title: '', product_name: '', batch_number: '', process_step: '', date_detected: '',
  reported_by: '', severity: '', description: '', immediate_action: '', impact_assessment: '', evidence_available: [],
}
const emptyAnalysis = () => ({
  why_analysis: [], fishbone: FISHBONE.map((c) => ({ category: c, causes: [] })),
  root_causes: [], contributing_factors: [], missing_evidence: [],
})
const initial = {
  id: null, sourceText: '', fileName: '', form: { ...emptyForm }, aiFields: [], analysis: emptyAnalysis(), capas: [],
  status: 'Draft', confirmedBy: '', saved: [], busy: '', error: '', notice: '', analysed: false,
}

const wrap = (fn) => async (arg, { rejectWithValue }) => { try { return await fn(arg) } catch (e) { return rejectWithValue(e.message) } }

export const uploadFile = createAsyncThunk('rca/upload', wrap((f) => api.fileToText(f)))
export const extractForm = createAsyncThunk('rca/extract', wrap((text) => api.extract(text)))
export const runInvestigation = createAsyncThunk('rca/investigate', wrap(({ text, form }) => api.investigate(text, form)))
export const loadSaved = createAsyncThunk('rca/list', wrap(() => api.list()))
export const openSaved = createAsyncThunk('rca/open', wrap((id) => api.get(id)))
export const deleteSaved = createAsyncThunk('rca/delete', wrap(async (id) => { await api.remove(id); return id }))
export const saveInvestigation = createAsyncThunk('rca/save', wrap((p) => api.save(p)))

const slice = createSlice({
  name: 'rca',
  initialState: initial,
  reducers: {
    setSourceText: (s, a) => { s.sourceText = a.payload },
    setField: (s, a) => { s.form[a.payload.key] = a.payload.value; s.aiFields = s.aiFields.filter((k) => k !== a.payload.key) },
    setStatus: (s, a) => { s.status = a.payload },
    setConfirmedBy: (s, a) => { s.confirmedBy = a.payload },
    // generic list editing: key is an analysis key or 'capas'
    editItem: (s, a) => { const { key, index, patch } = a.payload; const list = key === 'capas' ? s.capas : s.analysis[key]; Object.assign(list[index], patch) },
    addItem: (s, a) => { const { key, item } = a.payload; (key === 'capas' ? s.capas : s.analysis[key]).push(item) },
    removeItem: (s, a) => { const { key, index } = a.payload; (key === 'capas' ? s.capas : s.analysis[key]).splice(index, 1) },
    setFishbone: (s, a) => { s.analysis.fishbone.find((f) => f.category === a.payload.category).causes = a.payload.causes },
    setContributing: (s, a) => { s.analysis.contributing_factors = a.payload },
    newInvestigation: () => ({ ...initial, saved: [] }),
    dismiss: (s) => { s.error = ''; s.notice = '' },
  },
  extraReducers: (b) => {
    const pend = (name) => (s) => { s.busy = name; s.error = ''; s.notice = '' }
    const fail = (s, a) => { s.busy = ''; s.error = a.payload || a.error.message }
    b.addCase(uploadFile.pending, pend('upload')).addCase(uploadFile.rejected, fail)
      .addCase(uploadFile.fulfilled, (s, a) => { s.busy = ''; s.sourceText = a.payload.text; s.fileName = a.payload.filename })

    b.addCase(extractForm.pending, pend('extract')).addCase(extractForm.rejected, fail)
      .addCase(extractForm.fulfilled, (s, a) => {
        s.busy = ''
        const f = a.payload.form
        s.form = { ...emptyForm, ...f }
        s.aiFields = Object.keys(f).filter((k) => (Array.isArray(f[k]) ? f[k].length : f[k]))
        s.notice = 'Form populated from the document. Review each highlighted field before continuing.'
      })

    b.addCase(runInvestigation.pending, pend('investigate')).addCase(runInvestigation.rejected, fail)
      .addCase(runInvestigation.fulfilled, (s, a) => {
        s.busy = ''
        const an = a.payload.analysis
        const present = Object.fromEntries((an.fishbone || []).map((f) => [f.category, f.causes]))
        an.fishbone = FISHBONE.map((c) => ({ category: c, causes: present[c] || [] }))
        s.analysis = an
        s.capas = a.payload.capas
        s.analysed = true
        s.status = 'Pending Review'
        s.notice = 'AI investigation ready. Root causes are suggestions until a qualified person confirms them.'
      })

    b.addCase(loadSaved.fulfilled, (s, a) => { s.saved = a.payload })
    b.addCase(openSaved.pending, pend('open')).addCase(openSaved.rejected, fail)
      .addCase(openSaved.fulfilled, (s, a) => {
        const r = a.payload
        Object.assign(s, { busy: '', id: r.id, sourceText: r.source_text, form: { ...emptyForm, ...r.form }, aiFields: [],
          analysis: r.analysis?.why_analysis ? r.analysis : emptyAnalysis(), capas: r.capas || [], status: r.status,
          confirmedBy: r.confirmed_by, analysed: !!r.analysis?.why_analysis?.length })
      })
    b.addCase(deleteSaved.fulfilled, (s, a) => { s.saved = s.saved.filter((x) => x.id !== a.payload) })

    b.addCase(saveInvestigation.pending, pend('save')).addCase(saveInvestigation.rejected, fail)
      .addCase(saveInvestigation.fulfilled, (s, a) => {
        s.busy = ''; s.id = a.payload.id; s.notice = `Investigation saved (${a.payload.status}).`
      })
  },
})

export const A = slice.actions
export default slice.reducer
