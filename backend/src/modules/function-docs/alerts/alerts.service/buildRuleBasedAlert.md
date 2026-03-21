# buildRuleBasedAlert

## Location
- Source: alerts/alerts.service.js
- Lines: 247-286

## Signature
```js
buildRuleBasedAlert({ farmer, currentMonth, season, latestScore, recentAlerts })
```

## How It Works (Actual Flow)
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- { farmer
- currentMonth
- season
- latestScore
- recentAlerts }

## Implementation Snapshot
```js
function buildRuleBasedAlert({ farmer, currentMonth, season, latestScore, recentAlerts }) {
  const crop = String(farmer.primary_crop || "પાક").toLowerCase();
  const soil = String(farmer.soil_type || "").toLowerCase();
  const landSize = Number(farmer.land_size || 0);
  const income = Number(farmer.annual_income || 0);

  let message = "આ અઠવાડિયે ખેતરની સ્થિતિ પર નજર રાખો અને સિંચાઈ યોજના સમાયોજિત કરો.";
  let reason = `${currentMonth} મહિનામાં ${season} માટે ઋતુ આધારિત સલાહ`;
  let risk_level = "medium";

  if (soil.includes("sandy") || landSize >= 5) {
    message = `${crop || "પાક"} માટે જમીનમાં ભેજ ઝડપથી ઘટી શકે; ઓછા અંતરે સિંચાઈ કરો.`;
    reason = "જમીન અને ક્ષેત્રફળના સ્વરૂપને કારણે ભેજ ઘટાડાનો જોખમ વધારે છે";
    risk_level = "high";
  }

  if (income > 0 && income < 150000) {
    message = `આ અઠવાડિયે ${crop || "પાક"} માટે ઓછા ખર્ચની પૂર્વચેતવણી પગલાં લો જેથી નુકસાન ઓછું થાય.`;
    reason = "આવકને અનુરૂપ ઓછા ખર્ચે જોખમ નિયંત્રણ જરૂરી છે";
    risk_level = risk_level === "high" ? "high" : "medium";
  }

  if (latestScore !== null && Number(latestScore) >= 80) {
    message = `${crop || "પાક"} માટે અતિજોખમી સ્થિતિ દેખાઈ; તાત્કાલિક અધિકારીની મુલાકાત ગોઠવો.`;
    reason = `છેલ્લો વલ્નરેબિલિટી સ્કોર ${latestScore} છે`;
    risk_level = "critical";
  } else if (latestScore !== null && Number(latestScore) >= 60) {
    message = `${crop || "પાક"} માટે ઊંચું જોખમ વલણ છે; તરત જ જોખમ ઘટાડવાના પગલાંને પ્રાથમિકતા આપો.`;
    reason = `છેલ્લો વલ્નરેબિલિટી સ્કોર ${latestScore} છે`;
    risk_level = "high";
```
