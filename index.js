require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const request = require("superagent");
const querystring = require("querystring");
const dataStore = require("./dataStore");
const _ = require("lodash");

const port = process.env.port || 4000;

const Botkit = require("botkit");

app.use(express.static("views"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function(req, res) {
  res.send("Test");
  res.send(process.env.mailchimpInstance);
});

app.listen(port, function() {
  console.log("App listening on " + port);
});
