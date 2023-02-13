const User = require("../models/User");

const getStatus = async (req, res, next) => {
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({ message: "Fetch success.", status: user.status });
  } catch (err) {
    const error = new Error("Fetch status failed.");
    error.statusCode = 500;
    return next(error);
  }
};

const updateStatus = async (req, res, next) => {
  const userId = req.user.userId;
  const { status } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      return next(error);
    }

    user.status = status;

    const result = await user.save();

    return res.status(200).json({ message: "Status update success", status: result.status });
  } catch (err) {
    const error = new Error("Updating status failed.");
    error.statusCode = 500;
    return next(error);
  }
};

module.exports = { getStatus, updateStatus };
