// User avatar with online status indicator
const Avatar = ({ user, size = "md", isOnline = false }) => {
    const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
    return (
        <div className="relative shrink-0">
            {user?.profilePicture
                ? <img src={user.profilePicture} alt={`${user.name || 'User'}'s profile picture`} className={`${sz} rounded-full object-cover`} /> {/* GSSoC Issue #43 Fix */}
                : <div className={`${sz} rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary`}>
                    {user?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
            }
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-base-100 ${isOnline ? "bg-success" : "bg-base-300"}`} />
        </div>
    )
}

export default Avatar
