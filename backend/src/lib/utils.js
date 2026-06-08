import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRETKEY, { expiresIn: "15d" });
    res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development" || process.env.FORCE_SECURE_COOKIES === "true" // GSSoC Issue #49 Fix
    });
    return token;
};

/**
 * Wraps an async function to catch errors and pass them to the next middleware.
 * Eliminates the need for try/catch blocks in every controller.
 */
export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};