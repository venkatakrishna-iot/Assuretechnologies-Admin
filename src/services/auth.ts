export interface AuthUser {
  id: number;
  email?: string;
  role: "admin" | "customer" | "vendor" | "technician" | "drone_partner";
  full_name?: string;
}

// 🔹 Login Operation: Cache user details (but not the JWT token)
export const loginUser = (user: AuthUser) => {
  localStorage.setItem("user", JSON.stringify(user));
};

// 🔹 Logout Operation: Clear cache
export const logoutUser = () => {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("user");
};

// 🔹 Check Authentication State
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("user") || !!localStorage.getItem("admin_token");
};

// 🔹 Get Authenticated User Profile
export const getCurrentUser = (): AuthUser | null => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as AuthUser;
  } catch (e) {
    return null;
  }
};
