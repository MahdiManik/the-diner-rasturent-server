const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 7000;
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("The diner running");
});

app.listen(port, () => {
  console.log(`The diner running on port ${port}`);
});
