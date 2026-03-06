// =============================================================
// Georgia Solar ROI Calculator — v1.0
// Georgia Power Solar Buy Back Rate: ~7.2¢/kWh (2026)
// Federal ITC: 30% residential (Section 25D, 2026)
// NREL PVWatts: Atlanta metro ~4.8 peak sun hours/day avg
// =============================================================

// ── AFFILIATE URL (also set in index.html) ──
var AFFILIATE_URL = "mailto:your@email.com?subject=Free%20Solar%20Quote%20Request%20-%20Georgia";

// ── GEORGIA POWER SOLAR BUY BACK EXPORT RATE (2026) ──
var GA_EXPORT_RATE = 0.072; // $0.072/kWh — ~7.2¢ effective rate

// ── FEDERAL ITC ──
var FEDERAL_ITC = 0.30; // 30% Section 25D residential (2026)

// ── NREL PEAK SUN HOURS — Atlanta metro by roof direction ──
var PEAK_SUN_HOURS = {
  south:      4.8,
  southwest:  4.5,
  southeast:  4.4,
  east_west:  3.8
};

// ── SHADING DERATE FACTORS ──
var SHADING_DERATE = {
  none:     1.00,
  light:    0.92,
  moderate: 0.80
};

// ── SYSTEM EFFICIENCY (account for inverter losses, temp, soiling) ──
var SYSTEM_EFFICIENCY = 0.80;

// ── SELF-CONSUMPTION RATIO (portion of solar used on-site vs exported) ──
// Georgia homeowners typically consume ~60% on-site, export ~40%
var SELF_CONSUME_RATIO = 0.60;

// ── AVERAGE RETAIL RATE PAID (Georgia Power blended avg incl. summer tiers) ──
var RETAIL_RATE = 0.115; // $0.115/kWh blended average

// ── BATTERY COST ADDER ──
var BATTERY_COST = 10000; // midpoint $8k–$12k

// ── SOLAR PANEL DEGRADATION ──
var ANNUAL_DEGRADATION = 0.005; // 0.5%/year industry standard

// ── MAIN CALCULATION ──
function calculateROI() {
  var systemSizeKw    = parseFloat(document.getElementById('system_size').value);
  var systemCost      = parseFloat(document.getElementById('system_cost').value);
  var monthlyBill     = parseFloat(document.getElementById('monthly_bill').value);
  var roofDir         = document.getElementById('roof_direction').value;
  var shading         = document.getElementById('shading').value;
  var elecInflation   = parseFloat(document.getElementById('electricity_inflation').value);
  var includeBattery  = document.getElementById('battery').checked;
  var itcEligible     = document.getElementById('itc_eligible').checked;
  var utility         = document.getElementById('utility').value;

  // --- SYSTEM COST ---
  var totalSystemCost = systemCost + (includeBattery ? BATTERY_COST : 0);
  var itcAmount       = itcEligible ? totalSystemCost * FEDERAL_ITC : 0;
  var netCost         = totalSystemCost - itcAmount;

  // --- ANNUAL PRODUCTION (kWh) ---
  var peakSunHours    = PEAK_SUN_HOURS[roofDir];
  var shadingFactor   = SHADING_DERATE[shading];
  var annualProduction = systemSizeKw * peakSunHours * 365 * SYSTEM_EFFICIENCY * shadingFactor;

  // --- YEAR 1 SAVINGS ---
  var selfConsumedKwh  = annualProduction * SELF_CONSUME_RATIO;
  var exportedKwh      = annualProduction * (1 - SELF_CONSUME_RATIO);

  // Use a slightly lower export rate for non-GP utilities (conservative)
  var exportRate = (utility === 'georgia_power') ? GA_EXPORT_RATE : GA_EXPORT_RATE * 1.05;

  var selfConsumeSavings = selfConsumedKwh * RETAIL_RATE;
  var exportCredit       = exportedKwh * exportRate;
  var yr1Savings         = selfConsumeSavings + exportCredit;

  // --- BILL OFFSET % ---
  var annualBill   = monthlyBill * 12;
  var billOffsetPct = Math.min(100, Math.round((yr1Savings / annualBill) * 100));

  // --- 25-YEAR PROJECTION ---
  var cumulativeSavings = 0;
  var paybackYear = null;
  var projectionData = [];
  var currentRate = RETAIL_RATE;
  var currentExportRate = exportRate;

  for (var yr = 1; yr <= 25; yr++) {
    var degradation    = Math.pow(1 - ANNUAL_DEGRADATION, yr - 1);
    var yrProduction   = annualProduction * degradation;
    var yrSelfConsume  = yrProduction * SELF_CONSUME_RATIO * currentRate;
    var yrExport       = yrProduction * (1 - SELF_CONSUME_RATIO) * currentExportRate;
    var yrSavings      = yrSelfConsume + yrExport;

    cumulativeSavings += yrSavings;

    if (paybackYear === null && cumulativeSavings >= netCost) {
      paybackYear = yr;
    }

    // Store every 5 years + year 1
    if (yr === 1 || yr % 5 === 0) {
      projectionData.push({ yr: yr, cumulative: cumulativeSavings });
    }

    // Escalate rates
    currentRate       *= (1 + elecInflation);
    currentExportRate *= (1 + elecInflation * 0.5); // export rate escalates slower
  }

  var net25YrSavings = cumulativeSavings - netCost;

  // --- RENDER ---
  renderResults({
    paybackYear:       paybackYear,
    net25YrSavings:    net25YrSavings,
    itcAmount:         itcAmount,
    billOffsetPct:     billOffsetPct,
    totalSystemCost:   totalSystemCost,
    systemCost:        systemCost,
    netCost:           netCost,
    annualProduction:  annualProduction,
    selfConsumeSavings: selfConsumeSavings,
    exportCredit:      exportCredit,
    yr1Savings:        yr1Savings,
    includeBattery:    includeBattery,
    projectionData:    projectionData,
    netCostForBars:    netCost
  });

  trackEvent('Calculator', 'calculate_roi', utility + '_' + systemSizeKw + 'kw');
}

// --- RENDER ---
function renderResults(d) {
  document.getElementById('results-placeholder').classList.add('hidden');
  document.getElementById('results-content').classList.remove('hidden');

  // Summary cards
  document.getElementById('res-payback').textContent =
    d.paybackYear ? d.paybackYear + ' years' : '25+ yrs';
  document.getElementById('res-25yr').textContent =
    '$' + Math.round(d.net25YrSavings).toLocaleString();
  document.getElementById('res-itc').textContent =
    d.itcAmount > 0 ? '$' + Math.round(d.itcAmount).toLocaleString() : 'Not eligible';
  document.getElementById('res-offset').textContent = d.billOffsetPct + '%';

  // Investment breakdown
  document.getElementById('br-gross').textContent    = '$' + d.systemCost.toLocaleString();
  document.getElementById('br-itc').textContent      = d.itcAmount > 0 ? '-$' + Math.round(d.itcAmount).toLocaleString() : '$0';
  document.getElementById('br-net').textContent      = '$' + Math.round(d.netCost).toLocaleString();

  if (d.includeBattery) {
    document.getElementById('br-battery-row').style.display = 'flex';
    document.getElementById('br-battery').textContent = '+$' + (10000).toLocaleString();
  } else {
    document.getElementById('br-battery-row').style.display = 'none';
  }

  // Annual savings
  document.getElementById('br-production').textContent     = Math.round(d.annualProduction).toLocaleString() + ' kWh';
  document.getElementById('br-self-consume').textContent   = '$' + Math.round(d.selfConsumeSavings).toLocaleString();
  document.getElementById('br-export').textContent         = '$' + Math.round(d.exportCredit).toLocaleString();
  document.getElementById('br-yr1-savings').textContent    = '$' + Math.round(d.yr1Savings).toLocaleString();

  // 25-year projection bars
  buildProjectionBars(d.projectionData, d.netCostForBars);

  // Scroll to results on mobile
  if (window.innerWidth <= 820) {
    document.getElementById('results-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Wire CTA
  document.getElementById('main-cta').href = AFFILIATE_URL;
  trackEvent('CTA', 'impression', 'results_shown');
}

// --- PROJECTION BARS ---
function buildProjectionBars(data, netCost) {
  var container = document.getElementById('projection-bars');
  container.innerHTML = '';

  var maxVal = data[data.length - 1].cumulative;

  data.forEach(function(point) {
    var netAtPoint = point.cumulative - netCost;
    var isPositive = netAtPoint >= 0;
    var barPct = Math.min(100, Math.round((point.cumulative / maxVal) * 100));

    var fillClass = 'negative';
    if (isPositive && netAtPoint > netCost * 0.5) fillClass = 'good';
    else if (isPositive) fillClass = 'positive';

    var label = netAtPoint >= 0
      ? '+$' + Math.round(netAtPoint).toLocaleString()
      : '-$' + Math.round(Math.abs(netAtPoint)).toLocaleString();

    var row = document.createElement('div');
    row.className = 'proj-row';
    row.innerHTML =
      '<span class="proj-label">Yr ' + point.yr + '</span>' +
      '<div class="proj-bar-wrap"><div class="proj-bar-fill ' + fillClass + '" style="width:' + barPct + '%"></div></div>' +
      '<span class="proj-val">' + label + '</span>';

    container.appendChild(row);
  });
}
