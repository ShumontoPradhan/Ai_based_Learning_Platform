import axiosInstance from "../utilities/axios_instance.js";
import { API_PATHS } from "../utilities/apiPaths.js";

const login = async (email, password) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, { email, password });

    // 👇 match backend response exactly
    return {
      user: response.data.user,              // not response.data.data.user
      accessToken: response.data.accessToken, // not token
      refreshToken: response.data.refreshToken
    };

  } catch (error) {
    throw error.response?.data || { message: "Login failed" };
  }
};

const register = async (username, email, password, terms) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
      username,
      email,
      password,
      terms, // make sure terms is passed
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred" };
  }
};

const getProfile = async () => {
  try {
    const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred" };
  }
};

const updateProfile = async (userData) => {
  try {
    const response = await axiosInstance.put(API_PATHS.AUTH.UPDATE_PROFILE, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred" };
  }
};

const changePassword = async (passwords) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.CHANGE_PASSWORD, passwords);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred" };
  }
};

const authService = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword
};

export default authService;