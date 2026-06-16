import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Staff ─────────────────────────────────────────────────────────────────────
export const createStaff   = (data)     => api.post('/staff/', data)
export const getStaff      = (id)       => api.get(`/staff/${id}`)
export const listStaff     = (params)   => api.get('/staff/', { params })

// ── Survey tasks ──────────────────────────────────────────────────────────────
export const getSurveyTask    = (appId)         => api.get(`/applications/${appId}/survey-task`)
export const listSurveyorTasks = (surveyorId, status) =>
  api.get('/survey-tasks/', { params: { surveyor_id: surveyorId, status } })

// ── Assignment ────────────────────────────────────────────────────────────────
export const autoAssign = (appId) => api.post(`/applications/${appId}/auto-assign-surveyor`)

// ── Milestones ────────────────────────────────────────────────────────────────
export const addMilestone = (appId, data) =>
  api.patch(`/applications/${appId}/survey-milestone`, data)

// ── Survey report ─────────────────────────────────────────────────────────────
export const uploadSurveyReport = (appId, data) =>
  api.post(`/applications/${appId}/survey-report`, data)

// ── Registrar review ──────────────────────────────────────────────────────────
export const registrarReview = (appId, data) =>
  api.patch(`/applications/${appId}/registrar-review`, data)

// ── Field notes ───────────────────────────────────────────────────────────────
export const addFieldNote = (taskId, data) =>
  api.post(`/survey-tasks/${taskId}/field-notes`, data)

// ── PLACEHOLDER: Analytics endpoints (Group module — Student 3 UI needs these)
// These will be implemented by the group. Stubs return empty data for now.
export const getKPIs              = () => api.get('/analytics/kpis').catch(() => ({ data: {} }))
export const getApplicationsByStatus = () => api.get('/analytics/applications-by-status').catch(() => ({ data: [] }))
export const getApplicationsByZone   = () => api.get('/analytics/applications-by-zone').catch(() => ({ data: [] }))
export const getProcessingTime       = () => api.get('/analytics/processing-time').catch(() => ({ data: [] }))
export const getSurveyorAnalytics    = () => api.get('/analytics/surveyors').catch(() => ({ data: [] }))
export const getParcelGeoFeed        = () => api.get('/analytics/geofeeds/parcels').catch(() => ({ data: { features: [] } }))
export const getPendingHeatmap       = () => api.get('/analytics/geofeeds/pending-heatmap').catch(() => ({ data: { features: [] } }))
