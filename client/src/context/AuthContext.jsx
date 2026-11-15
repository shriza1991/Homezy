import { useEffect, useState, useCallback } from "react";
import { AuthContext } from "./authContext";
import { authRequest, verifySession } from "../services/api";

/**
 * Read stored authentication state with per-tab priority.
 * Prefers tab-isolated sessionStorage so separate tabs can maintain
 * independent admin, owner, or tenant sessions.
 */
function readStoredAuth() {
  try {
    let token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null;
    let userStr = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("user") : null;

    // Fall back to localStorage if tab has no active session yet
    if (!token && typeof localStorage !== "undefined") {
      token = localStorage.getItem("token");
      userStr = localStorage.getItem("user");
      // Seed this tab's sessionStorage to isolate it going forward
      if (token && userStr && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", userStr);
      }
    }

    if (!token || !userStr) return null;
    const user = JSON.parse(userStr);
    return token && user && typeof user.name === "string"
      ? { token, user: { id: user.id || user._id, name: user.name, email: user.email, role: user.role } }
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);
  const [isVerifying, setIsVerifying] = useState(true);

  // Verified session restoration on initial mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const initialAuth = readStoredAuth();
      if (!initialAuth?.token) {
        if (isMounted) setIsVerifying(false);
        return;
      }

      try {
        const verifiedUser = await verifySession(initialAuth.token);
        if (!isMounted) return;

        if (verifiedUser) {
          const updatedUser = {
            id: verifiedUser.id || verifiedUser._id,
            name: verifiedUser.name,
            email: verifiedUser.email,
            role: verifiedUser.role,
          };
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("user", JSON.stringify(updatedUser));
          }
          setAuth({ token: initialAuth.token, user: updatedUser });
        } else {
          // Token is invalid or expired
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("user");
          }
          if (typeof localStorage !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
          setAuth(null);
        }
      } catch {
        // Fall back to locally stored credentials if network is temporarily unreachable
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle cross-tab storage changes while preserving tab session independence
  useEffect(() => {
    const handleStorage = (event) => {
      // If this tab already has an active session in sessionStorage, preserve it!
      // This prevents actions in one tab (e.g. logging in as Tenant) from clobbering
      // an active session in another tab (e.g. logged in as Admin).
      const hasTabSession = typeof sessionStorage !== "undefined" && Boolean(sessionStorage.getItem("token"));
      if (hasTabSession) {
        return;
      }

      if (event.key === "token" || event.key === "user" || event.key === null) {
        setAuth(readStoredAuth());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authRequest("login", { email, password });
    if (!data.token || !data.user) {
      throw new Error("The server returned incomplete login data");
    }

    const user = {
      id: data.user.id || data.user._id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
    };

    // Store in tab-scoped sessionStorage for independent tab sessions
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(user));
    }

    // Also update localStorage so single-tab persistent logins can seed new tabs
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(user));
    }

    setAuth({ token: data.token, user });
    return { token: data.token, user };
  }, []);

  const logout = useCallback(() => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    setAuth(null);
  }, []);

  const contextValue = {
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    isAuthenticated: Boolean(auth),
    isVerifying,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
