export default function ServersLoading() {
  return (
    <div className="flex h-full bg-background overflow-hidden animate-pulse">
      <div className="hidden md:flex flex-col h-full w-[72px] bg-muted/30 border-r border-border py-3 items-center gap-2 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-muted" />
        <div className="w-8 h-[2px] bg-border rounded-full my-1" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-12 h-12 rounded-2xl bg-muted" />
        ))}
      </div>

      <div className="flex-1 flex">
        <div className="hidden md:flex flex-col w-64 border-r border-border bg-muted/20 p-3 gap-2">
          <div className="h-10 bg-muted rounded-lg" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded-md" />
          ))}
        </div>

        <div className="flex-1 flex flex-col bg-background">
          <div className="h-16 border-b border-border bg-muted/20 shrink-0" />
          <div className="flex-1 p-6 flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 w-2/3">
                <div className="size-8 rounded-full bg-muted shrink-0" />
                <div className="h-12 flex-1 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
          <div className="h-20 border-t border-border bg-muted/20 shrink-0" />
        </div>
      </div>
    </div>
  );
}
