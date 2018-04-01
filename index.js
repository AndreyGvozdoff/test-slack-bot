require("dotenv").config();
const express = require("express");
const path = require("path");
const request = require("superagent");
const bodyParser = require("body-parser");
const Mailchimp = require("mailchimp-api-v3");
const slack = require("slack");
const PORT = process.env.PORT || 5000;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const token = process.env.slackToken,
  channel = process.env.slackChannel;

const apitoken = process.env.mailchimpApiKey,
  list_id = process.env.listUniqueId;

const mailchimp = new Mailchimp(apitoken);

app.get("/", (req, res) => {
  mailchimp
    //.get(`/lists/${list_id}/members`)
    .get("/lists")
    .then(function(results) {
      res.send(results);

      // res.render("pages/index", {
      //   listsId: results
      // });
    })
    .catch(function(err) {
      res.send(err);
    });
});

app.post("/callback-subscribes", (req, res) => {
  let text = req.body;
  slack.chat
    .postMessage({ token: token, channel: channel, text: text })
    .then(console.log)
    .catch(console.log);
  console.log(req.body);
});

app.listen(PORT, () => console.log("App listening on " + PORT));
