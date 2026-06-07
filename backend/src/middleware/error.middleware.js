/**
 * Centralized error handling middleware.
 * Catches all errors passed through next() and returns a consistent JSON response.
 */
export const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[API Error] ${req.method} ${req.url}:`, err);

    res.status(statusCode).json({ message });
};