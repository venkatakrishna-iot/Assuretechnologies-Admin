import axios from "axios";
import { logoutUser } from "./auth";

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: { 'X-Client-Type': 'admin' }
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.config &&
      !error.config.url?.includes("/auth/")
    ) {
      // Clear local storage user data and redirect to login
      logoutUser();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default API;



