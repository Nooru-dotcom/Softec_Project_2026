import os
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://fairgig:fairgig@localhost:5432/fairgig")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
app = FastAPI(title="FairGig Certificate Service", version="1.0.0")


@app.get("/certificate/{worker_id}", response_class=HTMLResponse)
def render_certificate(worker_id: str):
    worker_id = worker_id.strip()
    with engine.begin() as conn:
        worker = conn.execute(
            text("SELECT id, full_name, city, is_identity_verified FROM users WHERE id = :wid AND role = 'worker'"),
            {"wid": worker_id},
        ).mappings().first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")

        totals = conn.execute(
            text(
                """
                SELECT ROUND(COALESCE(SUM(gross), 0)::numeric, 2) AS gross,
                       ROUND(COALESCE(SUM(deductions), 0)::numeric, 2) AS deductions,
                       ROUND(COALESCE(SUM(net), 0)::numeric, 2) AS net,
                       ROUND(COALESCE(SUM(hours), 0)::numeric, 2) AS hours
                FROM shifts
                WHERE user_id = :wid
                  AND shift_date >= CURRENT_DATE - INTERVAL '30 days'
                """
            ),
            {"wid": worker_id},
        ).mappings().first()

    issue_date = datetime.utcnow().strftime("%d %B %Y")
    verification_badge = "VERIFIED" if worker["is_identity_verified"] else "PENDING VERIFICATION"

    html = f"""
<!doctype html>
<html>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>FairGig Income Certificate</title>
  <style>
    @page {{ size: A4; margin: 18mm; }}
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #0b0d13;
      color: #e8ecf4;
      margin: 0;
      padding: 0;
    }}
    .page {{
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: linear-gradient(145deg, #121725 0%, #0d1119 100%);
      padding: 22mm;
      box-sizing: border-box;
      border: 1px solid #25304a;
    }}
    .actions {{
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }}
    .btn {{
      background: #111b33;
      color: #d6dcff;
      border: 1px solid #2b3c62;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
      cursor: pointer;
    }}
    .btn:hover {{ border-color: #4f6fb7; }}
    .brand {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }}
    .logo {{ font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #38f2d3; }}
    .badge {{
      border: 1px solid #f97316;
      color: #f97316;
      padding: 6px 12px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 12px;
    }}
    h1 {{ font-size: 36px; margin: 0 0 8px; color: #d6dcff; }}
    p.sub {{ margin: 0 0 20px; color: #a9b2ca; }}
    .card {{
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 18px;
      margin-top: 16px;
    }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
    .label {{ color: #8b94ab; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }}
    .value {{ color: #f3f6ff; font-size: 20px; font-weight: 700; }}
    .stamp {{
      margin-top: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      color: #95a0bd;
    }}
    .seal {{
      width: 120px;
      height: 120px;
      border-radius: 100%;
      border: 2px solid #6d7cff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6d7cff;
      font-weight: 800;
      text-align: center;
      font-size: 12px;
    }}
    @media print {{
      body {{ background: white; }}
      .actions {{ display: none; }}
      .page {{ border: 0; }}
    }}
  </style>
</head>
<body>
  <div class='page'>
    <div class='actions'>
      <button class='btn' onclick='window.print()'>Download PDF / Print</button>
      <button class='btn' onclick='downloadHtml()'>Download HTML</button>
    </div>
    <div class='brand'>
      <div class='logo'>FairGig</div>
      <div class='badge'>{verification_badge}</div>
    </div>

    <h1>Income Certificate</h1>
    <p class='sub'>Issued for verified platform gig earnings. This certificate is generated from ledgered shift records in FairGig.</p>

    <div class='card'>
      <div class='grid'>
        <div><div class='label'>Worker Name</div><div class='value'>{worker['full_name']}</div></div>
        <div><div class='label'>City</div><div class='value'>{worker['city']}</div></div>
        <div><div class='label'>Gross Earnings (30d)</div><div class='value'>PKR {totals['gross']}</div></div>
        <div><div class='label'>Deductions (30d)</div><div class='value'>PKR {totals['deductions']}</div></div>
        <div><div class='label'>Net Earnings (30d)</div><div class='value'>PKR {totals['net']}</div></div>
        <div><div class='label'>Total Logged Hours</div><div class='value'>{totals['hours']}</div></div>
      </div>
    </div>

    <div class='stamp'>
      <div>
        Issued on {issue_date}<br/>
        FairGig Certificate Renderer Service
      </div>
      <div class='seal'>FAIRGIG<br/>VERIFIED</div>
    </div>
  </div>
  <script>
    function downloadHtml() {{
      const html = '<!doctype html>\\n' + document.documentElement.outerHTML;
      const blob = new Blob([html], {{ type: 'text/html;charset=utf-8' }});
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'fairgig-certificate-{worker_id}.html';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }}
  </script>
</body>
</html>
"""

    return HTMLResponse(content=html)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "certificate"}
