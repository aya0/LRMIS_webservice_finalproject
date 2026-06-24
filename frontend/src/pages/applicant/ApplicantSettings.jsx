import { useEffect, useState } from 'react'
import { getApplicant } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
import './applicantPortal.css'

export default function ApplicantSettings() {
  const applicantId = getSavedApplicantId()
  const [settings, setSettings] = useState({
    email: false,
    sms: false,
    share: false,
    tracking: false,
  })
  const [loading, setLoading] = useState(Boolean(applicantId))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true

    async function loadSettings() {
      if (!applicantId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const res = await getApplicant(applicantId)
        if (!active) return
        
        let loadedSettings = {
          email: Boolean(res.data.notification_preferences?.email),
          sms: Boolean(res.data.notification_preferences?.sms),
          share: Boolean(res.data.privacy_settings?.share_contact_with_staff),
          tracking: Boolean(res.data.privacy_settings?.allow_status_notifications),
        }
        
        try {
          const localStr = localStorage.getItem(`lrmis_applicant_settings_${applicantId}`)
          if (localStr) {
            loadedSettings = { ...loadedSettings, ...JSON.parse(localStr) }
          }
        } catch (e) {
          // ignore
        }
        
        setSettings(loadedSettings)
      } catch (err) {
        if (active) setError(friendlyApplicantError(err, 'Unable to load applicant settings.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSettings()
    return () => {
      active = false
    }
  }, [applicantId])

  function update(name, value) {
    setSaved(false)
    setSettings(current => ({ ...current, [name]: value }))
  }

  function saveSettings(e) {
    e.preventDefault()
    if (!applicantId) {
      setError('Create or load an applicant profile before saving settings.')
      return
    }
    setError('')
    try {
      localStorage.setItem(`lrmis_applicant_settings_${applicantId}`, JSON.stringify(settings))
    } catch (e) {
      // Local storage may be full or blocked
    }
    setSaved(true)
  }

  return (
    <ApplicantLayout>
      <p className="applicant-page-label">SETTINGS</p>
      <h1 className="applicant-page-title">Settings & Preferences</h1>
      <p className="applicant-page-subtitle">Review notification and privacy preferences for the current applicant profile.</p>

      {loading && <section className="applicant-card applicant-section">Loading settings...</section>}
      {error && <div className="applicant-error">{error}</div>}
      {saved && (
        <div className="applicant-success">
          Settings are saved locally only because backend update endpoint is unavailable.
        </div>
      )}

      <form onSubmit={saveSettings} className="applicant-card applicant-section applicant-settings-grid">
        <section className="applicant-settings-card">
          <p className="applicant-muted-label">Notification Preferences</p>
          <h2>Notification Preferences</h2>
          <Toggle label="Email Notifications" checked={settings.email} onChange={value => update('email', value)} />
          <Toggle label="SMS Notifications" checked={settings.sms} onChange={value => update('sms', value)} />
        </section>

        <section className="applicant-settings-card">
          <p className="applicant-muted-label">Privacy Settings</p>
          <h2>Privacy Settings</h2>
          <Toggle label="Share my information with authorities" checked={settings.share} onChange={value => update('share', value)} />
          <Toggle label="Allow status tracking" checked={settings.tracking} onChange={value => update('tracking', value)} />
        </section>

        <div className="applicant-settings-actions">
          <button disabled={loading} className="applicant-button">
            Save Changes
          </button>
        </div>
      </form>
    </ApplicantLayout>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="applicant-toggle-row">
      <span className="applicant-toggle-name">{label}</span>
      <span className={`applicant-toggle-status ${checked ? 'applicant-toggle-status-enabled' : 'applicant-toggle-status-disabled'}`}>
        {checked ? 'Enabled' : 'Disabled'}
      </span>
      <span className="applicant-switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="applicant-switch-track" aria-hidden="true">
          <span className="applicant-switch-thumb" />
        </span>
      </span>
    </label>
  )
}
