export function FormCardSkeleton() {
  return (
    <div className="bg-gray-800/50 border border-white/10 rounded-xl p-4 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="h-5 w-32 bg-gray-700 rounded" />
            <div className="h-4 w-16 bg-gray-700/50 rounded-full" />
            <div className="h-4 w-16 bg-gray-700/50 rounded-full" />
          </div>
          <div className="h-3 w-48 bg-gray-700/30 rounded mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <div className="h-8 w-14 bg-white/5 rounded-lg" />
          <div className="h-8 w-16 bg-white/5 rounded-lg" />
          <div className="h-8 w-16 bg-white/5 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
