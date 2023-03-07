const bcrypt = require("bcryptjs");
const validator = require("validator").default;
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const clearImage = require("../util/file");
const { findByIdAndUpdate } = require("../models/User");

module.exports = {
  createUser: async (args, req) => {
    const { email, name, password } = args.userInput;

    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: "Email is invalid." });
    }

    if (validator.isEmpty(name)) {
      errors.push({ message: "Name is required." });
    }

    if (validator.isEmpty(password) || !validator.isLength(password, { min: 5 })) {
      errors.push({ message: "Password too short." });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      throw new Error("Email already registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      email,
      name,
      password: hashedPassword,
    });

    const createdUser = await newUser.save();

    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async (args, req) => {
    const { email, password } = args;

    const errors = [];
    if (!validator.isEmail(email) || validator.isEmpty(email)) {
      errors.push({ message: "Invalid email input" });
    }

    if (validator.isEmpty(password) || !validator.isLength(password, { min: 5 })) {
      errors.push({ message: "Invalid password input" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const foundUser = await User.findOne({ email });

    if (!foundUser) {
      const error = new Error("User not found.");
      error.code = 401;
      throw error;
    }

    const verified = await bcrypt.compare(password, foundUser.password);

    if (!verified) {
      const error = new Error("Password invalid.");
      error.code = 401;
      throw error;
    }

    const secret = "A7v1n_t3am3";
    const token = jwt.sign({ userId: foundUser._id.toString(), email: foundUser.email }, secret, {
      expiresIn: "1h",
    });

    return { token, userId: foundUser._id.toString() };
  },
  createPost: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }
    const { title, content, imageUrl } = args.postInput;

    // const errors = [];

    // if (validator.isEmpty(title)) {
    //   errors.push({ message: "Title is required." });
    // }

    // if (validator.isEmpty(content)) {
    //   errors.push({ message: "Content is required." });
    // }

    // if (errors.length > 0) {
    //   const error = new Error("Invalid input.");
    //   error.data = errors;
    //   error.code = 422;
    //   throw error;
    // }

    const user = await User.findById(req.user.userId);

    if (!user) {
      const error = new Error("Invalid user.");
      // error.data = errors;
      error.code = 401;
      throw error;
    }

    const newPost = new Post({
      title,
      content,
      imageUrl,
      creator: user,
    });

    const createdPost = await newPost.save();

    user.posts.push(createdPost);

    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  posts: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    const currentPage = args.page;

    if (!currentPage) {
      currentPage = 1;
    }

    const perPage = 2;

    const totalPosts = await Post.find().countDocuments();

    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const formattedPosts = posts.map((post) => {
      return {
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      };
    });

    return { totalPosts, posts: formattedPosts };
  },
  post: async ({ id }, req) => {
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");

    if (!post) {
      const error = new Error("No Post found");
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async ({ id, postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");

    if (!post) {
      const error = new Error("No Post found");
      error.code = 404;
      throw error;
    }

    //checking if user who wants to edit the post owns the post
    if (req.user.userId.toString() !== post.creator._id.toString()) {
      const error = new Error("Unauthorized.");
      error.code = 403;
      throw error;
    }

    //input validation
    const errors = [];

    if (validator.isEmpty(postInput.title)) {
      errors.push({ message: "Title is required." });
    }

    if (validator.isEmpty(postInput.content)) {
      errors.push({ message: "Content is required." });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // once here you can now update the post with the post input
    post.title = postInput.title;
    post.content = postInput.content;

    // check if new image was uploaded
    if (postInput.imageUrl !== "undefined") {
      post.imageUrl = postInput.imageUrl;
    }

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async ({ id }, req) => {
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id);

    if (!post) {
      const error = new Error("No Post found");
      error.code = 404;
      throw error;
    }

    //checking if user who wants to edit the post owns the post
    if (req.user.userId.toString() !== post.creator.toString()) {
      const error = new Error("Unauthorized.");
      error.code = 403;
      throw error;
    }

    clearImage(post.imageUrl);

    await Post.findByIdAndDelete(id);

    // delete reference of deleted post from user posts array
    const user = await User.findById(req.user.userId);

    user.posts.pull(id);

    await user.save();

    return true;
  },
  user: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      const error = new Error("No user found");
      error.code = 404;
      throw error;
    }

    return { ...user._doc, _id: user._id.toString() };
  },
  updateStatus: async ({ status }, req) => {
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      const error = new Error("No user found");
      error.code = 404;
      throw error;
    }

    user.status = status;

    await user.save();

    return { ...user._doc, _id: user._id.toString() };
  },
};
