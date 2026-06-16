/**
 * Live Parcel Map — Spec: Student 3 UI
 * Shows: parcel boundaries, pending apps, survey-required apps, disputed parcels,
 *        marker clustering, filters by zone / type / status.
 * Uses: OpenStreetMap + Leaflet (react-leaflet)
 *
 * PLACEHOLDER: parcel GeoJSON and pending heatmap come from Group module analytics endpoints.
 * Until those are ready, the map loads whatever data is available and shows a placeholder notice.
 */
import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getParcelGeoFeed, getPendingHeatmap } from '../api/api'

// Fix Leaflet default icon path issue with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
})

const STATUS_COLORS = {
  pending:          '#f59e0b',
  survey_required:  '#3b82f6',
  disputed:         '#ef4444',
  registered:       '#10b981',
  default:          '#6b7280',
}

function statusColor(status) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.default
}

function parcelStyle(feature) {
  const status = feature?.properties?.registration_status ?? 'default'
  const dispute = feature?.properties?.dispute_state
  return {
    color:       dispute && dispute !== 'none' ? STATUS_COLORS.disputed : statusColor(status),
    weight:      2,
    opacity:     0.9,
    fillOpacity: 0.25,
  }
}

// Default map center — Ramallah (matches sample data in spec)
const DEFAULT_CENTER = [31.905, 35.206]

export default function LiveMap() {
  const [parcels,     setParcels]     = useState(null)
  const [pending,     setPending]     = useState(null)
  const [loadingMsg,  setLoadingMsg]  = useState('Loading map data…')

  // Filters (spec: filter by zone, type, status)
  const [zoneFilter,   setZoneFilter]   = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    Promise.all([getParcelGeoFeed(), getPendingHeatmap()])
      .then(([parcelRes, pendingRes]) => {
        setParcels(parcelRes.data)
        setPending(pendingRes.data)
        setLoadingMsg(null)
      })
      .catch(() => {
        setLoadingMsg(
          'PLACEHOLDER: Analytics endpoints (Group module) not yet available. ' +
          'Map will populate once Student 1 & Group module analytics are running.'
        )
      })
  }, [])

  // Filter GeoJSON features client-side
  function filterFeatures(geojson) {
    if (!geojson?.features) return geojson
    const filtered = geojson.features.filter(f => {
      const props = f.properties ?? {}
      if (zoneFilter   && props.zone_id          !== zoneFilter)   return false
      if (typeFilter   && props.application_type !== typeFilter)    return false
      if (statusFilter && props.registration_status !== statusFilter) return false
      return true
    })
    return { ...geojson, features: filtered }
  }

  function onEachParcel(feature, layer) {
    const p = feature.properties ?? {}
    layer.bindPopup(`
      <strong>Parcel ${p.parcel_number ?? '—'}</strong><br/>
      Block: ${p.block_number ?? '—'} | Basin: ${p.basin_number ?? '—'}<br/>
      Zone: ${p.zone_id ?? '—'}<br/>
      Status: ${p.registration_status ?? '—'}<br/>
      Dispute: ${p.dispute_state ?? 'none'}<br/>
      Area: ${p.area_sqm ? p.area_sqm + ' sqm' : '—'}
    `)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Live Parcel Map</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl shadow p-4 border border-gray-100">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Zone</label>
          <input
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
            placeholder="e.g. ZONE-RM-01"
            className="border border-gray-300 rounded px-3 py-1 text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Application Type</label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
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
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'default').map(([status, color]) => (
          <span key={status} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {status.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* PLACEHOLDER notice */}
      {loadingMsg && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
          ⚠ {loadingMsg}
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden shadow border border-gray-200" style={{ height: '60vh' }}>
        <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Parcel boundaries — spec: show parcel boundaries */}
          {parcels && (
            <GeoJSON
              key={JSON.stringify({ zoneFilter, typeFilter, statusFilter })}
              data={filterFeatures(parcels)}
              style={parcelStyle}
              onEachFeature={onEachParcel}
            />
          )}

          {/* Pending heatmap points — spec: show pending applications */}
          {pending?.features?.map((f, i) => {
            const [lng, lat] = f.geometry?.coordinates ?? []
            if (!lat || !lng) return null
            return (
              <Marker key={i} position={[lat, lng]}>
                <Popup>
                  <strong>Pending Application</strong><br />
                  Zone: {f.properties?.zone_id ?? '—'}<br />
                  Status: {f.properties?.status ?? '—'}
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-400">
        Map uses OpenStreetMap + Leaflet. Parcel data and pending application markers load from
        the Group analytics module endpoints once available.
      </p>
    </div>
  )
}
