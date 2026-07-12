import { useEffect, useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Wrench,
  Route as RouteIcon,
  Clock,
  Users,
  Gauge,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { api } from '../lib/api';
import { useToast } from '../components/Toast.jsx';
import { SkeletonCard, SkeletonRow } from '../components/Skeleton.jsx';
import StatusPill from '../components/StatusPill.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { formatDate, formatPercent } from '../lib/format';

const KPI_DEFS = [
  { key: 'activeVehicles', label: 'Active Vehicles', icon: Truck, color: 'text-route-500 bg-route-50' },
  { key: 'availableVehicles', label: 'Available Vehicles', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'vehiclesInMaintenance', label: 'In Maintenance', icon: Wrench, color: 'text-amber-600 bg-amber-50' },
  { key: 'activeTrips', label: 'Active Trips', icon: RouteIcon, color: 'text-route-500 bg-route-50' },
  { key: 'pendingTrips', label: 'Pending Trips', icon: Clock, color: 'text-ink-500 bg-ink-100' },
  { key: 'driversOnDuty', label: 'Drivers On Duty', icon: Users, color: 'text-route-500 bg-route-50' },
  { key: 'fleetUtilizationPct', label: 'Fleet Utilization', icon: Gauge, color: 'text-emerald-600 bg-emerald-50', percent: true },
];

const VEHICLE_TYPES = ['All', 'Truck', 'Van', 'Bike', 'Trailer'];
const STATUSES = ['All', 'Available', 'On Trip', 'In Shop', 'Retired'];
const REGIONS = ['All', 'North', 'South', 'East', 'West'];

export default function Dashboard() {
  const { push } = useToast();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [recentTrips, setRecentTrips] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [filters, setFilters] = useState({ type: 'All', status: 'All', region: 'All' });

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const data = await api.get('/dashboard/summary', {
        type: filters.type === 'All' ? undefined : filters.type,
        status: filters.status === 'All' ? undefined : filters.status,
        region: filters.region === 'All' ? undefined : filters.region,
      });
      setSummary(data);
    } catch (err) {
      push(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  async function loadTrendAndTrips() {
    setLoadingTrips(true);
    try {
      const [trendData, tripsData] = await Promise.all([
        api.get('/dashboard/utilization-trend'),
        api.get('/dashboard/recent-trips'),
      ]);
      setTrend(trendData || []);
      setRecentTrips(tripsData || []);
    } catch (err) {
      push(err.message);
    } finally {
      setLoadingTrips(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    loadTrendAndTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" description="Live snapshot of fleet, trips and driver activity." />

      {/* Filter bar */}
      <div className="card mb-6 flex flex-wrap gap-3 p-4">
        <FilterSelect
          label="Vehicle Type"
          value={filters.type}
          options={VEHICLE_TYPES}
          onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          options={STATUSES}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
        />
        <FilterSelect
          label="Region"
          value={filters.region}
          options={REGIONS}
          onChange={(v) => setFilters((f) => ({ ...f, region: v }))}
        />
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loadingSummary || !summary
          ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
          : KPI_DEFS.map(({ key, label, icon: Icon, color, percent }) => (
              <div key={key} className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</span>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
                    <Icon size={15} />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-ink-900">
                  {percent ? formatPercent(summary[key]) : summary[key] ?? 0}
                </p>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Utilization trend chart */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-bold text-ink-900">Fleet Utilization (7 days)</h3>
          <div className="h-64">
            {loadingTrips ? (
              <div className="h-full animate-pulse rounded-lg bg-ink-100" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EC" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5B6B85' }} tickFormatter={(d) => formatDate(d)} />
                  <YAxis tick={{ fontSize: 11, fill: '#5B6B85' }} unit="%" />
                  <Tooltip formatter={(v) => formatPercent(v)} labelFormatter={(d) => formatDate(d)} />
                  <Bar dataKey="utilizationPct" fill="#0F5FA6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent trips table */}
        <div className="card overflow-hidden p-0">
          <h3 className="border-b border-ink-100 px-5 py-4 text-sm font-bold text-ink-900">Recent Trips</h3>
          <table className="w-full">
            <thead className="bg-canvas">
              <tr>
                <th className="th">Source</th>
                <th className="th">Destination</th>
                <th className="th">Driver</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loadingTrips ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
              ) : recentTrips.length === 0 ? (
                <tr>
                  <td colSpan={4} className="td text-center text-ink-300">
                    No trips yet.
                  </td>
                </tr>
              ) : (
                recentTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="td font-medium text-ink-900">{trip.source}</td>
                    <td className="td">{trip.destination}</td>
                    <td className="td">{trip.driverName}</td>
                    <td className="td">
                      <StatusPill status={trip.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
