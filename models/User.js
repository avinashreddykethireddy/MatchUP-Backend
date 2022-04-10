const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true 
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: Number,
        required: true,
    },
    DOB: {
        type: String,
        required: true,
    },
    profileImage: {
        type: String,
        required: true,
    },
    favouriteBlogs :  [],
    cartProducts :  [],
    },{timestamps : true}
);

module.exports = mongoose.model("User", userSchema);
