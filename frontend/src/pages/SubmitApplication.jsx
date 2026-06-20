import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createApplication } from '../api/client';

const APP_TYPES = [
  'first_registration','ownership_transfer','parcel_subdivision',
  'parcel_merge','boundary_correction','certificate_request'
];
const PRIORITIES = ['normal','high','urgent','low'];
const APPLICANT_TYPES = ['citizen','lawyer','company','surveyor','authorized_representative'];
const DOC_TYPES = ['ownership_deed','id_copy','sale_contract','title_deed','survey_report','boundary_map'];

export default function SubmitApplication() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    application_type: 'first_registration',
    priority: 'normal',
    applicant_id: '',
    applicant_type: 'citizen',
    parcel_number: '',
    block_number: '',
    basin_number: '',
    zone_id: '',
    description: '',
    documents: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDoc = (type) => {
    setForm(f => {
      const exists = f.documents.find(d => d.document_type === type);
      if (exists) return { ...f, documents: f.documents.filter(d => d.document_type !== type) };
      return { ...f, documents: [...f.documents, { document_type: type, required: true, status: 'pending_review' }] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = {
        application_type: form.application_type,
        priority: form.priority,
        applicant_ref: {
          applicant_id: form.applicant_id || `APPLICANT-${Date.now()}`,
          applicant_type: form.applicant_type,
          submitted_by_representative: false,
        },
        parcel_ref: {
          parcel_number: form.parcel_number,
          block_number: form.block_number,
          basin_number: form.basin_number,
          zone_id: form.zone_id,
        },
        description: form.description,
        required_documents: form.documents,
        tags: [form.application_type],
      };
      const res = await createApplication(payload);
      setSuccess(res.data.application);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <div className="page-title">📝 Submit Application</div>
        <div className="card" style={{ maxWidth: 600, marginTop: 16 }}>
          <div className="alert alert-success">✅ Application submitted successfully!</div>
          <div style={{ marginBottom: 12 }}>
            <strong>Application ID:</strong> {success.application_id}<br />
            <strong>Status:</strong> <span className={`badge badge-${success.status}`}>{success.status}</span><br />
            <strong>Type:</strong> {success.application_type?.replace(/_/g,' ')}<br />
            <strong>Priority:</strong> {success.priority}<br />
            <strong>Submitted:</strong> {new Date(success.timestamps?.submitted_at).toLocaleString()}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 16 }}>
            Next step: A staff member will pre-check your application and contact you if documents are missing.
          </p>
          <div className="flex-gap">
            <button className="btn btn-primary" onClick={() => navigate(`/applications/${success.application_id}`)}>
              Track Application
            </button>
            <button className="btn btn-outline" onClick={() => { setSuccess(null); setForm({application_type:'first_registration',priority:'normal',applicant_id:'',applicant_type:'citizen',parcel_number:'',block_number:'',basin_number:'',zone_id:'',description:'',documents:[]}); }}>
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">📝 Submit Land Registration Application</div>
      <p className="page-sub">Fill in all required fields to register your land application.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          {/* Left column */}
          <div>
            <div className="card mb-16">
              <div className="card-title">Application Details</div>
              <div className="form-group">
                <label>Application Type *</label>
                <select value={form.application_type} onChange={e => set('application_type', e.target.value)}>
                  {APP_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Brief description of the application..." />
              </div>
            </div>

            <div className="card">
              <div className="card-title">Applicant Information</div>
              <div className="form-group">
                <label>Applicant ID / National ID *</label>
                <input value={form.applicant_id} onChange={e => set('applicant_id', e.target.value)}
                  placeholder="e.g. 400000000" required />
              </div>
              <div className="form-group">
                <label>Applicant Type</label>
                <select value={form.applicant_type} onChange={e => set('applicant_type', e.target.value)}>
                  {APPLICANT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div>
            <div className="card mb-16">
              <div className="card-title">Parcel Information</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Parcel Number *</label>
                  <input value={form.parcel_number} onChange={e => set('parcel_number', e.target.value)}
                    placeholder="e.g. 145" required />
                </div>
                <div className="form-group">
                  <label>Block Number *</label>
                  <input value={form.block_number} onChange={e => set('block_number', e.target.value)}
                    placeholder="e.g. 12" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Basin Number *</label>
                  <input value={form.basin_number} onChange={e => set('basin_number', e.target.value)}
                    placeholder="e.g. 3" required />
                </div>
                <div className="form-group">
                  <label>Zone ID *</label>
                  <input value={form.zone_id} onChange={e => set('zone_id', e.target.value)}
                    placeholder="e.g. ZONE-RM-01" required />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Required Documents</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Select which documents you are attaching:
              </p>
              {DOC_TYPES.map(dt => {
                const checked = form.documents.some(d => d.document_type === dt);
                return (
                  <label key={dt} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDoc(dt)} />
                    {dt.replace(/_/g,' ')}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-16">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting…' : '🚀 Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
