export default function MessagesLoading() {
  return (
    <div className="flex-1 p-4 flex h-full animate-pulse">
      <div className="flex w-full h-full rounded-lg overflow-hidden border border-border">
        <div className="w-72 shrink-0 border-r border-border bg-muted/30 flex flex-col p-3 gap-2">
          <div className="h-8 bg-muted rounded-lg mb-2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="flex-1 flex flex-col bg-background">
          <div className="h-16 border-b border-border bg-muted/20 shrink-0" />
          <div className="flex-1 p-6 flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "self-start" : "self-end flex-row-reverse"} w-2/3`}>
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
