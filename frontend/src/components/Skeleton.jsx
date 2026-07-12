export function SkeletonCard() {
  return (
    <div className="card animate-pulse p-5">
      <div className="mb-3 h-3 w-20 rounded bg-ink-100" />
      <div className="h-7 w-16 rounded bg-ink-100" />
    </div>
  );
}

export function SkeletonRow({ cols = 6 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 w-full max-w-[100px] rounded bg-ink-100" />
        </td>
      ))}
    </tr>
  );
}
