import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusPill from '../components/StatusPill.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';
import { daysUntil } from '../lib/format';

const TABS = ['All', 'Draft', 'Dispatched', 'Completed', 'Cancelled'];

const EMPTY_TRIP_FORM = {
  source: '',
  destination: '',
  vehicleId: '',
  driverId: '',
  cargoWeightKg: '',
  plannedDistanceKm: '',
};

export default function TripManagement() {
  const { hasRole } = useAuth();
  const { push } = useToast();
  const canWrite = hasRole('FleetManager', 'Driver');

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');

  // New trip modal
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(EMPTY_TRIP_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);

  // Confirm dialogs
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Complete trip modal
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeForm, setCompleteForm] = useState({ finalOdometer: '', fuelConsumedL: '' });
  const [completing, setCompleting] = useState(false);

  async function loadTrips() {
    setLoading(true);
    try {
      const data = await api.get('/trips', { status: tab === 'All' ? undefined : tab });
      setTrips(data || []);
    } catch (err) {
      push(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function openNewTrip() {
    setForm(EMPTY_TRIP_FORM);
    setFormErrors({});
    setNewTripOpen(true);
    try {
      const [vehicleData, driverData] = await Promise.all([
        api.get('/vehicles', { status: 'Available' }),
        api.get('/drivers', { status: 'Available' }),
      ]);
      setVehicles(vehicleData || []);
      setDrivers(driverData || []);
    } catch (err) {
      push(err.message);
    }
  }

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === form.vehicleId),
    [vehicles, form.vehicleId]
  );

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: v.regNumber,
    sublabel: `${v.name} — max ${v.maxLoadKg} kg`,
  }));

  const driverOptions = drivers
    .map((d) => {
      const expired = daysUntil(d.licenseExpiry) !== null && daysUntil(d.licenseExpiry) < 0;
      return {
        value: d.id,
        label: d.name,
        sublabel: expired ? 'License expired' : `Lic. ${d.licenseNumber}`,
        disabled: expired,
        disabledReason: 'This driver\u2019s license has expired.',
      };
    })
    .filter((d) => !d.disabled); // client-side filter out expired-license drivers per spec

  function validateNewTrip() {
    const next = {};
    if (!form.source.trim()) next.source = 'Source is required.';
    if (!form.destination.trim()) next.destination = 'Destination is required.';
    if (!form.vehicleId) next.vehicleId = 'Select a vehicle.';
    if (!form.driverId) next.driverId = 'Select a driver.';
    if (!(Number(form.plannedDistanceKm) > 0)) next.plannedDistanceKm = 'Enter a planned distance.';

    const cargo = Number(form.cargoWeightKg);
    if (!(cargo > 0)) {
      next.cargoWeightKg = 'Cargo weight is required.';
    } else if (selectedVehicle && cargo > selectedVehicle.maxLoadKg) {
      next.cargoWeightKg = `Cargo weight exceeds vehicle capacity (${selectedVehicle.maxLoadKg} kg).`;
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreateTrip(e) {
    e.preventDefault();
    if (!validateNewTrip()) return;

    setCreating(true);
    try {
      const created = await api.post('/trips', {
        source: form.source,
        destination: form.destination,
        vehicleId: form.vehicleId,
        driverId: form.driverId,
        cargoWeightKg: Number(form.cargoWeightKg),
        plannedDistanceKm: Number(form.plannedDistanceKm),
      });
      setTrips((list) => (tab === 'All' || tab === 'Draft' ? [created, ...list] : list));
      push('Trip created as Draft', 'success');
      setNewTripOpen(false);
    } catch (err) {
      push(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDispatch() {
    setActionLoading(true);
    try {
      const updated = await api.patch(`/trips/${dispatchTarget.id}/dispatch`);
      setTrips((list) => list.map((t) => (t.id === updated.id ? updated : t)));
      push('Trip dispatched', 'success');
      setDispatchTarget(null);
    } catch (err) {
      push(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      const updated = await api.patch(`/trips/${cancelTarget.id}/cancel`);
      setTrips((list) => list.map((t) => (t.id === updated.id ? updated : t)));
      push('Trip cancelled', 'success');
      setCancelTarget(null);
    } catch (err) {
      push(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function openComplete(trip) {
    setCompleteTarget(trip);
    setCompleteForm({ finalOdometer: '', fuelConsumedL: '' });
  }

  async function handleComplete(e) {
    e.preventDefault();
    setCompleting(true);
    try {
      const updated = await api.patch(`/trips/${completeTarget.id}/complete`, {
        finalOdometer: Number(completeForm.finalOdometer),
        fuelConsumedL: Number(completeForm.fuelConsumedL) || 0,
      });
      setTrips((list) => list.map((t) => (t.id === updated.id ? updated : t)));
      push('Trip completed', 'success');
      setCompleteTarget(null);
    } catch (err) {
      push(err.message);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Trip Management"
        description="Create, dispatch, and complete fleet trips."
        action={
          canWrite && (
            <button className="btn-primary" onClick={openNewTrip}>
              <Plus size={16} /> New Trip
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
        <table className="w-full min-w-[960px]">
          <thead className="bg-canvas">
            <tr>
              <th className="th">Trip ID</th>
              <th className="th">Source</th>
              <th className="th">Destination</th>
              <th className="th">Vehicle</th>
              <th className="th">Driver</th>
              <th className="th">Cargo (kg)</th>
              <th className="th">Status</th>
              {canWrite && <th className="th text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={canWrite ? 8 : 7} />)
            ) : trips.length === 0 ? (
              <tr>
                <td colSpan={8} className="td py-10 text-center text-ink-300">
                  No trips in this view.
                </td>
              </tr>
            ) : (
              trips.map((trip, idx) => (
                <tr key={trip.id} className={idx % 2 === 1 ? 'bg-canvas/40' : ''}>
                  <td className="td font-mono text-xs text-ink-500">{trip.id}</td>
                  <td className="td font-medium text-ink-900">{trip.source}</td>
                  <td className="td">{trip.destination}</td>
                  <td className="td font-mono">{trip.vehicleRegNumber}</td>
                  <td className="td">{trip.driverName}</td>
                  <td className="td font-mono">{trip.cargoWeightKg}</td>
                  <td className="td">
                    <StatusPill status={trip.status} />
                  </td>
                  {canWrite && (
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        {trip.status === 'Draft' && (
                          <>
                            <button className="btn-secondary !px-2.5 !py-1 text-xs" onClick={() => setDispatchTarget(trip)}>
                              Dispatch
                            </button>
                            <button
                              className="btn-danger !px-2.5 !py-1 text-xs"
                              onClick={() => setCancelTarget(trip)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {trip.status === 'Dispatched' && (
                          <>
                            <button className="btn-primary !px-2.5 !py-1 text-xs" onClick={() => openComplete(trip)}>
                              Complete
                            </button>
                            <button
                              className="btn-danger !px-2.5 !py-1 text-xs"
                              onClick={() => setCancelTarget(trip)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(trip.status === 'Completed' || trip.status === 'Cancelled') && (
                          <span className="text-xs text-ink-300">—</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Trip modal */}
      <Modal open={newTripOpen} onClose={() => setNewTripOpen(false)} title="New Trip">
        <form onSubmit={handleCreateTrip} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Source</label>
              <input className="input" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
              {formErrors.source && <p className="field-error">{formErrors.source}</p>}
            </div>
            <div>
              <label className="label">Destination</label>
              <input
                className="input"
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              />
              {formErrors.destination && <p className="field-error">{formErrors.destination}</p>}
            </div>
          </div>

          <div>
            <label className="label">Vehicle</label>
            <SearchableSelect
              options={vehicleOptions}
              value={form.vehicleId}
              onChange={(v) => setForm((f) => ({ ...f, vehicleId: v }))}
              placeholder="Select an available vehicle…"
              emptyLabel="No available vehicles"
            />
            {formErrors.vehicleId && <p className="field-error">{formErrors.vehicleId}</p>}
          </div>

          <div>
            <label className="label">Driver</label>
            <SearchableSelect
              options={driverOptions}
              value={form.driverId}
              onChange={(v) => setForm((f) => ({ ...f, driverId: v }))}
              placeholder="Select an available driver…"
              emptyLabel="No available drivers"
            />
            {formErrors.driverId && <p className="field-error">{formErrors.driverId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cargo Weight (kg)</label>
              <input
                type="number"
                className="input"
                value={form.cargoWeightKg}
                onChange={(e) => setForm((f) => ({ ...f, cargoWeightKg: e.target.value }))}
              />
              {selectedVehicle && (
                <p className="mt-1 text-xs text-ink-500">Max load for {selectedVehicle.regNumber}: {selectedVehicle.maxLoadKg} kg</p>
              )}
              {formErrors.cargoWeightKg && <p className="field-error">{formErrors.cargoWeightKg}</p>}
            </div>
            <div>
              <label className="label">Planned Distance (km)</label>
              <input
                type="number"
                className="input"
                value={form.plannedDistanceKm}
                onChange={(e) => setForm((f) => ({ ...f, plannedDistanceKm: e.target.value }))}
              />
              {formErrors.plannedDistanceKm && <p className="field-error">{formErrors.plannedDistanceKm}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setNewTripOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create Trip'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Trip modal */}
      <Modal open={!!completeTarget} onClose={() => setCompleteTarget(null)} title="Complete Trip" width="max-w-sm">
        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <label className="label">Final Odometer</label>
            <input
              type="number"
              required
              className="input"
              value={completeForm.finalOdometer}
              onChange={(e) => setCompleteForm((f) => ({ ...f, finalOdometer: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Fuel Consumed (liters)</label>
            <input
              type="number"
              className="input"
              value={completeForm.fuelConsumedL}
              onChange={(e) => setCompleteForm((f) => ({ ...f, fuelConsumedL: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCompleteTarget(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={completing}>
              {completing ? 'Completing…' : 'Complete Trip'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!dispatchTarget}
        onClose={() => setDispatchTarget(null)}
        onConfirm={handleDispatch}
        loading={actionLoading}
        title="Dispatch trip?"
        confirmLabel="Dispatch"
        message="This marks the vehicle and driver as On Trip and locks in the assignment."
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={actionLoading}
        tone="danger"
        title="Cancel trip?"
        confirmLabel="Cancel Trip"
        message="If the trip is dispatched, the vehicle and driver will be restored to Available."
      />
    </div>
  );
}
