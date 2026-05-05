import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { User, Membership } from "@/types/database";
import { fetchPlatformRole, hasPlatformAccess, isPlatformAdmin, isPlatformOwner, type PlatformRole } from "@/lib/platformAccess";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  memberships: Membership[];
  loading: boolean;
  noMemberships: boolean;
  platformRole: PlatformRole | null;
  hasPlatformAccess: boolean;
  isPlatformAdmin: boolean;
  isPlatformOwner: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  memberships: [],
  loading: true,
  noMemberships: false,
  platformRole: null,
  hasPlatformAccess: false,
  isPlatformAdmin: false,
  isPlatformOwner: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [noMemberships, setNoMemberships] = useState(false);
  const [platformRole, setPlatformRole] = useState<PlatformRole | null>(null);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user:", userError);
        return;
      }
      setUser(userData);

      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select(`
          *,
          organization:organizations(*),
          branch:branches(*),
          department:departments(*),
          role:roles(*)
        `)
        .eq("user_id", userId)
        .eq("is_active", true);

      if (membershipError) {
        console.error("Error fetching memberships:", membershipError);
        return;
      }
      setMemberships(membershipData || []);

      const role = await fetchPlatformRole(userId);
      setPlatformRole(role);

      setNoMemberships((membershipData || []).length === 0 && !hasPlatformAccess(role));
    } catch (err) {
      console.error("fetchUserData error:", err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        setSession(session);

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            fetchUserData(session.user.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setUser(null);
          setMemberships([]);
          setNoMemberships(false);
          setPlatformRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setMemberships([]);
    setPlatformRole(null);
  };

  const canAccessPlatform = hasPlatformAccess(platformRole);

  return (
    <AuthContext.Provider value={{ session, user, memberships, loading, noMemberships, signOut, platformRole, hasPlatformAccess: canAccessPlatform, isPlatformAdmin: isPlatformAdmin(platformRole), isPlatformOwner: isPlatformOwner(platformRole) }}>
      {children}
    </AuthContext.Provider>
  );
}
