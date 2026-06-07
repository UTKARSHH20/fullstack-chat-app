import {
    Bell, MessageSquare, Shield, Check, Monitor,
    Volume2, VolumeX, Eye, EyeOff, Clock,
    Trash2, RotateCcw, Send, Moon, Sun, Sparkles, Music
} from "lucide-react"
import { useEffect, useState } from "react"
import useThemeStore from "../src/store/useThemeStore"
import useSettingsStore from "../src/store/useSettingsStore"
import useAuthStore from "../src/store/useAuthStore"
import StatusMoodSelector from "../components/StatusMoodSelector"
import ListeningStatusSelector from "../components/ListeningStatusSelector"
import LiveActivityBadge from "../components/LiveActivityBadge"
import toast from "react-hot-toast"

const THEMES = [
    { id: "light",     label: "Light",     colors: ["#570df8","#f000b8","#00b5ff","#e5e6e6"] },
    { id: "dark",      label: "Dark",      colors: ["#661ae6","#d926aa","#1fb2a5","#1f1f1f"] },
    { id: "cupcake",   label: "Cupcake",   colors: ["#65c3c8","#ef9fbc","#eeaf3a","#f4e9e1"] },
    { id: "bumblebee", label: "Bumblebee", colors: ["#e0a82e","#f9d72f","#181830","#f9f1e6"] },
    { id: "emerald",   label: "Emerald",   colors: ["#66cc8a","#377cfb","#ea5234","#333c4d"] },
    { id: "corporate", label: "Corporate", colors: ["#4b6bfb","#7b92b2","#67cba0","#e6e6e6"] },
    { id: "synthwave", label: "Synthwave", colors: ["#e779c1","#58c7f3","#f3cc30","#1a103d"] },
    { id: "retro",     label: "Retro",     colors: ["#ef9900","#dc2626","#499380","#e4d8b4"] },
    { id: "cyberpunk", label: "Cyberpunk", colors: ["#ff7598","#75d1f0","#c07eec","#1f1f1f"] },
    { id: "valentine", label: "Valentine", colors: ["#e96d7b","#a991f7","#88dbdd","#f0d6e8"] },
    { id: "halloween", label: "Halloween", colors: ["#f28c18","#6d3a9c","#51a800","#1f1f1f"] },
    { id: "garden",    label: "Garden",    colors: ["#5c7f67","#ecf4e7","#e9e7e7","#1f1f1f"] },
    { id: "forest",    label: "Forest",    colors: ["#1eb854","#1fd65f","#d99330","#171212"] },
    { id: "aqua",      label: "Aqua",      colors: ["#09ecf3","#966fb3","#ffe999","#345da7"] },
    { id: "lofi",      label: "Lofi",      colors: ["#0d0d0d","#1a1a1a","#262626","#f0f0f0"] },
    { id: "pastel",    label: "Pastel",    colors: ["#d1c1d7","#f2cdcd","#c9e4de","#f3eee0"] },
    { id: "fantasy",   label: "Fantasy",   colors: ["#6e0b75","#007ebd","#7dbd00","#1f1f1f"] },
    { id: "wireframe", label: "Wireframe", colors: ["#b8b8b8","#9a9a9a","#787878","#e8e8e8"] },
    { id: "black",     label: "Black",     colors: ["#343232","#343232","#343232","#000000"] },
    { id: "luxury",    label: "Luxury",    colors: ["#ffffff","#152747","#513448","#09090b"] },
    { id: "dracula",   label: "Dracula",   colors: ["#ff79c6","#bd93f9","#ffb86c","#282a36"] },
    { id: "cmyk",      label: "Cmyk",      colors: ["#45aeee","#e8488a","#ffd430","#1f1f1f"] },
    { id: "autumn",    label: "Autumn",    colors: ["#8c0327","#d85251","#d59b6a","#f3e8e8"] },
    { id: "business",  label: "Business",  colors: ["#1c4f82","#7b9eb9","#f99057","#1f1f1f"] },
    { id: "acid",      label: "Acid",      colors: ["#ff00f4","#ff7400","#c8ff00","#ffffff"] },
    { id: "lemonade",  label: "Lemonade",  colors: ["#519903","#e9e92f","#ffffff","#f0f0f0"] },
    { id: "night",     label: "Night",     colors: ["#38bdf8","#818cf8","#f471b5","#0f172a"] },
    { id: "coffee",    label: "Coffee",    colors: ["#db924b","#263e3f","#10576d","#20160f"] },
    { id: "winter",    label: "Winter",    colors: ["#047aed","#463aa1","#c148ac","#f8fafc"] },
    { id: "dim",       label: "Dim",       colors: ["#9ca3af","#6b7280","#374151","#1f2937"] },
    { id: "nord",      label: "Nord",      colors: ["#5e81ac","#81a1c1","#88c0d0","#2e3440"] },
    { id: "sunset",    label: "Sunset",    colors: ["#ff865b","#fd6f9c","#b387fa","#1a1a2e"] },
]

const Section = ({ icon: Icon, title, description, children }) => (
    <div className="bg-base-100 rounded-2xl p-6 border border-base-200 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
                <h2 className="font-semibold text-base">{title}</h2>
                <p className="text-sm text-base-content/50 mt-0.5">{description}</p>
            </div>
        </div>
        {children}
    </div>
)

const ToggleRow = ({ label, description, checked, onChange, icon: Icon }) => (
    <label className="flex items-center justify-between gap-4 cursor-pointer group py-1">
        <div className="flex items-center gap-3">
            {Icon && <Icon className="w-4 h-4 text-base-content/40" />}
            <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">{label}</p>
                {description && <p className="text-xs text-base-content/40 mt-0.5">{description}</p>}
            </div>
        </div>
        <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
        />
    </label>
)

export default function SettingsPage() {
    const { theme, setTheme } = useThemeStore()

    const { notifications: notif, chat, privacy: priv, updateNotification, updateChat, updatePrivacy, resetAll } = useSettingsStore()
    const { authUser, updateStatusMood, updateListeningStatus, isLoading } = useAuthStore()
    const [selectedMood, setSelectedMood] = useState(authUser?.statusMood || null)
    const [selectedTrack, setSelectedTrack] = useState(authUser?.currentTrack || "")
    const [selectedArtist, setSelectedArtist] = useState(authUser?.currentArtist || "")
    const [listeningEnabled, setListeningEnabled] = useState(authUser?.isListening || false)
    const [shareActivity, setShareActivity] = useState(authUser?.shareActivity ?? true)

    useEffect(() => {
        setSelectedMood(authUser?.statusMood || null)
    }, [authUser?.statusMood])

    useEffect(() => {
        setSelectedTrack(authUser?.currentTrack || "")
        setSelectedArtist(authUser?.currentArtist || "")
        setListeningEnabled(authUser?.isListening || false)
        setShareActivity(authUser?.shareActivity ?? true)
    }, [authUser?.currentTrack, authUser?.currentArtist, authUser?.isListening])

    const handleMoodChange = async (mood) => {
        const previousMood = selectedMood
        setSelectedMood(mood)
        try {
            await updateStatusMood(mood)
        } catch {
            setSelectedMood(previousMood)
        }
    }

    const handleListeningSave = async ({ currentTrack, currentArtist, isListening }) => {
        const previousTrack = selectedTrack
        const previousArtist = selectedArtist
        const previousEnabled = listeningEnabled

        setSelectedTrack(currentTrack)
        setSelectedArtist(currentArtist)
        setListeningEnabled(isListening)

        try {
            await updateListeningStatus({ currentTrack, currentArtist, isListening })
        } catch {
            setSelectedTrack(previousTrack)
            setSelectedArtist(previousArtist)
            setListeningEnabled(previousEnabled)
        }
    }

    const handleListeningClear = async () => {
        const previousTrack = selectedTrack
        const previousArtist = selectedArtist
        const previousEnabled = listeningEnabled

        setSelectedTrack("")
        setSelectedArtist("")
        setListeningEnabled(false)

        try {
            await updateListeningStatus({ currentTrack: "", currentArtist: "", isListening: false })
        } catch {
            setSelectedTrack(previousTrack)
            setSelectedArtist(previousArtist)
            setListeningEnabled(previousEnabled)
        }
    }

    const handleShareActivityToggle = async (checked) => {
        const prev = shareActivity
        setShareActivity(checked)
        try {
            await useAuthStore.getState().updateActivitySettings(checked)
        } catch {
            setShareActivity(prev)
        }
    }

    const upNotif = (k) => (v) => updateNotification(k, v)
    const upChat = (k) => (v) => updateChat(k, v)
    const upPriv = (k) => (v) => updatePrivacy(k, v)

    const DARK_THEMES = new Set(["dark","night","dracula","synthwave","luxury","coffee","halloween","black","dim","forest","lofi","business"])
    const [fontSize, setFontSize] = useState(16)


    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 bg-base-200">
            <div className="max-w-3xl mx-auto px-4 py-8">

                {/* Page header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-base-content/50 mt-1 text-sm">Personalise your chatter-box experience.</p>
                </div>

                <div className="space-y-5">

                    {/* Appearance */}
                    <Section
                        icon={Sun}
                        title="Appearance"
                        description="Pick a theme — changes apply instantly across the whole app"
                    >
                        {/* Theme grid */}
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
                            {THEMES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    title={t.label}
                                    className={`
                                        group relative flex flex-col items-center gap-1.5 p-2 rounded-xl
                                        border-2 transition-all duration-150 hover:scale-105
                                        ${theme === t.id
                                            ? "border-primary shadow-md shadow-primary/25 bg-primary/5"
                                            : "border-base-200 hover:border-base-300 bg-base-200/50"}
                                    `}
                                >
                                    {/* 4-colour swatch */}
                                    <div className="flex gap-0.5">
                                        {t.colors.map((c, i) => (
                                            <span
                                                key={i}
                                                className="w-3.5 h-5 rounded-sm first:rounded-l-md last:rounded-r-md"
                                                style={{ background: c }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-medium text-base-content/60 leading-none">
                                        {t.label}
                                    </span>

                                    {theme === t.id && (
                                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                                            <Check className="w-2.5 h-2.5 text-primary-content" strokeWidth={3} />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Live chat preview */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-base-content/30 mb-3">
                                Preview
                            </p>
                            <div
    data-theme={theme}
    style={{ fontSize: `${fontSize}px` }}
    className="rounded-2xl overflow-hidden border border-base-content/10 shadow-lg"
>
                                {/* Preview header */}
                                <div className="bg-base-200 px-4 py-3 flex items-center gap-3 border-b border-base-content/10">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content text-sm font-bold">J</div>
                                    <div>
                                        <p className="text-sm font-semibold text-base-content">John Doe</p>
                                        <p className="text-xs text-success flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                                            Online
                                        </p>
                                    </div>
                                </div>

                                {/* Preview messages */}
                                <div className="bg-base-100 px-4 py-4 space-y-3 min-h-36">
                                    <div className="chat chat-start">
                                        <div className="chat-bubble chat-bubble-base-300 text-sm shadow-sm">
                                            Hey! How's it going? 👋
                                        </div>
                                        <div className="chat-footer opacity-40 text-xs mt-0.5">12:00 PM</div>
                                    </div>
                                    <div className="chat chat-end">
                                        <div className="chat-bubble chat-bubble-primary text-sm shadow-sm">
                                            I'm doing great! Just working on some new features. 🚀
                                        </div>
                                        <div className="chat-footer opacity-40 text-xs mt-0.5">12:00 PM</div>
                                    </div>
                                    <div className="chat chat-start">
                                        <div className="chat-bubble chat-bubble-base-300 text-sm shadow-sm">
                                            Looks awesome! ✨
                                        </div>
                                        <div className="chat-footer opacity-40 text-xs mt-0.5">12:01 PM</div>
                                    </div>
                                </div>

                                {/* Preview input bar */}
                                <div className="bg-base-200 px-4 py-3 flex items-center gap-2 border-t border-base-content/10">
                                    <input
                                        type="text"
                                        placeholder="Type a message…"
                                        className="input input-bordered input-sm flex-1 text-sm"
                                        readOnly
                                    />
                                    <button className="btn btn-primary btn-sm btn-square">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Active theme badge */}
                            <div className="flex items-center gap-2 mt-3">
                                {DARK_THEMES.has(theme) ? <Moon className="w-3.5 h-3.5 text-base-content/40" /> : <Sun className="w-3.5 h-3.5 text-base-content/40" />}
                                <p className="text-xs text-base-content/40">
                                    Active theme: <span className="text-primary font-semibold capitalize">{theme}</span>

                                    <div className="mt-4">
    <label className="text-sm font-medium">
        Font Size: {fontSize}px
    </label>

    <input
        type="range"
        min="12"
        max="24"
        value={fontSize}
        onChange={(e) => setFontSize(e.target.value)}
        className="range range-primary range-sm mt-2"
    />
</div>
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* Notifications */}
                    <Section
                        icon={Bell}
                        title="Notifications"
                        description="Control how and when you get notified"
                    >
                        <div className="space-y-1">
                            <ToggleRow icon={Bell}        label="New messages"           description="Get notified on new messages"         checked={notif.messages} onChange={upNotif("messages")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow icon={MessageSquare} label="Mentions & replies"   description="Notify when someone mentions you"     checked={notif.mentions} onChange={upNotif("mentions")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow icon={notif.sounds ? Volume2 : VolumeX} label="Notification sounds" description="Play a sound for incoming messages" checked={notif.sounds} onChange={upNotif("sounds")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow icon={Monitor}     label="Desktop notifications"  description="Show browser notifications when minimised" checked={notif.desktop} onChange={upNotif("desktop")} />

                            <div className="divider my-0 opacity-20" />

<div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
        <Clock className="w-4 h-4 text-base-content/40" />
        <div>
            <p className="text-sm font-medium">Mute Notifications</p>
            <p className="text-xs text-base-content/40">
                Temporarily disable all notifications
            </p>
        </div>
    </div>
    {notif.muteDuration !== "0" && (
    <div className="mt-3 alert alert-warning py-2 text-sm">
        Notifications are currently muted ({notif.muteDuration})
    </div>
)}

    <select
        className="select select-bordered select-sm"
        value={notif.muteDuration}
        onChange={(e) => updateNotification("muteDuration", e.target.value)}
    >
        <option value="0">Off</option>
        <option value="30m">30 Minutes</option>
        <option value="1h">1 Hour</option>
        <option value="24h">24 Hours</option>
        <option value="forever">Forever</option>
    </select>
</div>
                        </div>
                    </Section>

                    {/* Chat Preferences */}
                    <Section
                        icon={MessageSquare}
                        title="Chat Preferences"
                        description="Customise your messaging experience"
                    >
                        <div className="space-y-1">
                            <ToggleRow label="Press Enter to send"  description="Use Shift+Enter for a new line"      checked={chat.enterSend}   onChange={upChat("enterSend")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow label="Read receipts"        description="Show when you've read messages"      checked={chat.receipts}    onChange={upChat("receipts")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow label="Typing indicators"    description="Show when you're typing to others"   checked={chat.typing}      onChange={upChat("typing")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow icon={Clock} label="Timestamps" description="Show time next to every message" checked={chat.timestamps}  onChange={upChat("timestamps")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow label="Compact mode"         description="Reduce spacing between messages"     checked={chat.compact}     onChange={upChat("compact")} />
                        </div>
                    </Section>

                    <Section
                        icon={Sparkles}
                        title="Status Mood"
                        description="Share what you are currently doing with your contacts"
                    >
                        <StatusMoodSelector
                            value={selectedMood}
                            onChange={handleMoodChange}
                            disabled={isLoading}
                        />
                    </Section>

                    <Section
                        icon={Music}
                        title="Listening Status"
                        description="Show the song and artist you are currently listening to"
                    >
                        <ListeningStatusSelector
                            currentTrack={selectedTrack}
                            currentArtist={selectedArtist}
                            isListening={listeningEnabled}
                            onSave={handleListeningSave}
                            onClear={handleListeningClear}
                            disabled={isLoading}
                        />
                    </Section>

                    {/* Privacy */}
                    <Section
                        icon={Shield}
                        title="Privacy & Visibility"
                        description="Control who can see your activity"
                    >
                        <div className="space-y-1">
                            <ToggleRow icon={Eye}  label="Online status"          description="Let others see when you're active"       checked={priv.online}   onChange={upPriv("online")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow icon={Clock} label="Last seen"             description="Show when you were last online"          checked={priv.lastSeen} onChange={upPriv("lastSeen")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow icon={priv.photo ? Eye : EyeOff} label="Profile photo" description="Allow others to see your picture" checked={priv.photo}    onChange={upPriv("photo")} />
                            <div className="divider my-0 opacity-20" />
                            <ToggleRow icon={Music} label="Live Activity" description="Share your current in-app activity with contacts" checked={shareActivity} onChange={handleShareActivityToggle} />
                        </div>
                    </Section>

                    {/* Danger Zone */}
                    <div className="bg-base-100 rounded-2xl p-6 border border-error/20 shadow-sm">
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-error" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-base">Danger Zone</h2>
                                <p className="text-sm text-base-content/50 mt-0.5">Irreversible actions — proceed with care</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-base-200">
                                <div className="flex items-center gap-3">
                                    <RotateCcw className="w-4 h-4 text-base-content/40" />
                                    <div>
                                        <p className="text-sm font-medium">Reset all settings</p>
                                        <p className="text-xs text-base-content/40">Restore defaults for all preferences</p>
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-outline btn-warning" onClick={() => { if (confirm("Reset all settings to defaults?")) resetAll() }}>Reset</button>
                            </div>
                            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-base-200">
                                <div className="flex items-center gap-3">
                                    <Trash2 className="w-4 h-4 text-base-content/40" />
                                    <div>
                                        <p className="text-sm font-medium">Clear chat history</p>
                                        <p className="text-xs text-base-content/40">Delete all your messages permanently</p>
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-outline btn-error" onClick={() => toast("Clear chat history is not yet available")}>Clear</button>
                            </div>
                        </div>
                    </div>

                </div>

                <p className="text-center text-xs text-base-content/20 mt-8">
                    chatter-box · v1.0.0 · Settings are saved locally
                </p>
            </div>
        </div>
    )
}