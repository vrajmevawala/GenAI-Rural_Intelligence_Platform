# list

## Location
- Source: farmers/farmers.controller.js
- Lines: 4-32

## Signature
```js
list(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Wraps API output in the platform response envelope.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
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
```
