import { create } from "zustand";
import axiosInstance from "../../lib/axios";
import toast from "react-hot-toast";
import { connectSocket, disconnectSocket } from "../../lib/socket";
import { compressImageToBase64, validateImageFile } from "../../lib/imageUtils";

const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const requestNotificationPermission = async () => {
    if ("Notification" in window && "serviceWorker" in navigator && "PushManager" in window) {
        let perm = Notification.permission;
        if (perm === "default") {
            perm = await Notification.requestPermission();
        }
        if (perm === "granted") {
            try {
                const registration = await navigator.serviceWorker.register("/service-worker.js");
                const existingSub = await registration.pushManager.getSubscription();
                if (!existingSub) {
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
                    });
                    await axiosInstance.post("/auth/push-subscribe", { subscription });
                }
            } catch (err) {
                console.log("Push subscription failed", err);
            }
        }
    }
};

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
            connectSocket();
            requestNotificationPermission();
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
            connectSocket();
            requestNotificationPermission();
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
            connectSocket();
            requestNotificationPermission();
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

    updateStatusMood: async (statusMood) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.patch("/users/status-mood", { statusMood });
            set({ authUser: res.data });
            toast.success("Status mood updated!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Mood update failed");
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    /**
     * FIX (#573): Compresses the selected image client-side before uploading.
     * Previously, the raw uncompressed base64 string (up to 15 MB) was sent
     * directly to the server and then to Cloudinary — wasting bandwidth and
     * storage. Now the image is compressed to ≤1 MB / 1024px before upload.
     *
     * @param {File} imageFile - The raw File object from the file input
     */
    updateProfilePicture: async (imageFile) => {
        set({ isLoading: true });
        try {
            // Validate file type and size before compression
            const validation = validateImageFile(imageFile, 10);
            if (!validation.valid) {
                toast.error(validation.error);
                return;
            }

            toast.loading("Compressing image...", { id: "pic-upload" });

            // Compress client-side to ≤1 MB / 1024px (avatar quality)
            const compressedBase64 = await compressImageToBase64(imageFile, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1024,
                fileType: "image/webp",
            });

            toast.loading("Uploading...", { id: "pic-upload" });

            const res = await axiosInstance.put("/auth/update-profile-picture", {
                profilePicture: compressedBase64,
            });
            set({ authUser: res.data });
            toast.success("Profile picture updated!", { id: "pic-upload" });
        } catch (error) {
            toast.error(error.response?.data?.message || "Picture update failed", { id: "pic-upload" });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    googleLogin: async (credential) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.post("/auth/google", { credential });
            set({ authUser: res.data });
            connectSocket();
            requestNotificationPermission();
            toast.success("Signed in with Google!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Google sign-in failed");
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },
}));

export default useAuthStore;