const path = require("path");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");

const graphqlSchema = require("./graphql/schema");
const graphqlResolvers = require("./graphql/resolvers");
const verifyToken = require("./middleware/verifyToken");

const clearImage = require("./util/file");

const app = express();

const PORT = process.env.PORT;

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilterFunc = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(express.json());
// app.use(express.urlencoded({ extended: true })); x-www-form-urlencoded <form> data
// app.use(cors());

// after multer middleware is registered, able to access file property in request object
// for input file type with "image" id
app.use(multer({ storage: fileStorage, fileFilter: fileFilterFunc }).single("image"));

app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(verifyToken);

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated.");
  }

  if (!req.file) {
    return res.status(200).json({ message: "No file provided." });
  }

  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  return res.status(201).json({ message: "File stored.", filePath: req.file.path });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolvers,
    graphiql: true,
    customFormatErrorFn: (error) => ({
      message: error.message || "An error occurred.",
      status: error.originalError?.code || 500,
      data: error.originalError?.data,
    }),
  })
);

// express error middleware, gets call if next is passed with an error object
// general error handling function
app.use((error, req, res, next) => {
  console.log("error:", error);
  console.log("express error middleware in action");
  const status = error.statusCode || 500;
  const message = error.message || "Something went wrong.";

  res.status(status).json({ message });
});

try {
  mongoose.set("strictQuery", false);
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
} catch (err) {
  console.log(err);
}

// database event listeners
const db = mongoose.connection;

db.once("open", () => {
  console.log("DB connection Established");
  app.listen(PORT, () => console.log(`Server listening on port: ${PORT}!`));
});

db.on("error", (err) => {
  console.log("connection error");
  console.log(err);
});
