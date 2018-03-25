//require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");

const port = process.env.port || 5000;

app.get("/", function(req, res) {
  res.send("Test");
  //res.send(process.env.mailchimpInstance);
});

app.listen(port, () => console.log("App listening on " + port));
