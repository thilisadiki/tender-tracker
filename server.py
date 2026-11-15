"""
server.py - REST API & Web Server for South African Tender Tracker
Zero external dependencies. Serves single page application and REST API
with full support for Gauteng & Limpopo provincial filtering,
WhatsApp alerts, and email notifications.
"""

import http.server
import socketserver
import json
import os
import urllib.parse
import mimetypes
import csv
import io
from datetime import datetime

import database
import scraper_engine
import alert_service

PORT = int(os.environ.get("PORT", 8000))
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

class TenderHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def send_json(self, data, status_code=200):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            raw_body = self.rfile.read(content_length).decode("utf-8")
            try:
                return json.loads(raw_body)
            except Exception:
                return {}
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        def q(key, default=None):
            return query[key][0] if key in query and len(query[key]) > 0 else default

        # REST API endpoints
        if path == "/api/tenders":
            filters = {
                "province": q("province"),
                "sector": q("sector"),
                "category": q("category"),
                "status": q("status"),
                "priority": q("priority"),
                "search": q("search")
            }
            tenders = database.get_tenders(filters)
            self.send_json(tenders)
            return

        elif path.startswith("/api/tenders/"):
            parts = path.split("/")
            if len(parts) == 4 and parts[3].isdigit():
                tender_id = int(parts[3])
                tender = database.get_tender_by_id(tender_id)
                if tender:
                    self.send_json(tender)
                else:
                    self.send_json({"error": "Tender not found"}, 404)
                return

        elif path == "/api/stats":
            stats = database.get_stats()
            self.send_json(stats)
            return

        elif path == "/api/sources":
            sources = database.get_sources()
            self.send_json(sources)
            return

        elif path == "/api/discover":
            feed = scraper_engine.get_live_discovery_feed()
            self.send_json(feed)
            return

        elif path == "/api/alerts/config":
            cfg = alert_service.load_config()
            # Redact password for security
            safe_cfg = {**cfg, "smtp_password": "••••••••" if cfg.get("smtp_password") else ""}
            self.send_json(safe_cfg)
            return

        elif path == "/api/export":
            fmt = q("format", "csv").lower()
            tenders = database.get_tenders()

            if fmt == "json":
                self.send_json(tenders)
                return

            # CSV format
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                "Reference Number", "Title", "Issuing Entity", "Province", "Sector", "Category",
                "Sub Category", "Status", "Priority", "Estimated Value (ZAR)", "Currency",
                "B-BBEE Requirement", "Submission Deadline", "Briefing Date", "Briefing Type", "Lead Assignee",
                "Go/No-Go Decision", "Win Probability %", "Compliance Score %"
            ])
            for t in tenders:
                writer.writerow([
                    t.get("ref_number", ""),
                    t.get("title", ""),
                    t.get("issuing_entity", ""),
                    t.get("province", ""),
                    t.get("sector", ""),
                    t.get("category", ""),
                    t.get("sub_category", ""),
                    t.get("status", ""),
                    t.get("priority", ""),
                    t.get("estimated_value", 0),
                    t.get("currency", "ZAR"),
                    t.get("bbbee_requirement", ""),
                    t.get("submission_deadline", ""),
                    t.get("briefing_date", ""),
                    t.get("briefing_type", ""),
                    t.get("lead_assignee", ""),
                    t.get("go_no_go_decision", ""),
                    t.get("win_probability", 0),
                    t.get("compliance_score", 0)
                ])

            body = output.getvalue().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="sa_tenders_gauteng_limpopo.csv"')
            self.send_header("Content-Length", str(len(body)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(body)
            return

        # Fallback to static files
        if path == "/" or not os.path.exists(os.path.join(STATIC_DIR, path.lstrip("/"))):
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/tenders":
            data = self.read_json_body()
            if not data.get("title") or not data.get("issuing_entity"):
                self.send_json({"error": "Title and Issuing Entity are required"}, 400)
                return

            if not data.get("province"):
                data["province"] = scraper_engine.detect_province(data.get("title", "") + " " + data.get("issuing_entity", "") + " " + data.get("location", ""))

            if not data.get("category") or data.get("category") == "Auto":
                cat, sub, rel, _ = scraper_engine.classify_tender(data["title"], data.get("description", ""))
                data["category"] = cat
                if not data.get("sub_category"):
                    data["sub_category"] = sub

            if not data.get("sector") or data.get("sector") == "Auto":
                data["sector"] = scraper_engine.detect_sector(data["issuing_entity"])

            tender = database.create_tender(data)
            self.send_json(tender, 201)
            return

        elif path.startswith("/api/compliance/") and path.endswith("/toggle"):
            parts = path.split("/")
            if len(parts) == 5 and parts[3].isdigit():
                item_id = int(parts[3])
                res = database.toggle_compliance_item(item_id)
                if res:
                    self.send_json(res)
                else:
                    self.send_json({"error": "Compliance item not found"}, 404)
                return

        elif path.startswith("/api/milestones/") and path.endswith("/toggle"):
            parts = path.split("/")
            if len(parts) == 5 and parts[3].isdigit():
                milestone_id = int(parts[3])
                res = database.toggle_milestone(milestone_id)
                if res:
                    self.send_json(res)
                else:
                    self.send_json({"error": "Milestone not found"}, 404)
                return

        elif path == "/api/discover/import":
            data = self.read_json_body()
            if not data.get("title"):
                self.send_json({"error": "Missing tender payload"}, 400)
                return

            tender_payload = {
                "ref_number": data.get("ref_number"),
                "title": data.get("title"),
                "issuing_entity": data.get("issuing_entity"),
                "province": data.get("province", "Gauteng"),
                "sector": data.get("sector", "Government"),
                "category": data.get("category", "Software & Systems Development"),
                "sub_category": data.get("sub_category"),
                "status": "Identified",
                "priority": "High" if data.get("relevance_score", 0) > 85 else "Medium",
                "estimated_value": data.get("estimated_value", 0),
                "currency": "ZAR",
                "publication_date": data.get("publication_date"),
                "briefing_date": data.get("briefing_date"),
                "briefing_type": data.get("briefing_type", "None"),
                "submission_deadline": data.get("submission_deadline"),
                "submission_method": data.get("submission_method", "Online Portal"),
                "portal_url": data.get("source_url"),
                "description": data.get("summary", ""),
                "notes": f"Imported from {data.get('source_name', 'SA Portal Feed')} (Match: {data.get('relevance_score', 0)}%)"
            }
            tender = database.create_tender(tender_payload)

            # Check if alert should be dispatched
            cfg = alert_service.load_config()
            if cfg.get("notify_on_new_match"):
                wa_msg = alert_service.build_tender_alert_message(tender)
                if cfg.get("whatsapp_enabled") and cfg.get("whatsapp_number"):
                    alert_service.send_whatsapp(wa_msg, config=cfg)
                if cfg.get("email_enabled") and cfg.get("recipient_email"):
                    alert_service.send_email(
                        subject=f"🚨 New SA Tender: {tender['title']} [{tender['province']}]",
                        html_content=f"<p>{wa_msg.replace(chr(10), '<br>')}</p>",
                        config=cfg
                    )

            self.send_json(tender, 201)
            return

        elif path == "/api/alerts/config":
            data = self.read_json_body()
            saved = alert_service.save_config(data)
            self.send_json(saved)
            return

        elif path == "/api/alerts/test":
            data = self.read_json_body()
            channel = data.get("channel", "all")
            phone = data.get("whatsapp_number")
            email = data.get("recipient_email")

            results = {}

            if channel in ["whatsapp", "all"]:
                sample_msg = (
                    "🚀 *TenderPulse SA Alert Service Test*\n\n"
                    "✅ WhatsApp notifications are successfully configured!\n"
                    "You will receive immediate alerts for new high-match tenders in *Gauteng* and *Limpopo*, "
                    "plus 24h reminders before compulsory briefing sessions."
                )
                wa_res = alert_service.send_whatsapp(sample_msg, phone_number=phone)
                results["whatsapp"] = wa_res

            if channel in ["email", "all"]:
                html_body = """
                <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
                  <h2 style="color: #38bdf8; margin-top: 0;">TenderPulse SA - Email Alerts Test</h2>
                  <p>Your email notification dispatcher is working properly.</p>
                  <p>You will receive daily digests of newly published tenders across <strong>Gauteng</strong> and <strong>Limpopo</strong>.</p>
                </div>
                """
                em_res = alert_service.send_email(
                    subject="✅ TenderPulse SA Alert Verification",
                    html_content=html_body,
                    recipient=email
                )
                results["email"] = em_res

            self.send_json({"success": True, "results": results})
            return

        elif path == "/api/gonogo/evaluate":
            data = self.read_json_body()
            r_cap = float(data.get("capability", 3))
            r_comp = float(data.get("compliance", 3))
            r_res = float(data.get("capacity", 3))
            r_marg = float(data.get("margin", 3))
            r_rel = float(data.get("client", 3))
            r_win = float(data.get("competition", 3))

            score = (
                (r_cap / 5.0) * 25 +
                (r_comp / 5.0) * 25 +
                (r_res / 5.0) * 15 +
                (r_marg / 5.0) * 15 +
                (r_rel / 5.0) * 10 +
                (r_win / 5.0) * 10
            )
            score_int = int(round(score))

            if score_int >= 75:
                decision = "Go"
                rec = "Strong Strategic Fit: High technical match and compliant with B-BBEE/Tax requirements. Proceed to bid drafting."
            elif score_int >= 60:
                decision = "Caution"
                rec = "Moderate Fit: Review critical compliance prerequisites (TCS PIN, Briefing, Subcontracting) before allocating bid team."
            else:
                decision = "No-Go"
                rec = "High Risk / Disqualification Risk: Recommend declining or bidding only as sub-contractor."

            tender_id = data.get("tender_id")
            if tender_id:
                database.update_tender(tender_id, {
                    "go_no_go_score": score_int,
                    "go_no_go_decision": decision
                })

            self.send_json({
                "score": score_int,
                "decision": decision,
                "recommendation": rec
            })
            return

        self.send_json({"error": "Endpoint not found"}, 404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/tenders/"):
            parts = path.split("/")
            if len(parts) == 4 and parts[3].isdigit():
                tender_id = int(parts[3])
                data = self.read_json_body()
                updated = database.update_tender(tender_id, data)
                if updated:
                    self.send_json(updated)
                else:
                    self.send_json({"error": "Tender not found"}, 404)
                return

        self.send_json({"error": "Endpoint not found"}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/tenders/"):
            parts = path.split("/")
            if len(parts) == 4 and parts[3].isdigit():
                tender_id = int(parts[3])
                success = database.delete_tender(tender_id)
                self.send_json({"success": success})
                return

        self.send_json({"error": "Endpoint not found"}, 404)

def run(port=PORT):
    # Re-initialize database
    database.init_db()
    with socketserver.TCPServer(("", port), TenderHandler) as httpd:
        print(f"============================================================")
        print(f" TenderPulse SA Tracker (Gauteng & Limpopo)")
        print(f" Running at http://localhost:{port}")
        print(f" Currency: South African Rand (ZAR / R)")
        print(f" Alert System: WhatsApp & Email Configured")
        print(f"============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.shutdown()

if __name__ == "__main__":
    run()
