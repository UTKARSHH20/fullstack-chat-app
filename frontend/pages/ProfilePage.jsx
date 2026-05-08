import { useState } from "react"
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
            setSelectedFile(file)
            setPreviewImage(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            // Upload picture first if a new file was selected
            if (selectedFile) {
                const reader = new FileReader()
                reader.onloadend = async () => {
                    const base64 = reader.result
                    try {
                        await updateProfilePicture(base64)
                    } catch {
                        // toast already shown
                    }
                }
                reader.readAsDataURL(selectedFile)
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
                    <div className="absolute inset-0 bg-pattern opacity-20" />
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
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-5.586a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 009.586 3H7a1 1 0 00-1 1z" clipRule="evenodd" />
                                        </svg>
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
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
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

                        {/* Email (read-only) */}
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

                        {/* Submit button (only visible while editing) */}
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