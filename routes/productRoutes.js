const { Router } = require("express");
const Product = require("../models/Product");
const User = require('../models/User');
const { getProduct } = require("../middleware/getProducts");
const multer = require('multer');
const router = Router();
const DIR = './uploads';
const fs = require('fs');
const path = require('path');

// firebase
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const uuid = require('uuid-v4');

//Auth
const auth = require("../middleware/auth");

//Redis
// const client = require("../models/redis");

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

async function getProducts() {
    // const allProd = await client.get("allProducts", async (err,data) => {
    //     if(err){
    //         console.log(err);
    //         throw err;
    //     }
    //     if(data){
    //         console.log("Data fetched from redis!");
    //         return JSON.parse(data);
    //     }
    // });
    const products = await Product.find();
    return products;

    // if(allProd == null){
    //     const products = await Product.find();
    //     await client.setEx("allProducts", 20, JSON.stringify(products), (err, status) => {
    //         if (err) throw err;
    //         console.log(status); // true
    //         return status;
    //     });
    //     console.log("Data fetched from database");
    //     return products;
    // } else {
    //     console.log("Data fetched from redis!");
    //     return JSON.parse(allProd);
    // }
} 

//redis server running
router.get("/", async (req, res) => {
    try {
        // const cc = await client.get("hello1" , (err, status) => {
        //     if(err){
        //         console.log(err);
        //     }
        //     else{
        //         console.log(status);
        //     }
        // });
        // console.log("dww ", cc);

        // await client.setEx("hello1",20,"world", function (err, status) {
        //     if (err) throw err;
        //     console.log(status); // true
        //     return status;
        //   });
        // console.log(await client.get("hello"));
        return res.status(200).send(await getProducts());

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

//Get all products by pageNo
router.get("/:pageNo", async (req, res) => {
    try {
        // Send Products with in range
        const pageNo = req.params.pageNo;
        const pageSize = 8;
        const totalProducts = await Product.count();

        const products = await Product.find().skip(parseInt((pageNo-1)*pageSize)).limit(parseInt(pageSize));
        const Pagination = {
            currentPage: pageNo,
            pageSize: pageSize,
            totalProducts: totalProducts,
            totalPages: Math.ceil(totalProducts/pageSize)
        }
        res.status(200).json({products: products, Pagination});

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a Product
router.post("/",auth, upload.single('file') ,async (req, res) => {

    try {

        const sellerUserId = req.userId
        console.log(sellerUserId)

        if(!req.body.name || req.body.price <= 0  || !req.body.available) {
            return res.status(422).json({message: "Please Enter All Fields!"});
        }
        if(! (req.body.available > 0)) {
            return res.status(422).json({message: "Available should be greater than zero"})
        }

        // Check whether the seller is present in User Collection
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
        let coverLink;
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
                coverLink = ("https://storage.googleapis.com/matchup-444.appspot.com/" + req.file.filename);
            })
        
        console.log(`${filename} uploaded.`);
        
        }
        
        await uploadFile()
        .catch((err) => {
        console.log(err)
        });

        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            sellerUserId : sellerUserId,
            cover : coverLink,
            available: req.body.available
        });
        // Save new product
        try {
            // delete key allProducts 
            // await client.del("allProducts", (err, reply) => {
            //     if(err){
            //         console.log(err);
            //         //throw err;
            //     }
            //     console.log("Redis reply",reply);
            // });

            const newProduct = await product.save();
            return res.status(200).json({message : "Successfully saved product",product : newProduct});
        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: "Error Adding new Product",error : error.message });
        }
                
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// Get a single Product
router.get("/:id", auth,getProduct, async (req, res) => {
    return res.status(200).json(res.product);
});

// Update the product
router.patch("/:id",auth, async (req, res) => {
    if(req.body.name == null && req.body.price == null){
        return res.status(422).json({message: "Please Enter atleast one field"});
    }
    try {
        Product.findOne({_id: req.params.id}, function(err, product) {
            if(!err) {
                if(!product) {
                    return res.status(404).json({message:"No Product found"})
                }
                if(req.body.name) {
                    product.name = req.body.name;
                }
                if(req.body.price) {
                    product.price = req.body.price;
                }
                product.save(async function(err) {
                    if(!err) {
                        // delete key allProducts 
                        // await client.del("allProducts", (err, reply) => {
                        //     if(err){
                        //         console.log(err);
                        //         throw err;
                        //     }
                        //     console.log("Redis reply",reply);
                        // });

                        return res.status(200).json({ message: `Product Updated Successfully`})
                    }
                    else {
                        return res.status(422).json({ message: "Error updating product"});
                    }
                });
            }
        });
        
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// Delete the product
router.delete("/:id",auth, async (req, res) => {
    let product;
    try {
        product = await Product.findById(req.params.id);
        if (product == null) {
            return res.status(400).json({ message: "Product does not exist" });
        }
        res.product = product;
        await res.product.remove();
        
        // // delete key allProducts 
        // await client.del("allProducts", (err, reply) => {
        //     if(err){
        //         console.log(err);
        //         throw err;
        //     }
        //     console.log("Redis reply",reply);
        // });
        return res.status(200).json({ message: "Product deleted succesfully" });

    } catch (error) {
        return res.status(500).json({ message: "Failed Deleting Product",error: error.message });
    }
});

module.exports = router;