export default function About() {
  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="bg-[#0f2044] rounded-3xl px-8 py-10 text-white relative overflow-hidden mb-8">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">About LRMIS</h1>
            <p className="text-slate-200 max-w-3xl">A secure, geo-enabled platform that modernizes land registration workflows — from application submission through field surveys and registrar decisions to certificate issuance.</p>
            <div className="mt-6 flex gap-3">
              <a href="/applicant/register" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg">Register as an applicant</a>
              <a href="/login" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg">Staff login</a>
            </div>
          </div>
          <div className="absolute -right-12 -top-12 w-72 h-72 bg-blue-600/10 rounded-full" />
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold mb-2">Our Vision</h3>
            <p className="text-sm text-slate-600">Create a modern, secure, and efficient digital platform that improves accessibility, transparency, and accuracy while reducing manual work.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold mb-2">Who uses it</h3>
            <p className="text-sm text-slate-600">Applicants, surveyors, registrars, and administrative staff — each with tailored interfaces and permissions.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold mb-2">What it does</h3>
            <p className="text-sm text-slate-600">Manages land records, parcel geometry, application workflows, survey tasks, certificates, and analytics for informed decisions.</p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Features</h2>
          <div className="grid md:grid-cols-2 gap-6 text-slate-600">
            <ul className="list-disc pl-6 space-y-2">
              <li>Centralized land records and geospatial parcel feeds.</li>
              <li>Workflow-driven application lifecycle with milestone enforcement.</li>
              <li>Surveyor assignment engine and field task tracking.</li>
              <li>Registrar review, approval, and certificate issuance.</li>
            </ul>
            <ul className="list-disc pl-6 space-y-2">
              <li>Applicant portal for submissions, uploads, and timeline tracking.</li>
              <li>Analytics dashboards and exportable reports for administrators.</li>
              <li>Secure authentication for staff and applicants, with audit logs.</li>
              <li>Geo-enabled mapping for task management and heatmaps.</li>
            </ul>
          </div>

          <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-3">Demo</h2>
          <p className="text-slate-600">To run the demo: start MongoDB, run the backend, seed the demo data (`backend/TestDataset.py`), and start the frontend. Use the Register button above or the staff login to explore the system.</p>
        </div>
      </div>
    </div>
  )
}
