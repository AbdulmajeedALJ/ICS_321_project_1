const express = require("express");
const firstController = require("../controllers/firstController");
const router = express.Router();

router.get("/", firstController.firstFunction);
router.get("/courses", firstController.getCourses);
router.get("/horses", firstController.getHorses);
router.get("/owners", firstController.getOwners);
router.get("/owns", firstController.getOwns);
router.get("/stables", firstController.getStables);
router.get("/trainers", firstController.getTrainers);
router.get("/races", firstController.getRaces);
router.get("/race-results", firstController.getRaceResults);
router.get("/tracks", firstController.getTracks);
module.exports = router;
