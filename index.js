require("dotenv").config();
const express = require("express");
const app = express();
const _ = require("lodash");

const port = process.env.port || 5000;

app.get("/", function(req, res) {
  res.send("Test");
  res.send(process.env.mailchimpInstance);
});

app.listen(port, function() {
  console.log("App listening on " + port);
});
