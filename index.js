let orderCount = 0;

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 7000;
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.rg5wc51.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  //  console.log("token value in middleware", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      //  console.log(err);
      return res.status(401).send({ message: "not authorized" });
    }
    //console.log("decoded token value", decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    //await client.connect();

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
      //  console.log(query);
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.post("/my-order", async (req, res) => {
      const order = req.body;
      if (order.orderCount >= 0) {
        orderCount++;
        order.orderCount = orderCount;
      }
      if (order.quantity > 0) {
        order.quantity--;
        console.log("quantity", order.quantity);
      }
      const result = await myOrderCollection.insertOne(order);

      res.send(result);
    });

    app.get("/my-order", async (req, res) => {
      const cursor = myOrderCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/my-order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myOrderCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/my-order/:foodId", async (req, res) => {
      const foodId = req.params.foodId;
      const filter = { foodId: parseInt(foodId) };

      try {
        const data = await myOrderCollection.findOne(filter);

        if (!data) {
          res.status(404).send("No orders found for this food item.");
          return;
        }
        const queryObj = {};
        const sortObj = {};
        const orderCount = req.query.orderCount;
        const sortField = req.query.sortField;
        const sortOrder = req.query.sortOrder;

        if (orderCount) {
          queryObj.orderCount = orderCount;
        }

        if (sortField && sortOrder) {
          sortObj[sortField] = sortOrder === "asc" ? 1 : -1;
        }

        const cursor = myOrderCollection
          .find({ foodId: parseInt(foodId), ...queryObj })
          .sort(sortObj);
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.post("/jwt", (req, res) => {
      const user = req.body;
      //  console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      console.log(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.get("/my-order", verifyToken, async (req, res) => {
      //  console.log("req.query.email", req.query.email);
      //  console.log("user in the valid token", req.user);
      if (req.query?.email !== req.user?.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await myOrderCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/logout", (req, res) => {
      const user = req.body;
      //  console.log("logout user", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //await client.db("admin").command({ ping: 1 });
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
