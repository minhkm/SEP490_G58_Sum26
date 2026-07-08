const express = require("express");
const { Op } = require("sequelize");
const { Notification, Voyage, Ship, User } = require("../models");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const whereClause = { recipientUserId: req.user.id };

    if (req.query.unreadOnly === "true") {
      whereClause.isRead = false;
    }

    if (req.query.type) {
      whereClause.type = req.query.type;
    }

    const notifications = await Notification.findAll({
      where: whereClause,
      include: [
        {
          model: Voyage,
          attributes: ["id", "departurePort", "destinationPort", "departureDate", "arrivalDate", "status"],
          include: [{ model: Ship, attributes: ["id", "shipName", "imoNumber"] }],
        },
        {
          model: User,
          as: "Actor",
          attributes: ["id", "username", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
    });

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Unable to fetch notifications." });
  }
});

router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await Notification.count({
      where: { recipientUserId: req.user.id, isRead: false },
    });

    res.json({ count });
  } catch (error) {
    console.error("Error counting notifications:", error);
    res.status(500).json({ message: "Unable to count notifications." });
  }
});

router.patch("/read-all", authMiddleware, async (req, res) => {
  try {
    const [updated] = await Notification.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          recipientUserId: req.user.id,
          isRead: false,
        },
      }
    );

    res.json({ message: "Marked all notifications as read.", updated });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Unable to mark notifications as read." });
  }
});

router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, recipientUserId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: "Marked notification as read.", notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Unable to mark notification as read." });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Notification.destroy({
      where: {
        id: req.params.id,
        recipientUserId: req.user.id,
      },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json({ message: "Deleted notification." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Unable to delete notification." });
  }
});

router.delete("/", authMiddleware, async (req, res) => {
  try {
    const whereClause = { recipientUserId: req.user.id };

    if (req.query.readOnly === "true") {
      whereClause.isRead = true;
    }

    if (req.query.before) {
      whereClause.createdAt = { [Op.lt]: new Date(req.query.before) };
    }

    const deleted = await Notification.destroy({ where: whereClause });

    res.json({ message: "Deleted notifications.", deleted });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    res.status(500).json({ message: "Unable to delete notifications." });
  }
});

module.exports = router;
