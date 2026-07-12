import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

/**
 * options: [{ value, label, sublabel, disabled, disabledReason }]
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  emptyLabel = 'No matches found',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    `${o.label} ${o.sublabel || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left"
      >
        <span className={selected ? 'text-ink-900' : 'text-ink-300'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className="text-ink-300" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-ink-100 bg-white shadow-modal">
          <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2">
            <Search size={14} className="text-ink-300" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full text-sm outline-none placeholder:text-ink-300"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-ink-300">{emptyLabel}</li>
            )}
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  disabled={o.disabled}
                  title={o.disabled ? o.disabledReason : undefined}
                  onClick={() => {
                    if (o.disabled) return;
                    onChange(o.value);
                    setQuery('');
                    setOpen(false);
                  }}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                    o.disabled
                      ? 'cursor-not-allowed text-ink-300'
                      : 'text-ink-900 hover:bg-canvas'
                  }`}
                >
                  <span>{o.label}</span>
                  {o.sublabel && <span className="text-xs text-ink-500">{o.sublabel}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
