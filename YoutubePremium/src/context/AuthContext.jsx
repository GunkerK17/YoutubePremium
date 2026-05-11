import { createContext, useContext, useEffect, useState, useRef } from "react";
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

  const currentUserId = useRef(null);

  const isAllowedEmail = (email) =>
    ALLOWED_EMAILS.includes(email?.toLowerCase());

  // ── Fetch Profile ──────────────────────────────────────────
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // Dùng maybeSingle để không văng lỗi nếu chưa có profile
      
      setProfile(!error ? data : null);
    } catch (err) {
      console.error("Lỗi fetch profile:", err);
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

  // ── Handle Session (Hàm xử lý chính) ───────────────────────
  const handleSession = async (session) => {
    try {
      const u = session?.user ?? null;

      // 1. Kiểm tra quyền truy cập
      if (u && !isAllowedEmail(u.email)) {
        alert("Email này không được cấp quyền truy cập!");
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        currentUserId.current = null;
        return;
      }

      // 2. Cập nhật state user
      setUser(u);
      currentUserId.current = u?.id ?? null;

      // 3. Lấy profile nếu có user
      if (u) {
        await fetchProfile(u.id);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Lỗi xử lý session:", error);
    } finally {
      // 4. LUÔN LUÔN tắt loading và dọn URL bất kể thành công hay thất bại
      cleanOAuthUrl();
      setLoading(false);
    }
  };

  // ── Khởi tạo ───────────────────────────────────────────────
  useEffect(() => {
    // Lấy session ngay lập tức khi load trang (để xử lý nhanh hơn event)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth Event:", event, session?.user?.email);

        // Nếu user ID không đổi thì chỉ cần tắt loading (tránh fetch profile thừa)
        if (session?.user?.id === currentUserId.current && event !== "SIGNED_OUT") {
          setLoading(false);
          return;
        }

        await handleSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────
  const signInWithEmail = async (email, password) => {
    if (!isAllowedEmail(email)) {
      return { error: { message: "Email này không được cấp quyền truy cập" } };
    }
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}/?auth_callback=1`,
        queryParams: { prompt: 'select_account' }
      },
    });
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    currentUserId.current = null;
    setLoading(false);
  };

  const isSuperAdmin = profile?.role === "super_admin";
  const isManager    = profile?.role === "manager" || isSuperAdmin;

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isSuperAdmin, isManager,
      signInWithEmail, signInWithGoogle, signOut,
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
