const assert = require("assert");
const chai = require("chai");
const {expect} = require("chai");
const chaiHttp = require("chai-http");
const { describe } = require("mocha");
const server = require("../server");
const should = chai.should();
chai.use(chaiHttp);

let user_token = "";
describe("User", function()  {
    this.timeout(0);
    it("Sign Up User", (done) => {
        chai.request(server)
            .post("/users/signup")
            .set('content-type', 'application/json')
            .field('Content-Type', 'multipart/form-data')
            .field('email', 'admin@gmail.com')
            .field('password', 'admin@123')
            .field('firstName', 'admin')
            .field('lastName', '123')
            .field('DOB', '2022-04-25')
            .field('phone', 1234567890)
            .attach('file', "./test_profile.jpg")
            .end(function(err, res) {
                // expect(res.status).to.be.oneOf([200, 302]);
                done()
            });
        // setTimeout(done, 3000);
    })
    this.timeout(0);
    it("Sign In User", (done) => {
        chai.request(server)
            .post("/users/signin")
            .set('content-type', 'application/json')
            .send({email: 'admin@gmail.com',password: 'admin@123'})
            .end(function(err, res) {
                if(res.should.have.status(200)){
                    user_token = res.body.token
                    done()
                }
            });
        // setTimeout(done, 3000);
    })
})


describe("Products", function()  {
    // Disable time limit
    this.timeout(0);

    describe("/getProducts", function()  {
        // Get all the Products
        it("Fetch all the Products", (done) => {
            chai.request(server)
                .get("/products/")
                .end((err, res) => {
                    res.should.have.status(200);
                    console.log ("Got",res.body.length, "Products")
                    done()
                });
            // setTimeout(done, 3000);
        })
    })

    // Add a single Product

    this.timeout(0);
    let currentProductId = "626855f69d6b23e93ffa8a0d";
    // describe("/postProduct", function()  {
    //     it("Should Add a new Product", (done) => {
    //         chai.request(server)
    //             .post("/products")
    //             .set('content-type', 'application/json')
    //             .field('Content-Type', 'multipart/form-data')
    //             .field('name', 'Laptop')
    //             .field('price', 1999)
    //             .field('available', 2)
    //             .field('token', user_token)
    //             // .set('Authorization', 'Bearer'+user_token)
    //             .attach('file', path.resolve(__dirname, "../test_product.jpg"))
    //             .end(function(err, res) {
    //                 console.log(err);
    //                 console.log(res.body.data);
    //                 // expect(res.status).to.be.oneOf([200, 302]);
    //                 done()
    //             });
    //         // setTimeout(done, 3000);
    //     })
    // })
    this.timeout(0);
    describe("/getProduct", function()  {
        // Add a single Product
        it("Should Fetch single Product", (done) => {
            chai.request(server)
                .get(`/products/${currentProductId}`)
                .field('Content-Type', 'multipart/form-data')
                .field('token', user_token)
                .end(function(err, res) {
                    res.should.have.status(200);
                    done()
                });
        })
    })
    this.timeout(0);
    describe("/updateProduct", function()  {
        // update a single Product
        it("Should Update single Product", (done) => {
            chai.request(server)
                .patch(`/products/${currentProductId}`)
                .set('content-type', 'application/json')
                .send({token: user_token,price: 2999})
                .end(function(err, res) {
                    res.should.have.status(200);
                    done()
                });
        })
    })


    // Delete a Single Product
    // describe("/deleteProduct", function()  {
    //     // delete a single Product
    //     it("Should Fetch single Product", (done) => {
    //         chai.request(server)
    //             .delete(`/products/${currentProductId}`)
    //             .set('content-type', 'application/json')
    //             .send({token: user_token})
    //             .end(function(err, res) {
    //                 res.should.have.status(200);
    //                 done()
    //             });
    //     })
    // })
})

describe("Blogs", function()  {
    // Disable time limit
    this.timeout(0);

    describe("/getBlogs", function()  {
        // Get all the Blogs
        it("Fetch all the Blogs", (done) => {
            chai.request(server)
                .get("/blogs/")
                .end((err, res) => {
                    res.should.have.status(200);
                    console.log ("Got",res.body.length, "Blogs")
                    done()
                });
            // setTimeout(done, 3000);
        })
    })

    this.timeout(0);
    let currentBlogId = "6268702dd8652c5eca59e10c";
    // describe("/postProduct", function()  {
    //     // Add a single Blog
    //     it("Should Add a new Blog", (done) => {
    //         chai.request(server)
    //             .post("/blogs/")
    //             .set('content-type', 'application/json')
    //             .field('Content-Type', 'multipart/form-data')
    //             .field('name', 'Laptop')
    //             .field('price', 1999)
    //             .field('available', 2)
    //             .field('token', user_token)
    //             .attach('file', './test_product.jpg')
    //             .end(function(err, res) {
    //                 console.log(user_token);
    //                 console.log(res)
    //                 res.should.have.status(200);
    //                 currentBlogId = res.body.blog._id;
    //                 console.log(currentBlogId);
    //                 done()
    //             });
    //     })
    // })
    this.timeout(0);
    describe("/getBlog", function()  {
        // Add a single Blog
        it("Should Fetch single Blog", (done) => {
            chai.request(server)
                .get(`/blogs/${currentBlogId}`)
                .set('content-type', 'application/json')
                .send({token: user_token})
                .end(function(err, res) {
                    res.should.have.status(200);
                    done()
                });
        })
    })
    this.timeout(0);
    describe("/updateBlog", function()  {
        // update a single Blog
        it("Should Update single Blog", (done) => {
            chai.request(server)
                .patch(`/blogs/${currentBlogId}`)
                .set('content-type', 'application/json')
                .send({token: user_token,title: "Macbook For the Less Price"})
                .end(function(err, res) {
                    res.should.have.status(200);
                    done()
                });
        })
    })

    this.timeout(0);
    // Delete a Single Blog
    // describe("/deleteBlog", function()  {
    //     // delete a single Blog
    //     it("Should delete single Blog", (done) => {
    //         chai.request(server)
    //             .delete(`/blogs/${currentBlogId}`)
    //             .set('content-type', 'application/json')
    //             .send({token: user_token})
    //             .end(function(err, res) {
    //                 res.should.have.status(200);
    //                 done()
    //             });
    //     })
    // })
})
