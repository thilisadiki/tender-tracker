# TenderPulse | Enterprise Tender Tracker

A comprehensive tender management and bid tracking application tailored specifically for **Digital Marketing** and **Software & Systems Development** opportunities across both **Government (Public Sector)** and **Private Sector (Enterprise)** procurement.

---

## 🎯 Key Capabilities

- **Multi-Sector Tracking**: Supports the procedural differences between Government tenders (tax pins, CSD registration, compulsory briefings, two-envelope physical/online bidding) and Private Sector RFPs (commercial agility, Coupa/Ariba portals, NDAs, fast turnarounds).
- **Domain Specialization**: Pre-configured taxonomy, keyword matching, and evaluation models for:
  - **Software & Systems Development**: Custom Web/Mobile Apps, Enterprise ERP/CRM, Cloud & DevOps, API Gateways, Cybersecurity, Data Analytics.
  - **Digital Marketing**: Omnichannel Performance Marketing, SEO/SEM, Social Media Campaigns, Brand Strategy, Creative Video Production, Web CRO.
- **Interactive Kanban Pipeline**: 6-stage bid lifecycle: `Identified` ➔ `Go/No-Go Review` ➔ `In Preparation` ➔ `Under Review` ➔ `Submitted` ➔ `Awarded / Won`.
- **Automated Go / No-Go Decision Calculator**: Weighted multi-factor evaluation matrix (Capability 25%, Compliance 25%, Capacity 15%, Profit Margin 15%, Client Relationship 10%, Competition 10%).
- **Statutory Compliance Checklist**: Dynamic verification tracker with automated compliance scoring for mandatory tax, B-BBEE/diversity, corporate incorporation, insurance, and briefing certificates.
- **Scraper & Discovery Hub**: Integrated scraper simulator and feed aggregator scanning national e-tender portals, SITA, GCIS, SAP Ariba, and Coupa with 1-click pipeline import.
- **Real-Time Deadlines & Alerts**: Dynamic countdown warnings for closing dates (< 7 days), briefing sessions, and clarification windows.
- **Exporting**: One-click export to CSV and JSON formats for executive reporting.

---

## 🚀 Quick Start

### 1. Launch the Server
Zero external dependencies required (runs natively with Python 3.9+ standard library):

```bash
# Using the launch script (automatically opens your browser)
./start.sh

# Or directly with Python
python3 server.py
```

### 2. Access the Application
Open your web browser and navigate to:
```
http://localhost:8000
```

### 3. Run Automated Tests
```bash
python3 test_tracker.py
```

---

## 📁 Repository Structure

```
tender tracker/
├── IMPLEMENTATION_PLAN.md    # Formal implementation & operational rollout roadmap
├── README.md                 # System overview and quick-start guide
├── start.sh                  # One-click launch script
├── server.py                 # REST API server & static asset handler (Python 3)
├── database.py               # SQLite database layer, schema, seed data, and KPIs
├── scraper_engine.py         # Keyword matching, sector classification & feed engine
├── test_tracker.py           # Comprehensive unit & integration test suite
├── tenders.db                # SQLite database (auto-generated on launch)
└── static/                   # Modern Single Page Application (SPA)
    ├── index.html            # Dashboard, Kanban, Table, Scraper, & Matrix views
    ├── styles.css            # Enterprise responsive UI design system
    └── app.js                # State management, API sync, and modal interactions
```

---

## 📊 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tenders` | List tenders with optional query filters (`sector`, `category`, `status`, `search`) |
| `GET` | `/api/tenders/<id>` | Retrieve full tender details including compliance checklist and milestones |
| `POST` | `/api/tenders` | Create a new tender notice with auto-categorization |
| `PUT` | `/api/tenders/<id>` | Update tender details, stage, or priority |
| `DELETE` | `/api/tenders/<id>` | Delete a tender and its associated records |
| `POST` | `/api/compliance/<id>/toggle` | Toggle verification state of a compliance item & recalculate score |
| `POST` | `/api/milestones/<id>/toggle` | Toggle completion status of a tender milestone |
| `GET` | `/api/stats` | Pipeline KPI metrics, sector and category breakdowns, win rate |
| `GET` | `/api/discover` | Live feed of newly discovered public and private tenders |
| `POST` | `/api/discover/import` | Import a discovered tender into the active pipeline |
| `POST` | `/api/gonogo/evaluate` | Calculate weighted Go/No-Go score and recommendation |
| `GET` | `/api/export?format=csv` | Download active tender pipeline as a formatted CSV |

---

## 📋 Implementation Plan Summary

See [IMPLEMENTATION_PLAN.md](file:///Users/jasonsadiki/tender%20tracker/IMPLEMENTATION_PLAN.md) for the detailed implementation roadmap covering:
1. **Strategic Distinction**: Navigating Government vs. Private sector procurement rules.
2. **Category Taxonomy**: High-value keyword matching for Marketing & Software.
3. **Go / No-Go Decision Framework**: Objective qualification gates to maximize win rates.
4. **Compliance Assurance Matrix**: Statutory checklist per procurement sector.
5. **Technical Architecture**: Ingestion, processing, storage, and presentation.
6. **Rollout Roadmap**: 4 phased milestones from core tracking to AI-assisted proposal drafting.
