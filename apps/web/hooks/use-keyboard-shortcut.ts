import { useEffect } from "react";

type ShortcutKey = string;

interface ShortcutOptions {
  mod?: boolean; // Maps to Ctrl on Windows/Linux and Cmd on Mac
  shift?: boolean;
  alt?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(
  key: ShortcutKey,
  callback: (e: KeyboardEvent) => void,
  options: ShortcutOptions = { mod: true, preventDefault: true },
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Don't trigger shortcuts inside inputs/textareas, unless it's specifically allowed
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      const matchKey = event.key.toLowerCase() === key.toLowerCase();

      const isMac =
        typeof window !== "undefined"
          ? navigator.platform.toUpperCase().indexOf("MAC") >= 0
          : false;
      const hasModKey = isMac ? event.metaKey : event.ctrlKey;
      const matchMod = options.mod ? hasModKey : !hasModKey;

      const matchShift = options.shift ? event.shiftKey : !event.shiftKey;
      const matchAlt = options.alt ? event.altKey : !event.altKey;

      if (matchKey && matchMod && matchShift && matchAlt) {
        if (options.preventDefault !== false) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, options]);
}
