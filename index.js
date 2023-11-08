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
    await client.connect();

    const foodCollection = client.db("theDiner").collection("foods");
    const myOrderCollection = client.db("theDiner").collection("order");
    const addFoodCollection = client.db("theDiner").collection("addFood");
    const userCollection = client.db("theDiner").collection("users");

    // user create
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log("Check user", user);
      const result = await userCollection.insertOne(user);
      console.log(result);
      res.send(result);
    });

    //user get for all need use a user
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // showing specific food details
    app.get("/foods/:foodId", async (req, res) => {
      const id = req.params.foodId;
      const query = { foodId: parseInt(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    //update quantity and orderCount
    app.patch("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedCount = req.body.orderCount;
      const updatedQuantity = req.body.quantity;
      const updatedDoc = {
        $set: {
          orderCount: updatedCount,
          quantity: updatedQuantity,
        },
      };
      const result = await foodCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //  order product stored on mongodb
    app.post("/my-order", async (req, res) => {
      const order = req.body;
      const result = await myOrderCollection.insertOne(order);
      res.send(result);
    });

    //delete my order food
    app.delete("/my-order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myOrderCollection.deleteOne(query);
      res.send(result);
    });

    // pagination and sort for quantity and Count
    app.get("/foods", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      let queryObj = {};
      let sortObj = {};
      const category = req.query.category;
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder;
      if (category) {
        queryObj.category = category;
      }
      if (sortField && sortOrder) {
        sortObj[sortField] = sortOrder;
      }
      const result = await foodCollection
        .find(queryObj)
        .sort(sortObj)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    //pagination count
    app.get("/foodsCount", async (req, res) => {
      const count = await foodCollection.estimatedDocumentCount();
      res.send({ count });
    });

    //jwt token create
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      //  console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // in my order page verify token
    app.get("/my-order", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      console.log(query);
      const result = await myOrderCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/logout", (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // add a food
    app.post("/add-food", async (req, res) => {
      const add = req.body;
      const result = await addFoodCollection.insertOne(add);
      res.send(result);
    });

    app.get("/add-food", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      console.log(query);
      const result = await addFoodCollection.find(query).toArray();
      res.send(result);
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
