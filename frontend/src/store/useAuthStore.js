import { create } from "zustand";
import axiosInstance from "../../lib/axios";
import toast from "react-hot-toast";
import { connectSocket, disconnectSocket } from "../../lib/socket";

const useAuthStore = create((set) => ({
    authUser: null,
    isLoading: false,
    isCheckingAuth: true,
    onlineUsers: [],

    signup: async (formData) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.post("/auth/signup", formData);
            set({ authUser: res.data });
            connectSocket(res.data._id);
            toast.success("Account created successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Signup failed");
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (formData) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.post("/auth/login", formData);
            set({ authUser: res.data });
            connectSocket(res.data._id);
            toast.success("Logged in successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed");
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            disconnectSocket();
            set({ authUser: null, onlineUsers: [] });
            toast.success("Logged out successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Logout failed");
        }
    },

    checkAuth: async () => {
        set({ isCheckingAuth: true });
        try {
            const res = await axiosInstance.get("/auth/check");
            set({ authUser: res.data });
            connectSocket(res.data._id);
        } catch {
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    setOnlineUsers: (users) => set({ onlineUsers: users }),

    updateProfile: async (formData) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.put("/auth/update-profile", formData);
            set({ authUser: res.data });
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Update failed");
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    updateProfilePicture: async (base64Image) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.put("/auth/update-profile-picture", { profilePicture: base64Image });
            set({ authUser: res.data });
            toast.success("Profile picture updated!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Picture update failed");
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },
}));

export default useAuthStore;