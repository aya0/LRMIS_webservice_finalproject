import api from '../api/api'

export const createApplicant = (data) =>
  api.post('/applicants/', data)

export const updateApplicant = (applicantId, data) =>
  api.patch(`/applicants/${applicantId}`, data)

export const getApplicant = (applicantId) =>
  api.get(`/applicants/${applicantId}`)

export const getApplicantApplications = (applicantId) =>
  api.get(`/applicants/${applicantId}/applications`)

export const getZones = () =>
  api.get('/parcels/zones')

export const addDocument = (applicationId, data) =>
  api.post(`/applications/${applicationId}/documents`, data)

export const addComment = (applicationId, data) =>
  api.post(`/applications/${applicationId}/comments`, data)

export const submitObjection = (applicationId, data) =>
  api.post(`/applications/${applicationId}/objections`, data)

export const getTimeline = (applicationId) =>
  api.get(`/applications/${applicationId}/timeline`)
