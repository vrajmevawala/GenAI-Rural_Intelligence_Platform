const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { generalLimiter } = require("./middleware/rateLimiter");
const { errorHandler, AppError } = require("./middleware/errorHandler");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const institutionsRoutes = require("./modules/institutions/institutions.routes");
const farmersRoutes = require("./modules/farmers/farmers.routes");
const cropsRoutes = require("./modules/crops/crops.routes");
const vulnerabilityRoutes = require("./modules/vulnerability/vulnerability.routes");
const schemesRoutes = require("./modules/schemes/schemes.routes");
const alertsRoutes = require("./modules/alerts/alerts.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const diseaseRoutes = require("./modules/disease/disease.routes");
const locationsRoutes = require("./modules/locations/locations.routes");
const translationRoutes = require("./modules/translation/translation.routes");
const whatsappRoutes = require("./modules/whatsapp/whatsapp.routes");
const telegramRoutes = require("./modules/telegram/telegram.routes");

dotenv.config();

const app = express();

// Required when running behind ngrok/reverse proxies so rate limiter can read client IP safely.
app.set("trust proxy", 1);

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(cookieParser());
app.use(morgan("combined"));
app.use(generalLimiter);
app.use("/media", express.static(path.join(__dirname, "../public")));

app.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" }, message: "Healthy", meta: null });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/institutions", institutionsRoutes);
app.use("/api/farmers", farmersRoutes);
app.use("/api/crops", cropsRoutes);
app.use("/api/vulnerability", vulnerabilityRoutes);
app.use("/api/schemes", schemesRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/disease", diseaseRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/translate", translationRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/telegram", telegramRoutes);

app.use((req, res, next) => {
  next(new AppError("Route not found", 404, "NOT_FOUND"));
});

app.use(errorHandler);

module.exports = app;
