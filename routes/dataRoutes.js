const express = require("express");
const dataController = require("../controllers/dataController");
const router = express.Router();

router
  .route("/")
  .get(dataController.executeQuery)
  .post(dataController.executeQuery);

module.exports = router;
