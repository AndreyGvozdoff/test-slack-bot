require("dotenv").config();
const express = require("express");
const request = require("superagent");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let apitoken = process.env.mailchimpApiKey,
  mailchimpInstance = apitoken.split("-")[1],
  listUniqueId = process.env.listUniqueId;

app.post("/", function(req, res) {
  request
    .post(
      "https://" +
        mailchimpInstance +
        ".api.mailchimp.com/3.0/lists/" +
        listUniqueId +
        "/members/"
    )
    .set("Content-Type", "application/json;charset=utf-8")
    .set(
      "Authorization",
      "Basic " + new Buffer("any:" + mailchimpApiKey).toString("base64")
    )
    .send({
      email_address: req.body.email,
      status: "subscribed",
      merge_fields: {
        FNAME: req.body.firstName,
        LNAME: req.body.lastName
      }
    })
    .end(function(err, response) {
      if (
        response.status < 300 ||
        (response.status === 400 && response.body.title === "Member Exists")
      ) {
        res.send("Signed Up!");
      } else {
        res.send("Sign Up Failed :(");
      }
    });
});

//app.get("/", (req, res) => res.send(process.env.app));

app.get("/callback-subscribes", (req, res) => res.send());

app.listen(PORT, () => console.log("App listening on " + PORT));
