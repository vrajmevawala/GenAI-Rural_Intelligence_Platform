# exportCsv

## Location
- Source: farmers/farmers.controller.js
- Lines: 88-142

## Signature
```js
exportCsv(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Transforms result sets before returning data to caller/UI.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
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
```
