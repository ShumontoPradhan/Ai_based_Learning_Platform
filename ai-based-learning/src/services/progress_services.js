import axiosInstance from "../utilities/axios_instance.js";
import { API_PATHS } from "../utilities/apiPaths.js";

const getDashboardData = async () => {
  try {
    const response = await axiosInstance.get(API_PATHS.PROGRESS.GET_DASHBOARD);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch dashboard data" };
  }
};

const progressService = {
  getDashboardData,
};

export default progressService;
