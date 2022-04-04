const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    productImage: {
        type: String,
        required: true,
    },
    sellerUserId: {
        type: String,
        required: true,
    }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);
