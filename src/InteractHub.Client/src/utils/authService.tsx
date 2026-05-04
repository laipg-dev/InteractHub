import api from "../api/axiosConfig";

export type LoginPayload = {
  userName: string;
  password: string;
};

export type RegisterPayload = {
  userName: string;
  email: string;
  fullName: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  userName?: string;
  email?: string;
};

export const loginUser = async (payload: LoginPayload) => {
  const response = await api.post<AuthResponse>("/auth/login", payload);
  return response.data;
};

export const registerUser = async (payload: RegisterPayload) => {
  const response = await api.post<AuthResponse>("/auth/register", payload);
  return response.data;
};
