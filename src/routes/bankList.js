import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/banks", async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.PAYSTACK_BASE_URL}/bank?currency=NGN`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    // Format and return only the needed fields
    const bankList = response.data.data.map((bank) => ({
      name: bank.name,
      code: bank.code,
    }));

    res.status(200).json({
      status: "success",
      message: "Banks retrieved successfully",
      data: bankList,
    });
  } catch (error) {
    console.error(
      "Error fetching banks:",
      error?.response?.data || error.message
    );
    res.status(500).json({
      status: "fail",
      message: "Unable to retrieve bank list",
    });
  }
});

export default router;
