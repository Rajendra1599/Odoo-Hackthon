import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';
import useDebounce from '../lib/useDebounce';
import { formatDate, daysUntil } from '../lib/format';

const STATUS_CHIPS = ['All', 'Available', 'On Trip', 'Off Duty', 'Suspended'];
const LICENSE_CATEGORIES = ['LMV', 'HMV', 'Trailer', 'Motorcycle'];

const EMPTY_FORM = {
  name: '',
  licenseNumber: '',
  licenseCategory: 'LMV',
  licenseExpiry: '',
  contactNumber: '',
  safetyScore: 80,
  status: 'Available',
};

export default function DriverManagement() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const canManage = hasRole('FleetManager', 'SafetyOfficer');

  const [drivers, setDrivers] = useState([]);
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

  async function loadDrivers() {
    setLoading(true);
    try {
      const data = await api.get('/drivers', {
        search: debouncedSearch || undefined,
        status: status === 'All' ? undefined : status,
      });
      setDrivers(data || []);
    } catch (err) {
      push(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(driver) {
    setEditing(driver);
    setForm({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiry: driver.licenseExpiry?.slice(0, 10) || '',
      contactNumber: driver.contactNumber,
      safetyScore: driver.safetyScore,
      status: driver.status,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!form.licenseNumber.trim()) next.licenseNumber = 'License number is required.';
    if (!form.licenseExpiry) next.licenseExpiry = 'License expiry date is required.';
    const score = Number(form.safetyScore);
    if (Number.isNaN(score) || score < 0 || score > 100) next.safetyScore = 'Score must be between 0 and 100.';
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = { ...form, safetyScore: Number(form.safetyScore) };

    setSaving(true);
    try {
      if (editing) {
        const updated = await api.put(`/drivers/${editing.id}`, payload);
        setDrivers((list) => list.map((d) => (d.id === editing.id ? updated : d)));
        push('Driver updated', 'success');
      } else {
        const created = await api.post('/drivers', payload);
        setDrivers((list) => [created, ...list]);
        push('Driver added', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      push(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/drivers/${deleteTarget.id}`);
      setDrivers((list) => list.filter((d) => d.id !== deleteTarget.id));
      push('Driver removed', 'success');
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
        title="Driver Management"
        description="Profiles, licensing and safety compliance."
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Driver
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by name or license number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={status === s ? 'chip-active' : 'chip'}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Name</th>
              <th className="th">License Number</th>
              <th className="th">Category</th>
              <th className="th">License Expiry</th>
              <th className="th">Contact</th>
              <th className="th">Safety Score</th>
              <th className="th">Status</th>
              {canManage && <th className="th text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={canManage ? 8 : 7} />)
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={8} className="td py-10 text-center text-ink-300">
                  No drivers match your filters.
                </td>
              </tr>
            ) : (
              drivers.map((d, idx) => {
                const remaining = daysUntil(d.licenseExpiry);
                return (
                  <tr key={d.id} className={idx % 2 === 1 ? 'bg-canvas/40' : ''}>
                    <td className="td font-medium text-ink-900">{d.name}</td>
                    <td className="td font-mono">{d.licenseNumber}</td>
                    <td className="td">{d.licenseCategory}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(d.licenseExpiry)}</span>
                        {remaining !== null && remaining < 0 && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-status-cancelled">
                            Expired
                          </span>
                        )}
                        {remaining !== null && remaining >= 0 && remaining <= 30 && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Expiring soon
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="td font-mono">{d.contactNumber}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className={`h-full rounded-full ${
                              d.safetyScore >= 80 ? 'bg-status-available' : d.safetyScore >= 50 ? 'bg-status-shop' : 'bg-status-cancelled'
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, d.safetyScore))}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-ink-500">{d.safetyScore}</span>
                      </div>
                    </td>
                    <td className="td">
                      <StatusPill status={d.status} />
                    </td>
                    {canManage && (
                      <td className="td">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(d)}
                            className="rounded-lg p-2 text-ink-500 hover:bg-canvas hover:text-route-500"
                            aria-label="Edit driver"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(d)}
                            className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-status-cancelled"
                            aria-label="Delete driver"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Driver' : 'Add Driver'}>
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            {formErrors.name && <p className="field-error">{formErrors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">License Number</label>
              <input
                className="input"
                value={form.licenseNumber}
                onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
              />
              {formErrors.licenseNumber && <p className="field-error">{formErrors.licenseNumber}</p>}
            </div>
            <div>
              <label className="label">License Category</label>
              <select
                className="input"
                value={form.licenseCategory}
                onChange={(e) => setForm((f) => ({ ...f, licenseCategory: e.target.value }))}
              >
                {LICENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">License Expiry</label>
              <input
                type="date"
                className="input"
                value={form.licenseExpiry}
                onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))}
              />
              {formErrors.licenseExpiry && <p className="field-error">{formErrors.licenseExpiry}</p>}
            </div>
            <div>
              <label className="label">Contact Number</label>
              <input
                className="input"
                value={form.contactNumber}
                onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Safety Score (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={form.safetyScore}
                onChange={(e) => setForm((f) => ({ ...f, safetyScore: e.target.value }))}
              />
              {formErrors.safetyScore && <p className="field-error">{formErrors.safetyScore}</p>}
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option>Available</option>
                <option>Off Duty</option>
                <option>Suspended</option>
              </select>
              <p className="mt-1 text-xs text-ink-500">"On Trip" is set automatically when dispatched.</p>
            </div>
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
        title="Remove driver?"
        confirmLabel="Remove"
        message={`This will permanently remove ${deleteTarget?.name} from the roster.`}
      />
    </div>
  );
}
