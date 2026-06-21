import { Link } from 'react-router-dom'
import ApplicantLayout from './ApplicantLayout'

const ACTIONS = [
  { to: '/applicant/create-profile', label: 'Create Profile', description: 'Set up your applicant profile and contact details.' },
  { to: '/applicant/applications', label: 'My Applications', description: 'View submitted applications and current status.' },
  { to: '/applicant/upload-document', label: 'Upload Document', description: 'Attach files required by the application.' },
  { to: '/applicant/comment', label: 'Add Comment', description: 'Send additional information or notes.' },
  { to: '/applicant/objection', label: 'Submit Objection', description: 'File an objection against a case or parcel.' },
  { to: '/applicant/timeline', label: 'Timeline', description: 'Track every step of your application lifecycle.' },
  { to: '/applicant/profile', label: 'My Profile', description: 'Review your saved profile information.' },
  { to: '/applicant/settings', label: 'Settings', description: 'Adjust preferences and notifications.' },
]

export default function ApplicantHome() {
  return (
    <ApplicantLayout narrow={false}>
      <div className="space-y-6">
        <section className="applicant-card">
          <p className="applicant-eyebrow">Applicant Home</p>
          <h1 className="applicant-title">Welcome to the Applicant Portal</h1>
          <p className="applicant-description">
            Use this portal to create your profile, submit documents, follow your application, and manage objections or comments.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
            <Link to="/applicant/applications" className="btn btn-primary">View Applications</Link>
            <Link to="/applicant/create-profile" className="btn btn-outline">Create Profile</Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {ACTIONS.map(item => (
            <Link key={item.to} to={item.to} className="applicant-card applicant-card-hover">
              <h2 className="applicant-section-title">{item.label}</h2>
              <p className="applicant-description" style={{ marginTop: 8 }}>{item.description}</p>
            </Link>
          ))}
        </section>

        <section className="applicant-card">
          <p className="applicant-eyebrow">How to start</p>
          <ol className="applicant-description" style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Create or verify your profile first.</li>
            <li>Submit your application and upload the required documents.</li>
            <li>Check the timeline to see the next step.</li>
            <li>Use comments or objections if you need to send updates.</li>
          </ol>
        </section>
      </div>
    </ApplicantLayout>
  )
}