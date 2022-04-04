const Blog = require("../models/Blog");

module.exports.getBlog = async (req, res, next) => {
    let blog;
    try {
        blog = await Blog.findById(req.params.id);
        if (blog == null) {
            return res.status(400).json({ message: "blog does not exist" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    res.blog = blog;
    next();
};
