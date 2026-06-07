export function validateSignup(req, res, next) {
    const { name, email, password } = req.body;
    const errors = [];

    if (typeof name !== "string" || name.trim().length < 2) {
        errors.push("Name must be at least 2 characters");
    } else if (name.trim().length > 50) {
        errors.push("Name cannot exceed 50 characters");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email.trim())) {
        errors.push("Valid email is required");
    }

    if (typeof password !== "string" || password.length < 6) {
        errors.push("Password must be at least 6 characters");
    } else if (password.length > 100) {
        errors.push("Password cannot exceed 100 characters");
    }

    if (errors.length > 0) return res.status(400).json({ message: errors[0], errors });
    next();
}

export function validateLogin(req, res, next) {
    const { email, password } = req.body;
    // GSSoC Issue #61 Fix
    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password must be strings" });
    }
    if (!email.trim() || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    next();
}
