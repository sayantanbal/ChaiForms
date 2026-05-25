"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useKeyboardShortcut } from "~/hooks/use-keyboard-shortcut";

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Cmd+K to open palette
  useKeyboardShortcut("k", () => setOpen((o) => !o));

  // Also close on Escape (cmdk handles this automatically, but we might want to manually sync state)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden text-gray-100">
        <Command
          label="Global Command Palette"
          className="flex flex-col"
          shouldFilter={true}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <Command.Input
            autoFocus
            placeholder="Type a command or search..."
            className="w-full bg-transparent border-b border-white/10 px-4 py-4 text-sm outline-none placeholder:text-gray-500"
          />

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-sm text-center text-gray-500">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="text-xs text-gray-500 px-2 py-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-semibold"
            >
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/dashboard");
                }}
                className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-gray-200"
              >
                Go to Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/dashboard/forms");
                }}
                className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-gray-200"
              >
                View all Forms
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/dashboard/forms/new");
                }}
                className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-gray-200"
              >
                Create new Form
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/explore");
                }}
                className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 text-gray-200"
              >
                Explore Templates
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
