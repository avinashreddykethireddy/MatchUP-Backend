const express = require("express");
const mongoose = require("mongoose");
const routes = require("./routes");
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeApp } = require("firebase/app");
const { getAnalytics } = require("firebase/analytics");
const morgan = require('morgan');
const fsr = require('file-stream-rotator');
const fs = require('fs');
const path = require('path');

require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

/* Morgan */

// let logsinfo = fsr.getStream({filename:'./matchup-logs/logs.log', frequency:"1h",verbose: true, date_format: "YYYY-MM-DD",}); 

// /* app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {stream: logsinfo})) */
// app.use(morgan('combined', {stream: logsinfo}))

/* Morgan new */
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'matchup-logs','logs.log'), { flags: 'a' })
app.use(morgan(':method :url :status :date[iso] :response-time ms', { stream: accessLogStream}));
app.use(morgan(':method :url :status :date[iso] :response-time ms'));


/* ODM mongoose */
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

// routes
app.use("/", routes);

  app.use(express.static('./build'))
  console.log(__dirname)
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
  })
const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => {
    console.log(`The application has been started at ${PORT}`);
    console.log("Hello World");
});

module.exports = app;
