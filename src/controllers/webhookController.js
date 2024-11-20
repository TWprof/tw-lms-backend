import webhookServices from "../services/webhook.js";

const webhookController = {
  paystackWebhook: async (req, res) => {
    const data = await webhookServices.paystackWebhook(req.body);
    res.status(data.statusCode).json(data);
  },
};

export default webhookController;
