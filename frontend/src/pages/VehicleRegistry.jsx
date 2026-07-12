import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';
import useDebounce from '../lib/useDebounce';
import { formatCurrency, formatNumber } from '../lib/format';

const STATUS_CHIPS = ['All', 'Available', 'On Trip', 'In Shop', 'Retired'];
const VEHICLE_TYPES = ['Truck', 'Van', 'Bike', 'Trailer'];

const EMPTY_FORM = {
  regNumber: '',
  name: '',
  type: 'Truck',
  maxLoadKg: '',
  odometer: '',
  acquisitionCost: '',
  status: 'Available',
};

export default function VehicleRegistry() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const canManage = hasRole('FleetManager');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const debouncedSearch = useDebounce(search);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadVehicles() {
    setLoading(true);
    try {
      const data = await api.get('/vehicles', {
        search: debouncedSearch || undefined,
        status: status === 'All' ? undefined : status,
      });
      setVehicles(data || []);
    } catch (err) {
      push(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(vehicle) {
    setEditing(vehicle);
    setForm({
      regNumber: vehicle.regNumber,
      name: vehicle.name,
      type: vehicle.type,
      maxLoadKg: vehicle.maxLoadKg,
      odometer: vehicle.odometer,
      acquisitionCost: vehicle.acquisitionCost,
      status: vehicle.status,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function validate() {
    const next = {};
    if (!form.regNumber.trim()) next.regNumber = 'Registration number is required.';
    if (!(Number(form.maxLoadKg) > 0)) next.maxLoadKg = 'Max load must be greater than 0.';
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      maxLoadKg: Number(form.maxLoadKg),
      odometer: Number(form.odometer) || 0,
      acquisitionCost: Number(form.acquisitionCost) || 0,
    };

    setSaving(true);
    try {
      if (editing) {
        const updated = await api.put(`/vehicles/${editing.id}`, payload);
        setVehicles((list) => list.map((v) => (v.id === editing.id ? updated : v)));
        push('Vehicle updated', 'success');
      } else {
        const created = await api.post('/vehicles', payload);
        setVehicles((list) => [created, ...list]);
        push('Vehicle added', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormErrors((f) => ({ ...f, regNumber: err.message }));
      } else {
        push(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/vehicles/${deleteTarget.id}`);
      setVehicles((list) => list.filter((v) => v.id !== deleteTarget.id));
      push('Vehicle deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      push(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Vehicle Registry"
        description="Master list of all fleet vehicles."
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Vehicle
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by registration or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={status === s ? 'chip-active' : 'chip'}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Reg. Number</th>
              <th className="th">Name / Model</th>
              <th className="th">Type</th>
              <th className="th">Max Load (kg)</th>
              <th className="th">Odometer</th>
              <th className="th">Acquisition Cost</th>
              <th className="th">Status</th>
              {canManage && <th className="th text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={canManage ? 8 : 7} />)
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={8} className="td py-10 text-center text-ink-300">
                  No vehicles match your filters.
                </td>
              </tr>
            ) : (
              vehicles.map((v, idx) => (
                <tr key={v.id} className={idx % 2 === 1 ? 'bg-canvas/40' : ''}>
                  <td className="td font-mono font-semibold text-ink-900">{v.regNumber}</td>
                  <td className="td">{v.name}</td>
                  <td className="td">{v.type}</td>
                  <td className="td font-mono">{formatNumber(v.maxLoadKg)}</td>
                  <td className="td font-mono">{formatNumber(v.odometer)}</td>
                  <td className="td font-mono">{formatCurrency(v.acquisitionCost)}</td>
                  <td className="td">
                    <StatusPill status={v.status} />
                  </td>
                  {canManage && (
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(v)}
                          className="rounded-lg p-2 text-ink-500 hover:bg-canvas hover:text-route-500"
                          aria-label="Edit vehicle"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(v)}
                          className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-status-cancelled"
                          aria-label="Delete vehicle"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'}>
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div>
            <label className="label">Registration Number</label>
            <input
              className="input"
              value={form.regNumber}
              onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))}
            />
            {formErrors.regNumber && <p className="field-error">{formErrors.regNumber}</p>}
          </div>
          <div>
            <label className="label">Name / Model</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Max Load (kg)</label>
              <input
                type="number"
                className="input"
                value={form.maxLoadKg}
                onChange={(e) => setForm((f) => ({ ...f, maxLoadKg: e.target.value }))}
              />
              {formErrors.maxLoadKg && <p className="field-error">{formErrors.maxLoadKg}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Odometer</label>
              <input
                type="number"
                className="input"
                value={form.odometer}
                onChange={(e) => setForm((f) => ({ ...f, odometer: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Acquisition Cost</label>
              <input
                type="number"
                className="input"
                value={form.acquisitionCost}
                onChange={(e) => setForm((f) => ({ ...f, acquisitionCost: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option>Available</option>
              <option>Retired</option>
            </select>
            <p className="mt-1 text-xs text-ink-500">
              "On Trip" and "In Shop" are managed automatically by trips and maintenance.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        tone="danger"
        title="Delete vehicle?"
        confirmLabel="Delete"
        message={`This will permanently remove ${deleteTarget?.regNumber} from the registry.`}
      />
    </div>
  );
}
