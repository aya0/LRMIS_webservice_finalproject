export const APPLICANT_ID_STORAGE_KEY = 'lrmis_applicant_id'

export function getSavedApplicantId() {
  try {
    return localStorage.getItem(APPLICANT_ID_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function saveApplicantId(applicantId) {
  if (!applicantId) return
  try {
    localStorage.setItem(APPLICANT_ID_STORAGE_KEY, applicantId)
  } catch {
    // Ignore storage errors; copy button still lets users keep the ID.
  }
}

export function friendlyApplicantError(err, fallback) {
  if (!err.response) {
    return 'Could not connect to the server. Please make sure the backend is running.'
  }
  if (err.response.status === 404) {
    return 'Applicant not found. Please check the Applicant ID.'
  }
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(item => item.msg || item.message).filter(Boolean).join(' ')
  }
  return fallback
}
