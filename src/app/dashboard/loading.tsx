// Shown instantly while any dashboard page (customer, admin, staff, support) loads its
// data, so a click never looks like nothing happened.
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 animate-pulse px-4 py-8 sm:px-6 sm:py-12" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-foreground/10" />
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 rounded bg-foreground/10" />
          <div className="h-5 w-48 rounded bg-foreground/10" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-foreground/5" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-foreground/5" />
        ))}
      </div>
    </div>
  );
}
