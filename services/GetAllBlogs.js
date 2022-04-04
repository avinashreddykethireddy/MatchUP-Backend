const Blog = require("../models/Blog");

async function GetAllBlogs(){
    let blogs = await Blog.find();
    return blogs;
}

module.exports = GetAllBlogs;