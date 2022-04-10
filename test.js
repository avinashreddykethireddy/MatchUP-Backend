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

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const uuid = require('uuid-v4');
const { route } = require("./blogsRoutes");

const GetAllProducts = require("../services/GetAllProducts");
const GetAllBlogs = require("../services/GetAllBlogs");
const Blog = require("../models/Blog");

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
router.get("/", async (req, res) => {
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
    if(!email || !password || !firstName || !lastName || !DOB || !phone){
        return res.status(422).json({message:"Please Enter all fields"});
    }
    await User.findOne({email})
    .then((savedUser)=>{
        if(savedUser){
            return res.status(422).json({message:"User already exsist"})
        }
    })
    /* Store Profile Image at Firebase */
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: "matchup-12345.appspot.com"
        });
    }
 
    let bucket = admin.storage().bucket();

    let filename = path.join(__dirname , '..' ,'uploads' , req.file.filename);
    let profileImageLink;
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
            profileImageLink = ("https://storage.googleapis.com/matchup-12345.appspot.com/" + req.file.filename);
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

    bcrypt.hash(password,10)
    .then((hashedpassword) => {
        const user = new User({
            firstName : firstName,
            lastName : lastName,
            email : email,
            DOB : DOB,
            password:hashedpassword,
            phone: phone,
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
        if(!savedUser){
            return res.status(422).json({message:"Invalid email or password"})
        }
        bcrypt.compare(password,savedUser.password)
        .then(doMatch=>{
            if(doMatch){
                // res.json({message:"SignIn successfull"})
                const token = jwt.sign({_id:savedUser._id},process.env.JWT_SECRET)
                const {_id,email,firstName,lastName,profileImage} = savedUser
                return res.status(200).json({token,user:{_id,email,firstName,lastName,profileImage}})
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
router.get("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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
router.patch("/:id", async (req,res) => {
    // let user = await User.findById(req.params.id);
    // if(user == null){
    //     return res.status(400).json({ message: "User does not exist" });
    // }
    try{
        
        User.findOne({_id: req.params.id}, function(err, user) {
            if(!err){
                if(req.body.firstName && req.body.lastName && req.body.email && req.body.DOB && req.body.phone) {
                    user.firstName = req.body.firstName;
                    user.lastName = req.body.lastName;
                    user.email = req.body.email;
                    user.DOB = req.body.DOB;
                    user.phone = req.body.phone;
                }   

                user.save(function(err) {
                    if(!err) {
                        return res.status(200).json({ message: `User Updated Successfully`})
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

// Cart / Recently Products

/* ------------------------Recently Viewed Products------------------------ */

// Add a product to User's recentProducts list
router.post('/recentProducts/:userId/:productId', async (req, res) => {
    try {
    const {userId, productId} = req.params;
    if(!userId || !productId) {
        return res.status(422).send({message: "Invalid Id(s)"});
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
    let isProductExists = products.find((product) => product._id.toString() === productId);
    if(!isProductExists){
        return res.status(404).send({message: "Product not Found"});
    }

    //All params OK
    
    // let currentProduct =  products.find((product) =>  product._id.toString() === productId);
    // if(!currentProduct){
    //     return res.status(404).send({message: "Product is Null"})
    // }
    User.findOne({_id: userId}, function(err, user) {
        if(err) {
            return res.status(404).send({message: err.message});
        }
        else{
            if(!user) {
                return res.status(404).json({message:"No User found"})
            }
            const products = user.recentlyViewedProducts;
            let flag=1;
            if(products.length !== 0){
                products.forEach(ele => {
                    if(productId.toString() === ele.toString()){
                        flag = 0;
                    }
                });
            }
            if(flag){
                user.recentlyViewedProducts.push(productId);
            }

            user.save(function(err) {
                if(!err) {
                    return res.status(200).json({ message: `Product Successfully Added to Recently Viewed Products`})
                }
                else {
                    console.log(err);
                    return res.status(422).json({ message: "Error Adding Product to Recently Viewed Products"});
                }
            });
        }
    })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// Get a product from User's recentProducts list
router.get('/recentProducts/:userId', async (req, res) => {
    const {userId} = req.params;
    if(!userId) {
        return res.status(404).json({ message: "Invalid User Id"});
    }
    User.findOne({ _id: userId},async function(err, user) {
        if(err) {
            return res.status(404).send({message: "Invalid User Id"});
        }
        else{
            const productIds = user.recentlyViewedProducts;
            const products = [];
            await Promise.all(productIds.map(async (id) => {
                products.push(await Product.findById(id));
            }));
            // console.log(products);
            return res.status(200).json({ recentProducts: products || [] });
        }
    })
});

// Remove a product from User's recentProducts list
router.delete('/recentProducts/:userId/:productId', async (req, res) => {
    let user;
    try {
        user = await User.findById(req.params.userId);
        if (user == null) {
            return res.status(400).json({ message: "User does not exist" });
        }
        res.user = user;
        //await res.user.recentlyViewedProducts.reduce((product) => product._id.toString() == req.params.productId);
        
        const products = user.recentlyViewedProducts;
                
        if(products.length !== 0){
            products.forEach(ele => {
                if(req.params.productId.toString() === ele.toString()){
                    products.remove(ele);
                }
            })
        }
        user.cartProducts = products;

        user.save();

        return res.status(200).json({ message: "Recently viewed product deleted succesfully" });

    } catch (error) {
        return res.status(500).json({ message: "Failed Deleting",error: error.message });
    }
});
/* ------------------------FavouriteBlogs------------------------ */

// Add a blog to User's favouriteBlogs list
router.post('/favouriteBlogs/:userId/:blogId', async (req, res) => {
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
    
    // let currentBlog =  blogs.find((blog) =>  blog._id.toString() === blogId);
    // if(!currentBlog){
    //     return res.status(404).send({message: "Blog is Null"})
    // }
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
            if(blogs.length !== 0){
                blogs.forEach(ele => {
                    if(blogId.toString() === ele.toString()){
                        flag = 0;
                    }
                });
            }
            if(flag){
                user.favouriteBlogs.push(blogId);
            }

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
    })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// Get a blog from User's favouriteBlogs list
router.get('/favouriteBlogs/:userId', async (req, res) => {
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
            // blogIds.forEach(async (id) => {
            //     blogs.push(await Blog.findById(id));
            // });
            await Promise.all(blogIds.map(async (id) => {
                blogs.push(await Blog.findById(id));
            }));

            return res.status(200).json({ favouriteBlogs: blogs || [] });
        }
    })
});
// Remove a blog from User's favouriteBlogs list
router.delete('/favouriteBlogs/:userId/:blogId', async (req, res) => {
    let user;
    try {
        user = await User.findById(req.params.userId);
        if (user == null) {
            return res.status(400).json({ message: "User does not exist" });
        }
        res.user = user;
        //await res.user.favouriteBlogs.reduce((blog) => blog._id.toString() == req.params.blogId);
        
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
router.post('/cartProducts/:userId/:productId', async (req, res) => {
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
    let isProductExists = products.find((product) => product._id.toString() === productId);
    if(!isProductExists){
        return res.status(404).send({message: "Product not Found"});
    }

    //All params OK
    
    // let currentProduct =  products.find((product) =>  product._id.toString() === productId);
    // if(!currentProduct){
    //     return res.status(404).send({message: "Product is Null"})
    // }
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
            if(products.length !== 0){
                console.log(products);
                products.forEach(ele => {
                    if(productId.toString() === ele.productId){
                        flag = 0;
                        quantity = parseInt(ele.quantity);
                        products.remove(ele);
                    }
                })
            }
            if(flag){
                const newProduct = {
                    productId,
                    "quantity" : req.body.quantity,
                }
                user.cartProducts.push(newProduct);
            }
            else{
                const newProduct = {
                    productId,
                    "quantity" : parseInt(req.body.quantity)+quantity,
                }
                products.push(newProduct);
                user.cartProducts = products;
            }
            
            //user.cartProducts.push(currentProduct);

            // user.cartProducts.filter((v,i,a)=>a.findIndex(v2=>(v2._id===v._id))===i)
            // user.cartProducts = user.cartProducts.filter((value, index, self) =>
            // index === self.findIndex((t) => (
            //   t._id.toString() === value._id.toString()
            // ))
            // )
            user.save(function(err) {
                if(!err) {
                    return res.status(200).json({ message: `Product Successfully Added to Cart`})
                }
                else {
                    return res.status(422).json({ message: "Error Adding Product to Cart"});
                }
            });
        }
    })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});
// Get a product from User's cartProducts list
router.get('/cartProducts/:userId', async (req, res) => {
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
        // products.forEach(async (id) => {
        //     products.push(await Product.findById(id));
        // });

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
    // User.findById(userId,  function(err, user) {
    //     if(err) {
    //         return res.status(404).send({message: "Invalid User Id"});
    //     }
    //     else{
    //         if(user.cartProducts == null) {
    //             return res.status(200).json({ cartProducts: []  });
    //         }
    //         return res.status(200).json({ cartProducts: user.cartProducts || []  });
    //     }
    // })
});

// Remove a product from User's cartProducts list
router.delete('/cartProducts/:userId/:productId', async (req, res) => {
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
                        if(productId.toString() === ele.toString()){
                            products.remove(ele);
                        }
                    })
                }
                user.cartProducts = products;
        
                // let newCart = await user.cartProducts.reduce((product) => {
                //     console.log(product._id.toString());
                //     console.log(productId)
                //     return product._id.toString() === productId
                // });
                
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