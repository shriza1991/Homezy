import { useEffect, useState } from "react";
import { AuthContext } from "./authContext";
import { authRequest } from "../services/api";

function readStoredAuth() {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    return token && user && typeof user.name === "string"
      ? { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "token" || event.key === "user" || event.key === null) {
        setAuth(readStoredAuth());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = async (email, password) => {
    const data = await authRequest("login", { email, password });
    if (!data.token || !data.user) throw new Error("The server returned incomplete login data");
    const user = { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role };
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(user));
    setAuth({ token: data.token, user });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth(null);
  };

  return <AuthContext.Provider value={{ user: auth?.user ?? null, isAuthenticated: Boolean(auth), login, logout }}>{children}</AuthContext.Provider>;
}
