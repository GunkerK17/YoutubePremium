import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

const ALLOWED_EMAILS = [
  "chihai11102003@gmail.com",
  "gunker001867@gmail.com",
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialized = useRef(false);
  const currentUserId = useRef(null);

  const isAllowedEmail = (email) =>
    ALLOWED_EMAILS.includes(email?.toLowerCase());

  const fetchProfile = async (userId) => {
    try {
      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 4000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      setProfile(!error ? data : null);
    } catch (err) {
      console.warn("fetchProfile failed:", err.message);
      setProfile(null);
    }
  };

  const cleanOAuthUrl = () => {
    const url = new URL(window.location.href);
    let changed = false;

    if (url.searchParams.has("auth_callback")) {
      url.searchParams.delete("auth_callback");
      changed = true;
    }

    if (window.location.hash.includes("access_token")) {
      url.hash = "";
      changed = true;
    }

    if (changed) window.history.replaceState({}, "", url.toString());
  };

  const applySession = async (session) => {
    try {
      const nextUser = session?.user ?? null;

      if (nextUser && !isAllowedEmail(nextUser.email)) {
        alert("Email này không được cấp quyền truy cập!");
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        currentUserId.current = null;
        return;
      }

      currentUserId.current = nextUser?.id ?? null;
      setUser(nextUser);
      setLoading(false);

      if (nextUser) fetchProfile(nextUser.id);
      else setProfile(null);
    } catch (err) {
      console.error("applySession error:", err);
    } finally {
      cleanOAuthUrl();
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn("Auth timeout, forcing loading off");
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth Event:", event, session?.user?.email ?? "no user");
        clearTimeout(timeout);

        if (!initialized.current) {
          initialized.current = true;
          await applySession(session);
          return;
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          currentUserId.current = null;
          setLoading(false);
          return;
        }

        await applySession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized.current) {
        initialized.current = true;
        clearTimeout(timeout);
        applySession(session);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email, password) => {
    if (!isAllowedEmail(email)) {
      return { error: { message: "Email này không được cấp quyền truy cập" } };
    }

    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signInWithGoogle = async () => {
    const basePath = import.meta.env.BASE_URL || "/";
    const normalizedBasePath = basePath.endsWith("/")
      ? basePath
      : `${basePath}/`;

    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${normalizedBasePath}?auth_callback=1`,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isSuperAdmin: profile?.role === "super_admin",
      isManager: profile?.role === "manager" || profile?.role === "super_admin",
      signInWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}

export default AuthContext;
