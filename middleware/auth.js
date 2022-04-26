//Install jsonwebtoken package
const jwt = require("jsonwebtoken");

// get Secret Key from .env
const config = process.env;

const verifyToken = (req, res, next) => {
  // Check token in body || query || header
  const token =
    req.body.token || req.query.token || req.headers["x-auth-token"];

  if (!token) {
    return res.status(403).json({message: "A token is required for authentication"});
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.userId = decoded._id;
  } catch (err) {
    return res.status(401).json({message: "Invalid Token"});
  }
  return next();
};

module.exports = verifyToken;