const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.Authorization || req.headers.authorization;
  const token = authHeader?.split(" ")[1]; // or authHeader.splice(7)
  // const token = req.get("Authorization").slice(7); ---// this way works too

  if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
    const error = new Error("Jwt required.");
    error.statusCode = 401;
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // decoded = {email, userId}
    next();
  } catch (err) {
    const error = new Error(err);
    error.statusCode = 500;
    return next(error);
  }
};

module.exports = verifyToken;
