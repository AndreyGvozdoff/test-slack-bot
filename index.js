require("dotenv").config();
const express = require("express");
const Mailchimp = require("mailchimp-api-v3");
const slack = require("slack");
const PORT = process.env.PORT || 5000;
const app = express();

const token = process.env.slackToken,
  channel = process.env.slackChannel;

const apitoken = process.env.mailchimpApiKey,
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

app.post("/callback-subscribes", (req, res) => {
  let text = req.body;
  slack.chat
    .postMessage({ token: token, channel: channel, text: text })
    .then(console.log)
    .catch(console.log);
  console.log(req.body);
});

app.listen(PORT, () => console.log("App listening on " + PORT));
