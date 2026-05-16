import type { User } from '@supabase/supabase-js';
export function useAuth(): {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};
