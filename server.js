/**
 * server.js - Node.js Server for TenderPulse SA
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'static')));

// Database JSON/SQLite file fallback
const DATA_FILE = path.join(__dirname, 'tenders.json');

function loadTenders() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {}
  }
  const initial = [
    {
      id: 1,
      ref_number: 'GPG-EDEV-2026-088',
      title: 'Provincial Cloud Infrastructure Modernization & Citizen e-Services Portal Phase 2',
      issuing_entity: 'Gauteng Department of e-Government',
      province: 'Gauteng',
      sector: 'Government',
      category: 'Software & Systems Development',
      sub_category: 'Cloud & Microservices Modernization',
      status: 'In Preparation',
      priority: 'High',
      estimated_value: 18500000,
      currency: 'ZAR',
      location: 'Johannesburg',
      submission_deadline: '2026-12-05 11:00 AM',
      briefing_date: '2026-11-20 10:00 AM',
      briefing_type: 'Compulsory Virtual (MS Teams)',
      bbbee_requirement: 'Level 1 or 2 with 30% subcontracting',
      go_no_go_score: 88,
      go_no_go_decision: 'Go',
      compliance_score: 90,
      win_probability: 75,
      compliance_items: [
        { id: 1, title: 'Valid SARS Tax Compliance Status (TCS PIN)', status: 'Verified' },
        { id: 2, title: 'CSD Master Registration Report (MAAA number)', status: 'Verified' },
        { id: 3, title: 'Valid B-BBEE Level Certificate or Sworn Affidavit', status: 'Verified' },
        { id: 4, title: 'SBD 4: Declaration of Interest Completed', status: 'Verified' },
        { id: 5, title: 'SBD 6.1: Preference Points Claim Form', status: 'Verified' },
        { id: 6, title: 'Compulsory Briefing Attendance / MS Teams Log', status: 'Pending' }
      ]
    },
    {
      id: 2,
      ref_number: 'LP-HEALTH-2026-031',
      title: 'Integrated Primary Healthcare Clinic Dispensing & Electronic Health Records (EHR) System',
      issuing_entity: 'Limpopo Department of Health',
      province: 'Limpopo',
      sector: 'Government',
      category: 'Software & Systems Development',
      sub_category: 'Custom Healthcare Software',
      status: 'Go/No-Go Review',
      priority: 'High',
      estimated_value: 14800000,
      currency: 'ZAR',
      location: 'Polokwane',
      submission_deadline: '2026-12-10 11:00 AM',
      briefing_date: '2026-11-22 11:00 AM',
      briefing_type: 'Compulsory In-Person (DOH Polokwane)',
      bbbee_requirement: 'Level 1 B-BBEE Contributor',
      go_no_go_score: 82,
      go_no_go_decision: 'Go',
      compliance_score: 85,
      win_probability: 70,
      compliance_items: [
        { id: 7, title: 'Valid SARS Tax Compliance Status (TCS PIN)', status: 'Verified' },
        { id: 8, title: 'CSD Master Registration Report', status: 'Verified' },
        { id: 9, title: 'B-BBEE Level 1 Affidavit', status: 'Verified' },
        { id: 10, title: 'SBD 4 Declaration', status: 'Verified' },
        { id: 11, title: 'Briefing Session Attendance Log', status: 'Pending' }
      ]
    },
    {
      id: 3,
      ref_number: 'GTA-MKT-2026-019',
      title: 'Global & Domestic Destination Marketing: Omnichannel SEO, Social Media, Creative Video & Media Buying',
      issuing_entity: 'Gauteng Tourism Authority (GTA)',
      province: 'Gauteng',
      sector: 'Government',
      category: 'Digital Marketing',
      sub_category: 'Performance Marketing & Creative Production',
      status: 'In Preparation',
      priority: 'High',
      estimated_value: 7500000,
      currency: 'ZAR',
      location: 'Rosebank, Johannesburg',
      submission_deadline: '2026-12-08 12:00 PM',
      briefing_date: '2026-11-21 10:00 AM',
      briefing_type: 'Compulsory Virtual (Zoom)',
      bbbee_requirement: '51% Black-owned, Level 1 or 2',
      go_no_go_score: 92,
      go_no_go_decision: 'Go',
      compliance_score: 95,
      win_probability: 80,
      compliance_items: [
        { id: 12, title: 'Valid SARS Tax PIN', status: 'Verified' },
        { id: 13, title: 'CSD Registration', status: 'Verified' },
        { id: 14, title: 'B-BBEE Level 1 Certificate', status: 'Verified' },
        { id: 15, title: 'Creative Portfolio / References', status: 'Verified' }
      ]
    },
    {
      id: 4,
      ref_number: 'LTA-DIGI-2026-007',
      title: 'Eco-Tourism & Wildlife Heritage Digital Marketing, Social Media Campaign & Performance Ad Management',
      issuing_entity: 'Limpopo Tourism Agency (LTA)',
      province: 'Limpopo',
      sector: 'Government',
      category: 'Digital Marketing',
      sub_category: 'Brand Strategy & Social Media',
      status: 'Under Review',
      priority: 'Medium',
      estimated_value: 3800000,
      currency: 'ZAR',
      location: 'Polokwane',
      submission_deadline: '2026-11-25 11:00 AM',
      briefing_date: '2026-11-12',
      briefing_type: 'Compulsory Virtual',
      bbbee_requirement: 'Level 1 B-BBEE QSE / EME',
      go_no_go_score: 85,
      go_no_go_decision: 'Go',
      compliance_score: 100,
      win_probability: 75,
      compliance_items: [
        { id: 16, title: 'Valid SARS Tax PIN', status: 'Verified' },
        { id: 17, title: 'CSD Registration Report', status: 'Verified' },
        { id: 18, title: 'B-BBEE Sworn Affidavit', status: 'Verified' },
        { id: 19, title: 'Briefing Register Logged', status: 'Verified' }
      ]
    },
    {
      id: 5,
      ref_number: 'PVT-VOD-2026-512',
      title: 'Headless Digital Self-Care Web & Mobile Application Development Framework',
      issuing_entity: 'Vodacom Group South Africa',
      province: 'Gauteng',
      sector: 'Private Sector',
      category: 'Software & Systems Development',
      sub_category: 'Mobile App & Headless Web',
      status: 'Submitted',
      priority: 'High',
      estimated_value: 11500000,
      currency: 'ZAR',
      location: 'Midrand, Johannesburg',
      submission_deadline: '2026-11-18',
      briefing_date: '2026-11-05',
      briefing_type: 'Optional Virtual',
      bbbee_requirement: 'B-BBEE Level 1-4',
      go_no_go_score: 94,
      go_no_go_decision: 'Go',
      compliance_score: 100,
      win_probability: 82,
      compliance_items: [
        { id: 20, title: 'SARS Tax PIN', status: 'Verified' },
        { id: 21, title: 'NDA Executed', status: 'Verified' },
        { id: 22, title: 'Public Liability Insurance', status: 'Verified' }
      ]
    },
    {
      id: 6,
      ref_number: 'PVT-AMPLAT-2026-904',
      title: 'Mogalakwena Open-Pit Mine: Real-Time Worker Safety Telemetry & Mobile IoT Dispatch System',
      issuing_entity: 'Anglo American Platinum',
      province: 'Limpopo',
      sector: 'Private Sector',
      category: 'Software & Systems Development',
      sub_category: 'Mining IoT & Telemetry Software',
      status: 'Identified',
      priority: 'High',
      estimated_value: 10800000,
      currency: 'ZAR',
      location: 'Mokopane / Polokwane',
      submission_deadline: '2026-12-14 16:00 PM',
      briefing_date: '2026-11-24 10:00 AM',
      briefing_type: 'Optional Virtual',
      bbbee_requirement: 'Preferential procurement for Limpopo-based suppliers',
      go_no_go_score: 86,
      go_no_go_decision: 'Go',
      compliance_score: 75,
      win_probability: 65,
      compliance_items: [
        { id: 23, title: 'SARS Tax Clearance', status: 'Verified' },
        { id: 24, title: 'B-BBEE Certificate', status: 'Verified' },
        { id: 25, title: 'Safety Certifications / ISO 45001', status: 'Verified' }
      ]
    },
    {
      id: 7,
      ref_number: 'PVT-DISC-2026-310',
      title: 'Omnichannel Digital Performance Marketing, Paid Search (Google Ads) & Conversion Optimization',
      issuing_entity: 'Discovery Health & Vitality',
      province: 'Gauteng',
      sector: 'Private Sector',
      category: 'Digital Marketing',
      sub_category: 'SEO & Performance Marketing',
      status: 'Won',
      priority: 'High',
      estimated_value: 4900000,
      currency: 'ZAR',
      location: 'Sandton, Johannesburg',
      submission_deadline: '2026-10-25',
      briefing_date: '2026-10-05',
      briefing_type: 'Optional Virtual',
      bbbee_requirement: 'Level 1 or 2 B-BBEE',
      go_no_go_score: 96,
      go_no_go_decision: 'Go',
      compliance_score: 100,
      win_probability: 100,
      compliance_items: [
        { id: 26, title: 'SARS Tax PIN', status: 'Verified' },
        { id: 27, title: 'Master Services Agreement Executed', status: 'Verified' }
      ]
    }
  ];
  fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
  return initial;
}

function saveTenders(tenders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tenders, null, 2));
}

// Routes
app.get('/api/tenders', (req, res) => {
  let list = loadTenders();
  const { province, sector, category, status, priority, search } = req.query;

  if (province && province !== 'All') list = list.filter(t => t.province === province);
  if (sector && sector !== 'All') list = list.filter(t => t.sector === sector);
  if (category && category !== 'All') list = list.filter(t => t.category === category);
  if (status && status !== 'All') list = list.filter(t => t.status === status);
  if (priority && priority !== 'All') list = list.filter(t => t.priority === priority);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(t => 
      (t.title && t.title.toLowerCase().includes(s)) ||
      (t.ref_number && t.ref_number.toLowerCase().includes(s)) ||
      (t.issuing_entity && t.issuing_entity.toLowerCase().includes(s)) ||
      (t.location && t.location.toLowerCase().includes(s))
    );
  }
  res.json(list);
});

app.get('/api/tenders/:id', (req, res) => {
  const list = loadTenders();
  const found = list.find(t => t.id === parseInt(req.params.id, 10));
  if (found) return res.json(found);
  res.status(404).json({ error: 'Tender not found' });
});

app.post('/api/tenders', (req, res) => {
  const list = loadTenders();
  const newTender = {
    id: Date.now(),
    ref_number: req.body.ref_number || `ZA-${(req.body.province || 'GP').slice(0, 2)}-${Math.floor(1000 + Math.random() * 9000)}`,
    title: req.body.title,
    issuing_entity: req.body.issuing_entity,
    province: req.body.province || 'Gauteng',
    sector: req.body.sector || 'Government',
    category: req.body.category || 'Software & Systems Development',
    estimated_value: parseFloat(req.body.estimated_value) || 0,
    currency: 'ZAR',
    status: req.body.status || 'Identified',
    priority: req.body.priority || 'Medium',
    submission_deadline: req.body.submission_deadline || '',
    briefing_date: req.body.briefing_date || '',
    briefing_type: req.body.briefing_type || 'None',
    bbbee_requirement: req.body.bbbee_requirement || 'Level 1 or 2',
    location: req.body.location || '',
    scope_of_work: req.body.scope_of_work || '',
    compliance_score: 0,
    go_no_go_score: 80,
    go_no_go_decision: 'Go',
    compliance_items: [
      { id: Date.now() + 1, title: 'Valid SARS Tax Compliance Status (TCS PIN)', status: 'Pending' },
      { id: Date.now() + 2, title: 'CSD Master Registration Report (MAAA number)', status: 'Pending' },
      { id: Date.now() + 3, title: 'B-BBEE Level Contributor Status', status: 'Pending' },
      { id: Date.now() + 4, title: 'SBD 4: Declaration of Interest Completed', status: 'Pending' }
    ]
  };
  list.unshift(newTender);
  saveTenders(list);
  res.status(201).json(newTender);
});

app.put('/api/tenders/:id', (req, res) => {
  const list = loadTenders();
  const id = parseInt(req.params.id, 10);
  const idx = list.findIndex(t => t.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...req.body };
    saveTenders(list);
    return res.json(list[idx]);
  }
  res.status(404).json({ error: 'Tender not found' });
});

app.delete('/api/tenders/:id', (req, res) => {
  let list = loadTenders();
  const id = parseInt(req.params.id, 10);
  list = list.filter(t => t.id !== id);
  saveTenders(list);
  res.json({ success: true });
});

app.post('/api/compliance/:id/toggle', (req, res) => {
  const list = loadTenders();
  const id = parseInt(req.params.id, 10);
  for (let t of list) {
    if (t.compliance_items) {
      const item = t.compliance_items.find(i => i.id === id);
      if (item) {
        item.status = item.status === 'Verified' ? 'Pending' : 'Verified';
        const tot = t.compliance_items.length;
        const ver = t.compliance_items.filter(i => i.status === 'Verified').length;
        t.compliance_score = Math.round((ver / tot) * 100);
        saveTenders(list);
        return res.json({ id, status: item.status, compliance_score: t.compliance_score });
      }
    }
  }
  res.status(404).json({ error: 'Item not found' });
});

app.get('/api/stats', (req, res) => {
  const list = loadTenders();
  const totalVal = list.reduce((a, b) => a + (b.estimated_value || 0), 0);
  const activeList = list.filter(t => !['Won', 'Lost', 'Cancelled'].includes(t.status));
  const activeVal = activeList.reduce((a, b) => a + (b.estimated_value || 0), 0);
  const wonList = list.filter(t => t.status === 'Won');
  const wonVal = wonList.reduce((a, b) => a + (b.estimated_value || 0), 0);
  const decidedCount = list.filter(t => ['Won', 'Lost'].includes(t.status)).length;
  const winRate = decidedCount > 0 ? Math.round((wonList.length / decidedCount) * 100) : 0;

  const bySector = {};
  const byCategory = {};
  const byProvince = {};

  for (let t of list) {
    bySector[t.sector] = bySector[t.sector] || { count: 0, value: 0 };
    bySector[t.sector].count += 1;
    bySector[t.sector].value += (t.estimated_value || 0);

    byCategory[t.category] = byCategory[t.category] || { count: 0, value: 0 };
    byCategory[t.category].count += 1;
    byCategory[t.category].value += (t.estimated_value || 0);

    byProvince[t.province] = byProvince[t.province] || { count: 0, value: 0 };
    byProvince[t.province].count += 1;
    byProvince[t.province].value += (t.estimated_value || 0);
  }

  res.json({
    total_tenders: list.length,
    total_pipeline_value: totalVal,
    active_tenders: activeList.length,
    active_pipeline_value: activeVal,
    won_tenders: wonList.length,
    won_value: wonVal,
    win_rate: winRate,
    by_sector: bySector,
    by_category: byCategory,
    by_province: byProvince,
    closing_soon_count: 2
  });
});

app.get('/api/discover', (req, res) => {
  res.json([
    {
      id: 'DISC-ZA-001',
      ref_number: 'GP-JRA-2026-104',
      title: 'Johannesburg Roads Agency: Real-Time Traffic Signal Telemetry & Pothole Reporting Mobile App',
      issuing_entity: 'Johannesburg Roads Agency (JRA)',
      province: 'Gauteng',
      sector: 'Government',
      category: 'Software & Systems Development',
      estimated_value: 7200000,
      submission_deadline: '2026-12-06 11:00 AM',
      source_name: 'Gauteng Provincial e-Tender Portal',
      relevance_score: 96,
      summary: 'Citizen iOS/Android mobile app with GPS geofencing, real-time asphalt fault logging, and traffic telemetry.'
    },
    {
      id: 'DISC-ZA-002',
      ref_number: 'LP-POL-2026-077',
      title: 'Polokwane Smart City: Public Wi-Fi Portal Modernization, Citizen App & Targeted SMS Notification Engine',
      issuing_entity: 'Polokwane Local Municipality',
      province: 'Limpopo',
      sector: 'Government',
      category: 'Software & Systems Development',
      estimated_value: 5800000,
      submission_deadline: '2026-12-10 10:00 AM',
      source_name: 'Limpopo Provincial Treasury Bulletin',
      relevance_score: 92,
      summary: 'Implementation of captive portal for 30 public Wi-Fi zones in Polokwane CBD and municipal billing mobile app.'
    }
  ]);
});

app.get('/api/alerts/config', (req, res) => {
  res.json({
    whatsapp_enabled: true,
    whatsapp_number: '',
    whatsapp_provider: 'callmebot',
    email_enabled: true,
    recipient_email: ''
  });
});

app.post('/api/alerts/test', (req, res) => {
  res.json({
    success: true,
    results: {
      whatsapp: { success: true, provider: 'callmebot', phone: req.body.whatsapp_number },
      email: { success: true, recipient: req.body.recipient_email }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TenderPulse SA server running on port ${PORT}`);
});
