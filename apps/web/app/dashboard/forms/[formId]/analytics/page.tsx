"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { useAnalyticsWs } from "@/hooks/use-analytics-ws";

export default function AnalyticsPage() {
  const { formId } = useParams<{ formId: string }>();
  const utils = trpc.useUtils();
  const { delta, reconnecting } = useAnalyticsWs(formId);

  const { data: form } = trpc.forms.getById.useQuery({ formId });
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.getSummary.useQuery({ formId });
  const { data: breakdown, isLoading: breakdownLoading } = trpc.analytics.getFieldBreakdown.useQuery({ formId });
  const { data: overTime, isLoading: overTimeLoading } = trpc.analytics.getResponsesOverTime.useQuery({
    formId,
    granularity: "day",
  });

  useEffect(() => {
    if (!delta) return;
    void utils.analytics.getSummary.invalidate({ formId });
    void utils.analytics.getFieldBreakdown.invalidate({ formId });
    void utils.analytics.getResponsesOverTime.invalidate({ formId, granularity: "day" });
  }, [delta, formId, utils]);

  const maxCount = overTime ? Math.max(...overTime.map((d) => d.count), 1) : 1;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/forms" className="text-gray-500 hover:text-white transition-colors text-sm">
          ← Forms
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold">{form?.title ?? "..."} — Analytics</h1>
        {reconnecting && (
          <span className="text-xs text-amber-400 ml-auto">Reconnecting…</span>
        )}
      </div>

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-800/50 rounded-xl animate-pulse" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-white/10 rounded-xl p-5">
            <div className="text-3xl font-bold">{summary.totalResponses}</div>
            <div className="text-gray-400 text-sm mt-1">Total Responses</div>
          </div>
          <div className="bg-gray-800/50 border border-white/10 rounded-xl p-5">
            <div className="text-3xl font-bold">{summary.completionRate.toFixed(1)}%</div>
            <div className="text-gray-400 text-sm mt-1">Completion Rate</div>
          </div>
          <div className="bg-gray-800/50 border border-white/10 rounded-xl p-5">
            <div className="text-3xl font-bold">
              {summary.avgDurationSeconds !== null
                ? `${Math.floor(summary.avgDurationSeconds / 60)}m ${summary.avgDurationSeconds % 60}s`
                : "—"}
            </div>
            <div className="text-gray-400 text-sm mt-1">Avg. Duration</div>
          </div>
        </div>
      ) : null}

      {/* Responses over time */}
      <div className="bg-gray-800/50 border border-white/10 rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-4">Responses Over Time</h2>
        {overTimeLoading ? (
          <div className="h-32 bg-gray-700/30 rounded animate-pulse" />
        ) : (overTime ?? []).length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">No data yet</div>
        ) : (
          <div className="flex items-end gap-1 h-32 overflow-x-auto">
            {(overTime ?? []).map((d) => (
              <div key={d.date} className="flex-shrink-0 flex flex-col items-center gap-1 group">
                <div
                  className="w-6 bg-orange-500/70 hover:bg-orange-400 rounded-t transition-all relative"
                  style={{ height: `${(d.count / maxCount) * 112}px`, minHeight: "4px" }}
                  title={`${d.date}: ${d.count} response${d.count !== 1 ? "s" : ""}`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
                    {d.count}
                  </div>
                </div>
                <div className="text-xs text-gray-600 rotate-45 origin-top-left mt-1 whitespace-nowrap" style={{ fontSize: "9px" }}>
                  {d.date.slice(5, 10)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Field breakdown */}
      <div className="bg-gray-800/50 border border-white/10 rounded-xl p-5">
        <h2 className="font-semibold mb-4">Field Breakdown</h2>
        {breakdownLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-700/30 rounded animate-pulse" />)}
          </div>
        ) : (breakdown ?? []).length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">No responses yet</div>
        ) : (
          <div className="space-y-4">
            {(breakdown ?? []).map((field) => {
              const entries = Object.entries(field.distribution).sort((a, b) => b[1] - a[1]);
              const maxEntryCount = entries.length > 0 ? (entries[0]?.[1] ?? 1) : 1;
              return (
                <div key={field.fieldId} className="border border-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm">{field.fieldLabel}</span>
                    <span className="text-xs text-gray-500">{field.responseCount} responses</span>
                  </div>
                  {entries.length === 0 ? (
                    <div className="text-xs text-gray-600">No answers yet</div>
                  ) : (
                    <div className="space-y-2">
                      {entries.slice(0, 8).map(([value, cnt]) => (
                        <div key={value}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-300 truncate">{value}</span>
                            <span className="text-gray-500 flex-shrink-0 ml-2">{cnt}</span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500/70 rounded-full transition-all"
                              style={{ width: `${(cnt / maxEntryCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {entries.length > 8 && (
                        <div className="text-xs text-gray-500 text-center">+{entries.length - 8} more values</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
