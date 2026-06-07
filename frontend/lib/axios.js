import axios from "axios";

const axiosInstance = axios.create({
    baseURL: import.meta.env.MODE === "development"
        ? "http://localhost:5001/api"
        : "/api",
    withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
    const tokenMatch = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="));

    if (tokenMatch) {
        const token = decodeURIComponent(
            tokenMatch.slice("XSRF-TOKEN=".length)
        );

        config.headers["X-XSRF-TOKEN"] = token;
    }

    return config;
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Session expired (401 Unauthorized). Please log in again.");
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
