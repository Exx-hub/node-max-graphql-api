const express = require("express");

const { body } = require("express-validator");

const authController = require("../controllers/auth");

const router = express.Router();

router.post(
  "/signup",
  [
    body("email").isEmail().withMessage("Enter valid email").normalizeEmail(),
    body("password").trim().isLength({ min: 5 }),
    body("name").trim().notEmpty().isLength({ min: 5 }),
  ],
  authController.signup
);

// no validation here apparently cause in controller you really need to check email and compare password...
router.post("/login", authController.login);

module.exports = router;
