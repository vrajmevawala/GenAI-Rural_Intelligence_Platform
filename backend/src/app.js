const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { generalLimiter } = require("./middleware/rateLimiter");
const { errorHandler, AppError } = require("./middleware/errorHandler");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const farmersRoutes = require("./modules/farmers/farmers.routes");
const vulnerabilityRoutes = require("./modules/vulnerability/vulnerability.routes");
const schemesRoutes = require("./modules/schemes/schemes.routes");
const alertsRoutes = require("./modules/alerts/alerts.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("combined"));
app.use(generalLimiter);

app.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" }, message: "Healthy", meta: null });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/farmers", farmersRoutes);
app.use("/api/vulnerability", vulnerabilityRoutes);
app.use("/api/schemes", schemesRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res, next) => {
  next(new AppError("Route not found", 404, "NOT_FOUND"));
});

app.use(errorHandler);

module.exports = app;
