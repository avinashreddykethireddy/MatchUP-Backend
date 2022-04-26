const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    available:{
        type: Number,
        required: true,
    },
    cover: {
        type : String,
        required: true,
    },
    sellerUserId: {
        type: String,
        required: true,
    }},
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
