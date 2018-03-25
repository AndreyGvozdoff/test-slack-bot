const express = require("express");
const PORT = process.env.PORT || 5000;
const app = express();

app.get("/", (req, res) => res.send(process.env.app));

app.get("/callback-subscribes", function(req, res) {
  console.log(JSON.stringify(res));
  res.send(res);
});

app.listen(PORT, () => console.log("App listening on " + PORT));
