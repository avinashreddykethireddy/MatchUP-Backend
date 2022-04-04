const express = require("express");
const mongoose = require("mongoose");
const routes = require("./routes");
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeApp } = require("firebase/app");
const { getAnalytics } = require("firebase/analytics");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

/* global process */
mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("database connection establised"));
// Swagger
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());

app.use("/", routes);


app.listen(5000, () => {
    console.log("The application has been started at http://localhost:5000");
});
