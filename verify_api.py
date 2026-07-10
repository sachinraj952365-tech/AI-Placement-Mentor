"""Full API verification script for AI Placement Mentor backend."""
import sys
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'
sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None
import requests

BASE = "http://127.0.0.1:8000"
passed = 0
failed = 0

def test(name, func):
    global passed, failed
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print('='*60)
    try:
        func()
        passed += 1
        print("  [PASS]")
    except Exception as e:
        failed += 1
        print(f"  [FAIL]: {e}")

# Shared state
state = {}

def test_login():
    r = requests.post(f"{BASE}/api/auth/login", data={"email": "verify@test.com", "name": "Verifier"})
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    state["sid"] = data["id"]
    print(f"  Student ID: {data['id']}, Name: {data['name']}")

def test_get_profile():
    sid = state["sid"]
    r = requests.get(f"{BASE}/api/profile/{sid}")
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    print(f"  Profile loaded OK")

def test_update_profile():
    sid = state["sid"]
    r = requests.post(f"{BASE}/api/profile/{sid}", json={
        "dream_role": "ML Engineer",
        "target_company": "Google",
        "skills": "Python, TensorFlow"
    })
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    d = r.json()
    msg = d.get("agent_message", "")
    print(f"  Agent message (first 150): {msg[:150]}...")

def test_chat_coordinator():
    sid = state["sid"]
    r = requests.post(f"{BASE}/api/chat/{sid}", json={"message": "Hello, what can you do for me?"})
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    resp = r.json().get("response", "")
    assert len(resp) > 10, f"Response too short: {resp}"
    print(f"  Response (first 200): {resp[:200]}...")

def test_generate_roadmap():
    sid = state["sid"]
    r = requests.post(f"{BASE}/api/roadmap/generate/{sid}")
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    d = r.json()
    print(f"  Tasks count: {len(d.get('tasks', []))}")
    txt = d.get("roadmap_text", "")
    print(f"  Roadmap (first 150): {txt[:150]}...")

def test_get_roadmap():
    sid = state["sid"]
    r = requests.get(f"{BASE}/api/roadmap/{sid}")
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    d = r.json()
    print(f"  has_roadmap: {d.get('has_roadmap')}")

def test_progress():
    sid = state["sid"]
    r = requests.get(f"{BASE}/api/progress/{sid}")
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    d = r.json()
    print(f"  Streak: {d.get('streak')}, Completion: {d.get('completion_rate')}%")

def test_motivation():
    sid = state["sid"]
    r = requests.get(f"{BASE}/api/motivation/{sid}")
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    d = r.json()
    txt = d.get("motivation_text", "")
    print(f"  Motivation (first 150): {txt[:150]}...")

def test_start_interview():
    sid = state["sid"]
    r = requests.post(f"{BASE}/api/interview/start/{sid}", json={"type": "technical"})
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    d = r.json()
    state["interview_session_id"] = d["session_id"]
    q = d.get("question", "")
    print(f"  Interview Session: {d['session_id']}")
    print(f"  First Q (first 150): {q[:150]}...")

def test_interview_answer():
    isid = state["interview_session_id"]
    r = requests.post(f"{BASE}/api/interview/answer/{isid}", json={
        "answer": "A process is an independent program with its own memory space. A thread is a lightweight unit within a process sharing the same resources."
    })
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    d = r.json()
    print(f"  Finished: {d.get('is_finished')}")
    if d.get("question"):
        print(f"  Next Q (first 150): {d['question'][:150]}...")
    if d.get("feedback"):
        print(f"  Feedback (first 150): {d['feedback'][:150]}...")

def test_chat_history():
    sid = state["sid"]
    r = requests.get(f"{BASE}/api/chat/history/{sid}")
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    msgs = r.json()
    print(f"  Chat history messages: {len(msgs)}")

# Run all tests
test("1. Login", test_login)
test("2. Get Profile", test_get_profile)
test("3. Update Profile (+ Profile Agent)", test_update_profile)
test("4. Chat with Coordinator Agent", test_chat_coordinator)
test("5. Generate Roadmap (+ Roadmap Agent)", test_generate_roadmap)
test("6. Get Roadmap", test_get_roadmap)
test("7. Get Progress (+ Progress Agent)", test_progress)
test("8. Get Motivation (+ Motivation Agent)", test_motivation)
test("9. Start Technical Interview (+ Mock Agent)", test_start_interview)
test("10. Submit Interview Answer", test_interview_answer)
test("11. Chat History", test_chat_history)

print(f"\n{'='*60}")
print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed}")
print('='*60)

if failed > 0:
    sys.exit(1)
