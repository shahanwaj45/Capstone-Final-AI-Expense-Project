import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

FALLBACK_INSIGHTS = [
    {
        "headline": "Track every rupee to unlock insights.",
        "description": "Add more transactions to get personalised AI-powered financial insights. The more data you provide, the smarter your recommendations become.",
    },
    {
        "headline": "Small savings add up fast.",
        "description": "Even saving 10% of your monthly budget can compound significantly over a year. Consider setting an automatic savings goal to stay consistent.",
    },
    {
        "headline": "Review your subscriptions.",
        "description": "Many people overpay on subscriptions they rarely use. Review your recurring charges and cancel anything you haven't used in the last month.",
    },
]

def _build_financial_summary(user, db_session):
    from app.models.transaction import Transaction
    from app.utils.calculations import get_current_month_range
    from sqlalchemy import func
    
    start, end = get_current_month_range()
    
    total_spent = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id, Transaction.type == 'expense',
        Transaction.date >= start, Transaction.date < end
    ).scalar() or 0

    total_income = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id, Transaction.type == 'income',
        Transaction.date >= start, Transaction.date < end
    ).scalar() or 0
    
    top_categories = db_session.query(
        Transaction.category,
        func.sum(Transaction.amount).label('cat_total')
    ).filter(
        Transaction.user_id == user.id, Transaction.type == 'expense',
        Transaction.date >= start, Transaction.date < end
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).limit(3).all()
    
    top_category_name = top_categories[0].category if top_categories else "Other"
    top_category_amt = float(top_categories[0].cat_total) if top_categories else 0.0

    cats_summary = ", ".join([f"{c.category}: ₹{float(c.cat_total):,.0f}" for c in top_categories]) or "None"

    goals = user.savings_goals.all()
    avg_savings_progress = sum(g.percent_complete for g in goals) / len(goals) if goals else 0
    
    ef = user.emergency_fund
    ef_months = ef.months_covered if ef else 0

    allowance = float(user.monthly_allowance) if user.monthly_allowance else (30000.0 if user.role == 'student' else 85000.0)

    return {
        "period": start.strftime("%B %Y"),
        "role": user.role,
        "total_spent_inr": round(float(total_spent), 2),
        "total_income_inr": round(float(total_income), 2),
        "monthly_budget_inr": allowance,
        "top_category": top_category_name,
        "top_category_amount_inr": round(top_category_amt, 2),
        "top_categories_breakdown": cats_summary,
        "avg_savings_goal_progress_pct": round(avg_savings_progress, 1),
        "emergency_fund_months": ef_months,
    }

FALLBACK_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
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

    # Try modern google.genai
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        for model_name in candidate_models:
            try:
                res = client.models.generate_content(model=model_name, contents=prompt)
                if res and res.text:
                    return res.text.strip()
            except Exception as e:
                last_error = str(e)
                logger.warning(f"ai_service google.genai model {model_name} failed: {e}")
                if any(k in str(e).lower() for k in ['404', 'not found', 'no longer available', 'deprecated']):
                    continue
                break
    except ImportError:
        pass

    # Try legacy google.generativeai
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
                last_error = str(e)
                logger.warning(f"ai_service legacy_genai model {model_name} failed: {e}")
                if any(k in str(e).lower() for k in ['404', 'not found', 'no longer available', 'deprecated']):
                    continue
                break
    except Exception as e:
        last_error = str(e)

    raise RuntimeError(last_error or "AI generation failed across all available models")

def _clean_json_str(text):
    text = text.strip()
    import re
    if '```' in text:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.IGNORECASE)
        if match:
            text = match.group(1).strip()
    match = re.search(r'(\{[\s\S]*\})', text)
    if match:
        text = match.group(1).strip()
    return text

def _create_heuristic_insight(summary):
    spent = summary['total_spent_inr']
    budget = summary['monthly_budget_inr']
    top_cat = summary['top_category']
    top_amt = summary['top_category_amount_inr']
    role = summary['role']

    utilization = (spent / budget * 100) if budget > 0 else 50
    if utilization > 90:
        health_score = 58
        risk_level = "high"
        headline = f"Approaching monthly budget threshold ({utilization:.0f}%)"
        summary_text = f"You have utilized ₹{spent:,.0f} of your ₹{budget:,.0f} limit this month. The heaviest drain is in {top_cat} (₹{top_amt:,.0f}). Immediate re-balancing is recommended."
    elif utilization > 60:
        health_score = 76
        risk_level = "moderate"
        headline = f"Spending on track, but monitor {top_cat}"
        summary_text = f"You've consumed ₹{spent:,.0f} of your ₹{budget:,.0f} budget. Your largest spend remains {top_cat} at ₹{top_amt:,.0f}. Trimming small discretionary expenses can boost your end-of-month buffer."
    else:
        health_score = 88
        risk_level = "low"
        headline = "Healthy financial discipline maintained"
        summary_text = f"Strong budget control this month with only ₹{spent:,.0f} spent out of ₹{budget:,.0f}. You are positioned well to accelerate your savings goals."

    actionable_steps = [
        {
            "step": 1,
            "title": f"Cap weekly spend in {top_cat}",
            "action": f"Limit discretionary orders in {top_cat} to keep total category burn under control.",
            "potential_savings_inr": round(top_amt * 0.15) if top_amt > 0 else 800
        },
        {
            "step": 2,
            "title": "Boost automated savings",
            "action": "Redirect 10% of unspent monthly balance into your high-yield Emergency Fund or primary savings goal.",
            "potential_savings_inr": 1500
        },
        {
            "step": 3,
            "title": "Review active recurring charges",
            "action": "Audit current subscriptions to ensure you aren't paying for unutilized digital services.",
            "potential_savings_inr": 450
        }
    ]

    spending_anomalies = [
        {
            "category": top_cat,
            "detail": f"{top_cat} accounts for {round((top_amt / max(spent, 1)) * 100)}% of your monthly expenditure.",
            "severity": "warning" if utilization > 65 else "info"
        }
    ]

    insight_obj = {
        "headline": headline,
        "summary": summary_text,
        "financial_health_score": health_score,
        "risk_level": risk_level,
        "savings_potential_inr": 2750,
        "spending_anomalies": spending_anomalies,
        "actionable_steps": actionable_steps,
        "category_leaks": [top_cat]
    }
    return headline, json.dumps(insight_obj)

def generate_insight(user, db_session):
    """Generate comprehensive AI financial advisory report using Gemini with rich fallback."""
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    summary = _build_financial_summary(user, db_session)
    
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — using comprehensive heuristic insight")
        return _create_heuristic_insight(summary)
    
    try:
        prompt = f"""You are an expert personal financial advisor for an Indian {summary['role']}.
Analyze the following financial summary and produce a comprehensive, structured financial health report.

Financial Profile:
- Month: {summary['period']}
- Role: {summary['role']}
- Total Spent This Month: ₹{summary['total_spent_inr']:,.0f}
- Total Income / Received: ₹{summary['total_income_inr']:,.0f}
- Monthly Allowance / Budget: ₹{summary['monthly_budget_inr']:,.0f}
- Top Category Breakdown: {summary['top_categories_breakdown']}
- Savings Goals Average Progress: {summary['avg_savings_goal_progress_pct']}%
- Emergency Fund Runway: {summary['emergency_fund_months']} months

Respond ONLY with valid JSON with this exact schema (no markdown formatting, no code ticks):
{{
  "headline": "Punchy executive headline under 8 words",
  "summary": "2-3 sentence executive assessment highlighting spending patterns and financial runway.",
  "financial_health_score": 82,
  "risk_level": "low",
  "savings_potential_inr": 2500,
  "spending_anomalies": [
    {{"category": "Food", "detail": "Dining out surged 28% above weekly average.", "severity": "warning"}}
  ],
  "actionable_steps": [
    {{"step": 1, "title": "Cap weekly food orders", "action": "Limit weekend food deliveries to ₹1,200 to preserve ₹1,800 monthly.", "potential_savings_inr": 1800}},
    {{"step": 2, "title": "Auto-save unspent allowance", "action": "Deposit ₹1,000 into your emergency fund.", "potential_savings_inr": 1000}},
    {{"step": 3, "title": "Subscription audit", "action": "Cancel unused memberships to immediately boost monthly cash flow.", "potential_savings_inr": 400}}
  ],
  "category_leaks": ["Dining Out", "Weekend Cabs"]
}}"""

        text = _generate_content_text(prompt, api_key)
        cleaned_json = _clean_json_str(text)
        parsed = json.loads(cleaned_json)
        headline = str(parsed.get('headline', 'Financial Health Assessment'))[:255]
        
        # Verify essential fields
        if not headline or 'summary' not in parsed:
            raise ValueError("Incomplete AI response schema")
            
        return headline, json.dumps(parsed)
        
    except Exception as e:
        logger.error(f"AI insight generation failed: {e}")
        return _create_heuristic_insight(summary)

def parse_voice_expense(text):
    """Use Gemini to parse spoken text into structured expense data."""
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    
    if not api_key:
        return None, "AI service not configured. Please add GEMINI_API_KEY to your Backend/.env file."
    
    try:
        prompt = f"""Extract expense information from this spoken text: "{text}"

Respond ONLY with valid JSON:
{{"name": "expense description", "amount": 250, "category": "Food", "payment_method": "UPI"}}

Valid categories: Food, Travel, Education, Entertainment, Bills, Health, Shopping, Subscription, Other
If you cannot parse an amount, set amount to null.
Do not include markdown or explanation."""

        raw = _generate_content_text(prompt, api_key)
        cleaned_json = _clean_json_str(raw)
        parsed = json.loads(cleaned_json)
        return parsed, None
        
    except Exception as e:
        logger.error(f"Voice parsing failed: {e}")
        return None, f"Could not parse your expense: {e}"
