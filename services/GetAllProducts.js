const Product = require("../models/Product");

async function GetAllProducts(){
    let products = await Product.find();
    return products;
}

module.exports = GetAllProducts;