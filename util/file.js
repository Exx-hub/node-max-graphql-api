const path = require("path");
const fs = require("fs");

const clearImage = (filePath) => {
  const imagePathToDelete = path.join(__dirname, "..", filePath);
  fs.unlink(imagePathToDelete, (err) => console.log(err));
};

module.exports = clearImage;
