const express = require("express");

const feedController = require("../controllers/feed");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/posts", feedController.getPosts);

router.post(
  "/post",
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5, max: 400 }),
  ],
  feedController.createPost
);

router.get("/post/:postId", feedController.getPostById);

router.put(
  "/post/:postId",
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5, max: 400 }),
  ],
  feedController.updatePost
);

router.delete("/post/:postId", feedController.deletePost);

module.exports = router;
