const { Router } = require("express");
const Product = require("../models/Product");
const multer = require('multer');
const router = Router();
const DIR = './uploads';
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Blog = require("../models/Blog");
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const uuid = require('uuid-v4');
const { route } = require("./blogsRoutes");

const GetAllProducts = require("../services/GetAllProducts");
const GetAllBlogs = require("../services/GetAllBlogs");

//Auth

const auth = require("../middleware/auth");


// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, DIR);
    },
    filename: (req, file, cb) => {
      const fileName = file.originalname.toLowerCase().split(' ').join('-');
      cb(null, fileName)
    }
});

let upload = multer({
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
// Get all the users
router.get("/",auth, async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// SignUp       post      /auth/signup

router.post("/signup",upload.single('file'), async (req,res)=>{
    try {
  
    const {email,firstName,lastName,password,DOB,phone} = req.body;
    // null check for body
    if(!email || !password || !firstName || !lastName || !DOB || !phone){
        return res.status(422).json({message:"Please Enter all fields"});
    }
    // mobile number validate check 
    if(phone.toString().length != 10){
        return res.status(422).json({message:"Phone Number must be at 10 Digits!"});
    }
    await User.findOne({email})
    .then((savedUser)=>{
        if(savedUser){
            return res.status(302).json({message:"User already exsist"})
        }
    })
    /* Store Profile Image at Firebase */
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: "matchup-444.appspot.com"
        });
    }
 
    let bucket = admin.storage().bucket();

    let filename = path.join(__dirname , '..' ,'uploads' , req.file.filename);
    let profileImageLink;
    async function uploadFile() {

        const metadata = {
            metadata: {
            firebaseStorageDownloadTokens: uuid()
            },
            contentType: req.file.contentType,
            cacheControl: 'public, max-age=31536000',
        };
        
        // Uploads a local file to the bucket
        await bucket.upload(filename, {
            gzip: true,
            metadata: metadata,
        })
        .then((data) => {
            profileImageLink = ("https://storage.googleapis.com/matchup-444.appspot.com/" + req.file.filename);
        })
        .catch((err) => {
            return err
        })
        
        console.log(`${filename} uploaded.`);
        
    }
        
    await uploadFile()
        .catch((err) => {
        return res.status(500).json({message: "Error Uploading Profile Image" , error:err.message});
    });
        /* --------------------------------*/

    // Encrypt password using bcrypt and store in database
    bcrypt.hash(password,10)
    .then((hashedpassword) => {
        const user = new User({
            firstName : firstName,
            lastName : lastName,
            email : email,
            DOB : DOB,
            phone : phone,
            password:hashedpassword,
            profileImage: profileImageLink,
            recentlyViewedProducts : [],
            favouriteBlogs :  [],
            cartProducts :  [],
        })
        user.save()
        .then(user=>{
            return res.status(200).json({message:"Saved Succcessfully",user:user})
        }).catch(err=>{
            console.log(err);
            return res.status(401).json({message:"Failed to save Succcessfully",error:err})
        })
    })
    
    } catch (error) {
        console.log(error);
        return res.status(500).json({message : error.message})
    }
    
    
})

// SignIn       post      /auth/signin
router.post('/signin',(req,res)=>{
    const {email,password} = req.body;
    if(!email || !password){
        return res.status(422).json({message:"Please Add Email or Password"})
    }
    User.findOne({email})
    .then(savedUser => {
        // check if the user is valid or not
        if(!savedUser){
            return res.status(422).json({message:"Invalid email or password"})
        }     
        // Compare user password with the encrypted password in database
        bcrypt.compare(password,savedUser.password)     
        .then(doMatch=>{
            if(doMatch){
                const token = jwt.sign({_id:savedUser._id,email:savedUser.email},process.env.JWT_SECRET,   {
                    expiresIn: "24h",
                })
                const {_id,email,firstName,lastName,profileImage,DOB,phone} = savedUser;
                // return auth token
                return res.status(200).json({token,user:{_id,email,firstName,lastName,profileImage,DOB,phone}})
            }else{
                return res.status(422).json({error:"Invalid Email or Password"})
            }
        }).catch(err=>{
            console.log(err);
        })
    }).
    catch(err=>{
        console.log(err);
    })
});



// Get a single User by id
router.get("/:id",auth, async (req, res) => {
    let user;
    try {
        user = await User.findById(req.params.id);
        if (user == null) {
            return res.status(400).json({ message: "user does not exist" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error Fetching user" , error: error.message });
    }
    return res.status(200).json(user);
});

// Delete the user by id
router.delete("/:id",auth, async (req, res) => {
    let user;
    try {
        user = await User.findById(req.params.id);
        if (user == null) {
            return res.status(400).json({ message: "User does not exist" });
        }
        res.user = user;
        await res.user.remove();
        return res.status(200).json({ message: "User deleted succesfully" });

    } catch (error) {
        return res.status(500).json({ message: "Failed Deleting User",error: error.message });
    }
});
// Update the user by id
router.patch("/:id",auth, async (req,res) => {
    if(!req.body.firstName || !req.body.lastName || !req.body.email || !req.body.DOB || !req.body.phone) {
        return res.status(422).json({ message: "Please Enter all fields" });
    }
    if(req.body.phone.toString().length != 10){
        return res.status(422).json({ message: "Phone Number must be 10 Digits"})
    }
    try{
        User.findOne({_id: req.params.id}, function(err, user) {
            if(!err){
              
                user.firstName = req.body.firstName;
                user.lastName = req.body.lastName;
                user.email = req.body.email;
                user.DOB = req.body.DOB;
                user.phone = req.body.phone;

                user.save(function(err) {
                    if(!err) {
                        return res.status(200).json({ message: `User Updated Successfully`,user: user });
                    }
                    else {
                        return res.status(422).json({ message: "Error updating user"});
                    }
                });
            }
        });
    }
    catch(error) {
        return res.status(500).json({ message: "Failed to Update User",error: error.message })
    }
});



/* ------------------------FavouriteBlogs------------------------ */

// Add a blog to User's favouriteBlogs list
router.post('/favouriteBlogs/:userId/:blogId',auth, async (req, res) => {
    try {
    const {userId, blogId} = req.params;
    if(!userId || !blogId) {
        return res.status(422).send({message: "Invalid Id(s)"});
    }
    //check User ID
    let user = await User.findById(userId);
    if (user == null) {
        return res.status(400).json({ message: "user does not exist" });
    }
    //check Blog ID
    const blogs = await GetAllBlogs();
    if(!blogs){
        return res.status(422).send({message: "Blogs are Empty (or) Failed to fetch blogs"});
    }
    let isBlogExists = blogs.find((blog) => blog._id.toString() === blogId);
    if(!isBlogExists){
        return res.status(404).send({message: "Blog not Found"});
    }

    //All params OK
    User.findOne({_id: userId}, function(err, user) {
        if(err) {
            return res.status(404).send({message: err.message});
        }
        else{
            if(!user) {
                return res.status(404).json({message:"No User found"})
            }
            const blogs = user.favouriteBlogs;
            let flag=1;
            // Check if the blog is already in the user's favorites list'
            if(blogs.length !== 0){
                blogs.forEach(ele => {
                    if(blogId.toString() === ele.toString()){
                        flag = 0;
                    }
                });
            }
            // If not in the favorites list
            if(flag){
                user.favouriteBlogs.push(blogId);
                user.save(function(err) {
                    if(!err) {
                        return res.status(200).json({ message: `Blog Successfully Added to FavouriteBlogs`})
                    }
                    else {
                        console.log(err);
                        return res.status(422).json({ message: "Error Adding Blog to FavouriteBlogs"});
                    }
                });
            }
            // Already exists 
            else{
                return res.status(422).json({ message: "Blog already exists in Favourites"})
            }
        }
    })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// Get all favorite blogs from the User's favouriteBlogs list
router.get('/favouriteBlogs/:userId',auth, async (req, res) => {
    // Validate User
    const {userId} = req.params;
    if(!userId) {
        return res.status(404).json({ message: "Invalid User Id"});
    }
    User.findOne({ _id: userId}, async function(err, user) {
        if(err) {
            return res.status(404).send({message: "Invalid User Id"});
        }
        else{
            const blogIds = user.favouriteBlogs;
            const blogs = [];
            // GetAllBlogsbyId and send the favourite blogs
            await Promise.all(blogIds.map(async (id) => {
                blogs.push(await Blog.findById(id));
            }));

            return res.status(200).json({ favouriteBlogs: blogs || [] });
        }
    })
});
// Remove a blog from User's favouriteBlogs list
router.delete('/favouriteBlogs/:userId/:blogId',auth, async (req, res) => {
    let user;
    try {
        // Validate User
        user = await User.findById(req.params.userId);
        if (user == null) {
            return res.status(400).json({ message: "User does not exist" });
        }
        res.user = user;
        
        const blogs = user.favouriteBlogs;
                
        if(blogs.length !== 0){
            blogs.forEach(ele => {
                if(req.params.blogId.toString() === ele.toString()){
                    blogs.remove(ele);
                }
            })
        }
        user.cartBlogs = blogs;

        user.save();

        return res.status(200).json({ message: "Blog deleted succesfully" });

    } catch (error) {
        return res.status(500).json({ message: "Failed Deleting",error: error.message });
    }
});

/* ------------------------Cart Products------------------------ */

// Add a product to Cart
router.post('/cartProducts/:userId/:productId',auth, async (req, res) => {
    try {
    const quantity = req.body.quantity;
    const {userId, productId} = req.params;
    if(!userId || !productId) {
        return res.status(422).send({message: "Invalid Id(s)"});
    }
    if(quantity == 0 || quantity == null || quantity === undefined) {
        return res.status(422).send({message: "Invalid quantity"});
    }
    //check User ID
    let user = await User.findById(userId);
    if (user == null) {
        return res.status(400).json({ message: "user does not exist" });
    }
    //check Product ID
    const products = await GetAllProducts();
    if(!products){
        return res.status(422).send({message: "Products are Empty (or) Failed to fetch products"});
    }
    let curProduct = products.find((product) => product._id.toString() === productId);
    if(!curProduct){
        return res.status(404).send({message: "Product not Found"});
    }

    // Check Product is available or not for the quantity
    if(!(curProduct.available > 0 && (curProduct.available - quantity) >= 0)){
        return res.status(404).send({message: "Product is out of stock"});
    }


    //All params OK

    User.findOne({_id: userId}, function(err, user) {
        if(err) {
            return res.status(404).send({message: err.message});
        }
        else{
            if(!user) {
                return res.status(404).json({message:"No User found"})
            }
            const products = user.cartProducts;
            let flag=1;
            let quantity = 0;
            // Check if product already exists in User's cart
            if(products.length !== 0){
                products.forEach(ele => {
                    if(productId.toString() === ele.productId){
                        flag = 0;
                        quantity = parseInt(ele.quantity);
                        products.remove(ele);
                    }
                })
            }
            // If product does not exist in User's cart
            if(flag){
                const newProduct = {
                    productId,
                    "quantity" : req.body.quantity,
                }
                user.cartProducts.push(newProduct);
            }
            // if alreay exists in User's cart increase quantity
            else{
                const newProduct = {
                    productId,
                    "quantity" : parseInt(req.body.quantity)+quantity,
                }
                products.push(newProduct);
                user.cartProducts = products;
            }
            
            user.save(function(err) {
                if(err) {
                    return res.status(422).json({ message: "Error Adding Product to Cart"});

                }
                else {
                    Product.findByIdAndUpdate(productId, { available:  (curProduct.available - quantity)},
                            function (err, data) {
                        if (err){
                            console.log(err);
                            return res.status(500).json({ message: "Error  product"})
                        }
                        else{
                            return res.status(200).json({ message: `Product Successfully Added to Cart`})
                        }
                    });
                }
            });
        }
    })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});
// Get a product from User's cartProducts list
router.get('/cartProducts/:userId',auth, async (req, res) => {
    const {userId} = req.params;
    if(!userId) {
        return res.status(404).json({ message: "Invalid User Id"});
    }
    
    let user = await User.findById({ _id: userId});
    if(!user) {
        return res.status(404).send({message: "User Not Found"});
    }
    else{
        const productIds = user.cartProducts;
        const products = [];
        await Promise.all(productIds.map(async (prod) => {
            const product = await Product.findById(prod.productId);
            const quantity = prod.quantity;
            let cartProducts = {
                product,
                quantity 
            }
            products.push(cartProducts);
        }));

        return res.status(200).json({ cartProducts: products || []  });
    }
});

// Remove a product from User's cartProducts list
router.delete('/cartProducts/:userId/:productId',auth, async (req, res) => {
    try {
        const {userId, productId} = req.params;
        const products = await GetAllProducts();
        if(!products){
            return res.status(422).send({message: "Products are Empty (or) Failed to fetch products"});
        }
        let isProductExists = products.find((product) => product._id.toString() === productId);
        if(!isProductExists){
            return res.status(404).send({message: "Product not Found"});
        }

        User.findOne({_id: userId}, async function(err, user) {
            if(err) {
                return res.status(404).send({message: err.message});
            }
            else{
                if(!user) {
                    return res.status(404).json({message:"No User found"})
                }
                
                const products = user.cartProducts;
                
                if(products.length !== 0){
                    products.forEach(ele => {
                        if(productId.toString() === ele.productId.toString()){
                            products.remove(ele);
                        }
                    })
                }
                user.cartProducts = products;
                console.log(products)
                user.save(function(err) {
                    if(!err) {
                        return res.status(200).json({ message: "Removed from Cart succesfully" });
                    }
                    else {
                        return res.status(422).json({ message: "Error Removing Product to Cart"});
                    }
                });
            }
        })
       

    } catch (error) {
        return res.status(500).json({ message: "Failed Removing from Cart",error: error.message });
    }
});



module.exports = router;
