let orderCount = 0;

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 7000;
require("dotenv").config();

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.rg5wc51.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const foodCollection = client.db("theDiner").collection("foods");
    const myOrderCollection = client.db("theDiner").collection("order");

    app.get("/foods", async (req, res) => {
      const cursor = foodCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/foods/:foodId", async (req, res) => {
      const id = req.params.foodId;

      const query = { foodId: parseInt(id) };
      console.log(query);
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.post("/my-order", async (req, res) => {
      const order = req.body;
      //  const count = order.orderCount;
      if (order.orderCount >= 0) {
        orderCount++;
        order.orderCount = orderCount;
        console.log(order.orderCount);
      }
      const result = await myOrderCollection.insertOne(order);

      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    //  await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The diner running");
});

app.listen(port, () => {
  console.log(`The diner running on port ${port}`);
});
