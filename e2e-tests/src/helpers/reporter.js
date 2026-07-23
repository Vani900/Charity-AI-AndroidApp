const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * Generate Excel report (.xlsx) and HTML report (execution-report.html)
 * @param {Array} results Array of test result objects
 * @param {String} outputDir Directory where reports will be saved
 */
async function generateReports(results, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const excelPath = path.join(outputDir, 'test-report.xlsx');
  const htmlPath = path.join(outputDir, 'execution-report.html');

  // --- 1. GENERATE EXCEL REPORT ---
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CharityAI QA Automation Team';
  workbook.lastModifiedBy = 'CharityAI QA';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Calculations
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const passRate = total > 0 ? parseFloat(((passed / total) * 100).toFixed(2)) : 0;
  const totalDurationMs = results.reduce((acc, r) => acc + (r.duration || 0), 0);
  const totalDurationSec = parseFloat((totalDurationMs / 1000).toFixed(2));
  const avgDurationMs = total > 0 ? parseFloat((totalDurationMs / total).toFixed(2)) : 0;
  const timestamp = new Date().toLocaleString();

  // Category aggregate numbers
  const categoriesMap = {};
  results.forEach(r => {
    if (!categoriesMap[r.category]) {
      categoriesMap[r.category] = { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 };
    }
    const cat = categoriesMap[r.category];
    cat.total++;
    if (r.status === 'PASS') cat.passed++;
    else if (r.status === 'FAIL') cat.failed++;
    else if (r.status === 'SKIP') cat.skipped++;
    cat.duration += r.duration || 0;
  });

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.views = [{ showGridLines: true }];
  
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 30 }
  ];

  summarySheet.addRow({ metric: 'Total Tests', value: total });
  summarySheet.addRow({ metric: 'Passed', value: passed });
  summarySheet.addRow({ metric: 'Failed', value: failed });
  summarySheet.addRow({ metric: 'Skipped', value: skipped });
  summarySheet.addRow({ metric: 'Pass Percentage', value: `${passRate}%` });
  summarySheet.addRow({ metric: 'Total Execution Time', value: `${totalDurationSec}s` });
  summarySheet.addRow({ metric: 'Average Test Duration', value: `${avgDurationMs}ms` });
  summarySheet.addRow({ metric: 'Execution Timestamp', value: timestamp });

  // Style Sheet 1
  summarySheet.getRow(1).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } }; // Dark blue
  
  // Sheet 2: By Category
  const catSheet = workbook.addWorksheet('By Category');
  catSheet.views = [{ showGridLines: true }];
  catSheet.columns = [
    { header: 'Category', key: 'category', width: 45 },
    { header: 'Total Tests', key: 'total', width: 15 },
    { header: 'Passed', key: 'passed', width: 12 },
    { header: 'Failed', key: 'failed', width: 12 },
    { header: 'Skipped', key: 'skipped', width: 12 },
    { header: 'Pass Rate (%)', key: 'passRate', width: 18 },
    { header: 'Avg Duration (ms)', key: 'avgDuration', width: 20 }
  ];

  Object.keys(categoriesMap).forEach(catName => {
    const data = categoriesMap[catName];
    const catRate = data.total > 0 ? parseFloat(((data.passed / data.total) * 100).toFixed(2)) : 0;
    const catAvg = data.total > 0 ? parseFloat((data.duration / data.total).toFixed(2)) : 0;
    catSheet.addRow({
      category: catName,
      total: data.total,
      passed: data.passed,
      failed: data.failed,
      skipped: data.skipped,
      passRate: catRate,
      avgDuration: catAvg
    });
  });

  // Style Sheet 2
  catSheet.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  catSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0369A1' } }; // Light blue

  // Sheet 3: Test Cases
  const tcSheet = workbook.addWorksheet('Test Cases');
  tcSheet.views = [{ showGridLines: true }];
  tcSheet.columns = [
    { header: 'Test ID', key: 'id', width: 15 },
    { header: 'Category', key: 'category', width: 45 },
    { header: 'Test Name', key: 'name', width: 50 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Duration (ms)', key: 'duration', width: 15 },
    { header: 'Error Details / Reason', key: 'error', width: 60 },
    { header: 'Timestamp', key: 'timestamp', width: 25 }
  ];

  results.forEach(r => {
    tcSheet.addRow({
      id: r.id,
      category: r.category,
      name: r.name,
      role: r.role,
      status: r.status,
      duration: r.duration || 0,
      error: r.error || '',
      timestamp: timestamp
    });
  });

  // Style Sheet 3 Status Cells & Headers
  tcSheet.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  tcSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } }; // Gray

  tcSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const statusCell = row.getCell('status');
    if (statusCell.value === 'PASS') {
      statusCell.font = { color: { argb: '15803D' }, bold: true }; // Green
    } else if (statusCell.value === 'FAIL') {
      statusCell.font = { color: { argb: 'B91C1C' }, bold: true }; // Red
    } else {
      statusCell.font = { color: { argb: 'B45309' }, bold: true }; // Orange/Yellow (SKIP)
    }
  });

  await workbook.xlsx.writeFile(excelPath);

  // --- 2. GENERATE HTML REPORT ---
  const categoryRows = Object.keys(categoriesMap).map(catName => {
    const data = categoriesMap[catName];
    const catRate = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : 0;
    const catAvg = data.total > 0 ? (data.duration / data.total).toFixed(0) : 0;
    return `
      <tr>
        <td>${catName}</td>
        <td class="text-center font-semibold">${data.total}</td>
        <td class="text-center text-pass font-semibold">${data.passed}</td>
        <td class="text-center text-fail font-semibold">${data.failed}</td>
        <td class="text-center text-skip font-semibold">${data.skipped}</td>
        <td class="text-center font-semibold">${catRate}%</td>
        <td class="text-center text-muted">${catAvg} ms</td>
      </tr>
    `;
  }).join('');

  const testCaseRows = results.map(r => {
    let statusClass = 'status-skip';
    if (r.status === 'PASS') statusClass = 'status-pass';
    else if (r.status === 'FAIL') statusClass = 'status-fail';

    const cleanErr = r.error ? r.error.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const errRow = r.error ? `<div class="error-box text-xs mt-1 font-mono">${cleanErr}</div>` : '';

    return `
      <tr class="test-row" data-status="${r.status}" data-category="${r.category}">
        <td class="font-mono font-semibold">${r.id}</td>
        <td class="text-xs text-muted">${r.category}</td>
        <td>
          <div class="font-medium">${r.name}</div>
          <div class="text-xs text-muted mt-0.5">${r.description}</div>
          ${errRow}
        </td>
        <td class="text-center"><span class="role-badge capitalize">${r.role}</span></td>
        <td class="text-center"><span class="status-badge ${statusClass}">${r.status}</span></td>
        <td class="text-right font-mono">${r.duration || 0} ms</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CharityAI — 500 Test E2E Execution Report</title>
  <style>
    :root {
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --border-color: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --brand-blue: #3b82f6;
      --color-pass: #22c55e;
      --color-fail: #ef4444;
      --color-skip: #f59e0b;
    }
    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .timestamp {
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    .grid {
      display: grid;
      grid-template-cols: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }
    .card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
    }
    .card-title {
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .card-value {
      font-size: 2rem;
      font-weight: 800;
    }
    .text-pass { color: var(--color-pass); }
    .text-fail { color: var(--color-fail); }
    .text-skip { color: var(--color-skip); }
    
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 1rem;
      border-left: 4px solid var(--brand-blue);
      padding-left: 0.75rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    th {
      background-color: #1e293b80;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tr:hover {
      background-color: #1e293b40;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: var(--text-muted); }
    
    .status-badge {
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .status-pass { background-color: #16a34a20; color: #4ade80; border: 1px solid #16a34a60; }
    .status-fail { background-color: #dc262620; color: #f87171; border: 1px solid #dc262660; }
    .status-skip { background-color: #d9770620; color: #fbbf24; border: 1px solid #d9770660; }
    
    .role-badge {
      background-color: #47556940;
      color: #cbd5e1;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.75rem;
      border: 1px solid #47556980;
    }
    .error-box {
      background-color: #dc262610;
      border: 1px solid #dc262630;
      color: #f87171;
      padding: 0.5rem;
      border-radius: 0.5rem;
      max-height: 80px;
      overflow-y: auto;
    }
    .filter-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      background-color: var(--bg-card);
      padding: 1rem;
      border-radius: 0.75rem;
      border: 1px solid var(--border-color);
      flex-wrap: wrap;
    }
    .filter-btn {
      background-color: #334155;
      border: 1px solid #475569;
      color: var(--text-main);
      padding: 0.4rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      cursor: pointer;
      font-weight: 500;
    }
    .filter-btn.active {
      background-color: var(--brand-blue);
      border-color: var(--brand-blue);
    }
    .table-container {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 1rem;
      overflow: hidden;
    }
  </style>
  <script>
    function filterStatus(status) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      const rows = document.querySelectorAll('.test-row');
      rows.forEach(row => {
        if (status === 'all' || row.getAttribute('data-status') === status) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
  </script>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>CharityAI — Android E2E Pipeline</h1>
        <div class="timestamp">QA Execution Report • Local Test Cycle</div>
      </div>
      <div class="text-right">
        <div class="font-semibold text-pass">Execution Completed</div>
        <div class="timestamp">${timestamp}</div>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Tests</div>
        <div class="card-value">${total}</div>
      </div>
      <div class="card">
        <div class="card-title text-pass">Passed</div>
        <div class="card-value text-pass">${passed}</div>
      </div>
      <div class="card">
        <div class="card-title text-fail">Failed</div>
        <div class="card-value text-fail">${failed}</div>
      </div>
      <div class="card">
        <div class="card-title text-skip">Skipped</div>
        <div class="card-value text-skip">${skipped}</div>
      </div>
      <div class="card">
        <div class="card-title">Pass Rate</div>
        <div class="card-value">${passRate}%</div>
      </div>
      <div class="card">
        <div class="card-title">Total Time</div>
        <div class="card-value">${totalDurationSec}s</div>
      </div>
    </div>

    <div class="section-title">Category Summary</div>
    <div class="table-container" style="margin-bottom: 2.5rem;">
      <table>
        <thead>
          <tr>
            <th>Testing Category</th>
            <th class="text-center">Total</th>
            <th class="text-center text-pass">Passed</th>
            <th class="text-center text-fail">Failed</th>
            <th class="text-center text-skip">Skipped</th>
            <th class="text-center">Pass Rate</th>
            <th class="text-center">Avg Duration</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
      </table>
    </div>

    <div class="section-title">Test Details</div>
    <div class="filter-bar">
      <button class="filter-btn active" onclick="filterStatus('all')">All Tests (${total})</button>
      <button class="filter-btn" onclick="filterStatus('PASS')">Passed (${passed})</button>
      <button class="filter-btn" onclick="filterStatus('FAIL')">Failed (${failed})</button>
      <button class="filter-btn" onclick="filterStatus('SKIP')">Skipped (${skipped})</button>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 100px;">Test ID</th>
            <th style="width: 250px;">Category</th>
            <th>Test Details</th>
            <th class="text-center" style="width: 100px;">Role</th>
            <th class="text-center" style="width: 100px;">Status</th>
            <th class="text-right" style="width: 120px;">Duration</th>
          </tr>
        </thead>
        <tbody>
          ${testCaseRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent);
  
  return {
    excelPath,
    htmlPath
  };
}

module.exports = {
  generateReports
};
