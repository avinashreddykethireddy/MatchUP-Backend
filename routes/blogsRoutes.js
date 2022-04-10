const { Router } = require("express");
const Blog = require("../models/Blog");
const User = require('../models/User');
const { getBlog } = require("../middleware/getBlog");
const multer = require('multer');
const router = Router();
const DIR = './uploads';
const fs = require('fs');
const path = require('path');

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const uuid = require('uuid-v4');

//Auth

const auth = require("../middleware/auth");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, DIR);
    },
    filename: (req, file, cb) => {
      const fileName = file.originalname.toLowerCase().split(' ').join('-');
      cb(null, fileName)
    }
});

var upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
        cb(null, true);
      } else {
        cb(null, false);
        return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
      }
    }
});
// Get all the Blogs
router.get("/", async (req, res) => {
    try {
        const blogs = await Blog.find();
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a Blog
router.post("/",auth, upload.single('file') ,async (req, res) => {

    try {

    const {sellerUserId} = req.body;
    if(!req.body.title || req.body.description <=0 || !req.body.sellerUserId){
        return res.status(422).json({error:"Please Enter All Fields!"});
    }
    User.findOne({sellerUserId})
    .then(savedUser => {
        if(!savedUser){
            return res.status(422).json({error:"Invalid User Details"});
        }
    })
    .catch(err => {
        console.log(err);
    })
    /* Firebase */

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: "matchup-444.appspot.com"
        });
    }
    var bucket = admin.storage().bucket();

    var filename = path.join(__dirname , '..' ,'uploads' , req.file.filename);
    let productImageLink;
    async function uploadFile() {

        const metadata = {
          metadata: {
            // This line is very important. It's to create a download token.
            firebaseStorageDownloadTokens: uuid()
          },
          contentType: req.file.contentType,
          cacheControl: 'public, max-age=31536000',
        };
      
        // Uploads a local file to the bucket
        await bucket.upload(filename, {
          // Support for HTTP requests made with `Accept-Encoding: gzip`
          gzip: true,
          metadata: metadata,
        })
        .then((data) => {
            productImageLink = ("https://storage.googleapis.com/matchup-444.appspot.com/" + req.file.filename);
        })
        .catch((err) => {
           return err
        })
      
      console.log(`${filename} uploaded.`);
      
    }
      
    await uploadFile()
      .catch((err) => {
        return res.status(500).json({message: "Error Uploading image" , error:err.message});
      });

    const blog = new Blog({
        title: req.body.title,
        description: req.body.description,
        sellerUserId : sellerUserId,
        productImage : productImageLink
    });
    try {
        const newBlog = await blog.save();
        return res.status(201).json({message : "Successfully saved blog",blog : newBlog});
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Error Adding new Blog",error : error.message });
    }
                
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});
// Get a single Blog
router.get("/:id",auth, getBlog, async (req, res) => {
    return res.status(200).json(res.blog);
});

// Update the blog
router.patch("/:id",auth, async (req, res) => {
    if(req.body.title == null && req.body.description == null){
        return res.status(422).json({message: "Please Enter atleast one field"});
    }
    try {
        Blog.findOne({_id: req.params.id}, function(err, blog) {
            if(!err) {
                if(!blog) {
                    return res.status(404).json({message:"No Blog found"})
                }
                if(req.body.title) {
                    blog.title = req.body.title;
                }
                if(req.body.description) {
                    blog.description = req.body.description;
                }
                blog.save(function(err) {
                    if(!err) {
                        return res.status(200).json({ message: `Blog Updated Successfully`})
                    }
                    else {
                        return res.status(422).json({ message: "Error updating blog"});
                    }
                });
            }
        });
        
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// Delete the blog
router.delete("/:id",auth, async (req, res) => {
    let blog;
    try {
        blog = await Blog.findById(req.params.id);
        if (blog == null) {
            return res.status(400).json({ message: "Blog does not exist" });
        }
        res.blog = blog;
        await res.blog.remove();
        return res.status(200).json({ message: "Blog deleted succesfully" });

    } catch (error) {
        return res.status(500).json({ message: "Failed Deleting Blog",error: error.message });
    }
});

module.exports = router;