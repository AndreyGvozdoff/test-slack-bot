require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const request = require("superagent");
const querystring = require("querystring");
const dataStore = require("./dataStore");
const _ = require("lodash");
const Promise = require("bluebird");
Promise.longStackTraces();
const rp = require("request-promise");
const crypto = require("crypto");

const bunyan = require("bunyan");
const logging = bunyan.createLogger({ name: process.env.app });
const port = process.env.port || 4000;

const Botkit = require("botkit");

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

logging.info("(Node " + process.version + ") started");

var apitoken = process.env.mailchimpApiKey;
var dc = apitoken.split("-")[1];

var q = function(url) {
  return {
    uri: "https://foo:" + apitoken + "@" + dc + ".api.mailchimp.com/3.0/" + url,
    json: true
  };
};

function fetchUserInfo(email, listName) {
  return rp(q("lists"))
    .then(function(response) {
      return _.filter(response.lists, function(list) {
        return list.name + " Recipients" === listName;
      });
    })
    .then(function(lists) {
      if (lists.length !== 1) {
        return;
      }
      var list = lists[0];
      return rp(
        q(
          "lists/" +
            list.id +
            "/members/" +
            crypto
              .createHash("md5")
              .update(email)
              .digest("hex")
        )
      );
      logging.info(list.id);
    })
    .catch(function(err) {
      logging.error("Failed fetch user info", { err: err });
    });
}

var controller = Botkit.slackbot();
var bot = controller.spawn({
  token: process.env.slackToken
});
bot.startRTM(function(err) {
  if (err) {
    throw new Error("Could not connect to Slack");
  }
});

controller.on("bot_message", function(bot, message) {
  logging.info("message", message);
  var match = message.text.match(
    /^<mailto:([^@]+@[^|]+)\|[^@]+@[^>]+> subscribed to <[^|]+\|([^>]+)>$/
  );
  if (!match) {
    return;
  }
  fetchUserInfo(match[1], match[2]).then(function(member) {
    if (!member) {
      logging.error("Failed to fetch member info for", match);
      return;
    }
    rp
      .post({
        uri: "https://slack.com/api/chat.postMessage",
        qs: {
          token: process.env.slackToken,
          channel: message.channel,
          username: process.env.app,
          icon_url:
            "https://slack.global.ssl.fastly.net/12b5a/plugins/mailchimp/assets/service_36.png",
          text:
            "The new member is <mailto:" +
            match[1] +
            "|" +
            member.merge_fields.NAME +
            ">"
        }
      })
      .catch(function(err) {
        logging.error("Failed to post message", err);
      });
  });
});

app.listen(port, function() {
  console.log("App listening on " + port);
});
