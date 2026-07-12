import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';
import { formatCurrency, formatDate, formatNumber } from '../lib/format';

const EXPENSE_TYPES = ['Toll', 'Other'];

export default function FuelExpense() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const canCreate = hasRole('FleetManager', 'FinancialAnalyst');

  const [tab, setTab] = useState('fuel');

  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState({ vehicleId: '', liters: '', cost: '', date: '' });
  const [fuelErrors, setFuelErrors] = useState({});
  const [savingFuel, setSavingFuel] = useState(false);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ vehicleId: '', type: 'Toll', amount: '', date: '' });
  const [expenseErrors, setExpenseErrors] = useState({});
  const [savingExpense, setSavingExpense] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [fuelData, expenseData, summaryData, vehicleData] = await Promise.all([
        api.get('/fuel-logs'),
        api.get('/expenses'),
        api.get('/expenses/summary'),
        api.get('/vehicles'),
      ]);
      setFuelLogs(fuelData || []);
      setExpenses(expenseData || []);
      setSummary(summaryData || []);
      setVehicles((vehicleData || []).filter((v) => v.status !== 'Retired'));
    } catch (err) {
      push(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openFuelModal() {
    setFuelForm({ vehicleId: '', liters: '', cost: '', date: new Date().toISOString().slice(0, 10) });
    setFuelErrors({});
    setFuelModalOpen(true);
  }

  function validateFuel() {
    const next = {};
    if (!fuelForm.vehicleId) next.vehicleId = 'Select a vehicle.';
    if (!(Number(fuelForm.liters) > 0)) next.liters = 'Liters must be greater than 0.';
    if (!(Number(fuelForm.cost) >= 0)) next.cost = 'Enter a valid cost.';
    setFuelErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSaveFuel(e) {
    e.preventDefault();
    if (!validateFuel()) return;
    setSavingFuel(true);
    try {
      const created = await api.post('/fuel-logs', {
        vehicleId: fuelForm.vehicleId,
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
        date: fuelForm.date,
      });
      setFuelLogs((list) => [created, ...list]);
      push('Fuel log added', 'success');
      setFuelModalOpen(false);
      loadAll();
    } catch (err) {
      push(err.message);
    } finally {
      setSavingFuel(false);
    }
  }

  function openExpenseModal() {
    setExpenseForm({ vehicleId: '', type: 'Toll', amount: '', date: new Date().toISOString().slice(0, 10) });
    setExpenseErrors({});
    setExpenseModalOpen(true);
  }

  function validateExpense() {
    const next = {};
    if (!expenseForm.vehicleId) next.vehicleId = 'Select a vehicle.';
    if (!(Number(expenseForm.amount) >= 0)) next.amount = 'Enter a valid amount.';
    setExpenseErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSaveExpense(e) {
    e.preventDefault();
    if (!validateExpense()) return;
    setSavingExpense(true);
    try {
      const created = await api.post('/expenses', {
        vehicleId: expenseForm.vehicleId,
        type: expenseForm.type,
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
      });
      setExpenses((list) => [created, ...list]);
      push('Expense added', 'success');
      setExpenseModalOpen(false);
      loadAll();
    } catch (err) {
      push(err.message);
    } finally {
      setSavingExpense(false);
    }
  }

  return (
    <div>
      <PageHeader title="Fuel & Expense Management" description="Log fuel and other operational costs per vehicle." />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('fuel')} className={tab === 'fuel' ? 'chip-active' : 'chip'}>
          Fuel Logs
        </button>
        <button onClick={() => setTab('expenses')} className={tab === 'expenses' ? 'chip-active' : 'chip'}>
          Expenses
        </button>
      </div>

      {tab === 'fuel' ? (
        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="text-sm font-bold text-ink-900">Fuel Logs</h3>
            {canCreate && (
              <button className="btn-primary !py-1.5 text-xs" onClick={openFuelModal}>
                <Plus size={14} /> Add Fuel Log
              </button>
            )}
          </div>
          <table className="w-full">
            <thead className="bg-canvas">
              <tr>
                <th className="th">Vehicle</th>
                <th className="th">Date</th>
                <th className="th">Liters</th>
                <th className="th">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
              ) : fuelLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="td py-10 text-center text-ink-300">
                    No fuel logs yet.
                  </td>
                </tr>
              ) : (
                fuelLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="td font-mono font-semibold text-ink-900">{log.vehicleRegNumber}</td>
                    <td className="td">{formatDate(log.date)}</td>
                    <td className="td font-mono">{formatNumber(log.liters, 1)}</td>
                    <td className="td font-mono">{formatCurrency(log.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="text-sm font-bold text-ink-900">Expenses</h3>
            {canCreate && (
              <button className="btn-primary !py-1.5 text-xs" onClick={openExpenseModal}>
                <Plus size={14} /> Add Expense
              </button>
            )}
          </div>
          <table className="w-full">
            <thead className="bg-canvas">
              <tr>
                <th className="th">Vehicle</th>
                <th className="th">Type</th>
                <th className="th">Amount</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="td py-10 text-center text-ink-300">
                    No expenses yet.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="td font-mono font-semibold text-ink-900">{exp.vehicleRegNumber}</td>
                    <td className="td">{exp.type}</td>
                    <td className="td font-mono">{formatCurrency(exp.amount)}</td>
                    <td className="td">{formatDate(exp.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Total operational cost summary */}
      <div className="card mt-6 p-5">
        <h3 className="mb-4 text-sm font-bold text-ink-900">Total Operational Cost by Vehicle (Fuel + Maintenance)</h3>
        <div className="h-72">
          {loading ? (
            <div className="h-full animate-pulse rounded-lg bg-ink-100" />
          ) : summary.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-ink-300">No cost data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EC" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#5B6B85' }} />
                <YAxis type="category" dataKey="regNumber" width={90} tick={{ fontSize: 11, fill: '#5B6B85' }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="totalOperationalCost" fill="#0F5FA6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Add Fuel Log modal */}
      <Modal open={fuelModalOpen} onClose={() => setFuelModalOpen(false)} title="Add Fuel Log">
        <form onSubmit={handleSaveFuel} noValidate className="space-y-4">
          <VehicleSelect vehicles={vehicles} value={fuelForm.vehicleId} onChange={(v) => setFuelForm((f) => ({ ...f, vehicleId: v }))} error={fuelErrors.vehicleId} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Liters</label>
              <input
                type="number"
                className="input"
                value={fuelForm.liters}
                onChange={(e) => setFuelForm((f) => ({ ...f, liters: e.target.value }))}
              />
              {fuelErrors.liters && <p className="field-error">{fuelErrors.liters}</p>}
            </div>
            <div>
              <label className="label">Cost</label>
              <input
                type="number"
                className="input"
                value={fuelForm.cost}
                onChange={(e) => setFuelForm((f) => ({ ...f, cost: e.target.value }))}
              />
              {fuelErrors.cost && <p className="field-error">{fuelErrors.cost}</p>}
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={fuelForm.date}
              onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setFuelModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={savingFuel}>
              {savingFuel ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Expense modal */}
      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSaveExpense} noValidate className="space-y-4">
          <VehicleSelect
            vehicles={vehicles}
            value={expenseForm.vehicleId}
            onChange={(v) => setExpenseForm((f) => ({ ...f, vehicleId: v }))}
            error={expenseErrors.vehicleId}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={expenseForm.type}
                onChange={(e) => setExpenseForm((f) => ({ ...f, type: e.target.value }))}
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Amount</label>
              <input
                type="number"
                className="input"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
              />
              {expenseErrors.amount && <p className="field-error">{expenseErrors.amount}</p>}
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setExpenseModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={savingExpense}>
              {savingExpense ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function VehicleSelect({ vehicles, value, onChange, error }) {
  return (
    <div>
      <label className="label">Vehicle</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a vehicle…</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.regNumber} — {v.name}
          </option>
        ))}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
