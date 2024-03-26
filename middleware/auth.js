const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/users");

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      if (!req.baseUrl.includes("/api/products") || req.method !== "GET") {
        return res.status(401).json({ message: "SORRY!! Please login first ^_^ " });
      }
      return next();
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Invalid token format." });
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    if (!decoded.userId) {
      return res.status(401).json({ message: "Invalid token." });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    if (user.role === "seller") {
      if (!req.baseUrl.includes("/api/products")) {
        return res.status(403).json({ message: "SORRY! You are not authorized to do this action" });
      }

      if (req.method === "GET") {
        req.userId = decoded.userId;
      } else {
        if (req.params.id) {

          const product = await Product.findById(req.params.id);
          if (!product || product.seller.toString() !== decoded.userId) {
            return res.status(403).json({ message: "SORRY! You are not authorized to do this action" });
          }
        }
      }
    } else if (user.role === "registered") {
 
      if (!req.baseUrl.includes("/api/users")) {

        if (req.params.userId !== decoded.userId) {
          return res.status(403).json({ message: "SORRY! You are not authorized to do this action" });
        }
      }

      if (req.baseUrl.includes("/api/orders")) {

        if (req.method === "POST") {
          req.userId = decoded.userId;
        }
      }
    } else {

      if (req.baseUrl.includes("/api/users") || req.baseUrl.includes("/api/orders")) {
          return res.status(403).json({ message: "SORRY! You are not authorized to do this action" });
      }

      if (req.baseUrl.includes("/api/products") && req.method !== "GET") {
            return res.status(403).json({ message: "SORRY! You are not authorized to do this action" });
      }
    }


    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Authentication failed." });
  }
}

module.exports = auth;
