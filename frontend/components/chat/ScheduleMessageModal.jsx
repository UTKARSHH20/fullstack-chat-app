import { useState } from "react";
import { Calendar, Clock, X } from "lucide-react";
import toast from "react-hot-toast";
import useScheduledMessageStore from "../../src/store/useScheduledMessageStore";

const ScheduleMessageModal = ({ 
    isOpen, 
    onClose, 
    receiverId, 
    messageContent 
}) => {
    const { scheduleMessage } = useScheduledMessageStore();
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("09:00");
    const [isScheduling, setIsScheduling] = useState(false);

    if (!isOpen) return null;

    const getDateTime = (date, time) => {
        const [hours, minutes] = time.split(":");
        const dt = new Date(date);
        dt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return dt;
    };

    const handleQuickOption = async (option) => {
        let scheduledFor;
        const now = new Date();

        if (option === "1hour") {
            scheduledFor = new Date(now.getTime() + 60 * 60 * 1000);
        } else if (option === "tomorrow9am") {
            scheduledFor = new Date(now);
            scheduledFor.setDate(scheduledFor.getDate() + 1);
            scheduledFor.setHours(9, 0, 0, 0);
        }

        setIsScheduling(true);
        try {
            await scheduleMessage({
                receiverId,
                message: messageContent.message || "",
                image: messageContent.image || "",
                audio: messageContent.audio || "",
                scheduledFor,
            });
            onClose();
        } catch (error) {
            // Error is already toasted by the store
        } finally {
            setIsScheduling(false);
        }
    };

    const handleCustomSchedule = async () => {
        if (!selectedDate) {
            toast.error("Please select a date");
            return;
        }

        const scheduledFor = getDateTime(selectedDate, selectedTime);
        const now = new Date();

        if (scheduledFor <= now) {
            toast.error("Please select a future date and time");
            return;
        }

        setIsScheduling(true);
        try {
            await scheduleMessage({
                receiverId,
                message: messageContent.message || "",
                image: messageContent.image || "",
                audio: messageContent.audio || "",
                scheduledFor,
            });
            onClose();
        } catch (error) {
            // Error is already toasted by the store
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-lg shadow-lg max-w-md w-full">
                <div className="flex items-center justify-between p-4 border-b border-base-200">
                    <h2 className="text-xl font-semibold">Schedule Message</h2>
                    <button
                        onClick={onClose}
                        disabled={isScheduling}
                        className="btn btn-ghost btn-sm btn-circle"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Quick Options */}
                    <div>
                        <p className="text-sm font-medium mb-3">Quick Options</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleQuickOption("1hour")}
                                disabled={isScheduling}
                                className="btn btn-outline btn-sm"
                            >
                                In 1 Hour
                            </button>
                            <button
                                onClick={() => handleQuickOption("tomorrow9am")}
                                disabled={isScheduling}
                                className="btn btn-outline btn-sm"
                            >
                                Tomorrow 9 AM
                            </button>
                        </div>
                    </div>

                    <div className="divider my-2">OR</div>

                    {/* Custom Date & Time */}
                    <div>
                        <p className="text-sm font-medium mb-3">Custom Schedule</p>
                        
                        <div className="space-y-3">
                            {/* Date Picker */}
                            <div>
                                <label className="label text-sm">
                                    <span className="label-text flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Date
                                    </span>
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    disabled={isScheduling}
                                    className="input input-bordered w-full input-sm"
                                    min={new Date().toISOString().split("T")[0]}
                                />
                            </div>

                            {/* Time Picker */}
                            <div>
                                <label className="label text-sm">
                                    <span className="label-text flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Time
                                    </span>
                                </label>
                                <input
                                    type="time"
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    disabled={isScheduling}
                                    className="input input-bordered w-full input-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 p-4 border-t border-base-200">
                    <button
                        onClick={onClose}
                        disabled={isScheduling}
                        className="btn btn-ghost flex-1"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCustomSchedule}
                        disabled={isScheduling || !selectedDate}
                        className="btn btn-primary flex-1"
                    >
                        {isScheduling ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                            "Schedule"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleMessageModal;
