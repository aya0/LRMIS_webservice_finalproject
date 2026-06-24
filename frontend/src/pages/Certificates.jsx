import { useState } from 'react';
import { getCertificate, getApplicationCertificate, verifyCertificate } from '../api/client';

export default function Certificates() {
  const [certId, setCertId] = useState('');
  const [cert, setCert] = useState(null);
  const [verify, setVerify] = useState(null);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  const handleLookup = async () => {
    setErr('');
    setNotice('');
    setCert(null);
    setVerify(null);

    const query = certId.trim();
    if (!query) {
      setErr('Enter a certificate ID or application ID.');
      return;
    }

    try {
      let certificateResponse = null;
      let certificateLookupId = query;

      try {
        certificateResponse = await getCertificate(query);
      } catch (primaryError) {
        const fallbackResponse = await getApplicationCertificate(query);
        certificateResponse = fallbackResponse;
      }

      setCert(certificateResponse.data);

      const certificateIdForVerify = certificateResponse.data?.certificate_id || query;
      certificateLookupId = certificateIdForVerify;

      if (certificateResponse.data?.status !== 'issued') {
        setVerify({
          valid: false,
          certificate_id: certificateLookupId,
          application_id: certificateResponse.data?.application_id,
        });
        setNotice('This certificate is still in draft state, so it is not valid yet.');
        return;
      }

      try {
        const v = await verifyCertificate(certificateLookupId);
        setVerify(v.data);
      } catch (verifyError) {
        setVerify({
          valid: false,
          certificate_id: certificateLookupId,
          application_id: certificateResponse.data?.application_id,
        });
        setNotice(verifyError.response?.data?.detail || 'Certificate verification unavailable.');
      }
    } catch (e) {
      setErr(e.response?.data?.detail || 'Certificate not found.');
    }
  };

  return (
    <div className="module1-shell">
      <section className="module1-hero">
        <span className="module1-kicker">Module 1 · Certificates</span>
        <h1 className="module1-title">Certificate lookup & verification</h1>
        <p className="module1-subtitle">
          Search issued certificates, review their metadata, and verify the digital record for a specific application.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <a className="btn btn-primary" href="/applications">Open Applications</a>
          <a className="btn btn-outline" href="/parcels">Open Parcels</a>
        </div>
      </section>

      <div className="module1-card module1-card-accent" style={{ maxWidth: 560 }}>
        <div className="card-title">Search Certificate</div>
        <div className="flex-gap">
          <input
            value={certId} onChange={e => setCertId(e.target.value)}
            placeholder="e.g. CERT-2026-0001 or LRMIS-2026-0001"
            style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.92rem' }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button className="btn btn-primary" onClick={handleLookup}>Search</button>
        </div>
        {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
        {notice && !err && <div className="alert alert-success" style={{ marginTop: 12 }}>{notice}</div>}
      </div>

      {cert && (
        <div className="module1-card-grid cols-2">
          <div className="module1-card">
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
            <div className="module1-card">
              <div className="card-title">Verification Result</div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem' }}>{verify.valid ? '✅' : '❌'}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: verify.valid ? 'var(--accent-dark)' : 'var(--danger)', marginTop: 8 }}>
                  {verify.valid ? 'VALID CERTIFICATE' : 'INVALID / DRAFT'}
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
