require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const request = require("superagent");
const querystring = require("querystring");
const dataStore = require("./dataStore");
const port = process.env.port || 4000;

app.use(express.static("views"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function(req, res) {
  res.send("Test");
  res.send(process.env.mailchimpInstance);
});

app.post("/signup", function(req, res) {
  request
    .post(
      "https://" +
        process.env.mailchimpInstance +
        ".api.mailchimp.com/3.0/lists/" +
        process.env.listUniqueId +
        "/members/"
    )
    .set("Content-Type", "application/json;charset=utf-8")
    .set(
      "Authorization",
      "Basic " +
        new Buffer("any:" + process.env.mailchimpApiKey).toString("base64")
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

app.get("/mailchimp/auth/authorize", function(req, res) {
  res.redirect(
    "https://login.mailchimp.com/oauth2/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: process.env.mailchimpClientId,
        redirect_uri: "http://127.0.0.1:3000/mailchimp/auth/callback"
      })
  );
});

app.get("/mailchimp/auth/callback", function(req, res) {
  request
    .post("https://login.mailchimp.com/oauth2/token")
    .send(
      querystring.stringify({
        grant_type: "authorization_code",
        client_id: process.env.mailchimpClientId,
        client_secret: process.env.mailchimpSecretKey,
        redirect_uri: "http://127.0.0.1:3000/mailchimp/auth/callback",
        code: req.query.code
      })
    )
    .end((err, result) => {
      if (err) {
        res.send(
          "An unexpected error occured while trying to perform MailChimp oAuth"
        );
      } else {
        // we need to get the metadata for the user
        request
          .get("https://login.mailchimp.com/oauth2/metadata")
          .set("Accept", "application/json")
          .set("Authorization", "OAuth " + result.body.access_token)
          .end((err, metaResult) => {
            if (err) {
              res.send(
                "An unexpected error occured while trying to get MailChimp meta oAuth"
              );
            } else {
              // save the result.body.access_token
              // save the metadata in metaResult.body
              // against the current user
              var mailchimpConf = metaResult;
              mailchimpConf.access_token = result.body.access_token;
              dataStore.saveMailChimpForUser(
                mailchimpConf.login.email,
                metaResult
              );
              res.redirect(
                "/pick-a-list.html?email=" + mailchimpConf.login.email
              );
            }
          });
      }
    });
});

app.get("/mailchimp/lists", function(req, res) {
  var mailchimpConf = dataStore.getMailChimpForUser(req.query.email);
  request
    .get(mailchimpConf.api_endpoint + "/3.0/lists")
    .set("Accept", "application/json")
    .set("Authorization", "OAuth " + mailchimpConf.access_token)
    .end((err, result) => {
      if (err) {
        res.status(500).json(err);
      } else {
        res.json(result.body.lists);
      }
    });
});

app.get("/mailchimp/list/members/:id", function(req, res) {
  var mailchimpConf = dataStore.getMailChimpForUser(req.query.email);
  request
    .get(
      mailchimpConf.api_endpoint + "/3.0/lists/" + req.params.id + "/members"
    )
    .set("Accept", "application/json")
    .set("Authorization", "OAuth " + mailchimpConf.access_token)
    .end((err, result) => {
      if (err) {
        res.status(500).json(err);
      } else {
        res.json(result.body.members);
      }
    });
  request
    .patch(
      mailchimpConf.api_endpoint +
        "/3.0/lists/" +
        req.params.id +
        "/members/" +
        req.params.memberId
    )
    .set("Accept", "application/json")
    .set("Authorization", "OAuth " + mailchimpConf.access_token)
    .send({ merge_fields: { FNAME: "new", LNAME: "name" } })
    .end(function(err, response) {
      if (
        response.status < 300 ||
        (response.status === 400 && response.body.title === "Member Exists")
      ) {
        res.send("Sync with status Success");
      } else {
        res.send("Sync with status Failed :(");
      }
    });
});

app.listen(port, function() {
  console.log("App listening on" + port);
});
