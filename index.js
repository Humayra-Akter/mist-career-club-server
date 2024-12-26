const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://mist-career-club:4geqyc4fdoGkadAf@cluster0.guksi.mongodb.net/mist-career-club?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);



async function run() {
  try {
    //await client.connect();
    const userCollection = client.db("mist-career-club").collection("user");

 

    // user post
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      if (result.insertedCount === 1) {
        res.status(201).json({ message: "User added successfully" });
      } else {
        res.status(500).json({ message: "Failed to add user" });
      }
    });

   

    // bookings
    app.get("/bookings", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const bookings = await cursor.toArray();
      res.send(bookings);
    });


    // maidSearchPost
    app.get("/maidSearchPost", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const bookings = await cursor.toArray();
      res.send(bookings);
    });

    //user get
    app.get("/user", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });

  
    //route get
    app.get("/", async (req, res) => {
      res.send("Hello from mist-career-club");
    });
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`server running on ${port}`);
});
