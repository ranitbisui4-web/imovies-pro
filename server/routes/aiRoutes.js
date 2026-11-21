const express = require("express");
const router = express.Router();
const { handleAICommand } = require("../controllers/aiController");

router.post("/command", handleAICommand);

module.exports = router;
