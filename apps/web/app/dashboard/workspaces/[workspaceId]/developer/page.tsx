"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

export default function DeveloperSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const { data: workspace } = trpc.workspaces.getById.useQuery({ workspaceId });

  // API Keys
  const { data: apiKeys = [], refetch: refetchKeys } = trpc.workspaces.listApiKeys.useQuery({
    workspaceId,
  });
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const createKeyMutation = trpc.workspaces.createApiKey.useMutation({
    onSuccess: (data: { rawKey: string }) => {
      setCreatedKey(data.rawKey);
      setNewKeyName("");
      void refetchKeys();
      toast.success("API Key created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeKeyMutation = trpc.workspaces.revokeApiKey.useMutation({
    onSuccess: () => {
      toast.success("API Key revoked");
      void refetchKeys();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Webhooks
  const { data: webhooks = [], refetch: refetchWebhooks } = trpc.workspaces.listWebhooks.useQuery({
    workspaceId,
  });
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvent, setNewWebhookEvent] = useState("form.response.submitted");

  const createWebhookMutation = trpc.workspaces.createWebhook.useMutation({
    onSuccess: () => {
      setNewWebhookUrl("");
      void refetchWebhooks();
      toast.success("Webhook created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteWebhookMutation = trpc.workspaces.deleteWebhook.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted");
      void refetchWebhooks();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <Link
          href={`/dashboard/workspaces/${workspaceId}`}
          className="text-sm text-gray-500 hover:text-white"
        >
          ← Back to {workspace?.name ?? "Workspace"}
        </Link>
        <h1 className="text-2xl font-bold mt-2">Developer Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage API Keys and Webhooks for this workspace.
        </p>
      </div>

      {/* API Keys Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">API Keys</h2>

        {createdKey && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <h3 className="text-green-400 font-medium mb-2">Save your API Key!</h3>
            <p className="text-sm text-gray-300 mb-3">
              This key will only be shown once. Please store it securely.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-900 p-2 rounded text-sm text-green-300 select-all font-mono">
                {createdKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdKey);
                  toast.success("Copied to clipboard");
                }}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="mt-3 text-sm text-gray-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newKeyName.trim()) return;
            createKeyMutation.mutate({ workspaceId, name: newKeyName.trim() });
          }}
          className="flex gap-2 mb-6"
        >
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="New API Key Name (e.g. Production App)"
            className="flex-1 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500/50"
            required
          />
          <button
            type="submit"
            disabled={createKeyMutation.isPending}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg text-sm disabled:opacity-50"
          >
            {createKeyMutation.isPending ? "Creating..." : "Create Key"}
          </button>
        </form>

        {apiKeys.length === 0 ? (
          <p className="text-sm text-gray-500 italic p-4 bg-gray-900/50 rounded-xl border border-white/5 text-center">
            No API keys created yet.
          </p>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-gray-400 bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last Used</th>
                  <th className="px-4 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key: any) => (
                  <tr key={key.id} className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium">{key.name}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (
                            confirm(`Revoke API key "${key.name}"? This action cannot be undone.`)
                          ) {
                            revokeKeyMutation.mutate({ workspaceId, keyId: key.id });
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs font-medium"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-900 border border-white/10 rounded-xl">
          <h3 className="font-semibold mb-2">How to authenticate</h3>
          <p className="text-sm text-gray-400 mb-3">
            Pass your API key in the <code>Authorization</code> header as a Bearer token:
          </p>
          <pre className="text-xs bg-gray-950 p-3 rounded-lg overflow-x-auto text-orange-300">
            <code>
              curl -H &quot;Authorization: Bearer cf_your_api_key_here&quot;
              https://api.chaiforms.com/v1/...
            </code>
          </pre>
        </div>
      </section>

      {/* Webhooks Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">Webhooks</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newWebhookUrl.trim()) return;
            createWebhookMutation.mutate({
              workspaceId,
              url: newWebhookUrl.trim(),
              events: [newWebhookEvent],
            });
          }}
          className="flex flex-wrap gap-2 mb-6"
        >
          <input
            type="url"
            value={newWebhookUrl}
            onChange={(e) => setNewWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="flex-1 min-w-[250px] px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500/50"
            required
          />
          <select
            value={newWebhookEvent}
            onChange={(e) => setNewWebhookEvent(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm"
          >
            <option value="form.response.submitted">form.response.submitted</option>
          </select>
          <button
            type="submit"
            disabled={createWebhookMutation.isPending}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg text-sm disabled:opacity-50"
          >
            {createWebhookMutation.isPending ? "Adding..." : "Add Webhook"}
          </button>
        </form>

        {webhooks.length === 0 ? (
          <p className="text-sm text-gray-500 italic p-4 bg-gray-900/50 rounded-xl border border-white/5 text-center">
            No webhooks configured.
          </p>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-gray-400 bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Events</th>
                  <th className="px-4 py-3 font-medium">Secret</th>
                  <th className="px-4 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((hook: any) => (
                  <tr key={hook.id} className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium truncate max-w-[200px]" title={hook.url}>
                      {hook.url}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{hook.events.join(", ")}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-500 bg-gray-900 px-1 py-0.5 rounded">
                        {hook.secret.substring(0, 10)}...
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (confirm(`Delete webhook?`)) {
                            deleteWebhookMutation.mutate({ workspaceId, webhookId: hook.id });
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
