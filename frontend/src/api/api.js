import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

/**
 * Request interceptor — attaches X-Staff-Id header from the logged-in staff
 * stored in localStorage. Satisfies spec: "basic access control for staff-only endpoints."
 */
api.interceptors.request.use(config => {
  try {
    const saved = localStorage.getItem('lrmis_auth')
    if (saved) {
      const auth = JSON.parse(saved)
      if (auth?.staff?.id) config.headers['X-Staff-Id'] = auth.staff.id
      if (auth?.token) config.headers['Authorization'] = `Bearer ${auth.token}`
    }
  } catch {
    // ignore parse errors
  }
  return config
})

// ── Staff ─────────────────────────────────────────────────────────────────────
export const createStaff  = (data)   => api.post('/staff/', data)
export const getStaff     = (id)     => api.get(`/staff/${id}`)
export const listStaff    = (params) => api.get('/staff/', { params })

// ── Survey tasks ──────────────────────────────────────────────────────────────
export const getSurveyTask     = (appId)              => api.get(`/applications/${appId}/survey-task`)
export const listSurveyorTasks = (surveyorId, status) =>
  api.get('/survey-tasks/', { params: { surveyor_id: surveyorId, status } })

// ── Assignment ────────────────────────────────────────────────────────────────
export const autoAssign      = (appId)                 => api.post(`/applications/${appId}/auto-assign-surveyor`)
export const reassignSurveyor = (appId, newSurveyorId, reason) =>
  api.patch(`/applications/${appId}/reassign-surveyor`, null, {
    params: { new_surveyor_id: newSurveyorId, reason }
  })

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
export const getKPIs                 = () => api.get('/analytics/kpis').catch(() => ({ data: {} }))
export const getApplicationsByStatus = () => api.get('/analytics/by-status').catch(() => ({ data: [] }))
export const getApplicationsByType   = () => api.get('/analytics/by-type').catch(() => ({ data: [] }))
export const getApplicationsByZone   = () => api.get('/analytics/by-zone').catch(() => ({ data: [] }))
export const getProcessingTime       = () => api.get('/analytics/processing-time').catch(() => ({ data: [] }))
export const getSurveyorAnalytics    = () => api.get('/analytics/surveyors').catch(() => ({ data: [] }))
export const getRegistrarAnalytics   = () => api.get('/analytics/registrars').catch(() => ({ data: [] }))
export const getDelayedApplications   = () => api.get('/analytics/delayed-applications').catch(() => ({ data: { count: 0, items: [] } }))
export const getHotspotZones         = () => api.get('/analytics/hotspot-zones').catch(() => ({ data: [] }))
export const getParcelGeoFeed        = () => api.get('/analytics/parcel-geo-feed').catch(() => ({ data: { features: [] } }))
export const getPendingHeatmap       = () => api.get('/analytics/pending-heatmap').catch(() => ({ data: { features: [] } }))
export const getManagementReport     = (format = 'json') => api.get('/analytics/reports/management', { params: { format } })
export const downloadManagementReport = async (format = 'csv') => {
  const response = await api.get('/analytics/reports/management', {
    params: { format },
    responseType: 'blob',
  })
  return response
}

export default api
export const getCertificatesPerMonth = () => api.get('/analytics/certs-per-month')
export const getObjectionStats       = () => api.get('/analytics/objections')
