"use client";

import React from "react";
import { FormSettingsSchema } from "@repo/schemas";

interface SettingsPanelProps {
  settings: Partial<FormSettingsSchema>;
  onUpdate: (updates: Partial<FormSettingsSchema>) => void;
}

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">General Settings</h3>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Visibility</label>
          <select
            value={settings.visibility || "unlisted"}
            onChange={(e) => onUpdate({ visibility: e.target.value as "public" | "unlisted" })}
            className="w-full text-sm p-2 rounded-md border border-input bg-background"
          >
            <option value="unlisted">Unlisted (direct link only)</option>
            <option value="public">Public (discoverable in Explore)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Custom Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm bg-muted px-2 py-2 border border-r-0 border-input rounded-l-md">
              /f/
            </span>
            <input
              type="text"
              value={settings.slug || ""}
              onChange={(e) => onUpdate({ slug: e.target.value })}
              placeholder="my-awesome-form"
              pattern="^[a-z0-9-]{3,60}$"
              className="flex-1 text-sm p-2 rounded-r-md border border-input bg-background"
            />
          </div>
          <p className="text-xs text-muted-foreground">Only letters, numbers, and hyphens. 3-60 chars.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Access Controls</h3>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Expiry Date (optional)</label>
          <input
            type="datetime-local"
            value={settings.expiryDate ? new Date(settings.expiryDate).toISOString().slice(0, 16) : ""}
            onChange={(e) => onUpdate({ expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full text-sm p-2 rounded-md border border-input bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Response Limit (optional)</label>
          <input
            type="number"
            min={1}
            placeholder="Unlimited"
            value={settings.responseLimit || ""}
            onChange={(e) => onUpdate({ responseLimit: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full text-sm p-2 rounded-md border border-input bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Access Password (optional)</label>
          <input
            type="password"
            placeholder="Leave blank for no password"
            value={settings.accessPassword || ""}
            onChange={(e) => onUpdate({ accessPassword: e.target.value || null })}
            className="w-full text-sm p-2 rounded-md border border-input bg-background"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Post-Submission</h3>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Thank You Message</label>
          <textarea
            rows={3}
            value={settings.thankyouMessage || ""}
            onChange={(e) => onUpdate({ thankyouMessage: e.target.value })}
            placeholder="Thank you for your response!"
            className="w-full text-sm p-2 rounded-md border border-input bg-background resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="respondent-conf"
            checked={settings.sendRespondentConfirmation || false}
            onChange={(e) => onUpdate({ sendRespondentConfirmation: e.target.checked })}
            className="w-4 h-4 rounded border-input"
          />
          <label htmlFor="respondent-conf" className="text-sm font-medium cursor-pointer">
            Send respondent confirmation email
          </label>
        </div>
      </div>
    </div>
  );
}
