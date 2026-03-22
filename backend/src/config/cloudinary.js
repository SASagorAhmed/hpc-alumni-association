const cloudinary = require("cloudinary").v2;
const env = require("./env");

function configureCloudinary() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });

  return true;
}

configureCloudinary();

module.exports = cloudinary;

