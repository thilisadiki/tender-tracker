"""
scraper_engine.py - South African Tender Ingestion & Keyword Classification Engine
Filters exclusively for Gauteng and Limpopo tenders across Government and Private sectors
in Digital Marketing and Software & Systems Development.
"""

import re
from datetime import datetime, timedelta

# Keywords taxonomy
MARKETING_KEYWORDS = {
    "SEO & Search": ["seo", "search engine optimization", "sem", "google ads", "paid search", "search marketing"],
    "Social Media & Content": ["social media", "content marketing", "copywriting", "creative agency", "influencer", "community management", "reels", "tiktok", "instagram"],
    "Brand & PR": ["brand strategy", "rebranding", "public relations", "digital pr", "media buying", "billboard", "advertising campaign", "creative production"],
    "Digital Experience & CRO": ["digital marketing", "conversion rate optimization", "cro", "landing page", "email marketing", "omnichannel marketing", "campaign tracking"]
}

SOFTWARE_KEYWORDS = {
    "Custom App Development": ["software development", "custom application", "web application", "mobile app", "flutter", "react native", "ios", "android", "full-stack"],
    "Enterprise & ERP/CRM": ["erp", "crm", "sap", "salesforce", "oracle", "systems modernization", "mscoa", "core banking", "enterprise architecture"],
    "Cloud & Infrastructure": ["cloud migration", "aws", "azure", "gcp", "devops", "kubernetes", "docker", "microservices", "infrastructure as code"],
    "Integration & APIs": ["systems integration", "api gateway", "rest api", "graphql", "middleware", "esb", "data exchange", "fhir", "hl7"],
    "Data & Analytics": ["data warehouse", "business intelligence", "power bi", "tableau", "big data", "predictive analytics", "etl pipeline", "machine learning"],
    "Cybersecurity": ["cybersecurity", "penetration testing", "vulnerability assessment", "iam", "zero trust", "soc", "iso 27001", "infosec"]
}

GOV_INDICATORS = [
    "department", "ministry", "municipality", "municipal", "provincial", "limpopo", "gauteng",
    "agency", "council", "parastatal", "public", "treasury", "authority", "state", "commission", "sita", "gcis", "csd"
]

def classify_tender(title, description="", scope_of_work=""):
    full_text = f"{title} {description} {scope_of_work}".lower()

    mkt_matches = []
    mkt_subcats = {}
    for subcat, kws in MARKETING_KEYWORDS.items():
        for kw in kws:
            if re.search(r'\b' + re.escape(kw) + r'\b', full_text):
                mkt_matches.append(kw)
                mkt_subcats[subcat] = mkt_subcats.get(subcat, 0) + 1

    soft_matches = []
    soft_subcats = {}
    for subcat, kws in SOFTWARE_KEYWORDS.items():
        for kw in kws:
            if re.search(r'\b' + re.escape(kw) + r'\b', full_text):
                soft_matches.append(kw)
                soft_subcats[subcat] = soft_subcats.get(subcat, 0) + 1

    mkt_score = len(mkt_matches) * 15
    soft_score = len(soft_matches) * 15

    if soft_score > mkt_score and soft_score > 0:
        category = "Software & Systems Development"
        top_sub = max(soft_subcats.items(), key=lambda x: x[1])[0] if soft_subcats else "Custom Application Development"
        relevance = min(100, 40 + soft_score)
        matched = soft_matches
    elif mkt_score > 0:
        category = "Digital Marketing"
        top_sub = max(mkt_subcats.items(), key=lambda x: x[1])[0] if mkt_subcats else "Performance & Omnichannel Marketing"
        relevance = min(100, 40 + mkt_score)
        matched = mkt_matches
    else:
        category = "General ICT & Services"
        top_sub = "General Procurement"
        relevance = 30
        matched = []

    return category, top_sub, relevance, matched

def detect_sector(issuing_entity):
    entity_lower = issuing_entity.lower()
    for ind in GOV_INDICATORS:
        if ind in entity_lower:
            return "Government"
    return "Private Sector"

def detect_province(text):
    text_lower = text.lower()
    if "limpopo" in text_lower or "polokwane" in text_lower or "vhembe" in text_lower or "capricorn" in text_lower or "mopani" in text_lower or "waterberg" in text_lower or "sekhukhune" in text_lower or "tzaneen" in text_lower:
        return "Limpopo"
    elif "gauteng" in text_lower or "johannesburg" in text_lower or "joburg" in text_lower or "pretoria" in text_lower or "tshwane" in text_lower or "ekurhuleni" in text_lower or "sandton" in text_lower or "midrand" in text_lower:
        return "Gauteng"
    return "National"

def get_live_discovery_feed():
    """
    Simulates real-time scraper pipeline across:
    - National Treasury e-Tender Portal (filtered for Gauteng and Limpopo)
    - Limpopo Provincial Treasury Bulletin
    - Gauteng Provincial Treasury e-Tenders
    - SITA (State IT Agency)
    - Private mining & enterprise boards (Anglo American, Vodacom, Standard Bank)
    """
    now = datetime.now()
    def d_str(days):
        return (now + timedelta(days=days)).strftime("%Y-%m-%d")

    prospects = [
        {
            "id": "DISC-ZA-001",
            "ref_number": "GP-JRA-2026-104",
            "title": "Johannesburg Roads Agency: Real-Time Traffic Signal Telemetry & Pothole Reporting Mobile App",
            "issuing_entity": "Johannesburg Roads Agency (JRA)",
            "province": "Gauteng",
            "sector": "Government",
            "category": "Software & Systems Development",
            "sub_category": "Custom App Development",
            "estimated_value": 7200000.0,
            "currency": "ZAR",
            "publication_date": d_str(-3),
            "briefing_date": d_str(5) + " 10:00 AM",
            "briefing_type": "Compulsory Virtual (MS Teams)",
            "submission_deadline": d_str(21) + " 11:00 AM",
            "submission_method": "e-Submission Portal",
            "source_name": "Gauteng Provincial e-Tender Portal",
            "source_url": "https://www.gauteng.gov.za/e-tenders/jra-104",
            "relevance_score": 96,
            "matched_keywords": ["software development", "mobile app", "gis mapping", "systems integration"],
            "summary": "Development of citizen-facing iOS/Android app with GPS geofencing, real-time asphalt fault logging, and traffic light telemetry dashboard."
        },
        {
            "id": "DISC-ZA-002",
            "ref_number": "LP-POL-2026-077",
            "title": "Polokwane Smart City: Public Wi-Fi Portal Modernization, Citizen App & Targeted SMS Notification Engine",
            "issuing_entity": "Polokwane Local Municipality",
            "province": "Limpopo",
            "sector": "Government",
            "category": "Software & Systems Development",
            "sub_category": "Cloud & Microservices Modernization",
            "estimated_value": 5800000.0,
            "currency": "ZAR",
            "publication_date": d_str(-2),
            "briefing_date": d_str(6) + " 11:30 AM",
            "briefing_type": "Compulsory In-Person (Jack Botes Hall, Polokwane)",
            "submission_deadline": d_str(25) + " 10:00 AM",
            "submission_method": "Two-Envelope Physical Delivery",
            "source_name": "Limpopo Provincial Treasury Bulletin",
            "source_url": "https://www.limtreasury.gov.za/bulletin/pol-077",
            "relevance_score": 92,
            "matched_keywords": ["software development", "web application", "mobile app", "rest api"],
            "summary": "Implementation of captive portal for 30 public Wi-Fi zones in Polokwane CBD and development of municipal account bill-check app."
        },
        {
            "id": "DISC-ZA-003",
            "ref_number": "GP-GCIS-2026-042",
            "title": "Gauteng Youth Skills & Unemployment Campaign: Social Media, Performance Ads & Digital Content Strategy",
            "issuing_entity": "Government Communication and Information System (GCIS)",
            "province": "Gauteng",
            "sector": "Government",
            "category": "Digital Marketing",
            "sub_category": "Social Media & Content",
            "estimated_value": 4200000.0,
            "currency": "ZAR",
            "publication_date": d_str(-4),
            "briefing_date": d_str(4) + " 09:30 AM",
            "briefing_type": "Compulsory Virtual",
            "submission_deadline": d_str(18) + " 11:00 AM",
            "submission_method": "Online Portal",
            "source_name": "GCIS Tender Bulletin",
            "source_url": "https://www.gcis.gov.za/tenders/gcis-042",
            "relevance_score": 94,
            "matched_keywords": ["social media", "content marketing", "creative agency", "digital marketing", "paid search"],
            "summary": "12-month multi-channel marketing campaign targeting youth in Soweto, Pretoria, and Ekurhuleni to promote vocational training and tech apprenticeships."
        },
        {
            "id": "DISC-ZA-004",
            "ref_number": "LP-LEDA-2026-015",
            "title": "Limpopo Marula Festival & Cultural Tourism: Omnichannel Digital PR, Influencer & Video Production",
            "issuing_entity": "Limpopo Economic Development Agency (LEDA)",
            "province": "Limpopo",
            "sector": "Government",
            "category": "Digital Marketing",
            "sub_category": "Brand & PR",
            "estimated_value": 2600000.0,
            "currency": "ZAR",
            "publication_date": d_str(-5),
            "briefing_date": d_str(3) + " 14:00 PM",
            "briefing_type": "Compulsory Virtual (Zoom)",
            "submission_deadline": d_str(17) + " 12:00 PM",
            "submission_method": "Physical Tender Box, Lebowakgomo",
            "source_name": "Limpopo Provincial Treasury Bulletin",
            "source_url": "https://www.leda.co.za/tenders/marula-015",
            "relevance_score": 89,
            "matched_keywords": ["public relations", "influencer", "creative production", "social media campaign"],
            "summary": "Digital brand positioning, lifestyle influencer activations, ticket booking funnel, and short-form video series for Limpopo's premier annual festival."
        },
        {
            "id": "DISC-ZA-005",
            "ref_number": "PVT-STDBNK-2026-880",
            "title": "Standard Bank South Africa: Next-Gen Business Banking Merchant Portal & Micro-Frontend Architecture",
            "issuing_entity": "The Standard Bank of South Africa",
            "province": "Gauteng",
            "sector": "Private Sector",
            "category": "Software & Systems Development",
            "sub_category": "Custom App Development",
            "estimated_value": 16500000.0,
            "currency": "ZAR",
            "publication_date": d_str(-2),
            "briefing_date": d_str(7) + " 14:00 PM",
            "briefing_type": "Optional Virtual (MS Teams)",
            "submission_deadline": d_str(26) + " 17:00 PM",
            "submission_method": "SAP Ariba Discovery Portal",
            "source_name": "SAP Ariba Enterprise Procurement",
            "source_url": "https://discovery.ariba.com/rfp/sbsa-880",
            "relevance_score": 95,
            "matched_keywords": ["software development", "web application", "microservices", "cloud migration", "zero trust"],
            "summary": "Engineering high-throughput merchant payment dashboards and POS telemetry management using React/Next.js and AWS serverless."
        },
        {
            "id": "DISC-ZA-006",
            "ref_number": "PVT-EXXARO-2026-402",
            "title": "Exxaro Resources (Limpopo Grootegeluk Coal Mine): Digital Environmental Safety & Carbon Emissions Tracker",
            "issuing_entity": "Exxaro Resources Limited",
            "province": "Limpopo",
            "sector": "Private Sector",
            "category": "Software & Systems Development",
            "sub_category": "Data & Analytics",
            "estimated_value": 8400000.0,
            "currency": "ZAR",
            "publication_date": d_str(-1),
            "briefing_date": d_str(8) + " 10:00 AM",
            "briefing_type": "Optional Virtual",
            "submission_deadline": d_str(29) + " 16:00 PM",
            "submission_method": "Coupa Supplier Portal",
            "source_name": "Coupa Supplier Portal Network",
            "source_url": "https://exxaro.supplier.coupahost.com/rfp-402",
            "relevance_score": 91,
            "matched_keywords": ["data warehouse", "business intelligence", "predictive analytics", "rest api"],
            "summary": "Custom environmental telemetry analytics platform tracking water quality, air particles, and carbon reduction metrics at Lephalale mine operations."
        }
    ]

    return prospects
