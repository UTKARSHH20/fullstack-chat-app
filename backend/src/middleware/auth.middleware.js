import jwt from "jsonwebtoken";

const protectRoute = (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) return res.status(401).json({ message: "Unauthorized" });
        const decodedToken = jwt.verify(token, process.env.JWT_SECRETKEY);
        req.userId = decodedToken.userId;
        next();
    } catch (error) { console.log(error); res.status(500).json({ message: "Internal server error" }); }
}
export default protectRoute;