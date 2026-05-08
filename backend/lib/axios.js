import axios from "axios";

const axiosIntance = axios.create({
    baseURL: import.meta.env.MODE === "development" ? "http://localhost:5001/api" : undefined,
    withCredentials: true
})

export default axiosIntance