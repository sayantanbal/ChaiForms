import { FormCardSkeleton } from "~/components/skeletons/form-card-skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-800/50 border border-white/10 rounded-xl p-5 animate-pulse"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-700 mb-3" />
            <div className="h-8 w-24 bg-gray-700 rounded mb-2" />
            <div className="h-4 w-20 bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <FormCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
