const STYLES = {
  Available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Trip': 'bg-blue-50 text-route-600 border-blue-200',
  'In Shop': 'bg-amber-50 text-amber-700 border-amber-200',
  Retired: 'bg-slate-100 text-ink-500 border-slate-200',
  'Off Duty': 'bg-slate-100 text-ink-500 border-slate-200',
  Suspended: 'bg-red-50 text-status-cancelled border-red-200',
  Draft: 'bg-slate-100 text-ink-500 border-slate-200',
  Dispatched: 'bg-blue-50 text-route-600 border-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-50 text-status-cancelled border-red-200',
  Open: 'bg-amber-50 text-amber-700 border-amber-200',
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function StatusPill({ status }) {
  const style = STYLES[status] || 'bg-slate-100 text-ink-500 border-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}
