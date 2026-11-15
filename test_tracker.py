"""
test_tracker.py - Automated Test Suite for South African Tender Tracker
Tests Gauteng & Limpopo filtering, SA statutory compliance, and alert services.
"""

import unittest
import os
import json
import tempfile

import database
import scraper_engine
import alert_service

class TestSouthAfricanTenderTracker(unittest.TestCase):
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.db_path = self.temp_db.name
        self.temp_db.close()
        
        database.DB_FILE = self.db_path
        database.init_db(self.db_path)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_database_seeding_sa(self):
        """Verify seeding of Gauteng and Limpopo tenders in ZAR"""
        tenders = database.get_tenders()
        self.assertGreaterEqual(len(tenders), 5)
        
        provinces = set(t["province"] for t in tenders)
        self.assertIn("Gauteng", provinces)
        self.assertIn("Limpopo", provinces)

        # Check currency is ZAR
        for t in tenders:
            self.assertEqual(t["currency"], "ZAR")

    def test_gauteng_and_limpopo_filtering(self):
        """Verify filtering by province"""
        gp_tenders = database.get_tenders({"province": "Gauteng"})
        for t in gp_tenders:
            self.assertEqual(t["province"], "Gauteng")

        lp_tenders = database.get_tenders({"province": "Limpopo"})
        for t in lp_tenders:
            self.assertEqual(t["province"], "Limpopo")

    def test_sa_compliance_items(self):
        """Verify presence of South African statutory compliance items (SARS, CSD, B-BBEE, SBD)"""
        tenders = database.get_tenders({"sector": "Government"})
        gov_tender = database.get_tender_by_id(tenders[0]["id"])
        comp_titles = [i["title"] for i in gov_tender["compliance_items"]]
        
        self.assertTrue(any("SARS" in title or "Tax" in title for title in comp_titles))
        self.assertTrue(any("CSD" in title or "Supplier Database" in title for title in comp_titles))
        self.assertTrue(any("B-BBEE" in title for title in comp_titles))
        self.assertTrue(any("SBD 4" in title for title in comp_titles))

    def test_whatsapp_alert_builder(self):
        """Verify WhatsApp message formatting for South African tenders"""
        sample_tender = {
            "title": "Provincial Cloud Infrastructure Modernization",
            "issuing_entity": "Gauteng Department of e-Government",
            "province": "Gauteng",
            "category": "Software & Systems Development",
            "sub_category": "Cloud Migration",
            "estimated_value": 18500000.0,
            "briefing_date": "2026-11-20 10:00 AM",
            "submission_deadline": "2026-12-05 11:00 AM",
            "ref_number": "GPG-EDEV-2026-088"
        }
        msg = alert_service.build_tender_alert_message(sample_tender)
        self.assertIn("NEW SA TENDER ALERT [GAUTENG]", msg)
        self.assertIn("R 18,500,000", msg)
        self.assertIn("GPG-EDEV-2026-088", msg)

    def test_province_detection(self):
        """Verify province auto-detection from entity and location text"""
        self.assertEqual(scraper_engine.detect_province("Polokwane Local Municipality"), "Limpopo")
        self.assertEqual(scraper_engine.detect_province("Vhembe District Municipality, Thohoyandou"), "Limpopo")
        self.assertEqual(scraper_engine.detect_province("City of Johannesburg Metropolitan Municipality"), "Gauteng")
        self.assertEqual(scraper_engine.detect_province("Gauteng Tourism Authority, Rosebank"), "Gauteng")

if __name__ == "__main__":
    unittest.main()
