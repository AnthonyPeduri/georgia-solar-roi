# Georgia Solar ROI Calculator

Georgia-specific solar payback and savings calculator using real 2026 data.

## What Makes This Different
- Uses Georgia Power's actual Solar Buy Back export rate (~7.2¢/kWh, 2026)
- NOT full retail net metering — corrects the #1 error in national solar calculators
- 5,000-customer cap warning baked in
- 30% federal ITC (Section 25D, 2026) applied correctly
- 25-year projection with 0.5% annual panel degradation
- NREL PVWatts Atlanta sun hours by roof direction

## Setup
1. Clone this repo
2. Update `AFFILIATE_URL` in `index.html` line ~18 and `calculator.js` line ~10
3. Replace GA4 Measurement ID in `index.html`
4. Deploy to GitHub Pages

## Rate Sources
- Georgia Power Solar Buy Back: https://www.palmetto.com/local/georgia/ (2026)
- Federal ITC: https://www.seia.org/solar-investment-tax-credit/
- NREL PVWatts: Atlanta metro 4.5–5.2 peak sun hours/day
