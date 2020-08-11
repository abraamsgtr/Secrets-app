//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");
const _ = require("lodash");
const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
// const md5 = require("md5");
// const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const port = 3000;
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

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.set("useCreateIndex", true);

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
  secret: {
    type: String,
    validate: {
      validator: function (v) {
        if (_.toString(v).length > 0) {
          return true;
        } else {
          return false;
        }
      },
      message: (props) => "Secret content can not set empty",
    },
  },
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"]
// });

const User = mongoose.model("user", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/auth/google", function (req, res) {
  passport.authenticate("google", { scope: ["profile"] });
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/secrets", function (req, res) {
  // if (req.isAuthenticated()) {
  //   res.render("secrets");
  // } else {
  //   res.redirect("/login");
  // }
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
      res.redirect("/");
    } else {
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      }
    }
  });
});

app.post("/register", function (req, res) {
  const userEmail = String(req.body.username).replace(" ", "");
  const userPassword = req.body.password;
  // bcrypt.hash(userPassword, saltRounds, function (err, hash) {
  //   const newUser = new User({
  //     email: userEmail,
  //     password: hash,
  //   });

  //   User.findOne({
  //       email: userEmail,
  //     },
  //     function (err, doc) {
  //       if (!err) {
  //         if (!doc || doc.length == 0) {
  //           newUser.save();
  //           console.log("user added");
  //           res.render("secrets");
  //         } else {
  //           res.render("login");
  //         }
  //       } else {
  //         console.log(err);
  //       }
  //     }
  //   );
  // });
  User.register({ username: userEmail }, userPassword, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", function (req, res) {
  const userName = String(req.body.username).replace(" ", "");
  const password = req.body.password;

  const user = new User({
    username: userName,
    passwrod: password,
  });

  req.logIn(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local", { failureRedirect: "/login" })(
        req,
        res,
        function () {
          res.redirect("/secrets");
        }
      );
    }
  });

  // User.findOne({
  //     email: userName,
  //   },
  //   function (err, doc) {
  //     if (!err) {
  //       if (doc) {
  //         bcrypt.compare(password, doc.password, function (err, result) {
  //           if (result) {
  //             res.render("secrets");
  //           } else {
  //             res.render("login");
  //           }
  //         });
  //       } else {
  //         res.render("register");
  //       }
  //     } else {
  //       console.log(err);
  //     }
  //   }
  // );
});

app
  .route("/submit")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post(function (req, res) {
    const submittedSecret = _.capitalize(req.body.secret);
    const userId = req.user.id;

    User.findById(userId, function (err, foundUser) {
      if (err) {
        console.log(err);
        res.redirect("/login");
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(function () {
            res.redirect("/secrets");
          });
        }
      }
    });
  });

app.get("/logout", function (req, res) {
  req.logOut();
  res.redirect("/");
});

app.listen(port, function () {
  console.log(`Server started on port ${port}`);
});
