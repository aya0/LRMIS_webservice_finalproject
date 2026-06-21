/**
 * Live Parcel Map — Spec: Student 3 UI
 * Shows: parcel boundaries, pending apps, survey-required apps, disputed parcels,
 *        marker clustering, filters by zone / type / status
 * Uses: OpenStreetMap + Leaflet (react-leaflet) + leaflet.markercluster
 * PLACEHOLDER: parcel GeoJSON and heatmap from Group module analytics endpoints
 */
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { getParcelGeoFeed, getPendingHeatmap } from '../api/api'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const STATUS_COLORS = {
  pending:         '#f59e0b',
  survey_required: '#3b82f6',
  disputed:        '#ef4444',
  registered:      '#10b981',
  default:         '#94a3b8',
}

const LEGEND = [
  { label: 'Registered',      color: '#10b981' },
  { label: 'Pending',         color: '#f59e0b' },
  { label: 'Survey Required', color: '#3b82f6' },
  { label: 'Disputed',        color: '#ef4444' },
]

const DEFAULT_CENTER = [31.905, 35.206]

function parcelStyle(feature) {
  const dispute = feature?.properties?.dispute_state
  const status  = feature?.properties?.registration_status ?? 'default'
  const color   = dispute && dispute !== 'none'
    ? STATUS_COLORS.disputed
    : (STATUS_COLORS[status] ?? STATUS_COLORS.default)
  return { color, weight: 2, opacity: 0.9, fillOpacity: 0.2, fillColor: color }
}

function onEachParcel(feature, layer) {
  const p = feature.properties ?? {}
  layer.bindPopup(`
    <div style="font-family:Inter,sans-serif;min-width:180px">
      <p style="font-weight:700;font-size:13px;margin:0 0 6px">Parcel ${p.parcel_number ?? '—'}</p>
      <table style="font-size:11px;border-collapse:collapse;width:100%">
        <tr><td style="color:#94a3b8;padding:2px 0">Block</td><td style="font-weight:600">${p.block_number ?? '—'}</td></tr>
        <tr><td style="color:#94a3b8;padding:2px 0">Basin</td><td style="font-weight:600">${p.basin_number ?? '—'}</td></tr>
        <tr><td style="color:#94a3b8;padding:2px 0">Zone</td><td style="font-weight:600">${p.zone_id ?? '—'}</td></tr>
        <tr><td style="color:#94a3b8;padding:2px 0">Status</td><td style="font-weight:600">${p.registration_status ?? '—'}</td></tr>
        <tr><td style="color:#94a3b8;padding:2px 0">Dispute</td><td style="font-weight:600">${p.dispute_state ?? 'none'}</td></tr>
        <tr><td style="color:#94a3b8;padding:2px 0">Area</td><td style="font-weight:600">${p.area_sqm ? p.area_sqm + ' sqm' : '—'}</td></tr>
      </table>
    </div>
  `)
}

/**
 * MarkerClusterLayer — wraps leaflet.markercluster for react-leaflet.
 * Spec: "Use marker clustering" for pending application markers.
 */
function MarkerClusterLayer({ features }) {
  const map        = useMap()
  const clusterRef = useRef(null)

  useEffect(() => {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current)
    }

    const cluster = L.markerClusterGroup({ maxClusterRadius: 60 })
    clusterRef.current = cluster

    features.forEach(f => {
      const [lng, lat] = f.geometry?.coordinates ?? []
      if (!lat || !lng) return
      const marker = L.marker([lat, lng])
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:12px">
          <strong>Pending Application</strong><br/>
          Zone: ${f.properties?.zone_id ?? '—'}<br/>
          Status: ${f.properties?.status ?? '—'}
        </div>
      `)
      cluster.addLayer(marker)
    })

    map.addLayer(cluster)

    return () => {
      map.removeLayer(cluster)
    }
  }, [map, features])

  return null
}

export default function LiveMap() {
  const [parcels,      setParcels]      = useState(null)
  const [pending,      setPending]      = useState(null)
  const [notice,       setNotice]       = useState(null)
  const [zoneFilter,   setZoneFilter]   = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [disputeFilter, setDisputeFilter] = useState('')

  useEffect(() => {
    Promise.all([getParcelGeoFeed(), getPendingHeatmap()])
      .then(([p, h]) => { setParcels(p.data); setPending(h.data) })
      .catch(() => setNotice('Parcel and heatmap data will load once the Group analytics module is running.'))
  }, [])

  function filterFeatures(geojson) {
    if (!geojson?.features) return geojson
    return {
      ...geojson,
      features: geojson.features.filter(f => {
        const p = f.properties ?? {}
        if (zoneFilter   && p.zone_id             !== zoneFilter)   return false
        if (typeFilter   && p.application_type    !== typeFilter)    return false
        if (statusFilter && p.registration_status !== statusFilter)  return false
        if (disputeFilter && p.dispute_state       !== disputeFilter) return false
        return true
      })
    }
  }

  const pendingFeatures = pending?.features ?? []

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Geospatial</p>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Live Parcel Map</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time view of parcels, applications, and survey tasks</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 flex flex-wrap items-end gap-6 mb-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Zone</label>
          <input
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
            placeholder="e.g. ZONE-RM-01"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Application Type</label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="first_registration">First Registration</option>
            <option value="ownership_transfer">Ownership Transfer</option>
            <option value="parcel_subdivision">Parcel Subdivision</option>
            <option value="parcel_merge">Parcel Merge</option>
            <option value="boundary_correction">Boundary Correction</option>
            <option value="certificate_request">Certificate Request</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="pre_checked">Pre Checked</option>
            <option value="survey_required">Survey Required</option>
            <option value="surveyed">Surveyed</option>
            <option value="legal_review">Legal Review</option>
            <option value="approved">Approved</option>
            <option value="certificate_issued">Certificate Issued</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Dispute State</label>
          <select
            value={disputeFilter}
            onChange={e => setDisputeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Disputes</option>
            <option value="none">None</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4">
          {LEGEND.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2" style={{ backgroundColor: color + '40', borderColor: color }} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder notice */}
      {notice && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-3 flex items-center gap-3 mb-4">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-amber-700 font-medium">{notice}</p>
        </div>
      )}

      {/* Map */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100" style={{ height: '62vh' }}>
        <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Parcel boundary polygons — GeoJSON from Student 1's parcels collection */}
          {parcels && (
            <GeoJSON
              key={JSON.stringify({ zoneFilter, typeFilter, statusFilter })}
              data={filterFeatures(parcels)}
              style={parcelStyle}
              onEachFeature={onEachParcel}
            />
          )}

          {/* Clustered pending application markers — spec: "use marker clustering" */}
          {pendingFeatures.length > 0 && (
            <MarkerClusterLayer features={pendingFeatures} />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-slate-300 mt-3 text-center">
        OpenStreetMap · Leaflet · Clustered markers via leaflet.markercluster · Parcel data from Group module
      </p>
    </div>
  )
}
