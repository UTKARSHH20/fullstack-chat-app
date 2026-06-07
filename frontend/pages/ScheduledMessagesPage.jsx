import { useEffect, useState } from "react";
import { Calendar, Clock, Edit2, Trash2, Send } from "lucide-react";
import useScheduledMessageStore from "../src/store/useScheduledMessageStore";

const ScheduledMessagesPage = () => {
    const {
        scheduledMessages,
        isLoading,
        fetchScheduledMessages,
        cancelScheduledMessage,
        setSelectedMessage,
    } = useScheduledMessageStore();

    const [filterStatus, setFilterStatus] = useState("pending");
    const [editingId, setEditingId] = useState(null);
    const [editMessage, setEditMessage] = useState("");
    const [editDateTime, setEditDateTime] = useState("");

    useEffect(() => {
        fetchScheduledMessages(filterStatus === "all" ? null : filterStatus);
    }, [filterStatus, fetchScheduledMessages]);

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleEdit = (msg) => {
        setEditingId(msg._id);
        setEditMessage(msg.message);
        setEditDateTime(new Date(msg.scheduledFor).toISOString().slice(0, 16));
    };

    const handleCancel = async (id) => {
        if (window.confirm("Cancel this scheduled message?")) {
            await cancelScheduledMessage(id);
        }
    };

    const filteredMessages = scheduledMessages.filter((msg) => {
        if (filterStatus === "all") return true;
        return msg.status === filterStatus;
    });

    return (
        <div className="min-h-screen bg-base-200 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Scheduled Messages</h1>
                    <p className="text-sm text-base-content/60 mt-1">
                        Manage your scheduled messages, edit or cancel before they are sent.
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {["pending", "sent", "cancelled", "all"].map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setFilterStatus(status);
                                setEditingId(null);
                            }}
                            className={`btn btn-sm ${
                                filterStatus === status
                                    ? "btn-primary"
                                    : "btn-ghost"
                            }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Messages List */}
                {isLoading ? (
                    <div className="flex justify-center items-center min-h-96">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="card bg-base-100 shadow-sm border border-base-200">
                        <div className="card-body items-center justify-center text-center min-h-96">
                            <Send className="w-12 h-12 text-base-300 mb-2" />
                            <p className="text-base-content/70">
                                No {filterStatus === "all" ? "" : filterStatus} scheduled messages.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMessages.map((msg) => (
                            <div
                                key={msg._id}
                                className="card bg-base-100 shadow-sm border border-base-200"
                            >
                                {editingId === msg._id ? (
                                    // Edit Mode
                                    <div className="card-body space-y-3">
                                        <textarea
                                            value={editMessage}
                                            onChange={(e) =>
                                                setEditMessage(e.target.value)
                                            }
                                            className="textarea textarea-bordered w-full"
                                            rows="3"
                                        ></textarea>
                                        <input
                                            type="datetime-local"
                                            value={editDateTime}
                                            onChange={(e) =>
                                                setEditDateTime(e.target.value)
                                            }
                                            className="input input-bordered w-full"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // Save logic would go here
                                                    setEditingId(null);
                                                }}
                                                className="btn btn-primary btn-sm"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <>
                                        <div className="card-body">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-base">
                                                        {msg.receiverId?.name || "Unknown"}
                                                    </h3>
                                                    <p className="text-sm text-base-content/70 mt-1">
                                                        {msg.message || "(Message with attachment)"}
                                                    </p>
                                                </div>
                                                <div
                                                    className={`badge badge-sm ${
                                                        msg.status === "pending"
                                                            ? "badge-warning"
                                                            : msg.status === "sent"
                                                            ? "badge-success"
                                                            : "badge-error"
                                                    }`}
                                                >
                                                    {msg.status}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-base-content/60 mt-3">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>
                                                        {formatDateTime(msg.scheduledFor)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {msg.status === "pending" && (
                                            <div className="card-actions justify-end p-4 border-t border-base-200">
                                                <button
                                                    onClick={() => handleEdit(msg)}
                                                    className="btn btn-ghost btn-sm gap-2"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleCancel(msg._id)
                                                    }
                                                    className="btn btn-ghost btn-sm gap-2 text-error"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduledMessagesPage;
