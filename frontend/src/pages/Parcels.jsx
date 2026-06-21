import { useState, useEffect } from 'react';
import { listParcels, createParcel } from '../api/client';

export default function Parcels() {
  const [parcels, setParcels] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    parcel_code: '', parcel_number: '', block_number: '', basin_number: '',
    zone_id: '', area_sqm: '', land_use: 'residential', address_hint: '',
    lat1: '', lng1: '', lat2: '', lng2: '',
  });

  const load = () => {
    setLoading(true);
    listParcels({ page: 1, page_size: 50 })
      .then(r => { setParcels(r.data.items || []); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault(); setErr('');
    try {
      // Build a simple square polygon from 2 corners
      const [lng1, lat1, lng2, lat2] = [+form.lng1, +form.lat1, +form.lng2, +form.lat2];
      const geometry = {
        type: 'Polygon',
        coordinates: [[[lng1,lat1],[lng2,lat1],[lng2,lat2],[lng1,lat2],[lng1,lat1]]]
      };
      await createParcel({
        parcel_code: form.parcel_code,
        parcel_number: form.parcel_number,
        block_number: form.block_number,
        basin_number: form.basin_number,
        zone_id: form.zone_id,
        area_sqm: form.area_sqm ? +form.area_sqm : null,
        land_use: form.land_use,
        address_hint: form.address_hint,
        geometry,
        current_owner_refs: [],
      });
      setMsg('Parcel created!'); setShowForm(false);
      setForm({ parcel_code:'',parcel_number:'',block_number:'',basin_number:'',zone_id:'',area_sqm:'',land_use:'residential',address_hint:'',lat1:'',lng1:'',lat2:'',lng2:'' });
      load();
    } catch (e) { setErr(e.response?.data?.detail || 'Failed to create parcel.'); }
  };

  return (
    <div className="module1-shell">
      <section className="module1-hero">
        <span className="module1-kicker">Module 1 · Parcel Registry</span>
        <h1 className="module1-title">Parcel management</h1>
        <p className="module1-subtitle">
          Maintain parcel records, geometry, zoning, and ownership references used by the application workflow and map.
        </p>

        <div className="module1-stats" style={{ marginTop: 22 }}>
          <div className="module1-stat">
            <div className="module1-stat-label">Total Parcels</div>
            <div className="module1-stat-value">{total}</div>
          </div>
          <div className="module1-stat">
            <div className="module1-stat-label">Form</div>
            <div className="module1-stat-value">Geometry</div>
          </div>
          <div className="module1-stat">
            <div className="module1-stat-label">Scope</div>
            <div className="module1-stat-value">Registry</div>
          </div>
          <div className="module1-stat">
            <div className="module1-stat-label">Views</div>
            <div className="module1-stat-value">List + Create</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Hide Form' : '+ Add Parcel'}
          </button>
          <a className="btn btn-outline" href="/map">Open Live Map</a>
          <a className="btn btn-outline" href="/applications">Open Applications</a>
        </div>
      </section>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      {showForm && (
        <div className="module1-card module1-card-accent">
          <div className="card-title">Register New Parcel</div>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group"><label>Parcel Code *</label><input value={form.parcel_code} onChange={e=>set('parcel_code',e.target.value)} placeholder="RM-Z01-B12-P145" required /></div>
              <div className="form-group"><label>Parcel Number *</label><input value={form.parcel_number} onChange={e=>set('parcel_number',e.target.value)} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Block Number *</label><input value={form.block_number} onChange={e=>set('block_number',e.target.value)} required /></div>
              <div className="form-group"><label>Basin Number *</label><input value={form.basin_number} onChange={e=>set('basin_number',e.target.value)} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Zone ID *</label><input value={form.zone_id} onChange={e=>set('zone_id',e.target.value)} placeholder="ZONE-RM-01" required /></div>
              <div className="form-group"><label>Land Use</label>
                <select value={form.land_use} onChange={e=>set('land_use',e.target.value)}>
                  {['residential','commercial','agricultural','industrial','public'].map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Area (sqm)</label><input type="number" value={form.area_sqm} onChange={e=>set('area_sqm',e.target.value)} /></div>
              <div className="form-group"><label>Address Hint</label><input value={form.address_hint} onChange={e=>set('address_hint',e.target.value)} placeholder="e.g. Ramallah - Al Tireh" /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: 8 }}>Parcel Boundary (SW corner → NE corner in lon,lat)</label>
              <div className="form-row">
                <div className="form-group"><label>SW Longitude</label><input type="number" step="any" value={form.lng1} onChange={e=>set('lng1',e.target.value)} placeholder="35.2001" required /></div>
                <div className="form-group"><label>SW Latitude</label><input type="number" step="any" value={form.lat1} onChange={e=>set('lat1',e.target.value)} placeholder="31.9021" required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>NE Longitude</label><input type="number" step="any" value={form.lng2} onChange={e=>set('lng2',e.target.value)} placeholder="35.2015" required /></div>
                <div className="form-group"><label>NE Latitude</label><input type="number" step="any" value={form.lat2} onChange={e=>set('lat2',e.target.value)} placeholder="31.9030" required /></div>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create Parcel</button>
          </form>
        </div>
      )}

      <div className="module1-card">
        {loading ? <div className="loading">Loading…</div> : (
          <div className="table-wrap">
            <table className="module1-table">
              <thead>
                <tr>
                  <th>Parcel Code</th>
                  <th>Number</th>
                  <th>Block</th>
                  <th>Zone</th>
                  <th>Land Use</th>
                  <th>Area (sqm)</th>
                  <th>Status</th>
                  <th>Dispute</th>
                </tr>
              </thead>
              <tbody>
                {parcels.length === 0
                  ? <tr><td colSpan={8} className="empty">No parcels found.</td></tr>
                  : parcels.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.parcel_code}</strong></td>
                      <td>{p.parcel_number}</td>
                      <td>{p.block_number}</td>
                      <td>{p.zone_id}</td>
                      <td>{p.land_use}</td>
                      <td>{p.area_sqm || '—'}</td>
                      <td><span className={`badge badge-${p.registration_status === 'registered' ? 'approved' : 'submitted'}`}>{p.registration_status}</span></td>
                      <td><span style={{ color: p.dispute_state !== 'none' ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem' }}>{p.dispute_state}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
