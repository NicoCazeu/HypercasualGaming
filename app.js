const fs = require("fs");
const express = require("express");
const multer = require("multer");
const OAuth2Data = require("./credentials.json");
var title, description;
var tags = [];

const { google } = require("googleapis");
const { storage } = require('@google-cloud/storage');

// Instantiate a storage client
const storage = new Storage();

const app = express();

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
var authed = false;

// If modifying these scopes, delete token.json.
const SCOPES =
  "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile";

app.set("view engine", "ejs");

/*var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./videos");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});*/

/*var upload = multer({
  storage: Storage,
}).single("file");*/

// Multer is required to process file uploads and make them available via
// req.files.
const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
  },
});

// A bucket is a container for objects (files).
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

app.get("/", (req, res) => {
  if (!authed) {
    // Generate an OAuth URL and redirect there
    var url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log(url);
    res.render("index", { url: url });
  } else {
    var oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    });
    oauth2.userinfo.get(function (err, response) {
      if (err) {
        console.log(err);
      } else {
        console.log(response.data);
        name = response.data.name;
        pic = response.data.picture;
        res.render("success", {
          name: response.data.name,
          pic: response.data.picture,
          success: false,
        });
      }
    });
  }
});

app.post('/upload', uploadMulter.single('file'), (req, res, next) => {
  if (!req.file) {
    res.status(400).send('No file uploaded.');
    return;
  }
  // Create a new blob in the bucket and upload the file data.
  const blob = bucket.file(req.file.originalname);
  const blobStream = blob.createWriteStream();

  blobStream.on('error', err => {
    next(err);
  });

  title = req.body.title;
  description = req.body.description;
  tags = req.body.tags;

  const youtube = google.youtube({ version: "v3", auth: oAuth2Client });

  youtube.videos.insert(
    {
      resource: {
        // Video title and description
        snippet: {
            title:title,
            description:description,
            tags:tags
        },
        // I don't want to spam my subscribers
        status: {
          privacyStatus: "private",
        },
      },
      // This is for the callback function
      part: "snippet,status",

      // Create the readable stream to upload the video
      media: {
        body: fs.createReadStream(req.file.path)
      },
    },
    (err, data) => {
      if(err) throw err
      console.log(data)
      console.log("Done.");
      fs.unlinkSync(req.file.path);
      res.render("success", { name: name, pic: pic, success: true });
    }
  );

  blobStream.on('finish', () => {
    // The public URL can be used to directly access the file via HTTP.
    const publicUrl = format(
      `https://storage.googleapis.com/${bucket.name}/${blob.name}`
    );
    res.status(200).send(publicUrl);
  });

  blobStream.end(req.file.buffer);
});

/*app.post("/upload", upload.single('file'), function(req, res) {

});*/

/*app.post("/upload", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      return res.end("Something went wrong");
    } else {
      console.log(req.file.path);
      title = req.body.title;
      description = req.body.description;
      tags = req.body.tags;
      console.log(title);
      console.log(description);
      console.log(tags);
      const youtube = google.youtube({ version: "v3", auth: oAuth2Client });
      console.log(youtube)
      youtube.videos.insert(
        {
          resource: {
            // Video title and description
            snippet: {
                title:title,
                description:description,
                tags:tags
            },
            // I don't want to spam my subscribers
            status: {
              privacyStatus: "private",
            },
          },
          // This is for the callback function
          part: "snippet,status",

          // Create the readable stream to upload the video
          media: {
            body: fs.createReadStream(req.file.path)
          },
        },
        (err, data) => {
          if(err) throw err
          console.log(data)
          console.log("Done.");
          fs.unlinkSync(req.file.path);
          res.render("success", { name: name, pic: pic, success: true });
        }
      );
    }
  });
});*/

app.get("/logout", (req, res) => {
  authed = false;
  res.redirect("/");
});

app.get("/google/callback", function (req, res) {
  const code = req.query.code;
  if (code) {
    // Get an access token based on our OAuth code
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log("Error authenticating");
        console.log(err);
      } else {
        console.log("Successfully authenticated");
        console.log(tokens);
        oAuth2Client.setCredentials(tokens);

        authed = true;
        res.redirect("/");
      }
    });
  }
});

app.listen(8080, () => {
  console.log("App is listening on Port 8080");
});
