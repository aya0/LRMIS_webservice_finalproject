import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getApplication, transitionApplication, holdApplication,
         rejectApplication, issueCertificate, addNote } from '../api/client';
import StatusBadge from '../context/StatusBadge';

export default function ApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Modal states
  const [showTransition, setShowTransition] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [targetState, setTargetState] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [actorId, setActorId] = useState('staff_01');

  const load = () => {
    setLoading(true);
    getApplication(id)
      .then(r => setApp(r.data))
      .catch(() => setError('Application not found.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const flash = (m, isErr = false) => {
    if (isErr) setError(m); else setMsg(m);
    setTimeout(() => { setError(''); setMsg(''); }, 4000);
  };

  const doTransition = async () => {
    try {
      await transitionApplication(id, { target_state: targetState, actor_id: actorId, actor_type: 'staff' });
      flash(`✅ Transitioned to ${targetState}`);
      setShowTransition(false);
      load();
    } catch (e) { flash(e.response?.data?.detail || 'Transition failed.', true); }
  };

  const doReject = async () => {
    if (!rejectReason) return flash('Rejection reason is required.', true);
    try {
      await rejectApplication(id, { reason: rejectReason, actor_id: actorId });
      flash('Application rejected.'); setShowReject(false); setRejectReason(''); load();
    } catch (e) { flash(e.response?.data?.detail || 'Reject failed.', true); }
  };

  const doHold = async () => {
    if (!holdReason) return flash('Hold reason is required.', true);
    try {
      await holdApplication(id, { reason: holdReason, actor_id: actorId });
      flash('Application placed on hold.'); setShowHold(false); setHoldReason(''); load();
    } catch (e) { flash(e.response?.data?.detail || 'Hold failed.', true); }
  };

  const doCertificate = async () => {
    try {
      await issueCertificate(id, actorId);
      flash('✅ Certificate issued!'); load();
    } catch (e) { flash(e.response?.data?.detail || 'Certificate failed.', true); }
  };

  const doNote = async () => {
    if (!noteText) return;
    try {
      await addNote(id, { note: noteText, actor_id: actorId });
      flash('Note added.'); setShowNote(false); setNoteText(''); load();
    } catch (e) { flash('Failed to add note.', true); }
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (error && !app) return <div className="alert alert-error">{error}</div>;
  if (!app) return null;

  const allowed = app.workflow?.allowed_next || [];
  const ts = app.timestamps || {};

  const timelineEntries = [
    { label: 'Submitted', date: ts.submitted_at },
    { label: 'Pre-Checked', date: ts.pre_checked_at },
    { label: 'Survey Required', date: ts.survey_required_at },
    { label: 'Surveyed', date: ts.surveyed_at },
    { label: 'Legal Review', date: ts.legal_review_at },
    { label: 'Approved', date: ts.approved_at },
    { label: 'Certificate Issued', date: ts.certificate_issued_at },
    { label: 'Closed', date: ts.closed_at },
  ].filter(e => e.date);

  return (
    <div className="module1-shell">
      <section className="module1-hero">
        <span className="module1-kicker">Module 1 · Application Detail</span>
        <h1 className="module1-title">{app.application_id}</h1>
        <p className="module1-subtitle">
          {app.application_type?.replace(/_/g,' ')} · {app.parcel_ref?.zone_id} · Current state: {app.status}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <Link to="/applications" className="btn btn-outline">← Back to Applications</Link>
          <Link to="/parcels" className="btn btn-outline">Open Parcels</Link>
          <Link to="/certificates" className="btn btn-outline">Open Certificates</Link>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="module1-card-grid cols-2">
        {/* Left */}
        <div>
          {/* Status card */}
          <div className="module1-card module1-card-accent">
            <div className="card-title">Current Status</div>
            <div style={{ marginBottom: 12 }}>
              <StatusBadge status={app.status} />
              <span style={{ marginLeft: 10, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Priority: <strong>{app.priority}</strong>
              </span>
            </div>
            {app.rejection_reason && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>Rejection reason: {app.rejection_reason}</div>
            )}
            {app.hold_reason && (
              <div className="alert" style={{ background: '#fef9e7', border: '1px solid #f9e79f', marginBottom: 12 }}>On hold: {app.hold_reason}</div>
            )}

            {/* Action buttons */}
            <div className="flex-gap">
              {allowed.length > 0 && (
                <button className="btn btn-primary btn-sm" onClick={() => { setTargetState(allowed[0]); setShowTransition(true); }}>
                  ⏩ Transition
                </button>
              )}
              {app.status !== 'rejected' && app.status !== 'closed' && (
                <>
                  <button className="btn btn-warning btn-sm" onClick={() => setShowHold(true)}>⏸ Hold</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setShowReject(true)}>✖ Reject</button>
                </>
              )}
              {app.status === 'approved' && (
                <button className="btn btn-success btn-sm" onClick={doCertificate}>📜 Issue Certificate</button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setShowNote(true)}>📝 Note</button>
            </div>
          </div>

          {/* Parcel info */}
          <div className="module1-card">
            <div className="card-title">Parcel Information</div>
            <table style={{ width: '100%', fontSize: '0.88rem' }}>
              <tbody>
                {[
                  ['Parcel Number', app.parcel_ref?.parcel_number],
                  ['Block Number', app.parcel_ref?.block_number],
                  ['Basin Number', app.parcel_ref?.basin_number],
                  ['Zone ID', app.parcel_ref?.zone_id],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: 'var(--text-muted)', padding: '6px 0', width: '45%' }}>{k}</td>
                    <td style={{ fontWeight: 600 }}>{v || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Documents */}
          <div className="module1-card">
            <div className="card-title">Required Documents</div>
            {(app.required_documents || []).length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No documents attached.</p>
              : (app.required_documents || []).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.88rem' }}>{d.document_type?.replace(/_/g,' ')}</span>
                  <StatusBadge status={d.status} />
                </div>
              ))
            }
          </div>

          {/* Assignment */}
          <div className="module1-card">
            <div className="card-title">Assignment</div>
            <table style={{ width: '100%', fontSize: '0.88rem' }}>
              <tbody>
                {[
                  ['Assigned Registrar', app.assignment?.assigned_registrar_id],
                  ['Assigned Surveyor', app.assignment?.assigned_surveyor_id],
                  ['Policy', app.assignment?.assignment_policy],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: 'var(--text-muted)', padding: '6px 0', width: '50%' }}>{k}</td>
                    <td style={{ fontWeight: 600 }}>{v || 'Not assigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right */}
        <div>
          {/* Applicant */}
          <div className="module1-card">
            <div className="card-title">Applicant</div>
            <table style={{ width: '100%', fontSize: '0.88rem' }}>
              <tbody>
                {[
                  ['Applicant ID', app.applicant_ref?.applicant_id],
                  ['Type', app.applicant_ref?.applicant_type],
                  ['Via Representative', app.applicant_ref?.submitted_by_representative ? 'Yes' : 'No'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: 'var(--text-muted)', padding: '6px 0', width: '45%' }}>{k}</td>
                    <td style={{ fontWeight: 600 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Timeline */}
          <div className="module1-card">
            <div className="card-title">Status Timeline</div>
            {timelineEntries.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No timeline yet.</p>
              : (
                <div className="timeline">
                  {timelineEntries.map((e, i) => (
                    <div key={i} className="tl-item">
                      <div className="tl-title">{e.label}</div>
                      <div className="tl-date">{new Date(e.date).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Internal Notes */}
          <div className="module1-card">
            <div className="card-title">Internal Notes</div>
            {(app.internal?.notes || []).length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No notes.</p>
              : (app.internal?.notes || []).map((n, i) => (
                <div key={i} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 6, marginBottom: 6, fontSize: '0.87rem' }}>
                  {n}
                </div>
              ))
            }
          </div>

          {/* Certificate */}
          {app.certificate && (
            <div className="module1-card">
              <div className="card-title">📜 Certificate</div>
              <div style={{ fontSize: '0.88rem' }}>
                <div><strong>ID:</strong> {app.certificate.certificate_id}</div>
                <div><strong>Status:</strong> <StatusBadge status={app.certificate.status} /></div>
              </div>
            </div>
          )}

          {/* Description */}
          {app.description && (
            <div className="module1-card">
              <div className="card-title">Description</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{app.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showTransition && (
        <Modal title="Transition Application" onClose={() => setShowTransition(false)}>
          <div className="form-group">
            <label>Actor ID (staff/system)</label>
            <input value={actorId} onChange={e => setActorId(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Target State</label>
            <select value={targetState} onChange={e => setTargetState(e.target.value)}>
              {allowed.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div className="flex-gap">
            <button className="btn btn-primary" onClick={doTransition}>Confirm Transition</button>
            <button className="btn btn-outline" onClick={() => setShowTransition(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {showReject && (
        <Modal title="Reject Application" onClose={() => setShowReject(false)}>
          <div className="form-group">
            <label>Rejection Reason (required)</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Legal/administrative reason for rejection..." rows={4} />
          </div>
          <div className="flex-gap">
            <button className="btn btn-danger" onClick={doReject}>Reject Application</button>
            <button className="btn btn-outline" onClick={() => setShowReject(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {showHold && (
        <Modal title="Place on Hold" onClose={() => setShowHold(false)}>
          <div className="form-group">
            <label>Hold Reason (required)</label>
            <textarea value={holdReason} onChange={e => setHoldReason(e.target.value)}
              placeholder="Reason for placing this application on hold..." rows={3} />
          </div>
          <div className="flex-gap">
            <button className="btn btn-warning" onClick={doHold}>Place on Hold</button>
            <button className="btn btn-outline" onClick={() => setShowHold(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {showNote && (
        <Modal title="Add Internal Note" onClose={() => setShowNote(false)}>
          <div className="form-group">
            <label>Note</label>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Internal note for staff..." rows={3} />
          </div>
          <div className="flex-gap">
            <button className="btn btn-primary" onClick={doNote}>Add Note</button>
            <button className="btn btn-outline" onClick={() => setShowNote(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 440, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
