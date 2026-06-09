const express = require("express");
const { Ship, Voyage } = require("../models");

const router = express.Router();

// Public endpoint: all users can view the voyage list.
router.get("/", async (req, res) => {
  try {
    const voyages = await Voyage.findAll({
      include: [
        {
          model: Ship,
          attributes: ["id", "shipName", "imoNumber", "flag", "status"],
        },
      ],
      order: [
        ["departureDate", "DESC"],
        ["id", "DESC"],
      ],
    });

    res.json(voyages);
  } catch (error) {
    console.error("Error fetching voyages:", error);
    res.status(500).json({ message: "Unable to fetch voyage list." });
  }
});

module.exports = router;
