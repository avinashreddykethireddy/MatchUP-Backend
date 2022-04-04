const Product = require("../models/Product");

module.exports.getProduct = async (req, res, next) => {
    let product;
    try {
        product = await Product.findById(req.params.id);
        if (product == null) {
            return res.status(400).json({ message: "product does not exist" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error Fetching product" , error: error.message });
    }
    res.product = product;
    next();
};
