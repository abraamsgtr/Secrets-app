//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");
const _ = require("lodash");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
// const md5 = require("md5");
// const encrypt = require("mongoose-encryption");

const port = 4000;
const app = express();

//app.set("", path.join(__dirname, "views/partials"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public/views"));

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    validate: {
      validator: function (v) {
        if (_.toString(v).includes("@") && _.toString(v).includes(".")) {
          return true;
        } else {
          return false;
        }
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },
  password: {
    type: String,
    validate: {
      validator: function (v) {
        if (_.toString(v).length > 6) {
          return true;
        } else {
          return false;
        }
      },
      message: (props) => `password must be at least 6 characters`,
    },
  },
});

// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"]
// });

const User = mongoose.model("user", userSchema);

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", function (req, res) {
  const userEmail = String(req.body.username).replace(" ", "");
  const userPassword = req.body.password;
  bcrypt.hash(userPassword, saltRounds, function (err, hash) {
    const newUser = new User({
      email: userEmail,
      password: hash,
    });

    User.findOne({
        email: userEmail,
      },
      function (err, doc) {
        if (!err) {
          if (!doc || doc.length == 0) {
            newUser.save();
            console.log("user added");
            res.render("secrets");
          } else {
            res.render("login");
          }
        } else {
          console.log(err);
        }
      }
    );
  });

});

app.post("/login", function (req, res) {
  const userName = String(req.body.username).replace(" ", "");
  const password = req.body.password;

  User.findOne({
      email: userName,
    },
    function (err, doc) {
      if (!err) {
        if (doc) {
          bcrypt.compare(password, doc.password, function (err, result) {
            if (result) {
              res.render("secrets");
            } else {
              res.render("login");
            }
          });
        } else {
          res.render("register");
        }
      } else {
        console.log(err);
      }
    }
  );
});

app.listen(port, function () {
  console.log(`Server started on port ${port}`);
});