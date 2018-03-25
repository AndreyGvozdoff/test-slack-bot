require("dotenv").config();
const express = require("express");
const PORT = process.env.PORT || 5000;
const app = express();

app.get("/", (req, res) => res.send(process.env.app));

app.get("/callback-subscribes", (req, res) => res.send());

app.listen(PORT, () => console.log("App listening on " + PORT));
