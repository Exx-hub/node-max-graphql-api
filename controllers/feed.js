const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");

const Post = require("../models/Post");

const getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    if (posts.length < 1 || totalItems.length < 1) {
      const error = new Error("No posts found.");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      message: "Posts fetched successfully.",
      posts,
      totalItems,
    });
  } catch (err) {
    const error = new Error(err);
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    return next(error);
  }
};

const getPostById = async (req, res, next) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Post not found.");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({ message: "Post fetched.", post });
  } catch (err) {
    const error = new Error(err);
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    return next(error);
  }
};

const createPost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, enetered data is incorrect.");
    error.statusCode = 422;
    return next(error);
  }

  const { title, content } = req.body;
  const image = req.file; // req.file accessible after multer middleware setup

  if (!image) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    return next(error);
  }

  const newPost = new Post({
    title,
    content,
    imageUrl: image.path,
    creator: {
      name: "Alvin Acosta",
    },
  });

  try {
    const result = await newPost.save();

    res.status(201).json({
      message: "Post Created successfully.",
      post: result,
    });
  } catch (err) {
    const error = new Error(err);
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    return next(error);
  }
};

const updatePost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, enetered data is incorrect.");
    error.statusCode = 422;
    return next(error);
  }

  const { postId } = req.params;
  const updatedTitle = req.body.title;
  const updateContent = req.body.content;
  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = req.file.path;
  }

  if (!imageUrl) {
    const error = new Error("File not picked.");
    error.statusCode = 422;
    return next(error);
  }

  const postToEdit = await Post.findById(postId);

  if (!postToEdit) {
    const error = new Error("Post not found.");
    error.statusCode = 404;
    return next(error);
  }

  if (imageUrl !== postToEdit.imageUrl) {
    clearImage(postToEdit.imageUrl);
  }

  postToEdit.title = updatedTitle;
  postToEdit.content = updateContent;
  postToEdit.imageUrl = imageUrl;

  const result = await postToEdit.save();

  res.status(200).json({ message: "Post updated successfully", post: result });
};

const deletePost = async (req, res, next) => {
  const { postId } = req.params;

  try {
    const postToDelete = await Post.findById(postId);

    if (!postToDelete) {
      const error = new Error("Post not found.");
      error.statusCode = 404;
      return next(error);
    }
    //check if post created by logged in user.

    const result = await Post.findByIdAndDelete(postToDelete._id);

    clearImage(result.imageUrl);

    if (!postToDelete) {
      const error = new Error("Post not found.");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({ message: "Post deleted.", post: result });
  } catch (err) {
    const error = new Error(err);
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    return next(error);
  }
};

const clearImage = (filePath) => {
  const imagePathToDelete = path.join(__dirname, "..", filePath);
  fs.unlink(imagePathToDelete, (err) => console.log(err));
};

module.exports = { getPosts, getPostById, createPost, updatePost, deletePost };
