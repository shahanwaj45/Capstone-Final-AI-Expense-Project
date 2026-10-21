import io
import calendar
from datetime import datetime
from app.utils.timezone import get_ist_now
from flask import Blueprint, request, make_response
from sqlalchemy import func
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app import db
from app.models.transaction import Transaction
from app.models.income_source import IncomeSource
from app.models.budget import Budget
from app.utils.auth import require_auth, get_current_user, success_response, error_response
from app.utils.calculations import calculate_financial_health, get_canonical_month_range

reports_bp = Blueprint('reports', __name__)

def _generate_pdf_buffer(user, report_type="monthly", month=None, year=None):
    now = get_ist_now()
    month = month or now.month
    year = year or now.year
    month_name = calendar.month_name[month]
    
    start, end = get_canonical_month_range(year, month)
    
    # 1. Fetch user expenses
    txs = Transaction.query.filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start,
        Transaction.date < end
    ).order_by(Transaction.date.desc()).all()
    
    total_spent = sum(float(t.amount) for t in txs)
    
    # 2. Fetch income
    income_txs = Transaction.query.filter(
        Transaction.user_id == user.id,
        Transaction.type == 'income',
        Transaction.date >= start,
        Transaction.date < end
    ).all()
    total_income = sum(float(t.amount) for t in income_txs)
    
    # Include income from income_sources table for professionals if any
    if user.role == 'professional':
        inc_sources = IncomeSource.query.filter_by(user_id=user.id).all()
        src_total = sum(float(s.amount) for s in inc_sources)
        if src_total > total_income:
            total_income = src_total
            
    if total_income == 0 and user.monthly_allowance:
        total_income = float(user.monthly_allowance)
        
    net_savings = max(0.0, total_income - total_spent)
    savings_rate = round((net_savings / total_income) * 100) if total_income > 0 else 0
    health_score = calculate_financial_health(user, db.session)
    
    # 3. Category breakdown
    cat_totals = {}
    for t in txs:
        cat = t.category or "Other"
        cat_totals[cat] = cat_totals.get(cat, 0.0) + float(t.amount)
        
    # 4. Create in-memory PDF using ReportLab
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    primary_color = colors.HexColor('#172532')
    text_muted = colors.HexColor('#718078')
    border_color = colors.HexColor('#E2E8E2')
    light_bg = colors.HexColor('#F8FAF7')
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_muted
    )
    
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6
    )
    
    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=primary_color
    )
    
    cell_regular = ParagraphStyle(
        'CellRegular',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=primary_color
    )

    story = []
    
    # Header Banner
    story.append(Paragraph("AI Expense Tracker — Official Financial Statement", title_style))
    story.append(Paragraph(
        f"Generated on {now.strftime('%d %B %Y')} | Account: {user.name} ({user.email}) | Role: {user.role.title()}",
        subtitle_style
    ))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceBefore=4, spaceAfter=14))
    
    # Statement Heading
    report_heading = f"Financial Statement — {month_name} {year}"
    story.append(Paragraph(report_heading, h2_style))
    story.append(Spacer(1, 6))
    
    # Financial Overview KPI Cards (Using 'Rs.' to guarantee font compatibility)
    kpi_data = [
        [
            Paragraph("Total Inflow", cell_bold),
            Paragraph("Total Spending Burn", cell_bold),
            Paragraph("Net Savings", cell_bold),
            Paragraph("Health Score", cell_bold)
        ],
        [
            Paragraph(f"+Rs. {total_income:,.0f}", cell_bold),
            Paragraph(f"-Rs. {total_spent:,.0f}", cell_bold),
            Paragraph(f"Rs. {net_savings:,.0f} ({savings_rate}%)", cell_bold),
            Paragraph(f"{health_score} / 100", cell_bold)
        ]
    ]
    
    kpi_table = Table(kpi_data, colWidths=[130, 130, 136, 136])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), light_bg),
        ('TEXTCOLOR', (0, 0), (-1, -1), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 16))
    
    # Category Breakdown Table
    story.append(Paragraph("Category Spending Breakdown", h2_style))
    cat_rows = [[
        Paragraph("Category", cell_bold),
        Paragraph("Amount Spent", cell_bold),
        Paragraph("Share of Spending", cell_bold)
    ]]
    
    if cat_totals:
        for cat, amt in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True):
            pct = round((amt / total_spent) * 100, 1) if total_spent > 0 else 0
            cat_rows.append([
                Paragraph(cat, cell_regular),
                Paragraph(f"Rs. {amt:,.0f}", cell_regular),
                Paragraph(f"{pct}%", cell_regular)
            ])
    else:
        cat_rows.append([
            Paragraph("No recorded expenses", cell_regular),
            Paragraph("Rs. 0", cell_regular),
            Paragraph("0%", cell_regular)
        ])
        
    cat_table = Table(cat_rows, colWidths=[200, 166, 166])
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), light_bg),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(cat_table)
    story.append(Spacer(1, 16))
    
    # Recent Transactions Ledger Table
    story.append(Paragraph("Recent Transactions Ledger", h2_style))
    tx_rows = [[
        Paragraph("Date", cell_bold),
        Paragraph("Description / Merchant", cell_bold),
        Paragraph("Category", cell_bold),
        Paragraph("Amount", cell_bold)
    ]]
    
    for t in txs[:10]:
        tx_rows.append([
            Paragraph(t.date.strftime("%d %b %Y"), cell_regular),
            Paragraph(t.name[:28], cell_regular),
            Paragraph(t.category or "Other", cell_regular),
            Paragraph(f"-Rs. {float(t.amount):,.0f}", cell_regular)
        ])
        
    if len(txs) == 0:
        tx_rows.append([
            Paragraph("-", cell_regular),
            Paragraph("No transactions for this statement period", cell_regular),
            Paragraph("-", cell_regular),
            Paragraph("Rs. 0", cell_regular)
        ])
        
    tx_table = Table(tx_rows, colWidths=[110, 200, 112, 110])
    tx_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), light_bg),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(tx_table)
    story.append(Spacer(1, 16))
    
    # Footer Notice
    story.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=10, spaceAfter=8))
    story.append(Paragraph(
        "Confidential financial statement generated automatically by AI Expense Tracker ReportLab Engine. Values formatted in INR.",
        subtitle_style
    ))
    
    doc.build(story)
    buf.seek(0)
    return buf

@reports_bp.route('/download', methods=['GET'])
@reports_bp.route('/monthly-pdf', methods=['GET'])
@require_auth
def download_pdf():
    user = get_current_user()
    name = request.args.get('name', '').lower()
    
    now = get_ist_now()
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))
    month_name = calendar.month_name[month]
    
    report_type = "monthly"
    if "category" in name:
        report_type = "category"
    elif "semester" in name:
        report_type = "semester"
        
    buf = _generate_pdf_buffer(user, report_type=report_type, month=month, year=year)
    
    filename = f"Statement_{month_name}_{year}.pdf"
    
    response = make_response(buf.getvalue())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

@reports_bp.route('/list', methods=['GET'])
@require_auth
def list_reports():
    now = get_ist_now()
    current_month_name = calendar.month_name[now.month]
    prev_month = now.month - 1 if now.month > 1 else 12
    prev_year = now.year if now.month > 1 else now.year - 1
    prev_month_name = calendar.month_name[prev_month]
    
    available = [
        {
            "id": "monthly-current",
            "name": f"Monthly Summary — {current_month_name} {now.year}",
            "type": "PDF",
            "date": "Generated today",
            "report_type": "monthly",
            "month": now.month,
            "year": now.year
        },
        {
            "id": "category-prev",
            "name": f"Category Breakdown — {prev_month_name} {prev_year}",
            "type": "PDF",
            "date": f"1 {current_month_name[:3]} {now.year}",
            "report_type": "category",
            "month": prev_month,
            "year": prev_year
        },
        {
            "id": "semester-h1",
            "name": f"Semester Overview — H{1 if now.month <= 6 else 2} {now.year}",
            "type": "PDF",
            "date": f"30 {calendar.month_abbr[6 if now.month <= 6 else 12]} {now.year}",
            "report_type": "semester",
            "month": now.month,
            "year": now.year
        }
    ]
    return success_response(available)
