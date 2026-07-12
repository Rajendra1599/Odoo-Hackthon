import { ShieldAlert } from 'lucide-react';

export default function RestrictedAccess({ message = "You don't have access to this page." }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ShieldAlert size={22} />
      </div>
      <p className="text-sm font-semibold text-ink-900">Access restricted</p>
      <p className="max-w-sm text-sm text-ink-500">{message}</p>
    </div>
  );
}
