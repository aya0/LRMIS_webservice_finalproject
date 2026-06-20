import { useState } from 'react';
import { getCertificate, verifyCertificate } from '../api/client';

export default function Certificates() {
  const [certId, setCertId] = useState('');
  const [cert, setCert] = useState(null);
  const [verify, setVerify] = useState(null);
  const [err, setErr] = useState('');

  const handleLookup = async () => {
    setErr(''); setCert(null); setVerify(null);
    try {
      const r = await getCertificate(certId.trim());
      setCert(r.data);
      const v = await verifyCertificate(certId.trim());
      setVerify(v.data);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Certificate not found.');
    }
  };

  return (
    <div>
      <div className="page-title">📜 Certificate Lookup</div>
      <p className="page-sub">View and verify issued land registration certificates.</p>

      <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <div className="card-title">Search Certificate</div>
        <div className="flex-gap">
          <input
            value={certId} onChange={e => setCertId(e.target.value)}
            placeholder="e.g. CERT-2026-0001"
            style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.92rem' }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button className="btn btn-primary" onClick={handleLookup}>Search</button>
        </div>
        {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      </div>

      {cert && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Certificate Details</div>
            <table style={{ width: '100%', fontSize: '0.88rem' }}>
              <tbody>
                {[
                  ['Certificate ID', cert.certificate_id],
                  ['Type', cert.certificate_type?.replace(/_/g,' ')],
                  ['Status', cert.status],
                  ['Application ID', cert.application_id],
                  ['Issued To', cert.issued_to?.applicant_id],
                  ['Issued By', cert.issued_by],
                  ['Issued At', cert.issued_at ? new Date(cert.issued_at).toLocaleString() : '—'],
                  ['QR Verify URL', cert.verification?.qr_code_url],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: 'var(--text-muted)', padding: '7px 0', width: '40%' }}>{k}</td>
                    <td style={{ fontWeight: 600 }}>{v || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {verify && (
            <div className="card">
              <div className="card-title">Verification Result</div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem' }}>{verify.valid ? '✅' : '❌'}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: verify.valid ? 'var(--accent-dark)' : 'var(--danger)', marginTop: 8 }}>
                  {verify.valid ? 'VALID CERTIFICATE' : 'INVALID / NOT ISSUED'}
                </div>
                <div style={{ marginTop: 16, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Digital Signature: <code>{cert.verification?.digital_signature_stub}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
