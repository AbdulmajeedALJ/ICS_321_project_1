const express = require("express");
const dataController = require("../controllers/dataController");
const router = express.Router();

router.get("/", dataController.executeQuery);
router.get("/horses", dataController.listHorses);
router.get("/owners", dataController.listOwners);
router.get("/owns", dataController.listOwnerships);
router.get("/stables", dataController.listStables);
router.get("/trainers", dataController.listTrainers);
router.get("/races", dataController.listRaces);
router.get("/race-results", dataController.listRaceResults);
router.get("/tracks", dataController.listTracks);
module.exports = router;
