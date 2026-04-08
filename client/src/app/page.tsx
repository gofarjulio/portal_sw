export default function Home() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Projects Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage standard work documentation across all production lines.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
          + New Project
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: "Assembly Line 1", takt: 45, processes: 8, status: 'Active' },
          { name: "Machining Area B", takt: 120, processes: 3, status: 'Active' },
          { name: "Packaging Gen 2", takt: 30, processes: 5, status: 'Draft' }
        ].map((proj, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-slate-800">{proj.name}</h3>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                proj.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {proj.status}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Takt Time</span>
                <span className="font-medium text-slate-700">{proj.takt} s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Processes</span>
                <span className="font-medium text-slate-700">{proj.processes}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <span className="text-sm text-blue-600 font-medium hover:text-blue-700">Open Dashboard &rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
