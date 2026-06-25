import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE });

// ── Applications ──────────────────────────────────────────────────────────────
export const createApplication = (data, idempotencyKey) =>
  api.post('/applications/', data, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  });

export const getApplication = (id) => api.get(`/applications/${id}`);

export const listApplications = (params) => api.get('/applications/', { params });

export const transitionApplication = (id, body) =>
  api.patch(`/applications/${id}/transition`, body);

export const holdApplication = (id, body) =>
  api.post(`/applications/${id}/hold`, body);

export const rejectApplication = (id, body) =>
  api.post(`/applications/${id}/reject`, body);

export const issueCertificate = (id, issuedBy = 'registrar') =>
  api.post(`/applications/${id}/certificate?issued_by=${issuedBy}`);

export const addNote = (id, body) =>
  api.post(`/applications/${id}/notes`, body);

// ── Parcels ────────────────────────────────────────────────────────────────────
export const createParcel = (data) => api.post('/parcels/', data);
export const listParcels = (params) => api.get('/parcels/', { params });
export const getParcel = (id) => api.get(`/parcels/${id}`);
export const getZones = () => api.get('/parcels/zones');

// ── Certificates ───────────────────────────────────────────────────────────────
export const getCertificate = (id) => api.get(`/certificates/${id}`);
export const verifyCertificate = (id) => api.get(`/certificates/${id}/verify`);
export const getApplicationCertificate = (applicationId) => api.get(`/applications/${applicationId}/certificate`);
