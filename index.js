const express = require("express");
const PORT = process.env.PORT || 5000;
const app = express();

app.get("/", function(req, res) {
  // res.send("Test");
  res.send(process.env.mailchimpInstance);
});

app.get("/callback-subscribes", (req, res) => res.send());

app.listen(PORT, () => console.log("App listening on " + PORT));
