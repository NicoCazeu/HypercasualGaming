const fs = require("fs");
const express = require("express");
const Multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const OAuth2Data = require("./credentials.json");
var title, description;
var tags = [];

const { google } = require("googleapis");
const storage = new Storage({projectId: "hypercasual-gaming-youtube", credentials: {client_email: "hypercasual-gaming-youtube@appspot.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCei93oCWxzBXhi\nPE8JqSYUvGvNumHHM1BEIRZHZUHRTJFYcmFy+N0fI1eJmjlqxD7qWS5O+wJ7I/i2\nAOhud9q01JmmpwrQfqTxvZ2/6vTZhW0nR7XhgA7caIv9IyqU/qsSbySoRxwAsSqy\nUkjKhVbCCfOQzkaUCHbrzDShkxtR5Lvuz3J7OEKCTdA4afBiA2OtH5vSPjWhpAzu\nMB1P4EKZ4MeVCMH19mH8rO8lzlLAfIeW9/QfFMTnT7wdeGBZ9HPahCStxcK2sYN3\nUTLzYWZDpbc2ZSfVRVGNKKHTyWB4zgj3V1uDl1AB5qMYNZDhuB9WmhuPPB03WW//\nRjo51uD1AgMBAAECggEABphzncsukMZh0KxeRAeeXER5CPDqT7rJvwZ6rR5Vk5sS\nJ3zH+FwepBn4nUfQ1akzo39xlrrdyo5KMsAXlejfLKCfgmL2kd/YMBpJmAnyhPiw\n/BkBRE/rI64nDLEhfLCaIJqGYDMSbiZF9sRyNMKWmQcy87YxEh1xXQknXgVcS0Fz\nlM2WNOHgZs6tmgR/+L/vwCl7dh3ZW9iTxuhuRM1FYCeoxK5VelXrWRoLUqKPnqZy\nccwFWG82ohjCSZRFPPO0DFxAmYbpVTdL453Iq2Lm3/w21prx7jJtxtD1qm6yhoce\nh8jSu/roSOdHwJLd4N2ABzshdVRmaaXC/VeBlLenoQKBgQDVGPK89UO67rJp6zaf\nqK4jW5sydF2ncEgx4ewpefs49TD/zw51w+7DnVj++Y2ZnywmTZNVwEoqzB4rB/R7\nFAsy0OnfdA/03oOWoDyRaXyVfY2QEfUFZwdU/fkgmscYr+OXoPALMni3yu6A+fUq\nNqrHRSJhz/m7xtE1fKiadKT9PQKBgQC+d1pITlPvhWu5HiXDefW1fsEzGXVPNxe4\nao1FYXDGJwvnCoOwMpZP7vTfXR9ddwGXAVwvhtV05KH9iXWb2r8f6p5345aMgpQL\nzcCwk+stFk6Zfzo3q3Y8CxgsLQy1B+SNjCysCxrAS8sIDytrS11jJGucSD1tnFXW\nv5qAWxEeGQKBgQCl3K9CyBwZqaSQsJVpm98+ghTAJramlsx6lwA8IEebw6yJz13P\n59s1woj8nLzML4orngHpoquXuBxbHev6yFUXDmialjm9PFxrpvi9rb9ck8bVtkRi\nGhko3C1GZXJGEtEwugFclcJEO9174hIi8z3lsDfcrgYRU+SOnyKUZenteQKBgQCl\ngedVD6OGbqT2Hsln/LHT/gp6kfPLWy9klEqgcJTjy4hfQ1a9pKfTW+0zr6MSv9gE\n1Sy7K+qPAiH1xB4LyeDtJh6ARadMACgPvcJkbpUc/9ZbMiBvwbIjaOyfbqItKWek\nzJsBAUFEulf6b9wmBz5maX6NNoUSm5hH3QWv5fKQ+QKBgQDEYJ6LsPkLLLIhZL0a\nV6cXOxnePfAiGcbTahwfqaYZ71z5AwFTtJLsTtKZFB4zzmQDFX+JisX1QNF69qf/\nc26l2opSgOqtIv1bHmR2UaB5lu1Wyn3OWoVe3vZayq89leU0WytjGfGosAbioX6L\nhqTe1Zq0WUeS6AmaodfVGY9cpw==\n-----END PRIVATE KEY-----\n"}});
//const storage = new Storage({projectId: process.env.GCLOUD_PROJECT, credentials: {client_email: process.env.GCLOUD_CLIENT_EMAIL, private_key: process.env.GCLOUD_PRIVATE_KEY}});
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

//const bucket = storage.bucket(process.env.GCS_BUCKET);
const bucket = storage.bucket("youtube-uploader-bucket");

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
}).single("file"); //Field name and max count*/

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

app.post("/upload", multer.single("file"), (req, res) => {
  const blob = bucket.file(req.file.originalname);
  const blobStream = blob.createWriteStream();

  title = req.body.title;
  description = req.body.description;
  tags = req.body.tags;

  blobStream.on("error", err => console.log(err));

  blobStream.on("finish", () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

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
          body: blob.createReadStream()
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

    //res.status(200).send(publicUrl);
  })

  blobStream.end(req.file.buffer);
});

app.post("/upload", (req, res) => {
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
});

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
