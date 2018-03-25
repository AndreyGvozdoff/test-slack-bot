require("dotenv").config();
const express = require("express");
const request = require("superagent");
const bodyParser = require("body-parser");
const Mailchimp = require("mailchimp-api-v3");
const PORT = process.env.PORT || 5000;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let apitoken = process.env.mailchimpApiKey,
  //mailchimp_instance = apitoken.split("-")[1],
  list_id = process.env.listUniqueId;

const mailchimp = new Mailchimp(apitoken);

app.get("/", (req, res) => {
  mailchimp
    .get(`/lists/${list_id}/members`)
    .then(function(results) {
      res.send(results);
    })
    .catch(function(err) {
      res.send(err);
    });
});

app.get("/callback-subscribes", (req, res) => {
  mailchimp
    .get("/callback-subscribes")
    .then(function(results) {
      res.send(results);
    })
    .catch(function(err) {
      res.send(err);
    });
});

app.listen(PORT, () => console.log("App listening on " + PORT));
