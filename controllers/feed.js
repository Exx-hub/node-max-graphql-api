const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");

const Post = require("../models/Post");
const User = require("../models/User");

const getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
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

  const user = req.user;
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
    creator: user.userId,
  });

  try {
    const result = await newPost.save();

    const postCreator = await User.findById(user.userId);

    postCreator.posts.push(newPost);

    await postCreator.save();

    res.status(201).json({
      message: "Post Created successfully.",
      post: result,
      creator: { _id: postCreator._id, name: postCreator.name },
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

  const userId = req.user.userId;
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

  // only users who created specific post can edit them
  if (postToEdit.creator.toString() !== userId.toString()) {
    const error = new Error("Not Authorized.");
    error.statusCode = 403;
    return next(error);
  }

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
  const userId = req.user.userId;
  const { postId } = req.params;

  try {
    const postToDelete = await Post.findById(postId);

    if (!postToDelete) {
      const error = new Error("Post not found.");
      error.statusCode = 404;
      return next(error);
    }

    // only users who created specific post can delete them
    if (postToDelete.creator.toString() !== userId.toString()) {
      const error = new Error("Not Authorized.");
      error.statusCode = 403;
      return next(error);
    }

    const result = await Post.findByIdAndDelete(postToDelete._id);

    // delete image of deleted post from file system
    clearImage(result.imageUrl);

    // delete reference of deleted post from user posts array
    const userToDeleteFrom = await User.findById(userId);

    userToDeleteFrom.posts.pull(postId);

    await userToDeleteFrom.save();

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
