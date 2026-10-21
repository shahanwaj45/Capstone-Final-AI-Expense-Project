import os
import io
import re
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Standard Gemini 1.5 Flash models
FALLBACK_MODELS = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
]

VALID_CATEGORIES = [
    'Food', 'Travel', 'Education', 'Entertainment', 'Bills', 
    'Health', 'Shopping', 'Subscription', 'Other'
]

def _get_candidate_models():
    configured = os.environ.get('AI_MODEL', '').strip()
    candidates = []
    if configured:
        candidates.append(configured)
    for m in FALLBACK_MODELS:
        if m not in candidates:
            candidates.append(m)
    return candidates

def _generate_content_text(prompt, api_key):
    """Run text generation using google.genai with fallback to google.generativeai across candidate models."""
    candidate_models = _get_candidate_models()
    last_error = None

    # Strategy 1: Modern google.genai SDK
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        for model_name in candidate_models:
            try:
                res = client.models.generate_content(model=model_name, contents=prompt)
                if res and res.text:
                    return res.text.strip()
            except Exception as e:
                err_msg = str(e)
                last_error = err_msg
                logger.warning(f"ai_service google.genai model {model_name} failed: {e}")
                if any(k in err_msg.lower() for k in ['404', 'not found', 'deprecated']):
                    continue
                if 'quota' in err_msg.lower() or '429' in err_msg or 'resourceexhausted' in err_msg.lower():
                    logger.info(f"Model {model_name} quota exceeded. Cascading to next candidate...")
                    continue
                continue
    except ImportError:
        pass

    # Strategy 2: Legacy google.generativeai
    try:
        import google.generativeai as legacy_genai
        legacy_genai.configure(api_key=api_key)
        for model_name in candidate_models:
            try:
                model = legacy_genai.GenerativeModel(model_name)
                res = model.generate_content(prompt)
                if res and res.text:
                    return res.text.strip()
            except Exception as e:
                err_msg = str(e)
                last_error = err_msg
                logger.warning(f"ai_service legacy_genai model {model_name} failed: {e}")
                if any(k in err_msg.lower() for k in ['404', 'not found', 'deprecated']):
                    continue
                if 'quota' in err_msg.lower() or '429' in err_msg:
                    logger.info(f"Legacy model {model_name} quota exceeded. Cascading to next candidate...")
                    continue
                continue
    except Exception as e:
        last_error = str(e)

    raise RuntimeError(last_error or "AI generation failed across all available models")

def _clean_json_str(text):
    text = text.strip()
    if '```' in text:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.IGNORECASE)
        if match:
            text = match.group(1).strip()
    match = re.search(r'(\{[\s\S]*\})', text)
    if match:
        text = match.group(1).strip()
    return text

def _regex_parse_voice_expense(text):
    """
    Deterministic fallback parser for multilingual (Hindi/English) voice input.
    Extracts item name, exact amount in INR, canonical category, and payment method.
    """
    clean_text = text.strip()
    lower_text = clean_text.lower()

    # 1. Extract Amount in INR
    # Patterns: ₹500, 500rs, 500 rs, 500 rupees, 500 rupaye, 500 ka, spent 500
    amt_match = re.search(
        r'(?:₹|rs\.?|inr|rupees|rupaye)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr|rupees|rupaye|bucks|ka)?',
        lower_text
    )
    amount = None
    if amt_match:
        try:
            raw_num = amt_match.group(1).replace(',', '')
            val = float(raw_num)
            if val > 0:
                amount = val
        except (ValueError, TypeError):
            amount = None

    # 2. Extract Category
    cat_keywords = {
        'Food': ['lunch', 'dinner', 'breakfast', 'canteen', 'swiggy', 'zomato', 'restaurant', 'meal', 'chai', 'tea', 'coffee', 'snacks', 'samosa', 'maggi', 'pizza', 'burger', 'thali', 'khana', 'food'],
        'Travel': ['auto', 'cab', 'taxi', 'uber', 'ola', 'bus', 'metro', 'train', 'flight', 'petrol', 'diesel', 'fuel', 'rickshaw', 'travel', 'commute', 'toll'],
        'Bills': ['recharge', 'wifi', 'broadband', 'electricity', 'bijli', 'water', 'rent', 'maintenance', 'gas', 'cylinder', 'bill', 'utilities'],
        'Education': ['book', 'books', 'stationery', 'xerox', 'print', 'printout', 'course', 'tuition', 'college', 'exam', 'fees', 'kitab', 'pen', 'notebook'],
        'Entertainment': ['movie', 'cinema', 'tickets', 'fest', 'game', 'gaming', 'concert', 'party', 'outing', 'pub', 'club'],
        'Health': ['medicine', 'doctor', 'pharmacy', 'clinic', 'hospital', 'tablet', 'medicines', 'dawa', 'gym', 'fitness', 'medical'],
        'Shopping': ['clothes', 'shirt', 'pants', 'shoes', 'amazon', 'flipkart', 'myntra', 'zara', 'shopping', 'dress'],
        'Subscription': ['subscription', 'netflix', 'spotify', 'youtube', 'copilot', 'aws', 'prime', 'membership']
    }

    detected_category = 'Other'
    for cat, keywords in cat_keywords.items():
        if any(re.search(r'\b' + re.escape(kw) + r'\b', lower_text) for kw in keywords):
            detected_category = cat
            break

    # 3. Extract Payment Method
    detected_pmethod = 'UPI'
    if any(k in lower_text for k in ['cash', 'rokad', 'nagad']):
        detected_pmethod = 'Cash'
    elif any(k in lower_text for k in ['card', 'credit card', 'debit card', 'visa', 'mastercard']):
        detected_pmethod = 'Card'
    elif any(k in lower_text for k in ['netbanking', 'net banking', 'bank transfer', 'neft', 'imps']):
        detected_pmethod = 'NetBanking'

    # 4. Extract Item Name
    # Remove amount tokens and payment words
    cleaned_name = re.sub(r'(?:₹|rs\.?|inr|rupees|rupaye)?\s*\d+(?:,\d+)*(?:\.\d{1,2})?\s*(?:₹|rs\.?|inr|rupees|rupaye|bucks|ka)?', ' ', clean_text, flags=re.IGNORECASE)
    cleaned_name = re.sub(r'\b(spent|paid|given|payed|kharch|diya|de diya|via|through|using|cash|upi|card|netbanking|by|for)\b', ' ', cleaned_name, flags=re.IGNORECASE).strip()
    cleaned_name = re.sub(r'\s+', ' ', cleaned_name).strip()
    if not cleaned_name or len(cleaned_name) < 2:
        cleaned_name = f"{detected_category} expense"

    return {
        "name": cleaned_name.title(),
        "amount": amount if amount is not None else 100.0,
        "category": detected_category,
        "payment_method": detected_pmethod
    }

def parse_voice_expense(text):
    """
    Parse voice transcription into structured expense fields.
    Uses Gemini 1.5 Flash with deterministic regex fallback for offline/missing key/rate-limit.
    """
    if not text or not text.strip():
        return None, "No voice input detected. Please speak clearly into the microphone."

    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    
    if api_key:
        try:
            prompt = f"""You are an Indian financial assistant parser. Extract the expense information from this spoken text:
"{text}"

Enforce this strict JSON format (no markdown code ticks, pure JSON only):
{{
  "name": "Item description or vendor",
  "amount": 250.0,
  "category": "Food",
  "payment_method": "UPI"
}}

Rules:
- Valid categories: Food, Travel, Education, Entertainment, Bills, Health, Shopping, Subscription, Other.
- Valid payment methods: UPI, Cash, Card, NetBanking. Default to UPI if unspecified.
- Amount must be a clean numeric float in Indian Rupee value."""

            raw = _generate_content_text(prompt, api_key)
            cleaned_json = _clean_json_str(raw)
            parsed = json.loads(cleaned_json)
            
            # Sanitize output
            amt = parsed.get('amount')
            if amt is not None:
                parsed['amount'] = float(amt)
            else:
                fallback = _regex_parse_voice_expense(text)
                parsed['amount'] = fallback['amount']
                
            if parsed.get('category') not in VALID_CATEGORIES:
                parsed['category'] = 'Other'
                
            if not parsed.get('name'):
                parsed['name'] = f"{parsed['category']} expense"
                
            return parsed, None
        except Exception as e:
            logger.warning(f"Gemini voice parsing failed: {e}. Executing deterministic fallback parser.")

    # Deterministic fallback parser
    fallback = _regex_parse_voice_expense(text)
    return fallback, None

def _build_financial_summary(user, db_session):
    from app.models.transaction import Transaction
    from app.utils.calculations import get_canonical_month_range
    from sqlalchemy import func
    
    start, end = get_canonical_month_range()
    
    total_spent = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id, Transaction.type == 'expense',
        Transaction.date >= start, Transaction.date < end
    ).scalar() or 0
    total_spent = float(total_spent)

    total_income = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id, Transaction.type == 'income',
        Transaction.date >= start, Transaction.date < end
    ).scalar() or 0
    total_income = float(total_income)
    
    # If student has 0 income records, use monthly allowance
    allowance = float(user.monthly_allowance) if user.monthly_allowance else (11500.0 if user.role == 'student' else 115000.0)
    effective_income = total_income if total_income > 0 else allowance
    
    net_savings = max(0.0, effective_income - total_spent)
    savings_rate = round((net_savings / effective_income) * 100) if effective_income > 0 else 0

    top_categories = db_session.query(
        Transaction.category,
        func.sum(Transaction.amount).label('cat_total')
    ).filter(
        Transaction.user_id == user.id, Transaction.type == 'expense',
        Transaction.date >= start, Transaction.date < end
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).limit(3).all()
    
    top_category_name = top_categories[0].category if top_categories else "Expenses"
    top_category_amt = float(top_categories[0].cat_total) if top_categories else 0.0
    cats_summary = ", ".join([f"{c.category}: ₹{float(c.cat_total):,.0f}" for c in top_categories]) or "None"

    goals = user.savings_goals.all()
    avg_savings_progress = sum(g.percent_complete for g in goals) / len(goals) if goals else 0
    
    ef = user.emergency_fund
    ef_months = ef.months_covered if ef else 0

    return {
        "period": start.strftime("%B %Y"),
        "role": user.role,
        "total_spent_inr": round(total_spent, 2),
        "total_income_inr": round(effective_income, 2),
        "savings_rate_pct": savings_rate,
        "monthly_budget_inr": allowance,
        "top_category": top_category_name,
        "top_category_amount_inr": round(top_category_amt, 2),
        "top_categories_breakdown": cats_summary,
        "avg_savings_goal_progress_pct": round(avg_savings_progress, 1),
        "emergency_fund_months": ef_months,
    }

def _create_heuristic_insight(summary):
    """Deterministic CFP rule-based fallback matrix returning structured advice with exact INR figures."""
    spent = summary['total_spent_inr']
    budget = summary['monthly_budget_inr']
    top_cat = summary['top_category']
    top_amt = summary['top_category_amount_inr']
    savings_rate = summary['savings_rate_pct']
    role = summary['role']

    utilization = (spent / budget * 100) if budget > 0 else 50
    if utilization > 85:
        headline = "Budget alert: Burn rate approaching limit"
        description = f"You have spent ₹{spent:,.0f} of your ₹{budget:,.0f} allocation this month. {top_cat} constitutes your largest outflow at ₹{top_amt:,.0f}. Trimming non-essential discretionary orders can preserve a ₹1,500 surplus."
        health_score = 56
        risk = "warning"
    elif utilization > 50:
        headline = f"Steady spending pace in {top_cat}"
        description = f"Your current burn is ₹{spent:,.0f} out of ₹{budget:,.0f} with a healthy {savings_rate}% savings rate. Redirecting ₹{round(top_amt * 0.15):,.0f} from {top_cat} will accelerate your savings goal completion."
        health_score = 78
        risk = "optimal"
    else:
        headline = "Excellent financial cushion maintained"
        description = f"Prudent money management this month with only ₹{spent:,.0f} spent against ₹{budget:,.0f}. You have retained a strong {savings_rate}% savings rate across your financial workspace."
        health_score = 92
        risk = "optimal"

    payload = {
        "headline": headline,
        "description": description,
        "financial_health_score": health_score,
        "risk_level": risk,
        "savings_potential_inr": round(top_amt * 0.15) if top_amt > 0 else 1200,
        "actionable_steps": [
            {
                "step": 1,
                "title": f"Monitor {top_cat} weekly burn",
                "action": f"Set a soft cap of ₹{round(top_amt * 0.75):,.0f} on {top_cat} for the remaining weeks.",
                "potential_savings_inr": round(top_amt * 0.15) if top_amt > 0 else 800
            },
            {
                "step": 2,
                "title": "Automate recurring savings",
                "action": "Transfer 10% of unspent surplus into your primary savings goal.",
                "potential_savings_inr": 1500
            }
        ]
    }
    return headline, json.dumps(payload)

def generate_insight(user, db_session):
    """
    Prompt Gemini 1.5 Flash as a Certified Financial Planner (CFP) using current month telemetry.
    Guarantee strict JSON responses: {"headline": "<8 words", "description": "2-3 sentences with exact INR figures"}.
    Deterministic rule-based fallback matrix when offline.
    """
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    summary = _build_financial_summary(user, db_session)
    
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — using CFP rule-based fallback matrix")
        return _create_heuristic_insight(summary)
    
    try:
        prompt = f"""You are a Certified Financial Planner (CFP) advising an Indian {summary['role']}.
Analyze the following telemetry for {summary['period']}:
- Total Burn: ₹{summary['total_spent_inr']:,.0f}
- Total Inflow / Allowance: ₹{summary['total_income_inr']:,.0f}
- Savings Rate: {summary['savings_rate_pct']}%
- Top Category: {summary['top_category']} (₹{summary['top_category_amount_inr']:,.0f})
- Savings Goals Progress: {summary['avg_savings_goal_progress_pct']}%
- Emergency Runway: {summary['emergency_fund_months']} months

Respond ONLY with valid JSON with this exact contract (no markdown code ticks):
{{
  "headline": "<8 words punchy headline",
  "description": "2-3 sentences with exact INR figures explaining financial health and giving 1 specific tip."
}}"""

        text = _generate_content_text(prompt, api_key)
        cleaned_json = _clean_json_str(text)
        parsed = json.loads(cleaned_json)
        headline = str(parsed.get('headline', 'Financial Health Assessment'))[:255]
        description = str(parsed.get('description', ''))
        
        if not headline or not description:
            raise ValueError("Incomplete CFP response schema")

        # Package into full structured JSON for AIInsight record
        payload = {
            "headline": headline,
            "description": description,
            "summary": description,
            "financial_health_score": 82,
            "risk_level": "optimal" if summary['savings_rate_pct'] >= 30 else "warning",
            "savings_potential_inr": round(summary['top_category_amount_inr'] * 0.15) if summary['top_category_amount_inr'] > 0 else 1200,
            "actionable_steps": [
                {
                    "step": 1,
                    "title": f"Manage {summary['top_category']} allocation",
                    "action": f"Keep discretionary transactions in {summary['top_category']} bounded under ₹{round(summary['top_category_amount_inr'] * 0.8):,.0f}.",
                    "potential_savings_inr": round(summary['top_category_amount_inr'] * 0.2) if summary['top_category_amount_inr'] > 0 else 1000
                }
            ]
        }
        return headline, json.dumps(payload)
    except Exception as e:
        logger.error(f"CFP insight generation failed: {e}. Reverting to fallback matrix.")
        return _create_heuristic_insight(summary)
