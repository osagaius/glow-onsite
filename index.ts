import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("Required environment variable is missing: DATABASE_URL");
}

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define the allowed industries
const allowedIndustries = ['restaurants', 'stores'];

// Define the workflow stages
const workflowStages = {
  NEW: "New",
  MARKET_APPROVED: "Market Approved",
  MARKET_DECLINED: "Market Declined",
  SALES_APPROVED: "Sales Approved",
  WON: "Won",
  LOST: "Lost"
};

interface Business {
  fein: string;
  name: string;
  industry?: string;
  contact?: {
    name?: string;
    phone?: string;
  };
  status: string;
}

// Create a new business
app.post("/api/business", async (req, res) => {
  const { fein, name } = req.body;

  console.log('fein', fein);

  if (!fein) {
    res.status(400).json({ error: "Missing required parameter: fein" });
    return;
  }

  if (!name) {
    res.status(400).json({ error: "Missing required parameter: name" });
    return;
  }

  const newBusiness: Business = {
    fein,
    name,
    status: workflowStages.NEW,
  };

  try {
    await db.query(
      "INSERT INTO businesses (fein, name, status) VALUES ($1, $2, $3)",
      [fein, name, newBusiness.status]
    );
    res.status(201).json({ success: true, business: newBusiness });
  } catch (error) {
    res.status(500).json({ error: "Failed to create business" });
  }
});

// Progress the business to the next stage
app.post("/api/business/:fein/progress", async (req, res) => {
  const fein = req.params.fein;
  const { industry, contact } = req.body;

  try {
    const result = await db.query("SELECT * FROM businesses WHERE fein = $1", [fein]);
    const business: Business = result.rows[0];

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    switch (business.status) {
      case workflowStages.NEW:
        if (!industry) {
          res.status(400).json({ error: "Industry is required to progress" });
          return;
        }

        if (!allowedIndustries.includes(industry)) {
          business.status = workflowStages.MARKET_DECLINED;
          await db.query("UPDATE businesses SET status = $1 WHERE fein = $2", [business.status, fein]);
          res.json({ success: true, business, message: "Industry not in target market" });
        } else {
          business.industry = industry;
          business.status = workflowStages.MARKET_APPROVED;
          await db.query("UPDATE businesses SET status = $1, industry = $2 WHERE fein = $3", [business.status, industry, fein]);
          res.json({ success: true, business, message: "Provide contact details to proceed" });
        }
        break;

      case workflowStages.MARKET_APPROVED:
        if (!contact || !contact.name || !contact.phone) {
          res.status(400).json({ error: "Valid contact is required to progress" });
          return;
        }

        business.contact = contact;
        business.status = workflowStages.SALES_APPROVED;
        await db.query("UPDATE businesses SET status = $1, contact = $2 WHERE fein = $3", [business.status, contact, fein]);
        res.json({ success: true, business, message: "Business is now part of the sales process" });
        break;

      case workflowStages.SALES_APPROVED:
        business.status = req.body.status === 'Won' ? workflowStages.WON : workflowStages.LOST;
        await db.query("UPDATE businesses SET status = $1 WHERE fein = $2", [business.status, fein]);
        res.json({ success: true, business, message: `Business deal is ${business.status.toLowerCase()}` });
        break;

      default:
        res.status(400).json({ error: "Business cannot progress further" });
        break;
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to progress business" });
  }
});

// API to get the current status of a business
app.get("/api/business/:fein/status", async (req, res) => {
  const fein = req.params.fein;
  try {
    const result = await db.query("SELECT * FROM businesses WHERE fein = $1", [fein]);
    const business: Business = result.rows[0];

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    res.json({ success: true, business });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve business status" });
  }
});

// Run the server
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`App started on http://localhost:${port}`);
  });
}

export default app;
