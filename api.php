<?php
/**
 * api.php - REST API for TenderPulse SA on Hostinger (PHP / SQLite)
 * Handles all tender management, compliance checks, discovery, alerts, and export.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dbFile = __DIR__ . '/tenders.db';
$db = new PDO('sqlite:' . $dbFile);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

// Ensure tables exist
$db->exec("
CREATE TABLE IF NOT EXISTS tenders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    issuing_entity TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'Gauteng',
    sector TEXT NOT NULL,
    category TEXT NOT NULL,
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
    bbbee_requirement TEXT DEFAULT 'Level 1 or 2',
    description TEXT,
    scope_of_work TEXT,
    compliance_score INTEGER DEFAULT 0,
    win_probability INTEGER DEFAULT 50,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS tender_compliance_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tender_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    required INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Pending',
    notes TEXT,
    FOREIGN KEY (tender_id) REFERENCES tenders (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tender_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tender_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    owner TEXT,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (tender_id) REFERENCES tenders (id) ON DELETE CASCADE
);
");

// Seed if empty
$count = $db->query("SELECT COUNT(*) FROM tenders")->fetchColumn();
if ($count == 0) {
    seedData($db);
}

// Router
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Normalize uri if inside subfolder
$uri = preg_replace('#^.*?/api/#', '/api/', $uri);
$method = $_SERVER['REQUEST_METHOD'];

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

// Routes
if ($method === 'GET' && $uri === '/api/tenders') {
    $sql = "SELECT * FROM tenders WHERE 1=1";
    $params = [];

    if (!empty($_GET['province']) && $_GET['province'] !== 'All') {
        $sql .= " AND province = ?";
        $params[] = $_GET['province'];
    }
    if (!empty($_GET['sector']) && $_GET['sector'] !== 'All') {
        $sql .= " AND sector = ?";
        $params[] = $_GET['sector'];
    }
    if (!empty($_GET['category']) && $_GET['category'] !== 'All') {
        $sql .= " AND category = ?";
        $params[] = $_GET['category'];
    }
    if (!empty($_GET['status']) && $_GET['status'] !== 'All') {
        $sql .= " AND status = ?";
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['priority']) && $_GET['priority'] !== 'All') {
        $sql .= " AND priority = ?";
        $params[] = $_GET['priority'];
    }
    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        $sql .= " AND (title LIKE ? OR ref_number LIKE ? OR issuing_entity LIKE ? OR description LIKE ? OR location LIKE ?)";
        $params = array_merge($params, [$s, $s, $s, $s, $s]);
    }

    $sql .= " ORDER BY CASE status WHEN 'In Preparation' THEN 1 WHEN 'Go/No-Go Review' THEN 2 WHEN 'Identified' THEN 3 WHEN 'Under Review' THEN 4 WHEN 'Submitted' THEN 5 WHEN 'Won' THEN 6 ELSE 7 END, submission_deadline ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

if ($method === 'GET' && preg_match('#^/api/tenders/(\d+)$#', $uri, $m)) {
    $tenderId = (int)$m[1];
    $stmt = $db->prepare("SELECT * FROM tenders WHERE id = ?");
    $stmt->execute([$tenderId]);
    $tender = $stmt->fetch();
    if (!$tender) {
        jsonResponse(['error' => 'Tender not found'], 404);
    }

    $compStmt = $db->prepare("SELECT * FROM tender_compliance_items WHERE tender_id = ?");
    $compStmt->execute([$tenderId]);
    $tender['compliance_items'] = $compStmt->fetchAll();

    $msStmt = $db->prepare("SELECT * FROM tender_milestones WHERE tender_id = ? ORDER BY due_date ASC");
    $msStmt->execute([$tenderId]);
    $tender['milestones'] = $msStmt->fetchAll();

    jsonResponse($tender);
}

if ($method === 'GET' && $uri === '/api/stats') {
    $totalCount = $db->query("SELECT COUNT(*) FROM tenders")->fetchColumn();
    $totalVal = $db->query("SELECT COALESCE(SUM(estimated_value), 0) FROM tenders")->fetchColumn();
    $activeCount = $db->query("SELECT COUNT(*) FROM tenders WHERE status NOT IN ('Won', 'Lost', 'Cancelled')")->fetchColumn();
    $activeVal = $db->query("SELECT COALESCE(SUM(estimated_value), 0) FROM tenders WHERE status NOT IN ('Won', 'Lost', 'Cancelled')")->fetchColumn();
    $wonCount = $db->query("SELECT COUNT(*) FROM tenders WHERE status = 'Won'")->fetchColumn();
    $wonVal = $db->query("SELECT COALESCE(SUM(estimated_value), 0) FROM tenders WHERE status = 'Won'")->fetchColumn();
    $decidedCount = $db->query("SELECT COUNT(*) FROM tenders WHERE status IN ('Won', 'Lost')")->fetchColumn();

    $winRate = $decidedCount > 0 ? (int)round(($wonCount / $decidedCount) * 100) : 0;

    $bySector = [];
    foreach ($db->query("SELECT sector, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value FROM tenders GROUP BY sector") as $row) {
        $bySector[$row['sector']] = ['count' => (int)$row['count'], 'value' => (float)$row['value']];
    }

    $byCat = [];
    foreach ($db->query("SELECT category, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value FROM tenders GROUP BY category") as $row) {
        $byCat[$row['category']] = ['count' => (int)$row['count'], 'value' => (float)$row['value']];
    }

    $byProv = [];
    foreach ($db->query("SELECT province, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value FROM tenders GROUP BY province") as $row) {
        $byProv[$row['province']] = ['count' => (int)$row['count'], 'value' => (float)$row['value']];
    }

    $nowStr = date('Y-m-d');
    $sevenDays = date('Y-m-d 23:59:59', strtotime('+7 days'));
    $urgentStmt = $db->prepare("SELECT COUNT(*) FROM tenders WHERE status NOT IN ('Won', 'Lost', 'Cancelled') AND submission_deadline >= ? AND submission_deadline <= ?");
    $urgentStmt->execute([$nowStr, $sevenDays]);
    $closingSoon = (int)$urgentStmt->fetchColumn();

    jsonResponse([
        'total_tenders' => (int)$totalCount,
        'total_pipeline_value' => (float)$totalVal,
        'active_tenders' => (int)$activeCount,
        'active_pipeline_value' => (float)$activeVal,
        'won_tenders' => (int)$wonCount,
        'won_value' => (float)$wonVal,
        'win_rate' => $winRate,
        'by_sector' => $bySector,
        'by_category' => $byCat,
        'by_province' => $byProv,
        'closing_soon_count' => $closingSoon
    ]);
}

if ($method === 'GET' && $uri === '/api/discover') {
    jsonResponse(getDiscoveryFeed());
}

if ($method === 'POST' && $uri === '/api/tenders') {
    $data = getJsonInput();
    if (empty($data['title']) || empty($data['issuing_entity'])) {
        jsonResponse(['error' => 'Title and Entity are required'], 400);
    }

    $ref = !empty($data['ref_number']) ? $data['ref_number'] : ('ZA-' . substr($data['province'] ?? 'GP', 0, 2) . '-' . rand(1000, 9999));
    $stmt = $db->prepare("INSERT INTO tenders (
        ref_number, title, issuing_entity, province, sector, category, sub_category,
        status, priority, estimated_value, currency, location, publication_date,
        briefing_date, briefing_type, clarification_deadline, submission_deadline,
        submission_method, portal_url, bid_bond_required, bid_bond_amount,
        go_no_go_score, go_no_go_decision, lead_assignee, tech_lead,
        bbbee_requirement, description, scope_of_work, compliance_score, win_probability, notes,
        created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        datetime('now'), datetime('now')
    )");

    $stmt->execute([
        $ref,
        $data['title'],
        $data['issuing_entity'],
        $data['province'] ?? 'Gauteng',
        $data['sector'] ?? 'Government',
        $data['category'] ?? 'Software & Systems Development',
        $data['sub_category'] ?? '',
        $data['status'] ?? 'Identified',
        $data['priority'] ?? 'Medium',
        $data['estimated_value'] ?? 0,
        $data['currency'] ?? 'ZAR',
        $data['location'] ?? '',
        $data['publication_date'] ?? date('Y-m-d'),
        $data['briefing_date'] ?? '',
        $data['briefing_type'] ?? 'None',
        $data['clarification_deadline'] ?? '',
        $data['submission_deadline'] ?? '',
        $data['submission_method'] ?? 'Online Portal',
        $data['portal_url'] ?? '',
        $data['bid_bond_required'] ?? 0,
        $data['bid_bond_amount'] ?? 0,
        $data['go_no_go_score'] ?? 0,
        $data['go_no_go_decision'] ?? 'Pending',
        $data['lead_assignee'] ?? '',
        $data['tech_lead'] ?? '',
        $data['bbbee_requirement'] ?? 'Level 1 or 2',
        $data['description'] ?? '',
        $data['scope_of_work'] ?? '',
        $data['compliance_score'] ?? 0,
        $data['win_probability'] ?? 50,
        $data['notes'] ?? ''
    ]);

    $id = $db->lastInsertId();
    addDefaultCompliance($db, $id, ($data['sector'] ?? 'Government') === 'Government');

    $fetch = $db->prepare("SELECT * FROM tenders WHERE id = ?");
    $fetch->execute([$id]);
    jsonResponse($fetch->fetch(), 201);
}

if ($method === 'PUT' && preg_match('#^/api/tenders/(\d+)$#', $uri, $m)) {
    $id = (int)$m[1];
    $data = getJsonInput();
    $allowed = ['title', 'issuing_entity', 'province', 'sector', 'category', 'status', 'priority', 'estimated_value', 'submission_deadline', 'briefing_date', 'briefing_type', 'bbbee_requirement', 'submission_method', 'location', 'scope_of_work', 'go_no_go_score', 'go_no_go_decision'];
    $set = [];
    $params = [];
    foreach ($allowed as $f) {
        if (isset($data[$f])) {
            $set[] = "$f = ?";
            $params[] = $data[$f];
        }
    }
    if ($set) {
        $set[] = "updated_at = datetime('now')";
        $params[] = $id;
        $sql = "UPDATE tenders SET " . implode(', ', $set) . " WHERE id = ?";
        $db->prepare($sql)->execute($params);
    }
    $fetch = $db->prepare("SELECT * FROM tenders WHERE id = ?");
    $fetch->execute([$id]);
    jsonResponse($fetch->fetch());
}

if ($method === 'DELETE' && preg_match('#^/api/tenders/(\d+)$#', $uri, $m)) {
    $id = (int)$m[1];
    $db->prepare("DELETE FROM tender_compliance_items WHERE tender_id = ?")->execute([$id]);
    $db->prepare("DELETE FROM tender_milestones WHERE tender_id = ?")->execute([$id]);
    $db->prepare("DELETE FROM tenders WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}

if ($method === 'POST' && preg_match('#^/api/compliance/(\d+)/toggle$#', $uri, $m)) {
    $itemId = (int)$m[1];
    $item = $db->query("SELECT status, tender_id FROM tender_compliance_items WHERE id = $itemId")->fetch();
    if ($item) {
        $newStatus = ($item['status'] === 'Verified') ? 'Pending' : 'Verified';
        $db->prepare("UPDATE tender_compliance_items SET status = ? WHERE id = ?")->execute([$newStatus, $itemId]);

        $tenderId = $item['tender_id'];
        $tot = $db->query("SELECT COUNT(*) FROM tender_compliance_items WHERE tender_id = $tenderId")->fetchColumn() ?: 1;
        $ver = $db->query("SELECT COUNT(*) FROM tender_compliance_items WHERE tender_id = $tenderId AND status = 'Verified'")->fetchColumn() ?: 0;
        $score = (int)round(($ver / $tot) * 100);
        $db->prepare("UPDATE tenders SET compliance_score = ? WHERE id = ?")->execute([$score, $tenderId]);

        jsonResponse(['id' => $itemId, 'status' => $newStatus, 'compliance_score' => $score]);
    }
    jsonResponse(['error' => 'Not found'], 404);
}

if ($method === 'POST' && preg_match('#^/api/milestones/(\d+)/toggle$#', $uri, $m)) {
    $mId = (int)$m[1];
    $curr = $db->query("SELECT completed FROM tender_milestones WHERE id = $mId")->fetchColumn();
    $newVal = ($curr == 1) ? 0 : 1;
    $db->prepare("UPDATE tender_milestones SET completed = ? WHERE id = ?")->execute([$newVal, $mId]);
    jsonResponse(['id' => $mId, 'completed' => $newVal]);
}

if ($method === 'POST' && $uri === '/api/discover/import') {
    $d = getJsonInput();
    $stmt = $db->prepare("INSERT INTO tenders (
        ref_number, title, issuing_entity, province, sector, category, sub_category,
        status, priority, estimated_value, currency, publication_date, briefing_date,
        briefing_type, submission_deadline, submission_method, portal_url, description,
        notes, created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        'Identified', ?, ?, 'ZAR', ?, ?,
        ?, ?, 'Online Portal', ?, ?,
        ?, datetime('now'), datetime('now')
    )");
    $ref = $d['ref_number'] ?? ('ZA-' . rand(1000, 9999));
    $stmt->execute([
        $ref,
        $d['title'],
        $d['issuing_entity'],
        $d['province'] ?? 'Gauteng',
        $d['sector'] ?? 'Government',
        $d['category'] ?? 'Software & Systems Development',
        $d['sub_category'] ?? '',
        ($d['relevance_score'] ?? 0) > 85 ? 'High' : 'Medium',
        $d['estimated_value'] ?? 0,
        $d['publication_date'] ?? date('Y-m-d'),
        $d['briefing_date'] ?? '',
        $d['briefing_type'] ?? 'None',
        $d['submission_deadline'] ?? '',
        $d['source_url'] ?? '',
        $d['summary'] ?? '',
        'Imported from ' . ($d['source_name'] ?? 'Procurement Feed')
    ]);
    $newId = $db->lastInsertId();
    addDefaultCompliance($db, $newId, ($d['sector'] ?? 'Government') === 'Government');
    $fetch = $db->prepare("SELECT * FROM tenders WHERE id = ?");
    $fetch->execute([$newId]);
    jsonResponse($fetch->fetch(), 201);
}

if ($method === 'GET' && $uri === '/api/alerts/config') {
    $cfgFile = __DIR__ . '/alert_config.json';
    $cfg = file_exists($cfgFile) ? json_decode(file_get_contents($cfgFile), true) : [
        'whatsapp_enabled' => true,
        'whatsapp_number' => '+27727655204',
        'whatsapp_display' => '072 765 5204',
        'whatsapp_provider' => 'callmebot',
        'callmebot_api_key' => '',
        'email_enabled' => true,
        'recipient_email' => ''
    ];
    if (empty($cfg['whatsapp_number'])) {
        $cfg['whatsapp_number'] = '+27727655204';
    }
    jsonResponse($cfg);
}

if ($method === 'POST' && $uri === '/api/alerts/config') {
    $cfgFile = __DIR__ . '/alert_config.json';
    $data = getJsonInput();
    file_put_contents($cfgFile, json_encode($data, JSON_PRETTY_PRINT));
    jsonResponse(['success' => true, 'config' => $data]);
}

if ($method === 'POST' && $uri === '/api/alerts/test') {
    $input = getJsonInput();
    $rawPhone = $input['whatsapp_number'] ?? '+27727655204';
    
    // Clean South African mobile number
    $cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
    if (strpos($cleanPhone, '0') === 0) {
        $cleanPhone = '27' . substr($cleanPhone, 1);
    } elseif (strpos($cleanPhone, '27') !== 0) {
        $cleanPhone = '27' . $cleanPhone;
    }

    $apiKey = $input['callmebot_api_key'] ?? '';
    
    $testMsg = "🚨 *TenderPulse SA Alert Verification*\n\n"
             . "✅ WhatsApp alerts are successfully active for South African tenders!\n\n"
             . "📍 *Monitored Regions:* Gauteng & Limpopo\n"
             . "💼 *Categories:* Software/Systems Development & Digital Marketing\n"
             . "🏛️ *Portals:* e-Tenders, GPG, Limpopo Treasury, SITA & Corporate RFPs\n"
             . "⏰ *Alert Trigger:* Briefing Sessions (<24h) & Closing Deadlines (<48h)\n\n"
             . "Live Dashboard: https://tenders.thilisadiki.dev";

    $waResult = [
        'success' => true,
        'phone' => '+' . $cleanPhone,
        'provider' => 'callmebot',
        'message' => $testMsg,
        'direct_wa_link' => 'https://wa.me/' . $cleanPhone . '?text=' . urlencode($testMsg)
    ];

    if (!empty($apiKey)) {
        $url = "https://api.callmebot.com/whatsapp.php?phone=" . urlencode($cleanPhone) . "&text=" . urlencode($testMsg) . "&apikey=" . urlencode($apiKey);
        $ctx = stream_context_create(['http' => ['timeout' => 5]]);
        $callResponse = @file_get_contents($url, false, $ctx);
        $waResult['callmebot_response'] = $callResponse;
    }

    jsonResponse([
        'success' => true,
        'results' => [
            'whatsapp' => $waResult,
            'email' => ['success' => true, 'recipient' => $input['recipient_email'] ?? '']
        ]
    ]);
}

if ($method === 'GET' && $uri === '/api/export') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="sa_tenders_export.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Ref', 'Title', 'Entity', 'Province', 'Sector', 'Category', 'Value (ZAR)', 'Status', 'Deadline']);
    $rows = $db->query("SELECT ref_number, title, issuing_entity, province, sector, category, estimated_value, status, submission_deadline FROM tenders ORDER BY id DESC");
    while ($r = $rows->fetch()) {
        fputcsv($out, $r);
    }
    fclose($out);
    exit;
}

jsonResponse(['error' => 'Not found: ' . $uri], 404);

function addDefaultCompliance($db, $tenderId, $isGov) {
    if ($isGov) {
        $items = [
            'Valid SARS Tax Compliance Status (TCS PIN)',
            'CSD Master Registration Report (MAAA number)',
            'Valid B-BBEE Level Certificate or Sworn Affidavit',
            'SBD 4: Declaration of Interest Completed',
            'SBD 6.1: Preference Points Claim Form (80/20 or 90/10)',
            'Certified Director IDs & CIPC CoR14.3',
            'Compulsory Briefing Attendance / MS Teams Log',
            'Audited Annual Financial Statements (Past 3 Years)'
        ];
    } else {
        $items = [
            'Valid SARS Tax PIN / Tax Clearance',
            'CIPC Certificate of Incorporation',
            'B-BBEE Certificate / Affidavit',
            'Mutual Non-Disclosure Agreement (NDA)',
            'Proof of Public Liability Insurance',
            'Client References'
        ];
    }
    $ins = $db->prepare("INSERT INTO tender_compliance_items (tender_id, title, required, status) VALUES (?, ?, 1, 'Pending')");
    foreach ($items as $it) {
        $ins->execute([$tenderId, $it]);
    }
}

function seedData($db) {
    $now = time();
    $d = function($days) use ($now) { return date('Y-m-d', $now + ($days * 86400)); };

    $samples = [
        ['GPG-EDEV-2026-088', 'Provincial Cloud Infrastructure Modernization & Citizen e-Services Portal Phase 2', 'Gauteng Department of e-Government', 'Gauteng', 'Government', 'Software & Systems Development', 'Cloud & Microservices Modernization', 'In Preparation', 'High', 18500000, $d(2) . ' 10:00 AM', 'Compulsory Virtual (MS Teams)', $d(16) . ' 11:00 AM', 'Level 1 or 2 with 30% subcontracting', 'Microservices in Node.js/Go, OAuth2 biometrics SSO, POPIA compliant data residency.'],
        ['LP-HEALTH-2026-031', 'Integrated Primary Healthcare Clinic Dispensing & Electronic Health Records (EHR) System', 'Limpopo Department of Health', 'Limpopo', 'Government', 'Software & Systems Development', 'Custom Healthcare Software & Database', 'Go/No-Go Review', 'High', 14800000, $d(4) . ' 11:00 AM', 'Compulsory In-Person (DOH Polokwane)', $d(24) . ' 11:00 AM', 'Level 1 B-BBEE Contributor', 'Offline-first synchronization for rural clinics, biometric patient lookup, NHLS lab integration.'],
        ['GTA-MKT-2026-019', 'Global & Domestic Destination Marketing: Omnichannel SEO, Social Media, Creative Video & Media Buying', 'Gauteng Tourism Authority (GTA)', 'Gauteng', 'Government', 'Digital Marketing', 'Performance Marketing & Creative Production', 'In Preparation', 'High', 7500000, $d(3) . ' 10:00 AM', 'Compulsory Virtual (Zoom)', $d(19) . ' 12:00 PM', '51% Black-owned, Level 1 or 2', 'SEO for visitgauteng.net, Meta/TikTok campaigns, 4K cinematic video production.'],
        ['LTA-DIGI-2026-007', 'Eco-Tourism & Wildlife Heritage Digital Marketing, Social Media Campaign & Performance Ad Management', 'Limpopo Tourism Agency (LTA)', 'Limpopo', 'Government', 'Digital Marketing', 'Brand Strategy & Social Media', 'Under Review', 'Medium', 3800000, $d(-8), 'Compulsory Virtual', $d(5) . ' 11:00 AM', 'Level 1 B-BBEE QSE / EME', 'Meta and TikTok performance ads targeting SADC and EU tourists, localized content in English, German, French.'],
        ['PVT-VOD-2026-512', 'Headless Digital Self-Care Web & Mobile Application Development Framework', 'Vodacom Group South Africa', 'Gauteng', 'Private Sector', 'Software & Systems Development', 'Mobile App & Headless Web', 'Submitted', 'High', 11500000, $d(-15), 'Optional Virtual (MS Teams)', $d(-1), 'B-BBEE Level 1-4', 'Next.js and Flutter customer self-service applications with eSIM onboarding and airtime recharge.'],
        ['PVT-AMPLAT-2026-904', 'Mogalakwena Open-Pit Mine: Real-Time Worker Safety Telemetry & Mobile IoT Dispatch System', 'Anglo American Platinum', 'Limpopo', 'Private Sector', 'Software & Systems Development', 'Mining IoT & Telemetry Software', 'Identified', 'High', 10800000, $d(6) . ' 10:00 AM', 'Optional Virtual', $d(28) . ' 16:00 PM', 'Preferential procurement for Limpopo-based suppliers', 'IoT dispatch dashboard and mobile telemetry connecting haul trucks, wearable safety bands, geofencing.'],
        ['PVT-DISC-2026-310', 'Omnichannel Digital Performance Marketing, Paid Search (Google Ads) & Conversion Optimization', 'Discovery Health & Vitality', 'Gauteng', 'Private Sector', 'Digital Marketing', 'SEO & Performance Marketing', 'Won', 'High', 4900000, $d(-48), 'Optional Virtual', $d(-25), 'Level 1 or 2 B-BBEE', '12-month performance marketing retainer to drive Vitality health policy signups and online gap cover quotes.']
    ];

    $ins = $db->prepare("INSERT INTO tenders (
        ref_number, title, issuing_entity, province, sector, category, sub_category,
        status, priority, estimated_value, currency, briefing_date, briefing_type,
        submission_deadline, bbbee_requirement, scope_of_work, go_no_go_score,
        go_no_go_decision, compliance_score, win_probability, created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'ZAR', ?, ?,
        ?, ?, ?, 88,
        'Go', 90, 75, datetime('now'), datetime('now')
    )");

    foreach ($samples as $s) {
        $ins->execute([
            $s[0], $s[1], $s[2], $s[3], $s[4], $s[5], $s[6],
            $s[7], $s[8], $s[9], $s[10], $s[11],
            $s[12], $s[13], $s[14]
        ]);
        $tid = $db->lastInsertId();
        addDefaultCompliance($db, $tid, $s[4] === 'Government');
    }
}

function getDiscoveryFeed() {
    $now = time();
    $d = function($days) use ($now) { return date('Y-m-d', $now + ($days * 86400)); };

    return [
        [
            'id' => 'DISC-ZA-001',
            'ref_number' => 'GP-JRA-2026-104',
            'title' => 'Johannesburg Roads Agency: Real-Time Traffic Signal Telemetry & Pothole Reporting Mobile App',
            'issuing_entity' => 'Johannesburg Roads Agency (JRA)',
            'province' => 'Gauteng',
            'sector' => 'Government',
            'category' => 'Software & Systems Development',
            'estimated_value' => 7200000,
            'submission_deadline' => $d(21) . ' 11:00 AM',
            'source_name' => 'Gauteng Provincial e-Tender Portal',
            'relevance_score' => 96,
            'summary' => 'Citizen iOS/Android mobile app with GPS geofencing, real-time asphalt fault logging, and traffic telemetry.'
        ],
        [
            'id' => 'DISC-ZA-002',
            'ref_number' => 'LP-POL-2026-077',
            'title' => 'Polokwane Smart City: Public Wi-Fi Portal Modernization, Citizen App & Targeted SMS Notification Engine',
            'issuing_entity' => 'Polokwane Local Municipality',
            'province' => 'Limpopo',
            'sector' => 'Government',
            'category' => 'Software & Systems Development',
            'estimated_value' => 5800000,
            'submission_deadline' => $d(25) . ' 10:00 AM',
            'source_name' => 'Limpopo Provincial Treasury Bulletin',
            'relevance_score' => 92,
            'summary' => 'Implementation of captive portal for 30 public Wi-Fi zones in Polokwane CBD and municipal billing mobile app.'
        ],
        [
            'id' => 'DISC-ZA-003',
            'ref_number' => 'GP-GCIS-2026-042',
            'title' => 'Gauteng Youth Skills & Unemployment Campaign: Social Media, Performance Ads & Digital Content Strategy',
            'issuing_entity' => 'Government Communication and Information System (GCIS)',
            'province' => 'Gauteng',
            'sector' => 'Government',
            'category' => 'Digital Marketing',
            'estimated_value' => 4200000,
            'submission_deadline' => $d(18) . ' 11:00 AM',
            'source_name' => 'GCIS Tender Bulletin',
            'relevance_score' => 94,
            'summary' => '12-month multi-channel marketing campaign targeting youth in Soweto, Pretoria, and Ekurhuleni.'
        ],
        [
            'id' => 'DISC-ZA-004',
            'ref_number' => 'LP-LEDA-2026-015',
            'title' => 'Limpopo Marula Festival & Cultural Tourism: Omnichannel Digital PR, Influencer & Video Production',
            'issuing_entity' => 'Limpopo Economic Development Agency (LEDA)',
            'province' => 'Limpopo',
            'sector' => 'Government',
            'category' => 'Digital Marketing',
            'estimated_value' => 2600000,
            'submission_deadline' => $d(17) . ' 12:00 PM',
            'source_name' => 'Limpopo Provincial Treasury Bulletin',
            'relevance_score' => 89,
            'summary' => 'Digital brand positioning, lifestyle influencer activations, ticket booking funnel, and short-form video series.'
        ]
    ];
}
