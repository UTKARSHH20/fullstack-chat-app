import { useState } from "react"
import { Camera, Pencil } from "lucide-react"
import toast from "react-hot-toast"
import useAuthStore from "../src/store/useAuthStore"

export default function ProfilePage() {
    const { authUser: user, updateProfile, updateProfilePicture, isLoading } = useAuthStore()
    const [formData, setFormData] = useState({
        name: user?.name || "",
    })
    const [previewImage, setPreviewImage] = useState(user?.profilePicture || null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [isEditing, setIsEditing] = useState(false)

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (!file.type.startsWith("image/")) {
                toast.error("Please select a valid image file")
                return
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size must be less than 5MB")
                return
            }
            setSelectedFile(file)
            setPreviewImage(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            // Upload picture first if a new file was selected
            if (selectedFile) {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(selectedFile);
                });
                await updateProfilePicture(base64);
            }

            // Update name if changed
            if (formData.name && formData.name !== user?.name) {
                await updateProfile({ name: formData.name })
            }

            setIsEditing(false)
            setSelectedFile(null)
        } catch {
            // toast already shown in store
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
            <div className="bg-base-100 rounded-2xl shadow-xl overflow-hidden w-full max-w-3xl">
                <div className="relative h-40 bg-gradient-to-r from-primary to-secondary">
                    <div className="absolute inset-0 flex items-end px-8 pb-4">
                        <div className="avatar -mb-16 border-4 border-base-100 rounded-full shadow-lg">
                            <div className="w-32 rounded-full bg-base-300 relative">
                                {previewImage ? (
                                    <img
                                        src={previewImage}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-base-content text-5xl">
                                        {user?.name?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                )}
                                {isEditing && (
                                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/40 hover:bg-black/60 transition-colors rounded-full">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                        <Camera className="w-8 h-8 text-white" />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="ml-4 mb-4">
                            <h2 className="text-3xl font-bold text-white">{user?.name}</h2>
                            <p className="text-base-100/80">{user?.email}</p>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">Profile Information</h3>
                        <div className="flex gap-2">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="btn btn-primary"
                                >
                                    <Pencil className="w-5 h-5" />
                                    Edit
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Full Name</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={!isEditing || isLoading}
                                className="input input-bordered w-full disabled:bg-base-200 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Email Address</span>
                                <span className="label-text-alt text-base-content/40">Cannot be changed</span>
                            </label>
                            <input
                                type="email"
                                value={user?.email || ""}
                                disabled
                                className="input input-bordered w-full bg-base-200 cursor-not-allowed"
                            />
                        </div>

                        {isEditing && (
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-1"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Saving...
                                        </>
                                    ) : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setIsEditing(false)
                                        setSelectedFile(null)
                                        setPreviewImage(user?.profilePicture || null)
                                        setFormData({ name: user?.name || "" })
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}