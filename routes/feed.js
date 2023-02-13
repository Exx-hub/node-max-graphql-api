const express = require("express");

const feedController = require("../controllers/feed");

const { body } = require("express-validator");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.get("/posts", verifyToken, feedController.getPosts);

router.post(
  "/post",
  verifyToken,
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5, max: 400 }),
  ],
  feedController.createPost
);

router.get("/post/:postId", verifyToken, feedController.getPostById);

router.put(
  "/post/:postId",
  verifyToken,
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5, max: 400 }),
  ],
  feedController.updatePost
);

router.delete("/post/:postId", verifyToken, feedController.deletePost);

module.exports = router;
