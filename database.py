"""
database.py - SQLite Database Layer for South African Tender Tracker
Focused on Gauteng & Limpopo tenders across Government and Private sectors
with full support for SARS Tax PIN, CSD, B-BBEE, SBD/MBD forms, and ZAR currency.
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tenders.db")

def get_connection(db_path=None):
    path = db_path or DB_FILE
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=None):
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Tenders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tenders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        issuing_entity TEXT NOT NULL,
        province TEXT NOT NULL DEFAULT 'Gauteng', -- 'Gauteng', 'Limpopo', 'National'
        sector TEXT NOT NULL, -- 'Government', 'Private Sector'
        category TEXT NOT NULL, -- 'Digital Marketing', 'Software & Systems Development'
        sub_category TEXT,
        status TEXT NOT NULL DEFAULT 'Identified',
        priority TEXT DEFAULT 'Medium',
        estimated_value REAL DEFAULT 0,
        currency TEXT DEFAULT 'ZAR',
        location TEXT,
        publication_date TEXT,
        briefing_date TEXT,
        briefing_type TEXT DEFAULT 'None',
        clarification_deadline TEXT,
        submission_deadline TEXT,
        submission_method TEXT DEFAULT 'Online Portal',
        portal_url TEXT,
        bid_bond_required INTEGER DEFAULT 0,
        bid_bond_amount REAL DEFAULT 0,
        go_no_go_score INTEGER DEFAULT 0,
        go_no_go_decision TEXT DEFAULT 'Pending',
        lead_assignee TEXT,
        tech_lead TEXT,
        description TEXT,
        scope_of_work TEXT,
        compliance_score INTEGER DEFAULT 0,
        win_probability INTEGER DEFAULT 50,
        bbbee_requirement TEXT DEFAULT 'Level 1 or 2',
        notes TEXT,
        created_at TEXT,
        updated_at TEXT
    );
    """)

    # Compliance Checklist Items
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tender_compliance_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tender_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        required INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Pending', -- 'Pending', 'Verified', 'Missing', 'N/A'
        notes TEXT,
        FOREIGN KEY (tender_id) REFERENCES tenders (id) ON DELETE CASCADE
    );
    """)

    # Milestones & Key Action Items
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tender_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tender_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        due_date TEXT,
        owner TEXT,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (tender_id) REFERENCES tenders (id) ON DELETE CASCADE
    );
    """)

    # Tender Sources Directory
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tender_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL, -- 'Government Portal', 'Private RFP Board', 'Provincial Bulletin'
        province TEXT DEFAULT 'Gauteng / Limpopo',
        url TEXT,
        category_focus TEXT,
        active INTEGER DEFAULT 1,
        last_scraped_at TEXT
    );
    """)

    conn.commit()

    # Re-seed if tenders table is empty or needs schema refresh
    cursor.execute("SELECT COUNT(*) FROM tenders")
    if cursor.fetchone()[0] == 0:
        seed_sample_data(conn)

    conn.close()

def seed_sample_data(conn):
    cursor = conn.cursor()
    now = datetime.now()

    def d_str(days_offset):
        return (now + timedelta(days=days_offset)).strftime("%Y-%m-%d")

    sample_tenders = [
        # 1. GAUTENG - Government - Software & Systems Development
        {
            "ref_number": "GPG-EDEV-2026-088",
            "title": "Provincial Cloud Infrastructure Modernization & Citizen e-Services Portal Phase 2",
            "issuing_entity": "Gauteng Department of e-Government",
            "province": "Gauteng",
            "sector": "Government",
            "category": "Software & Systems Development",
            "sub_category": "Cloud & Microservices Modernization",
            "status": "In Preparation",
            "priority": "High",
            "estimated_value": 18500000.0,
            "currency": "ZAR",
            "location": "Johannesburg / Remote Cloud",
            "publication_date": d_str(-14),
            "briefing_date": d_str(2) + " 10:00 AM",
            "briefing_type": "Compulsory Virtual (MS Teams)",
            "clarification_deadline": d_str(7),
            "submission_deadline": d_str(16) + " 11:00 AM",
            "submission_method": "e-Tender Box & 2 Sealed USB Drives",
            "portal_url": "https://www.gauteng.gov.za/e-tenders/edev-088",
            "bid_bond_required": 0,
            "bid_bond_amount": 0.0,
            "go_no_go_score": 88,
            "go_no_go_decision": "Go",
            "lead_assignee": "Sipho Ndlovu (Bid Manager)",
            "tech_lead": "Thabo Mokoena (Cloud Architect)",
            "bbbee_requirement": "B-BBEE Level 1 or 2 with 30% local subcontracting",
            "description": "Appointment of an accredited software development service provider to migrate core provincial citizen services onto hybrid cloud (Azure / AWS) with zero-downtime architecture.",
            "scope_of_work": "• Cloud-native microservices development in Node.js / Go\n• Secure OAuth2 / biometrics citizen single-sign-on (SSO)\n• POPIA-compliant data residency in South Africa\n• SLA: 24/7 support with 99.95% uptime",
            "compliance_score": 90,
            "win_probability": 75,
            "notes": "Compulsory virtual briefing on MS Teams in 2 days. TCS PIN and CSD report verified."
        },

        # 2. LIMPOPO - Government - Software & Systems Development
        {
            "ref_number": "LP-HEALTH-2026-031",
            "title": "Integrated Primary Healthcare Clinic Dispensing & Electronic Health Records (EHR) System",
            "issuing_entity": "Limpopo Department of Health",
            "province": "Limpopo",
            "sector": "Government",
            "category": "Software & Systems Development",
            "sub_category": "Custom Healthcare Software & Database",
            "status": "Go/No-Go Review",
            "priority": "High",
            "estimated_value": 14800000.0,
            "currency": "ZAR",
            "location": "Polokwane (Covering Capricorn & Vhembe Districts)",
            "publication_date": d_str(-6),
            "briefing_date": d_str(4) + " 11:00 AM",
            "briefing_type": "Compulsory In-Person (DOH Auditorium, Polokwane)",
            "clarification_deadline": d_str(11),
            "submission_deadline": d_str(24) + " 11:00 AM",
            "submission_method": "Two-Envelope Physical Delivery (Tender Box, 18 College St, Polokwane)",
            "portal_url": "https://www.limtreasury.gov.za/bulletin/health-031",
            "bid_bond_required": 1,
            "bid_bond_amount": 250000.0,
            "go_no_go_score": 82,
            "go_no_go_decision": "Go",
            "lead_assignee": "Kgomotso Phala",
            "tech_lead": "David Chen",
            "bbbee_requirement": "Level 1 B-BBEE Contributor",
            "description": "Supply, installation, commissioning, and maintenance of an offline-first Electronic Health Record and clinic pharmaceutical dispensing system for 85 rural clinics.",
            "scope_of_work": "• Offline-first synchronization for rural clinics with intermittent power/connectivity\n• Fingerprint patient biometric lookup\n• Integration with National Health Laboratory Service (NHLS)\n• On-site nurse and pharmacist training across Capricorn and Vhembe districts",
            "compliance_score": 85,
            "win_probability": 70,
            "notes": "Physical briefing in Polokwane next week. Two-envelope system strictly enforced."
        },

        # 3. GAUTENG - Government - Digital Marketing
        {
            "ref_number": "GTA-MKT-2026-019",
            "title": "Global & Domestic Destination Marketing: Omnichannel SEO, Social Media, Creative Video & Media Buying",
            "issuing_entity": "Gauteng Tourism Authority (GTA)",
            "province": "Gauteng",
            "sector": "Government",
            "category": "Digital Marketing",
            "sub_category": "Performance Marketing & Creative Production",
            "status": "In Preparation",
            "priority": "High",
            "estimated_value": 7500000.0,
            "currency": "ZAR",
            "location": "Rosebank, Johannesburg",
            "publication_date": d_str(-12),
            "briefing_date": d_str(3) + " 10:00 AM",
            "briefing_type": "Compulsory Virtual (Zoom)",
            "clarification_deadline": d_str(9),
            "submission_deadline": d_str(19) + " 12:00 PM",
            "submission_method": "GTA e-Submission Portal",
            "portal_url": "https://gauteng.net/procurement/rfp-019",
            "bid_bond_required": 0,
            "bid_bond_amount": 0.0,
            "go_no_go_score": 92,
            "go_no_go_decision": "Go",
            "lead_assignee": "Nomvula Khumalo",
            "tech_lead": "Lerato Sithole (Creative Director)",
            "bbbee_requirement": "51% Black-owned, Level 1 or 2",
            "description": "Appointment of a 360-degree digital creative and media agency to drive domestic and international tourism footfall to Gauteng heritage sites, nightlife, and business conferences.",
            "scope_of_work": "• Search Engine Marketing & SEO for visitgauteng.net\n• Multi-platform social media strategy (TikTok, Instagram, YouTube, LinkedIn)\n• 4K Cinematic video content production and influencer marketing activations\n• Programmatic display and real-time ROAS reporting dashboard",
            "compliance_score": 95,
            "win_probability": 80,
            "notes": "Pitch presentation scheduled for shortlisted agencies. Briefing link active."
        },

        # 4. LIMPOPO - Government - Digital Marketing
        {
            "ref_number": "LTA-DIGI-2026-007",
            "title": "Eco-Tourism & Wildlife Heritage Digital Marketing, Social Media Campaign & Performance Ad Management",
            "issuing_entity": "Limpopo Tourism Agency (LTA)",
            "province": "Limpopo",
            "sector": "Government",
            "category": "Digital Marketing",
            "sub_category": "Brand Strategy & Social Media",
            "status": "Under Review",
            "priority": "Medium",
            "estimated_value": 3800000.0,
            "currency": "ZAR",
            "location": "Polokwane & Waterberg Reserve",
            "publication_date": d_str(-18),
            "briefing_date": d_str(-8),
            "briefing_type": "Compulsory Virtual",
            "clarification_deadline": d_str(-3),
            "submission_deadline": d_str(5) + " 11:00 AM",
            "submission_method": "Physical Tender Box, Southern Gateway, Polokwane",
            "portal_url": "https://www.golimpopo.com/tenders/lta-007",
            "bid_bond_required": 0,
            "bid_bond_amount": 0.0,
            "go_no_go_score": 85,
            "go_no_go_decision": "Go",
            "lead_assignee": "Nomvula Khumalo",
            "tech_lead": "Lerato Sithole",
            "bbbee_requirement": "Level 1 B-BBEE QSE / EME",
            "description": "Digital marketing and experiential social media campaign promoting Kruger National Park northern gate, Mapungubwe Cultural Landscape, and Waterberg biosphere.",
            "scope_of_work": "• Meta & TikTok performance ads targeting SADC and EU tourists\n• SEO optimization and localized content creation in English, German, and French\n• Micro-influencer bush safari activations\n• Conversion tracking for lodge and park bookings",
            "compliance_score": 100,
            "win_probability": 75,
            "notes": "Bid proposal finalized. Closes in 5 days. Hand courier arranged to Polokwane tender box."
        },

        # 5. GAUTENG - Private Sector - Software & Systems Development
        {
            "ref_number": "PVT-VOD-2026-512",
            "title": "Headless Digital Self-Care Web & Mobile Application Development Framework",
            "issuing_entity": "Vodacom Group South Africa",
            "province": "Gauteng",
            "sector": "Private Sector",
            "category": "Software & Systems Development",
            "sub_category": "Mobile App & Headless Web",
            "status": "Submitted",
            "priority": "High",
            "estimated_value": 11500000.0,
            "currency": "ZAR",
            "location": "Midrand, Johannesburg",
            "publication_date": d_str(-25),
            "briefing_date": d_str(-15),
            "briefing_type": "Optional Virtual (MS Teams)",
            "clarification_deadline": d_str(-8),
            "submission_deadline": d_str(-1),
            "submission_method": "Coupa Supplier Portal",
            "portal_url": "https://vodacom.supplier.coupahost.com/rfp-512",
            "bid_bond_required": 0,
            "bid_bond_amount": 0.0,
            "go_no_go_score": 94,
            "go_no_go_decision": "Go",
            "lead_assignee": "Sipho Ndlovu",
            "tech_lead": "Thabo Mokoena",
            "bbbee_requirement": "B-BBEE Level 1-4 with valid Tax PIN",
            "description": "Enterprise RFP for engineering Next.js and Flutter customer self-service applications with eSIM onboarding, airtime recharge, and fiber management.",
            "scope_of_work": "• Flutter cross-platform iOS & Android mobile application\n• Next.js / TypeScript micro-frontends\n• Real-time billing integration via Kafka event bus\n• High security compliance with OWASP Top 10 and POPIA",
            "compliance_score": 100,
            "win_probability": 82,
            "notes": "Proposal submitted via Coupa. Technical demonstration scheduled with Vodacom Digital team."
        },

        # 6. LIMPOPO - Private Sector - Software & Systems Development (Mining Sector)
        {
            "ref_number": "PVT-AMPLAT-2026-904",
            "title": "Mogalakwena Open-Pit Mine: Real-Time Worker Safety Telemetry & Mobile IoT Dispatch System",
            "issuing_entity": "Anglo American Platinum",
            "province": "Limpopo",
            "sector": "Private Sector",
            "category": "Software & Systems Development",
            "sub_category": "Mining IoT & Telemetry Software",
            "status": "Identified",
            "priority": "High",
            "estimated_value": 10800000.0,
            "currency": "ZAR",
            "location": "Mokopane / Polokwane, Limpopo",
            "publication_date": d_str(-3),
            "briefing_date": d_str(6) + " 10:00 AM",
            "briefing_type": "Optional Virtual",
            "clarification_deadline": d_str(14),
            "submission_deadline": d_str(28) + " 16:00 PM",
            "submission_method": "SAP Ariba Discovery Portal",
            "portal_url": "https://discovery.ariba.com/rfp/anglo-904",
            "bid_bond_required": 0,
            "bid_bond_amount": 0.0,
            "go_no_go_score": 86,
            "go_no_go_decision": "Go",
            "lead_assignee": "Kgomotso Phala",
            "tech_lead": "Thabo Mokoena",
            "bbbee_requirement": "Preferential procurement for Limpopo-based suppliers",
            "description": "Private procurement for an IoT dispatch dashboard and mobile telemetry application connecting heavy machinery, haul trucks, and wearable safety bands.",
            "scope_of_work": "• Ruggedized Android tablet app for haul truck drivers\n• Geofencing collision avoidance algorithms\n• Integration with mine telemetry sensor networks\n• Mine Health and Safety Act compliance logs",
            "compliance_score": 75,
            "win_probability": 65,
            "notes": "High-value mining opportunity. Preparing capability statement highlighting industrial IoT expertise."
        },

        # 7. GAUTENG - Private Sector - Digital Marketing
        {
            "ref_number": "PVT-DISC-2026-310",
            "title": "Omnichannel Digital Performance Marketing, Paid Search (Google Ads) & Conversion Optimization",
            "issuing_entity": "Discovery Health & Vitality",
            "province": "Gauteng",
            "sector": "Private Sector",
            "category": "Digital Marketing",
            "sub_category": "SEO & Performance Marketing",
            "status": "Won",
            "priority": "High",
            "estimated_value": 4900000.0,
            "currency": "ZAR",
            "location": "Sandton, Johannesburg",
            "publication_date": d_str(-60),
            "briefing_date": d_str(-48),
            "briefing_type": "Optional Virtual",
            "clarification_deadline": d_str(-35),
            "submission_deadline": d_str(-25),
            "submission_method": "Direct Procurement Submission",
            "portal_url": "https://discovery.co.za/procure/rfp-310",
            "bid_bond_required": 0,
            "bid_bond_amount": 0.0,
            "go_no_go_score": 96,
            "go_no_go_decision": "Go",
            "lead_assignee": "Nomvula Khumalo",
            "tech_lead": "Lerato Sithole",
            "bbbee_requirement": "Level 1 or 2 B-BBEE",
            "description": "12-month performance marketing retainer to drive Vitality health policy signups and online gap cover quotes.",
            "scope_of_work": "• High intent Google Search & Performance Max campaigns\n• Landing page conversion rate optimization (CRO) A/B testing\n• Social media retargeting across Meta and LinkedIn\n• Multi-touch attribution modeling",
            "compliance_score": 100,
            "win_probability": 100,
            "notes": "Tender awarded! 12-month contract signed with monthly billing of R408k."
        }
    ]

    for t in sample_tenders:
        cursor.execute("""
        INSERT INTO tenders (
            ref_number, title, issuing_entity, province, sector, category, sub_category,
            status, priority, estimated_value, currency, location, publication_date,
            briefing_date, briefing_type, clarification_deadline, submission_deadline,
            submission_method, portal_url, bid_bond_required, bid_bond_amount,
            go_no_go_score, go_no_go_decision, lead_assignee, tech_lead,
            bbbee_requirement, description, scope_of_work, compliance_score, win_probability, notes,
            created_at, updated_at
        ) VALUES (
            :ref_number, :title, :issuing_entity, :province, :sector, :category, :sub_category,
            :status, :priority, :estimated_value, :currency, :location, :publication_date,
            :briefing_date, :briefing_type, :clarification_deadline, :submission_deadline,
            :submission_method, :portal_url, :bid_bond_required, :bid_bond_amount,
            :go_no_go_score, :go_no_go_decision, :lead_assignee, :tech_lead,
            :bbbee_requirement, :description, :scope_of_work, :compliance_score, :win_probability, :notes,
            datetime('now'), datetime('now')
        )
        """, t)

        tender_id = cursor.lastrowid

        # Standard South African Statutory Compliance Checklist
        if t["sector"] == "Government":
            compliance_items = [
                ("Valid SARS Tax Compliance Status (TCS PIN)", 1, "Verified"),
                ("Central Supplier Database (CSD) Master Registration Report (MAAA...)", 1, "Verified"),
                ("Valid B-BBEE Level Contributor Status (Sworn Affidavit / SANAS Cert)", 1, "Verified" if t["compliance_score"] > 80 else "Pending"),
                ("SBD 4: Declaration of Interest Completed & Signed", 1, "Verified"),
                ("SBD 6.1: Preference Points Claim Form (80/20 or 90/10)", 1, "Verified"),
                ("Certified Copies of Director IDs & CIPC CoR14.3 (Within 3 Months)", 1, "Verified"),
                ("Compulsory Briefing Attendance Certificate / MS Teams Sign-in Log", 1, "Pending"),
                ("Audited Annual Financial Statements (Past 3 Consecutive Years)", 1, "Verified"),
                ("COIDA Letter of Good Standing (Compensation Fund)", 1, "Verified"),
                ("Two-Envelope Separation (Technical Functionality vs Financial Offer)", 1, "Pending")
            ]
        else:
            compliance_items = [
                ("Valid SARS Tax PIN / Tax Clearance", 1, "Verified"),
                ("CIPC Certificate of Incorporation & Company Registration", 1, "Verified"),
                ("Mutual Non-Disclosure Agreement (NDA) Executed", 1, "Verified"),
                ("B-BBEE Certificate or Sworn Affidavit", 1, "Verified"),
                ("Public Liability & Professional Indemnity Insurance (min R10m)", 1, "Verified"),
                ("POPIA & Information Security Policy Compliant", 1, "Verified"),
                ("3x Verified Client References in Gauteng/Limpopo", 1, "Verified")
            ]

        for item_title, required, status in compliance_items:
            cursor.execute("""
            INSERT INTO tender_compliance_items (tender_id, title, required, status)
            VALUES (?, ?, ?, ?)
            """, (tender_id, item_title, required, status))

        # Seed key proposal milestones
        milestones = [
            ("RFP Clarification Questions Submission to Bid Office", d_str(4), t["lead_assignee"], 1 if t["status"] in ["Submitted", "Won"] else 0),
            ("Technical Proposal / Architecture Draft Complete", d_str(8), t["tech_lead"], 1 if t["status"] in ["Submitted", "Won"] else 0),
            ("Financial Costing & Bill of Quantities Sign-off", d_str(11), t["lead_assignee"], 1 if t["status"] in ["Submitted", "Won"] else 0),
            ("Executive Red-Team Quality Audit & SBD Review", d_str(13), "Executive Review Committee", 1 if t["status"] in ["Submitted", "Won"] else 0),
            ("Final Bid Submission & Proof of Delivery Receipt", d_str(15), t["lead_assignee"], 1 if t["status"] in ["Submitted", "Won"] else 0)
        ]

        for m_title, m_due, m_owner, m_done in milestones:
            cursor.execute("""
            INSERT INTO tender_milestones (tender_id, title, due_date, owner, completed)
            VALUES (?, ?, ?, ?, ?)
            """, (tender_id, m_title, m_due, m_owner, m_done))

    # Seed South African Specific Sources (Gauteng & Limpopo Focus)
    sources = [
        ("National Treasury e-Tender Portal", "Government Portal", "National", "https://www.etenders.gov.za", "All Categories", 1),
        ("Gauteng Provincial Treasury e-Tenders (GPG)", "Provincial Bulletin", "Gauteng", "https://www.gauteng.gov.za/e-tenders", "Software & Marketing", 1),
        ("Limpopo Provincial Treasury Tender Bulletin", "Provincial Bulletin", "Limpopo", "https://www.limtreasury.gov.za", "Software & Marketing", 1),
        ("State Information Technology Agency (SITA)", "Government Portal", "National / Gauteng", "https://www.sita.co.za/tenders", "Software & Systems Dev", 1),
        ("City of Johannesburg Metropolitan Municipality", "Government Portal", "Gauteng", "https://www.joburg.org.za/work_/Pages/Work%20in%20Joburg/Tenders/Tenders.aspx", "All Categories", 1),
        ("City of Tshwane (Pretoria) Metropolitan", "Government Portal", "Gauteng", "https://www.tshwane.gov.za/e-tenders", "Software & Systems Dev", 1),
        ("Polokwane Local Municipality", "Government Portal", "Limpopo", "https://www.polokwane.gov.za/tenders", "All Categories", 1),
        ("Government Communication & Information System (GCIS)", "Government Portal", "National / Gauteng", "https://www.gcis.gov.za/tenders", "Digital Marketing", 1),
        ("Mining Sector RFP Boards (Anglo, Sibanye, Impala)", "Private RFP Board", "Limpopo & Gauteng", "https://angloamerican.com/procurement", "Software & Telemetry", 1),
        ("SAP Ariba South Africa Enterprise Discovery", "Private RFP Board", "National", "https://discovery.ariba.com", "Software & Digital Marketing", 1),
        ("Coupa South Africa Corporate Procurement", "Private RFP Board", "National", "https://supplier.coupahost.com", "Digital Marketing & Software", 1)
    ]

    for s in sources:
        cursor.execute("""
        INSERT INTO tender_sources (name, source_type, province, url, category_focus, active, last_scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-1 hours'))
        """, s)

    conn.commit()

# --- Query & Mutation Functions ---

def get_tenders(filters=None):
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM tenders WHERE 1=1"
    params = []

    if filters:
        if filters.get("province") and filters["province"] != "All":
            query += " AND province = ?"
            params.append(filters["province"])

        if filters.get("sector") and filters["sector"] != "All":
            query += " AND sector = ?"
            params.append(filters["sector"])

        if filters.get("category") and filters["category"] != "All":
            query += " AND category = ?"
            params.append(filters["category"])

        if filters.get("status") and filters["status"] != "All":
            query += " AND status = ?"
            params.append(filters["status"])

        if filters.get("priority") and filters["priority"] != "All":
            query += " AND priority = ?"
            params.append(filters["priority"])

        if filters.get("search"):
            search = f"%{filters['search']}%"
            query += " AND (title LIKE ? OR ref_number LIKE ? OR issuing_entity LIKE ? OR description LIKE ? OR location LIKE ?)"
            params.extend([search, search, search, search, search])

    query += " ORDER BY CASE status WHEN 'In Preparation' THEN 1 WHEN 'Go/No-Go Review' THEN 2 WHEN 'Identified' THEN 3 WHEN 'Under Review' THEN 4 WHEN 'Submitted' THEN 5 WHEN 'Won' THEN 6 ELSE 7 END, submission_deadline ASC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_tender_by_id(tender_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tenders WHERE id = ?", (tender_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    tender = dict(row)

    # Compliance items
    cursor.execute("SELECT * FROM tender_compliance_items WHERE tender_id = ?", (tender_id,))
    tender["compliance_items"] = [dict(r) for r in cursor.fetchall()]

    # Milestones
    cursor.execute("SELECT * FROM tender_milestones WHERE tender_id = ? ORDER BY due_date ASC", (tender_id,))
    tender["milestones"] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return tender

def create_tender(data):
    conn = get_connection()
    cursor = conn.cursor()

    # Generate reference number if not provided
    if not data.get("ref_number"):
        prov_prefix = "GP" if data.get("province") == "Gauteng" else ("LP" if data.get("province") == "Limpopo" else "NAT")
        sector_prefix = "GOV" if data.get("sector") == "Government" else "PVT"
        cat_code = "MKT" if "Marketing" in data.get("category", "") else "DEV"
        data["ref_number"] = f"{sector_prefix}-{prov_prefix}-{cat_code}-{int(datetime.now().timestamp()) % 100000}"

    if not data.get("currency"):
        data["currency"] = "ZAR"

    fields = [
        "ref_number", "title", "issuing_entity", "province", "sector", "category", "sub_category",
        "status", "priority", "estimated_value", "currency", "location", "publication_date",
        "briefing_date", "briefing_type", "clarification_deadline", "submission_deadline",
        "submission_method", "portal_url", "bid_bond_required", "bid_bond_amount",
        "go_no_go_score", "go_no_go_decision", "lead_assignee", "tech_lead",
        "bbbee_requirement", "description", "scope_of_work", "compliance_score", "win_probability", "notes"
    ]

    columns = []
    placeholders = []
    values = []

    for f in fields:
        if f in data:
            columns.append(f)
            placeholders.append("?")
            values.append(data[f])

    columns.extend(["created_at", "updated_at"])
    placeholders.extend(["datetime('now')", "datetime('now')"])

    sql = f"INSERT INTO tenders ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
    cursor.execute(sql, values)
    tender_id = cursor.lastrowid

    # Auto-add default SA compliance items
    is_gov = data.get("sector") == "Government"
    if is_gov:
        default_items = [
            ("Valid SARS Tax Compliance Status (TCS PIN)", 1, "Pending"),
            ("CSD Master Registration Report (MAAA number)", 1, "Pending"),
            ("Valid B-BBEE Certificate or Sworn Affidavit", 1, "Pending"),
            ("SBD 4: Declaration of Interest Completed", 1, "Pending"),
            ("SBD 6.1: Preference Points Claim Form", 1, "Pending"),
            ("Certified Director IDs & CIPC CoR14.3", 1, "Pending"),
            ("Compulsory Briefing Attendance / MS Teams Log", 1, "Pending"),
            ("Audited Financial Statements (Past 3 Years)", 1, "Pending")
        ]
    else:
        default_items = [
            ("Valid SARS Tax PIN / Clearance", 1, "Pending"),
            ("CIPC Registration Documents", 1, "Pending"),
            ("B-BBEE Certificate / Affidavit", 1, "Pending"),
            ("Mutual Non-Disclosure Agreement (NDA)", 1, "Pending"),
            ("Proof of Public Liability Insurance", 1, "Pending"),
            ("Client Reference Letters", 1, "Pending")
        ]

    for title, req, status in default_items:
        cursor.execute("INSERT INTO tender_compliance_items (tender_id, title, required, status) VALUES (?, ?, ?, ?)",
                       (tender_id, title, req, status))

    conn.commit()
    conn.close()
    return get_tender_by_id(tender_id)

def update_tender(tender_id, data):
    conn = get_connection()
    cursor = conn.cursor()

    fields = [
        "title", "issuing_entity", "province", "sector", "category", "sub_category",
        "status", "priority", "estimated_value", "currency", "location",
        "publication_date", "briefing_date", "briefing_type", "clarification_deadline",
        "submission_deadline", "submission_method", "portal_url", "bid_bond_required",
        "bid_bond_amount", "go_no_go_score", "go_no_go_decision", "lead_assignee",
        "tech_lead", "bbbee_requirement", "description", "scope_of_work", "compliance_score",
        "win_probability", "notes"
    ]

    set_clauses = []
    values = []

    for f in fields:
        if f in data:
            set_clauses.append(f"{f} = ?")
            values.append(data[f])

    if not set_clauses:
        conn.close()
        return get_tender_by_id(tender_id)

    set_clauses.append("updated_at = datetime('now')")
    values.append(tender_id)

    sql = f"UPDATE tenders SET {', '.join(set_clauses)} WHERE id = ?"
    cursor.execute(sql, values)
    conn.commit()
    conn.close()
    return get_tender_by_id(tender_id)

def delete_tender(tender_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tender_compliance_items WHERE tender_id = ?", (tender_id,))
    cursor.execute("DELETE FROM tender_milestones WHERE tender_id = ?", (tender_id,))
    cursor.execute("DELETE FROM tenders WHERE id = ?", (tender_id,))
    conn.commit()
    conn.close()
    return True

def toggle_compliance_item(item_id, status=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, tender_id FROM tender_compliance_items WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    current_status = row["status"]
    tender_id = row["tender_id"]

    if status:
        new_status = status
    else:
        new_status = "Verified" if current_status != "Verified" else "Pending"

    cursor.execute("UPDATE tender_compliance_items SET status = ? WHERE id = ?", (new_status, item_id))

    cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Verified' THEN 1 ELSE 0 END) as verified FROM tender_compliance_items WHERE tender_id = ?", (tender_id,))
    comp_row = cursor.fetchone()
    total = comp_row["total"] or 1
    verified = comp_row["verified"] or 0
    score = int((verified / total) * 100)

    cursor.execute("UPDATE tenders SET compliance_score = ? WHERE id = ?", (score, tender_id))

    conn.commit()
    conn.close()
    return {"id": item_id, "status": new_status, "compliance_score": score, "tender_id": tender_id}

def toggle_milestone(milestone_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT completed, tender_id FROM tender_milestones WHERE id = ?", (milestone_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    new_val = 0 if row["completed"] == 1 else 1
    cursor.execute("UPDATE tender_milestones SET completed = ? WHERE id = ?", (new_val, milestone_id))
    conn.commit()
    conn.close()
    return {"id": milestone_id, "completed": new_val, "tender_id": row["tender_id"]}

def get_stats():
    conn = get_connection()
    cursor = conn.cursor()

    stats = {}

    cursor.execute("SELECT COUNT(*) as total_count, COALESCE(SUM(estimated_value), 0) as total_val FROM tenders")
    r = cursor.fetchone()
    stats["total_tenders"] = r["total_count"]
    stats["total_pipeline_value"] = r["total_val"]

    cursor.execute("SELECT COUNT(*) as active_count, COALESCE(SUM(estimated_value), 0) as active_val FROM tenders WHERE status NOT IN ('Won', 'Lost', 'Cancelled')")
    r = cursor.fetchone()
    stats["active_tenders"] = r["active_count"]
    stats["active_pipeline_value"] = r["active_val"]

    cursor.execute("SELECT COUNT(*) as won_count, COALESCE(SUM(estimated_value), 0) as won_val FROM tenders WHERE status = 'Won'")
    won_r = cursor.fetchone()
    stats["won_tenders"] = won_r["won_count"]
    stats["won_value"] = won_r["won_val"]

    cursor.execute("SELECT COUNT(*) FROM tenders WHERE status IN ('Won', 'Lost')")
    decided_count = cursor.fetchone()[0]
    stats["win_rate"] = int((stats["won_tenders"] / decided_count * 100)) if decided_count > 0 else 0

    # Sector breakdown
    cursor.execute("SELECT sector, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value FROM tenders GROUP BY sector")
    stats["by_sector"] = {r["sector"]: {"count": r["count"], "value": r["value"]} for r in cursor.fetchall()}

    # Category breakdown
    cursor.execute("SELECT category, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value FROM tenders GROUP BY category")
    stats["by_category"] = {r["category"]: {"count": r["count"], "value": r["value"]} for r in cursor.fetchall()}

    # Province breakdown (Gauteng vs Limpopo vs National)
    cursor.execute("SELECT province, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value FROM tenders GROUP BY province")
    stats["by_province"] = {r["province"]: {"count": r["count"], "value": r["value"]} for r in cursor.fetchall()}

    # Status breakdown
    cursor.execute("SELECT status, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value FROM tenders GROUP BY status")
    stats["by_status"] = {r["status"]: {"count": r["count"], "value": r["value"]} for r in cursor.fetchall()}

    # Urgent deadlines (< 7 days)
    now_str = datetime.now().strftime("%Y-%m-%d")
    seven_days = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d 23:59:59")
    cursor.execute("""
    SELECT COUNT(*) FROM tenders
    WHERE status NOT IN ('Won', 'Lost', 'Cancelled')
    AND submission_deadline >= ? AND submission_deadline <= ?
    """, (now_str, seven_days))
    stats["closing_soon_count"] = cursor.fetchone()[0]

    conn.close()
    return stats

def get_sources():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tender_sources ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
