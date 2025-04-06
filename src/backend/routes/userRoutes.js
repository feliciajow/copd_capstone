const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/authMiddleware");
/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with the provided information.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *               name:
 *                 type: string
 *                 description: User's full name
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Bad Request - Invalid input data
 *       409:
 *         description: Conflict - Email already exists
 *       500:
 *         description: Internal Server Error
 */

// user register
router.post("/register", userController.registerUser);


// Login user
/**
 * @swagger
 * /api/users/loggedin:
 *   post:
 *     summary: Login a user
 *     description: Authenticates a user with email and password.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Bad Request - Invalid credentials
 *       404:
 *         description: Not Found - User does not exist
 *       500:
 *         description: Internal Server Error
*/

// user login
router.post("/loggedin", userController.loginUser);


// refresh token
router.post("/refreshAccessToken", userController.refreshAccessToken);
/**
 * @swagger
 * /api/users/forgotpwd:
 *   post:
 *     summary: Forgot password
 *     description: Sends a password reset link to the user's email.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Not Found - User with email does not exist
 *       500:
 *         description: Internal Server Error
 */

//forgot password
router.post("/forgotpwd", userController.forgotpwd);

/**
 * @swagger
 * /api/users/resetpwd:
 *   post:
 *     summary: Reset password
 *     description: Resets the user's password using a valid reset token.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token
 *               password:
 *                 type: string
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad Request - Invalid or expired token
 *       500:
 *         description: Internal Server Error
 */

//reset password
router.post("/resetpwd", userController.resetpwd);

/**
 * @swagger
 * /api/users/model:
 *   get:
 *     summary: Get model information
 *     description: Retrieves information about the user model structure.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Model information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Internal Server Error
 */

// retrieve models belonging to all users
router.get("/model", userController.model);
router.get("/logout", userController.logoutUser);

module.exports = router;