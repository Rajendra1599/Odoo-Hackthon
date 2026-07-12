import { useEffect, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';
import { formatCurrency, formatDate } from '../lib/format';

const TABS = ['Open', 'Closed', 'All'];
const TYPES = ['Oil Change', 'Tire', 'Brake', 'Inspection', 'Other'];

const EMPTY_FORM = { vehicleId: '', type: 'Oil Change', cost: '' };

export default function Maintenance() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const canManage = hasRole('FleetManager');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Open');

  const [modalOpen, setModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [closeTarget, setCloseTarget] = useState(null);
  const [closing, setClosing] = useState(false);

  async function loadRecords() {
    setLoading(true);
    try {
      const data = await api.get('/maintenance', { status: tab === 'All' ? undefined : tab });
      setRecords(data || []);
    } catch (err) {
      push(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
    try {
      const data = await api.get('/vehicles', { status: 'Available' });
      setVehicles(data || []);
    } catch (err) {
      push(err.message);
    }
  }

  function validate() {
    const next = {};
    if (!form.vehicleId) next.vehicleId = 'Select a vehicle.';
    if (!(Number(form.cost) >= 0)) next.cost = 'Enter a valid cost.';
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const created = await api.post('/maintenance', {
        vehicleId: form.vehicleId,
        type: form.type,
        cost: Number(form.cost) || 0,
      });
      if (tab === 'All' || tab === 'Open') setRecords((list) => [created, ...list]);
      push('Maintenance record created — vehicle marked In Shop', 'success');
      setModalOpen(false);
    } catch (err) {
      push(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    setClosing(true);
    try {
      const updated = await api.patch(`/maintenance/${closeTarget.id}/close`);
      setRecords((list) =>
        tab === 'Open' ? list.filter((r) => r.id !== closeTarget.id) : list.map((r) => (r.id === updated.id ? updated : r))
      );
      push('Maintenance record closed', 'success');
      setCloseTarget(null);
    } catch (err) {
      push(err.message);
    } finally {
      setClosing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Maintenance Log"
        description="Track service records and vehicle downtime."
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> New Maintenance Record
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'chip-active' : 'chip'}>
            {t}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Vehicle</th>
              <th className="th">Type</th>
              <th className="th">Cost</th>
              <th className="th">Opened</th>
              <th className="th">Closed</th>
              <th className="th">Status</th>
              {canManage && <th className="th text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={canManage ? 7 : 6} />)
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="td py-10 text-center text-ink-300">
                  No records in this view.
                </td>
              </tr>
            ) : (
              records.map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 1 ? 'bg-canvas/40' : ''}>
                  <td className="td font-mono font-semibold text-ink-900">{r.vehicleRegNumber}</td>
                  <td className="td">{r.type}</td>
                  <td className="td font-mono">{formatCurrency(r.cost)}</td>
                  <td className="td">{formatDate(r.openedAt)}</td>
                  <td className="td">{formatDate(r.closedAt)}</td>
                  <td className="td">
                    <StatusPill status={r.status} />
                  </td>
                  {canManage && (
                    <td className="td text-right">
                      {r.status === 'Open' && (
                        <button className="btn-secondary !px-2.5 !py-1 text-xs" onClick={() => setCloseTarget(r)}>
                          Close
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Maintenance Record">
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>This will immediately mark the vehicle as In Shop and remove it from dispatch.</span>
          </div>

          <div>
            <label className="label">Vehicle</label>
            <select
              className="input"
              value={form.vehicleId}
              onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
            >
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.regNumber} — {v.name}
                </option>
              ))}
            </select>
            {formErrors.vehicleId && <p className="field-error">{formErrors.vehicleId}</p>}
          </div>

          <div>
            <label className="label">Maintenance Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Cost</label>
            <input
              type="number"
              className="input"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            />
            {formErrors.cost && <p className="field-error">{formErrors.cost}</p>}
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
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        onConfirm={handleClose}
        loading={closing}
        title="Close maintenance record?"
        confirmLabel="Close Record"
        message={`This will mark ${closeTarget?.vehicleRegNumber} as Available again (unless it has other open records).`}
      />
    </div>
  );
}
