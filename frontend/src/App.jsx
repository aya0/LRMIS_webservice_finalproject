import { Routes, Route, NavLink } from 'react-router-dom'
import SurveyorTasks from './pages/SurveyorTasks'
import TaskExecution  from './pages/TaskExecution'
import LiveMap        from './pages/LiveMap'
import Analytics      from './pages/Analytics'

const NAV = [
  { to: '/',         label: 'My Tasks'   },
  { to: '/map',      label: 'Live Map'   },
  { to: '/analytics',label: 'Analytics'  },
]

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-blue-800 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-8">
          <span className="font-bold text-lg tracking-wide">LRMIS — Module 3</span>
          <nav className="flex gap-4">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `text-sm font-medium px-3 py-1 rounded transition ${
                    isActive ? 'bg-white text-blue-800' : 'hover:bg-blue-700'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/"              element={<SurveyorTasks />} />
          <Route path="/tasks/:taskId" element={<TaskExecution />} />
          <Route path="/map"           element={<LiveMap />} />
          <Route path="/analytics"     element={<Analytics />} />
        </Routes>
      </main>
    </div>
  )
}
