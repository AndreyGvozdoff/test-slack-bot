const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const app = express();

app.get("/", function(req, res) {
  res.send("Test");
  //res.send(process.env.mailchimpInstance);
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
