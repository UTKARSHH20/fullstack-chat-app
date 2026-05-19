import jwt from "jsonwebtoken";

export default function protectRoute(req, res, next) {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: "Unauthorized — no token" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRETKEY);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Session expired, please log in again" });
        }
        return res.status(401).json({ message: "Invalid token" });
    }
}