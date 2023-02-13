const express = require("express");

const userController = require("../controllers/user");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.get("/status", verifyToken, userController.getStatus);
router.patch("/status", verifyToken, userController.updateStatus);

module.exports = router;
