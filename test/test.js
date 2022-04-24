const assert = require("assert");
const chai = require("chai");
const chaiHttp = require("chai-http");
const { describe } = require("mocha");
const server = require("../server");
const should = chai.should();
chai.use(chaiHttp);

describe("Products", function()  {
    // Disable time limit
    this.timeout(0);
    // Get all the Products
    it("Should Fetch all the Products", (done) => {
        chai.request(server)
            .get("/products/")
            .end((err, res) => {
                res.should.have.status(200);
                // console.log ("Got",res.body.data.length, " docs")
                done()
            });
        // setTimeout(done, 3000);
    })

    // Add a single Product
    // it("Should Add a new Product", (done) => {
    //     chai.request(server)
    //         .post("/products/")
    // })

    // Get a single Product
    // it("Should Fetch One Single Product", (done) => {
    //     chai.request(server)
    //         .get("/products/")
    // })

    // Change data to a single Product
    // it("Should Change the data of a Single Product", (done) => {

    // })

    // Delete a Single Product

})
