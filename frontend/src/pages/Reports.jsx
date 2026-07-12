import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { api } from '../lib/api';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { formatDate, formatPercent } from '../lib/format';

export default function Reports() {
  const { push } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [range, setRange] = useState({ from: thirtyDaysAgo, to: today });

  const [fuelEfficiency, setFuelEfficiency] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [operationalCost, setOperationalCost] = useState(null);
  const [roi, setRoi] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function loadPanel(setter, path) {
    setter(null);
    try {
      const data = await api.get(path, { from: range.from, to: range.to });
      setter(data || []);
    } catch (err) {
      push(err.message);
      setter([]);
    }
  }

  useEffect(() => {
    loadPanel(setFuelEfficiency, '/reports/fuel-efficiency');
    loadPanel(setUtilization, '/reports/utilization');
    loadPanel(setOperationalCost, '/reports/operational-cost');
    loadPanel(setRoi, '/reports/roi');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`${api.baseUrl}/reports/export?format=csv&from=${range.from}&to=${range.to}`, {
        headers: { Authorization: `Bearer ${api.getToken()}` },
      });
      if (!res.ok) throw new Error('Export failed. Please try again.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transitops_report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      push(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Efficiency, utilization, cost, and ROI across the fleet."
        action={
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                className="input"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                className="input"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
            <button className="btn-primary" onClick={handleExport} disabled={exporting}>
              <Download size={16} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button className="btn-secondary" disabled title="Optional — not yet available">
              Export PDF
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Fuel Efficiency (km/liter)" loading={fuelEfficiency === null} empty={fuelEfficiency?.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fuelEfficiency || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EC" />
              <XAxis dataKey="regNumber" tick={{ fontSize: 11, fill: '#5B6B85' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5B6B85' }} />
              <Tooltip />
              <Bar dataKey="kmPerLiter" fill="#0F5FA6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Fleet Utilization Over Time" loading={utilization === null} empty={utilization?.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={utilization || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EC" />
              <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fontSize: 11, fill: '#5B6B85' }} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: '#5B6B85' }} />
              <Tooltip formatter={(v) => formatPercent(v)} labelFormatter={(d) => formatDate(d)} />
              <Line type="monotone" dataKey="utilizationPct" stroke="#0F5FA6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Operational Cost (Fuel vs Maintenance)" loading={operationalCost === null} empty={operationalCost?.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={operationalCost || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EC" />
              <XAxis dataKey="regNumber" tick={{ fontSize: 11, fill: '#5B6B85' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5B6B85' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="fuelCost" stackId="cost" name="Fuel" fill="#0F5FA6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="maintenanceCost" stackId="cost" name="Maintenance" fill="#D97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Vehicle ROI" loading={roi === null} empty={roi?.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roi || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EC" />
              <XAxis dataKey="regNumber" tick={{ fontSize: 11, fill: '#5B6B85' }} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: '#5B6B85' }} />
              <Tooltip formatter={(v) => formatPercent(v)} />
              <Bar dataKey="roiPct" radius={[4, 4, 0, 0]}>
                {(roi || []).map((entry, i) => (
                  <Cell key={i} fill={entry.roiPct >= 0 ? '#0E9F6E' : '#DC2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <p className="mt-4 text-xs text-ink-500">
        ROI assumes a per-trip revenue figure. If your Trip records don't yet capture revenue, this panel reflects
        a placeholder of 0 until that field is added.
      </p>
    </div>
  );
}

function Panel({ title, loading, empty, children }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-bold text-ink-900">{title}</h3>
      <div className="h-64">
        {loading ? (
          <div className="h-full animate-pulse rounded-lg bg-ink-100" />
        ) : empty ? (
          <p className="flex h-full items-center justify-center text-sm text-ink-300">No data for this range.</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
