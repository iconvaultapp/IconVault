import { useEffect } from "react";

interface Shortcuts {
  onSearch?: () => void;
  onClose?: () => void;
  onCompare?: () => void;
}

export const useKeyboardShortcuts = ({ onSearch, onClose, onCompare }: Shortcuts) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") onClose?.();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onSearch?.();
      }
      if (e.key === "Escape") onClose?.();
      if (e.key === "/") {
        e.preventDefault();
        onSearch?.();
      }
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) onCompare?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearch, onClose, onCompare]);
};
