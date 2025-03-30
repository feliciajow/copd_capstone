const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// user register
router.post("/register", userController.registerUser);

// user login
router.post("/loggedin", userController.loginUser);

//forgot password
router.post("/forgotpwd", userController.forgotpwd);

//reset password
router.post("/resetpwd", userController.resetpwd);

// user login
router.get("/model", userController.model);

module.exports = router;