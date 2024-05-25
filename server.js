const express = require("express");
const app = express();
require("dotenv").config();
const config = require("./src/config/config");
const { connection } = require("./src/connection/connection");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-documentation.json');
const App = require("./src/helper/app.helper");
const session = require('express-session');

async function startServer() {
  app.use(cors({ origin: "*" }));
  app.use(morgan("dev"));
  app.use(session({
    secret: config.jwtSecret,
    resave: false,
    saveUninitialized: true
  }));


  app.use((req, res, next) => {
    if (req.originalUrl === '/api/v1/payment/webhook') {
      app.use(bodyParser.urlencoded({ extended: false }));
      app.use(bodyParser.raw({ type: "*/*" }));
      app.use(bodyParser.json())

      next();
    } else {
      app.use(express.json());
      // app.use(bodyParser.json({ limit: "250mb" }));
      // app.use(bodyParser.urlencoded({ limit: "250mb", extended: true, parameterLimit: 250000 }));
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({ extended: false }));
      bodyParser.json()(req, res, next);
    }
  });

  // connection
  await connection();

  await App.init()

  // home api
  app.get("/", (req, res) => {
    res.json({ message: "care-dac backend" });
  });

  app.get('/get_data', (req, res) => {
    const { name, mobile, email } = req.session;
    // Return the stored data as JSON
    res.json({ name, mobile, email });
  });

  // Routes
  const apiRouter = require("./src/routes/index.routes");

  // api initial path
  app.use("/api/v1/", apiRouter);

  // Swagger Documentation Path
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Server listening
  app.listen(config.port, "0.0.0.0", () => {
    console.log(
      `Server listening on the port no http://localhost:${config.port}`
    );
  });
}

startServer();