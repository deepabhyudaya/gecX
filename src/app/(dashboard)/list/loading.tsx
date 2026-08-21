const Loading = () => {
  return (
    <div className="bg-card text-card-foreground p-4 rounded-md flex-1 m-4 mt-0 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-muted rounded-md w-32 hidden md:block" />
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="h-9 bg-muted rounded-full flex-1 md:w-56 md:flex-none" />
          <div className="h-9 w-9 bg-muted rounded-full shrink-0" />
        </div>
      </div>

      <div className="hidden md:grid grid-cols-4 gap-4 px-4 pb-3 border-b border-border/30">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded w-3/4" />
        ))}
      </div>

      <div className="divide-y divide-border/20">
        {[...Array(10)].map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 py-4 px-2"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 bg-muted rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="h-4 bg-muted rounded w-3/5" />
                <div className="h-3 bg-muted/60 rounded w-2/5" />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 shrink-0">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 bg-muted rounded w-20" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-7 w-7 bg-muted rounded-full" />
              <div className="h-7 w-7 bg-muted rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/20">
        <div className="h-4 bg-muted rounded w-32" />
        <div className="flex items-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-8 bg-muted rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loading;
