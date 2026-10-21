import logging
import calendar
import os
from datetime import datetime, timedelta
from app.utils.timezone import get_ist_now
from app.models.transaction import Transaction
from sqlalchemy import func, extract

logger = logging.getLogger(__name__)

CATEGORY_COLORS = {
    'Food': '#7BE2BE',
    'Travel': '#a29bf4',
    'Bills': '#f6ae8e',
    'Education': '#a9dced',
    'Entertainment': '#ffb0c8',
    'Shopping': '#fed876',
    'Health': '#83d8c9',
    'Other': '#b8c5d6'
}

def _get_monthly_spending(user_id, db_session):
    """Get last 12 months of aggregated spending data"""
    rows = db_session.query(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type == 'expense'
    ).group_by('year', 'month').order_by('year', 'month').all()
    
    return [(int(r.year), int(r.month), float(r.total)) for r in rows]

def _get_category_distribution(user_id, db_session):
    """Get percentage breakdown of expenses by category"""
    cat_rows = db_session.query(
        Transaction.category,
        func.sum(Transaction.amount).label('cat_total')
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type == 'expense'
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()

    total_spent = sum(float(r.cat_total) for r in cat_rows)
    if total_spent == 0:
        return []

    distribution = []
    for r in cat_rows:
        amount = float(r.cat_total)
        pct = round((amount / total_spent) * 100, 1)
        distribution.append({
            'category': r.category or 'Other',
            'amount': round(amount, 2),
            'percentage': pct,
            'color': CATEGORY_COLORS.get(r.category, '#a9dced')
        })
    return distribution

def _generate_prediction_ai_note(predictions, top_category, daily_spend, total_predicted):
    """Generate intelligent forecast commentary using Gemini or dynamic heuristic"""
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if api_key:
        try:
            from app.services.ai_service import _generate_content_text
            p_first = predictions[0] if predictions else {}
            prompt = f"""You are a personal financial predictive analyst for an Indian user.
Context:
- Next month's forecasted spending: {p_first.get('predicted', 'N/A')} (Trend: {p_first.get('trend', 'stable')})
- Top spending driver category: {top_category}
- Current daily spend velocity: ₹{daily_spend:,.0f}/day
- Total 3-month forecast: ₹{total_predicted:,.0f}

In 2 clear, insightful sentences, explain the key factors driving this spending forecast and provide one actionable tip to avoid overspending."""
            note = _generate_content_text(prompt, api_key)
            if note and len(note.strip()) > 20:
                return note.strip()
        except Exception as e:
            logger.warning(f"Gemini prediction note generation failed: {e}")

    # Dynamic fallback note
    if top_category and daily_spend > 0:
        return f"AI projection indicates an average run-rate of ₹{daily_spend:,.0f}/day driven largely by {top_category}. Maintaining current spending pace will keep your upcoming month within your projected target."
    return "Predictions are generated based on your spending velocity and category trends. Add more transactions to continuously sharpen forecasting accuracy."

def predict_next_months(user_id, db_session, n_months=3):
    """
    Predict next n_months of spending with adaptive machine learning:
    - 0 transactions: onboarding required
    - < 3 months: Velocity & momentum daily projection
    - 3-5 months: Moving average + momentum
    - 6+ months: Linear regression with trend extrapolation
    Also generates category forecasts, confidence ranges, and AI forecast commentary.
    """
    now = get_ist_now()
    total_tx_count = db_session.query(func.count(Transaction.id)).filter(
        Transaction.user_id == user_id,
        Transaction.type == 'expense'
    ).scalar() or 0

    if total_tx_count == 0:
        return None, 'no_data', 0

    historical = _get_monthly_spending(user_id, db_session)
    category_dist = _get_category_distribution(user_id, db_session)

    # Calculate recent daily velocity
    thirty_days_ago = now - timedelta(days=30)
    recent_spent = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == 'expense',
        Transaction.date >= thirty_days_ago
    ).scalar() or 0
    daily_velocity = float(recent_spent) / 30.0 if recent_spent > 0 else 0

    # Calculate current month spend so far and month-end projection
    current_month_start = datetime(now.year, now.month, 1)
    current_month_spent = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == 'expense',
        Transaction.date >= current_month_start
    ).scalar() or 0
    current_month_spent = float(current_month_spent)

    days_in_current_month = calendar.monthrange(now.year, now.month)[1]
    days_passed = max(1, now.day)
    days_left = max(0, days_in_current_month - days_passed)
    current_month_daily_rate = current_month_spent / days_passed
    effective_daily = max(daily_velocity, current_month_daily_rate)
    projected_current_month_total = current_month_spent + (days_left * effective_daily)

    amounts = [h[2] for h in historical]
    method = 'velocity_momentum'
    predictions_raw = []

    if len(historical) >= 6:
        # Linear Regression ML
        try:
            from sklearn.linear_model import LinearRegression
            import numpy as np

            X = np.array(range(len(amounts))).reshape(-1, 1)
            y = np.array(amounts)
            model = LinearRegression()
            model.fit(X, y)

            future_X = np.array(range(len(amounts), len(amounts) + n_months)).reshape(-1, 1)
            predictions_raw = model.predict(future_X).tolist()
            method = 'linear_regression'
        except Exception as e:
            logger.warning(f"Linear regression failed: {e}")
            avg = sum(amounts[-3:]) / 3
            predictions_raw = [avg * (1 + (i * 0.02)) for i in range(n_months)]
            method = 'moving_average'
    elif len(historical) >= 3:
        # Moving average with momentum
        avg = sum(amounts[-3:]) / 3
        predictions_raw = [avg * (1 + (i * 0.025)) for i in range(n_months)]
        method = 'moving_average'
    else:
        # Velocity-based projection for newer accounts
        base_estimate = max(projected_current_month_total, effective_daily * 30, 5000)
        predictions_raw = [base_estimate * (1 + (i * 0.03)) for i in range(n_months)]
        method = 'daily_velocity'

    baseline_spend = current_month_spent if current_month_spent > 0 else (amounts[-1] if amounts else effective_daily * 30)

    predictions = []
    total_predicted = 0.0
    for i in range(n_months):
        month_offset = i + 1
        pred_month = ((now.month + month_offset - 1) % 12) + 1
        pred_year = now.year + (now.month + month_offset - 1) // 12
        pred_amount = max(500.0, round(predictions_raw[i], 2))
        total_predicted += pred_amount

        if baseline_spend > 0:
            pct_change = ((pred_amount - baseline_spend) / baseline_spend) * 100
        else:
            pct_change = 0

        positive = pct_change <= 0
        direction = "↓" if pct_change <= 0 else "↑"

        # Confidence bounds (Conservative: -8%, Expected, Aggressive: +10%)
        low_bound = round(pred_amount * 0.92, 2)
        high_bound = round(pred_amount * 1.10, 2)

        predictions.append({
            'month': calendar.month_name[pred_month],
            'month_abbr': calendar.month_abbr[pred_month],
            'year': pred_year,
            'predicted': f"₹{pred_amount:,.0f}",
            'predicted_raw': pred_amount,
            'low_bound': f"₹{low_bound:,.0f}",
            'high_bound': f"₹{high_bound:,.0f}",
            'trend': f"{direction} {abs(pct_change):.1f}%",
            'pct_change': round(pct_change, 1),
            'positive': positive,
        })

    # Category predictions for the immediate next month
    next_month_pred_amount = predictions[0]['predicted_raw'] if predictions else 0
    category_predictions = []
    for c in category_dist:
        cat_share = c['percentage'] / 100.0
        predicted_cat_amount = round(next_month_pred_amount * cat_share, 2)
        category_predictions.append({
            'category': c['category'],
            'predicted_amount': predicted_cat_amount,
            'predicted_formatted': f"₹{predicted_cat_amount:,.0f}",
            'percentage': c['percentage'],
            'color': c['color']
        })

    # Historical chart points
    if historical:
        historical_chart = [
            {
                'month': calendar.month_abbr[h[1]],
                'amount': h[2],
                'year': h[0],
            }
            for h in historical[-6:]
        ]
    else:
        historical_chart = [
            {
                'month': calendar.month_abbr[now.month],
                'amount': current_month_spent,
                'year': now.year
            }
        ]

    top_cat = category_dist[0]['category'] if category_dist else 'Expenses'
    ai_note = _generate_prediction_ai_note(predictions, top_cat, effective_daily, total_predicted)

    return {
        'predictions': predictions,
        'historical': historical_chart,
        'category_predictions': category_predictions,
        'method': method,
        'data_points': max(len(historical), 1),
        'daily_velocity': round(effective_daily, 2),
        'current_month_spent': round(current_month_spent, 2),
        'current_month_projected': round(projected_current_month_total, 2),
        'ai_note': ai_note,
    }, 'ok', max(len(historical), 1)
