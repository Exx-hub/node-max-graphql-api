const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.Authorization || req.headers.authorization;

  const token = authHeader?.split(" ")[1]; // or authHeader.splice(7)
  // const token = req.get("Authorization").slice(7); ---// this way works too

  if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
    req.isAuth = false;

    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // decoded = {email, userId}
    req.isAuth = true;
    next();
  } catch (err) {
    req.isAuth = false;

    return next();
  }
};

module.exports = verifyToken;
