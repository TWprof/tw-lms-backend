import webhookServices from "../services/webhook.js";

const webhookController = {
  paystackWebhook: async (req, res) => {
    try {
      const raw = req.body.toString("utf8");
      const payload = JSON.parse(raw);
      console.log("Webhook received:", payload.event);

      const data = await webhookServices.paystackWebhook(payload);

      return res.status(200).json(data);
    } catch (err) {
      console.error("Webhook error:", err.message);
      return res.sendStatus(400);
    }
  },
};

export default webhookController;
