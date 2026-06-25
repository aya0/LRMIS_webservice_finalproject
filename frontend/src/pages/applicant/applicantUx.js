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
    return 'We could not load this information right now. Please try again after checking that the service is running.'
  }
  if (err.response.status === 404) {
    return 'Applicant not found. Please check the Applicant ID.'
  }
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(item => {
      let msg = item.msg || item.message
      if (msg === 'Field required') msg = 'is required'
      if (item.loc && item.loc.length > 0) {
        const fieldPath = item.loc.filter(l => l !== 'body').join('.')
        return fieldPath ? `${fieldPath} ${msg}` : msg
      }
      return msg
    }).filter(Boolean).join(' | ')
  }
  return fallback
}
