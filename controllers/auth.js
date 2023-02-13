const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const { validationResult } = require("express-validator");

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    return next(error);
  }

  const { email, name, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    const error = new Error("Email already registered.");
    error.statusCode = 422;
    return next(error);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = new User({
    email,
    name,
    password: hashedPassword,
  });

  try {
    const result = await newUser.save();

    res.status(201).json({ message: "Signup successful", userId: result._id });
  } catch (err) {
    const error = new Error(err);
    error.statusCode = 500;
    return next(error);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (!userExists) {
    const error = new Error("Email/password incorrect.");
    error.statusCode = 401;
    return next(error);
  }

  const verified = await bcrypt.compare(password, userExists.password);

  if (!verified) {
    const error = new Error("Email/password incorrect.");
    error.statusCode = 401;
    return next(error);
  }

  // create jwt token here and pass along with response
  const secret = "A7v1n_t3am3";
  const accessToken = jwt.sign({ userId: userExists._id, email: userExists.email }, secret, {
    expiresIn: "1h",
  });

  res.status(200).json({ message: "Login success.", token: accessToken, userId: userExists._id });
};

module.exports = { signup, login };
