const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }
    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        // attach decoded token payload to the request
        req.user = decoded; 
        next(); 
    } catch (error) {
        return res.status(403).json({ error: "Invalid or expired token." });
    }
}

module.exports = { authenticateToken };