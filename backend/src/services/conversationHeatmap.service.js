import mongoose from "mongoose";
import Message from "../models/message.model.js";

const WEEK_DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const padHour = (hour) => String(hour).padStart(2, "0");

const buildHourlyActivity = (hourlyAggregation) => {
    const countsByHour = new Array(24).fill(0);
    hourlyAggregation.forEach((item) => {
        countsByHour[item._id] = item.count;
    });
    return countsByHour.map((count, hour) => ({ hour, count }));
};

const buildDailyActivity = (dailyAggregation) => {
    const countsByDay = Array(7).fill(0);
    dailyAggregation.forEach((item) => {
        const index = item._id - 1; // $isoDayOfWeek returns 1 (Monday) through 7 (Sunday)
        if (index >= 0 && index < 7) countsByDay[index] = item.count;
    });
    return countsByDay.map((count, index) => ({ day: WEEK_DAY_NAMES[index], count }));
};

const determinePeakHour = (hourlyActivity) => {
    if (!hourlyActivity || hourlyActivity.length === 0) return "N/A";

    const sortedByCount = [...hourlyActivity].sort((a, b) => b.count - a.count || a.hour - b.hour);
    const top = sortedByCount[0];
    if (top.count === 0) return "N/A";

    const nextHour = hourlyActivity.find((entry) => entry.hour === (top.hour + 1) % 24);
    if (nextHour && nextHour.count >= sortedByCount[1]?.count) {
        return `${padHour(top.hour)}:00-${padHour((nextHour.hour + 1) % 24)}:00`;
    }

    return `${padHour(top.hour)}:00-${padHour((top.hour + 1) % 24)}:00`;
};

export async function generateConversationHeatmap(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setHours(0, 0, 0, 0);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const matchForRecentWeek = {
        $match: {
            $and: [
                {
                    $or: [
                        { senderId: userObjectId },
                        { receiverId: userObjectId },
                    ],
                },
                { createdAt: { $gte: weekAgo } },
            ],
        },
    };

    const [hourlyAggregation, dailyAggregation, conversationAggregation] = await Promise.all([
        Message.aggregate([
            matchForRecentWeek,
            {
                $project: {
                    hour: { $hour: "$createdAt" },
                },
            },
            {
                $group: {
                    _id: "$hour",
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Message.aggregate([
            matchForRecentWeek,
            {
                $project: {
                    isoDay: { $isoDayOfWeek: "$createdAt" },
                },
            },
            {
                $group: {
                    _id: "$isoDay",
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: userObjectId },
                        { receiverId: userObjectId },
                    ],
                },
            },
            {
                $project: {
                    partnerId: {
                        $cond: [
                            { $eq: ["$senderId", userObjectId] },
                            "$receiverId",
                            "$senderId",
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: "$partnerId",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "partner",
                },
            },
            { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    count: 1,
                    partner: {
                        _id: "$partner._id",
                        name: "$partner.name",
                        profilePicture: "$partner.profilePicture",
                    },
                },
            },
        ]),
    ]);

    const hourlyActivity = buildHourlyActivity(hourlyAggregation);
    const dailyActivity = buildDailyActivity(dailyAggregation);
    const weeklyMessages = hourlyActivity.reduce((sum, item) => sum + item.count, 0);
    const peakHour = determinePeakHour(hourlyActivity);

    const mostActiveConversation = conversationAggregation[0]
        ? {
              partner: conversationAggregation[0].partner || {
                  _id: null,
                  name: "Unknown conversation",
              },
              messageCount: conversationAggregation[0].count,
          }
        : null;

    return {
        peakHour,
        weeklyMessages,
        hourlyActivity,
        dailyActivity,
        mostActiveConversation,
    };
}
