import { useSignInPrompt } from "@/hooks/useSignInPrompt";
import { useAuth } from "@/hooks/useAuth";

/**
 * Gate for export actions (copy / download). Browsing and previewing stay
 * open to everyone - only taking an icon away requires an account.
 */
export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  const { prompt } = useSignInPrompt();

  const requireAuth = (action = "continue"): boolean => {
    if (loading) return false;
    if (user) return true;
    prompt(`Sign in to ${action} - it's free.`);
    return false;
  };

  return { requireAuth, isAuthed: !!user, authLoading: loading };
};
