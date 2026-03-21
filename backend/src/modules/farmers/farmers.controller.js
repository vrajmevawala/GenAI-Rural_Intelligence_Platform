const { successResponse } = require("../../utils/apiResponse");
const farmersService = require("./farmers.service");

async function list(req, res, next) {
  try {
    const {
      district,
      village,
      soil_type,
      search,
      taluka,
      vulnerability_label,
      primary_crop,
      page,
      limit,
      offset
    } = req.query;
    const finalLimit = Number(limit || 10);
    const finalOffset = offset !== undefined
      ? Number(offset)
      : Math.max(0, (Number(page || 1) - 1) * finalLimit);

    const data = await farmersService.listFarmers(
      { district, village, soil_type, search, taluka, vulnerability_label, primary_crop },
      finalLimit,
      finalOffset
    );
    res.status(200).json(successResponse(data, "Farmers retrieved"));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await farmersService.createFarmer(req.body);
    res.status(201).json(successResponse(data, "Farmer created successfully"));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const data = await farmersService.getFarmerById(req.params.id);
    res.status(200).json(successResponse(data, "Farmer retrieved"));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await farmersService.updateFarmer(req.params.id, req.body);
    res.status(200).json(successResponse(data, "Farmer updated successfully"));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await farmersService.deleteFarmer(req.params.id);
    res.status(200).json(successResponse(data, "Farmer deleted successfully"));
  } catch (err) {
    next(err);
  }
}

async function recalculate(req, res, next) {
  try {
    const data = await farmersService.recalculateScore(req.params.id);
    res.status(200).json(successResponse(data, "Score recalculated"));
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const data = await farmersService.getScoreHistory(req.params.id);
    res.status(200).json(successResponse(data, "Score history retrieved"));
  } catch (err) {
    next(err);
  }
}

async function exportCsv(req, res, next) {
  try {
    const {
      district,
      village,
      soil_type,
      search,
      taluka,
      vulnerability_label,
      primary_crop,
      limit
    } = req.query;

    const data = await farmersService.listFarmers(
      { district, village, soil_type, search, taluka, vulnerability_label, primary_crop },
      Number(limit || 5000),
      0
    );

    const rows = data.farmers || [];
    const headers = [
      "id",
      "name",
      "phone",
      "district",
      "taluka",
      "village",
      "primary_crop",
      "soil_type",
      "land_area_acres",
      "annual_income_inr",
      "family_size",
      "irrigation_type",
      "vulnerability_score",
      "vulnerability_label"
    ];

    const escapeCsv = (value) => {
      const v = value ?? "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=farmers_export.csv");
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  get,
  update,
  remove,
  recalculate,
  history,
  exportCsv
};
