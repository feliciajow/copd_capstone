const bcrypt = require("bcrypt");
const pool = require("../utils/database");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { access } = require("fs");

// Register a new user
async function registerUser(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("INSERT INTO users (email, hashpassword) VALUES ($1, $2)", [email, hashedPassword]);
        res.status(201).json({ message: "User registered successfully." });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ error: "An account with this email already exists." });
        }
        res.status(500).json({ error: "An error occurred while registering the user." });
    }
}

// Log in a user
async function loginUser(req, res) {
    const { email, password } = req.body;
    console.log("Request Body:", req.body);
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {                                       
        //query DB
        const result = await pool.query('select * from users where email = $1', [email]);
        console.log("Result",result);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found.' });
        }
        //return the array in result
        const user = result.rows[0];
        //remove whitespaces or additional characters
        const trimpwd = password.trim();
        //remove whitespaces or additional characters
        const trimhashpwd = user.hashpassword.trim();
        //compare the plaintext password in login to the hashed password in db
        const comparepwd = await bcrypt.compare(trimpwd, trimhashpwd);
        console.log("Compare Password",comparepwd);
        if (!comparepwd) {
            return res.status(401).json({ error: 'Account exist but incorrect password.' });
        }
        //generate access token (short-lived)
        const accessToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

        //generate refresh token (long-lived)
        const refreshToken = jwt.sign({ email }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
        console.log("Tokens",process.env.REFRESH_TOKEN_SECRET, process.env.ACCESS_TOKEN_SECRET);
        //store refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false, // Set to true in production but false for localhost
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        console.log("Login successful, token generated.");
        return res.status(200).json({ message: 'Login successful.',accessToken });
    } catch (error) {
        return res.status(500).json({ error: 'An error has occured.' });
    }
}

//refresh access tokens
async function refreshAccessToken(req, res) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token not found.' });
    }
    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const newAccessToken = jwt.sign({ email: decoded.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
        return res.status(200).json({ accessToken: newAccessToken });
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid refresh token.' });
    }
}

//forgot password
async function forgotpwd(req, res) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }

    try {
        // Check if the email exists in the database
        const result = await pool.query("select * from users where email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Email not registered." });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000);

        // Save the reset token and expiry to the database
        await pool.query(
            "update users set reset_token = $1, reset_token_expiry = $2 where email = $3",
            [resetToken, resetTokenExpiry, email]
        );

        res.status(200).json({
            message: "Password reset token generated.",
            resetToken, // Include the token in the response
        });

    } catch (error) {
        console.error("Error in forgotPassword function:", error);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
}

//reset password
async function resetpwd(req, res) {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required." });
    }

    try {
        // check if token is valid and not expired
        const result = await pool.query(
            "select * from users where reset_token = $1 and reset_token_expiry > now()",
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired token." });
        }

        // hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // update user's password and clear the reset token
        await pool.query(
            "update users set hashpassword = $1, reset_token = null, reset_token_expiry = null where reset_token = $2",
            [hashedPassword, token]
        );

        res.status(200).json({ message: "Password reset successful." });
    } catch (error) {
        console.error("Error in resetPassword function:", error);
        res.status(500).json({ error: "An error occurred while resetting the password." });
    }
}

//View models belonging to all users
async function model(req, res) {
    const { email } = req.headers; //retrieve email from header in frontend
    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }
    try {
        const result = await pool.query(
            `Select m.modelid, m.model_name, m.c_index, m.timestamp, m.expire_date 
            From models m`
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No models trained.' });
        }
        return res.status(200).json(result.rows);
    } catch (error) {
        return res.status(500).json({ error: 'An error has occured.' });
    }
};


module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    forgotpwd,
    resetpwd,
    model,
};