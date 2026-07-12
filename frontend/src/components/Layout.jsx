import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/vehicles', label: 'Vehicle Registry', icon: Truck, roles: null },
  { to: '/drivers', label: 'Drivers', icon: Users, roles: null },
  { to: '/trips', label: 'Trip Management', icon: Route, roles: null },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: null },
  { to: '/fuel-expense', label: 'Fuel & Expense', icon: Fuel, roles: null },
  {
    to: '/reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
    roles: ['FleetManager', 'FinancialAnalyst'],
  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-surface md:flex md:flex-col">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-route-500 text-white">
            <Route size={18} />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-ink-900">TransitOps</span>
        </div>

        {/* Route-line signature: a dashed connector running behind the nav icons */}
        <nav className="relative flex-1 px-4 py-2">
          <div className="absolute left-[34px] top-2 bottom-2 w-px text-ink-100 bg-route-dashed bg-[length:1px_12px]" />
          <ul className="relative space-y-1">
            {visibleNav.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-route-50 text-route-600'
                        : 'text-ink-500 hover:bg-canvas hover:text-ink-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-surface ${
                          isActive ? 'border-route-500 text-route-500' : 'border-ink-100 text-ink-300'
                        }`}
                      >
                        <Icon size={13} />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-ink-100 px-4 py-4">
          <div className="rounded-lg bg-canvas px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
            <p className="text-xs text-ink-500">{user?.role}</p>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-100 bg-surface px-6 py-3 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-route-500 text-white">
              <Route size={14} />
            </div>
            <span className="font-extrabold text-ink-900">TransitOps</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-ink-100 bg-canvas px-3 py-1 text-xs font-semibold text-ink-500 sm:inline">
              {user?.role}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-canvas hover:text-status-cancelled"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
