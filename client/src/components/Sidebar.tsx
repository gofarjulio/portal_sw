import { Home, BarChart2, Activity, Map, ClipboardList } from 'lucide-react';

export default function Sidebar({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-slate-900 border-r border-slate-700 text-slate-300 flex flex-col ${className}`}>
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-white mb-2">Lean Portal</h1>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Standardized Work</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {[
          { icon: Home, label: "Dashboard", href: "/" },
          { icon: ClipboardList, label: "Observation Sheet", href: "/observations" },
          { icon: BarChart2, label: "Yamazumi Chart", href: "/yamazumi" },
          { icon: Activity, label: "TSKP Capacity", href: "/tskp" },
          { icon: Map, label: "TSK Layout", href: "/tsk" },
        ].map((item, idx) => (
          <a key={idx} href={item.href} className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors group">
            <item.icon size={20} className="text-slate-400 group-hover:text-blue-400" />
            <span className="font-medium">{item.label}</span>
          </a>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Admin User</p>
            <p className="text-xs text-slate-400">Engineering Dept</p>
          </div>
        </div>
      </div>
    </div>
  );
}
