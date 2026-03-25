import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still checking session; null = no session
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data || null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      role: profile?.role ?? null,
      signOut,
      loading: session === undefined,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
