"""
Australian Retirement Planning - PDF Report Generator

Generates a comprehensive PDF report suitable for financial advisers.
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.lib.colors import HexColor
import json
from datetime import datetime
from io import BytesIO


def format_currency(value):
    """Format currency as AUD"""
    return f"${value:,.0f}"


def format_percent(value):
    """Format as percentage"""
    return f"{value:.1f}%"


def create_portfolio_chart(chart_data, width=6*inch, height=3*inch):
    """Create portfolio balance chart with multiple series"""
    if not chart_data or len(chart_data) == 0:
        # Return empty drawing if no data
        return Drawing(width, height)
    
    drawing = Drawing(width, height)
    
    lc = HorizontalLineChart()
    lc.x = 50
    lc.y = 50
    lc.height = height - 100
    lc.width = width - 100
    
    # Extract data - handle different key names
    # Sample for clarity
    step = max(1, len(chart_data) // 20)  # Max 20 points on chart
    sampled_data = chart_data[::step]
    
    ages = []
    total_balances = []
    super_balances = []
    incomes = []
    
    for d in sampled_data:
        # Try different possible key names (including spaced versions)
        age = d.get('age', 0)
        total_balance = d.get('Total Balance', d.get('totalBalance', d.get('total_balance', d.get('balance', 0))))
        super_balance = d.get('Main Super', d.get('mainSuper', d.get('main_super', 0)))
        income = d.get('Income', d.get('income', d.get('inc', 0)))
        
        ages.append(age)
        total_balances.append(total_balance / 1000)  # In thousands
        super_balances.append(super_balance / 1000)
        incomes.append(income / 1000)
    
    if not ages or not total_balances:
        # No valid data, return empty chart
        return Drawing(width, height)
    
    # Safety check: ensure we have valid range
    all_values = total_balances + super_balances
    min_value = min(all_values)
    max_value = max(all_values)
    value_range = max_value - min_value
    
    # If all values are the same or very close, create a reasonable range
    if value_range < 10:  # Less than $10k variation
        max_value = max_value + 50  # Add $50k to top
        min_value = max(0, min_value - 50)  # Subtract $50k from bottom (but not below 0)
        value_range = max_value - min_value
    
    # Set up data series
    lc.data = [total_balances, super_balances, incomes]
    
    # Category axis (ages)
    lc.categoryAxis.categoryNames = [str(age) for age in ages]
    lc.categoryAxis.labels.angle = 45
    lc.categoryAxis.labels.fontSize = 7
    lc.categoryAxis.labels.dy = -5
    
    # Value axis (balances in thousands)
    lc.valueAxis.valueMin = 0
    lc.valueAxis.valueMax = max_value * 1.1
    lc.valueAxis.valueStep = max(10, value_range / 5)  # At least $10k steps
    lc.valueAxis.labels.fontSize = 7
    lc.valueAxis.labels.fontName = 'Helvetica'
    
    # Format Y-axis labels to show "$XXXk"
    lc.valueAxis.labelTextFormat = lambda x: f'${int(x)}k'
    
    # Line styles
    lc.lines[0].strokeColor = HexColor('#2563eb')  # Blue - Total Balance
    lc.lines[0].strokeWidth = 2.5
    
    lc.lines[1].strokeColor = HexColor('#10b981')  # Green - Super Balance
    lc.lines[1].strokeWidth = 1.5
    lc.lines[1].strokeDashArray = [3, 2]  # Dashed
    
    lc.lines[2].strokeColor = HexColor('#f59e0b')  # Orange - Income
    lc.lines[2].strokeWidth = 1.5
    lc.lines[2].strokeDashArray = [1, 2]  # Dotted
    
    drawing.add(lc)
    
    # Add legend
    from reportlab.graphics.charts.legends import Legend
    legend = Legend()
    legend.x = width - 150
    legend.y = height - 30
    legend.deltax = 5
    legend.deltay = 5
    legend.fontSize = 7
    legend.alignment = 'right'
    legend.columnMaximum = 1
    legend.colorNamePairs = [
        (HexColor('#2563eb'), 'Total Portfolio'),
        (HexColor('#10b981'), 'Super Balance'),
        (HexColor('#f59e0b'), 'Income'),
    ]
    drawing.add(legend)
    
    return drawing


def create_spending_income_chart(chart_data, width=6*inch, height=3*inch):
    """Create spending vs income chart"""
    if not chart_data or len(chart_data) == 0:
        return Drawing(width, height)
    
    drawing = Drawing(width, height)
    
    bc = VerticalBarChart()
    bc.x = 50
    bc.y = 50
    bc.height = height - 100
    bc.width = width - 100
    
    # Sample every 5 years or so
    step = max(1, len(chart_data) // 15)  # Max 15 bars
    sampled_data = chart_data[::step]
    
    ages = []
    spending = []
    income = []
    
    for d in sampled_data:
        age = d.get('age', 0)
        # Handle spaced property names
        spend = d.get('Spending', d.get('spending', d.get('spend', 0)))
        inc = d.get('Income', d.get('income', d.get('inc', 0)))
        
        ages.append(age)
        spending.append(spend / 1000)  # In thousands
        income.append(inc / 1000)
    
    if not ages:
        return Drawing(width, height)
    
    bc.data = [spending, income]
    bc.categoryAxis.categoryNames = [str(age) for age in ages]
    bc.categoryAxis.labels.angle = 45
    bc.categoryAxis.labels.fontSize = 8
    
    # Safety check for max value
    max_spending = max(spending) if spending else 0
    max_income = max(income) if income else 0
    max_value = max(max_spending, max_income)
    
    # Ensure we have a reasonable range
    if max_value < 1:
        max_value = 100  # Default to $100k if no data
    
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = max_value * 1.1
    bc.valueAxis.valueStep = max(1, max_value / 5)  # Ensure step is at least 1
    bc.valueAxis.labels.fontSize = 8
    
    bc.bars[0].fillColor = HexColor('#ef4444')  # Red for spending
    bc.bars[1].fillColor = HexColor('#10b981')  # Green for income
    
    drawing.add(bc)
    return drawing


def generate_pdf_report(data_dict, output_path=None):
    """
    Generate comprehensive retirement planning PDF report
    
    Args:
        data_dict: Dictionary containing retirement planning data
        output_path: Path to save PDF (if None, returns BytesIO)
    
    Returns:
        BytesIO object or None (if output_path provided)
    """
    
    # Create PDF document
    if output_path:
        doc = SimpleDocTemplate(output_path, pagesize=letter,
                               topMargin=0.75*inch, bottomMargin=0.75*inch)
    else:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                               topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    # Container for the 'Flowable' objects
    story = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=HexColor('#1f2937'),
        spaceAfter=30,
        alignment=TA_CENTER,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=HexColor('#2563eb'),
        spaceAfter=12,
        spaceBefore=12,
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=HexColor('#4b5563'),
        spaceAfter=6,
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HexColor('#374151'),
        alignment=TA_JUSTIFY,
    )
    
    # ========== PAGE 1: COVER PAGE ==========
    
    story.append(Spacer(1, 1.5*inch))
    
    story.append(Paragraph("Australian Retirement Planning Report", title_style))
    story.append(Spacer(1, 0.5*inch))
    
    # Client info box
    client_data = [
        ['Report Generated:', datetime.now().strftime('%d %B %Y')],
        ['Planning Horizon:', f"Age {data_dict.get('currentAge', 'N/A')} to 100"],
        ['Retirement Age:', str(data_dict.get('retirementAge', 'N/A'))],
    ]
    
    client_table = Table(client_data, colWidths=[2*inch, 3*inch])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(client_table)
    
    story.append(Spacer(1, 0.5*inch))
    
    # Disclaimer
    disclaimer = Paragraph(
        "<b>IMPORTANT DISCLAIMER:</b> This report is for informational purposes only and does not "
        "constitute financial advice. The projections are based on assumptions that may not reflect "
        "actual future conditions. Consult with a qualified financial adviser before making any "
        "investment decisions.",
        body_style
    )
    story.append(disclaimer)
    
    story.append(PageBreak())
    
    # ========== PAGE 2: EXECUTIVE SUMMARY ==========
    
    story.append(Paragraph("Executive Summary", heading_style))
    story.append(Spacer(1, 12))
    
    # Calculate summary statistics
    chart_data = data_dict.get('chartData', [])
    if chart_data:
        final_data = chart_data[-1]
        # Handle spaced property names
        final_balance = final_data.get('Total Balance', final_data.get('totalBalance', final_data.get('total_balance', final_data.get('balance', 0))))
        final_age = final_data.get('age', 100)
        
        # Find exhaustion age
        exhaustion_age = None
        for d in chart_data:
            balance = d.get('Total Balance', d.get('totalBalance', d.get('total_balance', d.get('balance', 0))))
            if balance <= 0:
                exhaustion_age = d.get('age')
                break
        
        # Calculate totals
        retirement_data = [d for d in chart_data if d.get('age', 0) >= data_dict.get('retirementAge', 60)]
        
        # Handle spaced property names for spending and income
        total_spending = sum(d.get('Spending', d.get('spending', d.get('spend', 0))) for d in retirement_data)
        total_income = sum(d.get('Income', d.get('income', d.get('inc', 0))) for d in retirement_data)
        avg_spending = total_spending / len(retirement_data) if retirement_data else 0
        
        # For age pension and withdrawals, we'll estimate or use 0 since they're not in chartData
        total_age_pension = 0  # Not in chartData
        total_withdrawn = total_spending - total_income  # Approximate
        
        # Summary data
        summary_data = [
            ['Initial Portfolio', format_currency(data_dict.get('mainSuperBalance', 0) + data_dict.get('sequencingBuffer', 0))],
            ['Final Balance (Age 100)', format_currency(final_balance)],
            ['Portfolio Outcome', 'Success - Lasts to Age 100' if final_balance > 0 else f'Depletes at Age {exhaustion_age}'],
            ['', ''],
            ['Average Annual Spending', format_currency(avg_spending)],
            ['Total Income Received', format_currency(total_income)],
            ['Net Portfolio Withdrawals', format_currency(max(0, total_withdrawn))],
        ]
    else:
        summary_data = [['No projection data available', '']]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f9fafb')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(summary_table)
    
    story.append(Spacer(1, 24))
    
    # Key findings
    story.append(Paragraph("Key Findings", subheading_style))
    
    if chart_data:
        if final_balance > 0:
            finding = f"Based on the assumptions provided, your retirement portfolio is projected to last " \
                     f"until at least age 100, with an estimated balance of {format_currency(final_balance)}."
        else:
            finding = f"Based on current assumptions, your portfolio may be exhausted around age {exhaustion_age}. " \
                     f"Consider adjusting spending levels or retirement age."
        
        story.append(Paragraph(finding, body_style))
    
    story.append(PageBreak())
    
    # ========== PAGE 3: ASSUMPTIONS ==========
    
    story.append(Paragraph("Planning Assumptions", heading_style))
    story.append(Spacer(1, 12))
    
    # Portfolio assumptions
    story.append(Paragraph("Portfolio Details", subheading_style))
    
    portfolio_data = [
        ['Main Superannuation', format_currency(data_dict.get('mainSuperBalance', 0))],
        ['Sequencing Buffer', format_currency(data_dict.get('sequencingBuffer', 0))],
        ['Total Starting Portfolio', format_currency(data_dict.get('mainSuperBalance', 0) + data_dict.get('sequencingBuffer', 0))],
        ['', ''],
        ['Defined Benefit Pension', format_currency(data_dict.get('totalPensionIncome', 0)) + ' per year'],
        ['Age Pension Eligible', 'Yes' if data_dict.get('includeAgePension') else 'No'],
        ['Homeowner Status', 'Yes' if data_dict.get('isHomeowner') else 'No'],
        ['Pension Type', data_dict.get('pensionRecipientType', 'couple').title()],
    ]
    
    portfolio_table = Table(portfolio_data, colWidths=[3*inch, 2.5*inch])
    portfolio_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f9fafb')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(portfolio_table)
    
    story.append(Spacer(1, 24))
    
    # Economic assumptions
    story.append(Paragraph("Economic Assumptions", subheading_style))
    
    scenario_names = {
        1: 'Conservative (4.5% return)',
        2: 'Moderate (6.0% return)',
        3: 'Balanced (7.0% return)',
        4: 'Growth (8.0% return)',
        5: 'Aggressive (9.5% return)',
    }
    
    spending_patterns = {
        'constant': 'Constant spending (adjusted for inflation)',
        'jpmorgan': 'JP Morgan age-based decline (~1% per year)',
        'age-adjusted': 'Custom age-adjusted pattern',
    }
    
    economic_data = [
        ['Investment Scenario', scenario_names.get(data_dict.get('selectedScenario', 3), 'Unknown')],
        ['Inflation Rate', format_percent(data_dict.get('inflationRate', 2.5))],
        ['Spending Pattern', spending_patterns.get(data_dict.get('spendingPattern', 'constant'), 'Unknown')],
        ['Base Annual Spending', format_currency(data_dict.get('baseSpending', 0))],
    ]
    
    economic_table = Table(economic_data, colWidths=[3*inch, 2.5*inch])
    economic_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f9fafb')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(economic_table)
    
    story.append(PageBreak())
    
    # ========== PAGE 4: CHARTS ==========
    
    story.append(Paragraph("Portfolio Projection", heading_style))
    story.append(Spacer(1, 12))
    
    if chart_data:
        # Portfolio balance chart
        story.append(Paragraph("Portfolio Balance Over Time", subheading_style))
        story.append(Spacer(1, 6))
        story.append(create_portfolio_chart(chart_data))
        story.append(Spacer(1, 24))
        
        # Spending vs income chart
        story.append(Paragraph("Annual Spending vs Income", subheading_style))
        story.append(Spacer(1, 6))
        story.append(create_spending_income_chart(chart_data))
    else:
        story.append(Paragraph("No projection data available", body_style))
    
    story.append(PageBreak())
    
    # ========== PAGE 5: MONTE CARLO RESULTS (IF AVAILABLE) ==========
    
    monte_carlo = data_dict.get('monteCarloResults')
    historical_mc = data_dict.get('historicalMonteCarloResults')
    
    if monte_carlo or historical_mc:
        story.append(Paragraph("Monte Carlo Simulation Results", heading_style))
        story.append(Spacer(1, 12))
        
        if historical_mc and historical_mc.get('successRate') is not None:
            story.append(Paragraph("Historical Monte Carlo Analysis", subheading_style))
            
            success_rate = historical_mc.get('successRate', 0)
            percentiles = historical_mc.get('percentiles', {})
            
            # Percentiles might be numbers or objects, handle both
            def get_percentile_value(p_data):
                if isinstance(p_data, dict):
                    return p_data.get('finalBalance', 0)
                elif isinstance(p_data, (int, float)):
                    return p_data
                return 0
            
            mc_data = [
                ['Success Rate (portfolio lasts to age 100)', f"{success_rate:.1f}%"],
                ['', ''],
                ['Portfolio Balance at Age 100:', ''],
                ['10th Percentile (worst case)', format_currency(get_percentile_value(percentiles.get('p10', 0)))],
                ['25th Percentile', format_currency(get_percentile_value(percentiles.get('p25', 0)))],
                ['50th Percentile (median)', format_currency(get_percentile_value(percentiles.get('p50', 0)))],
                ['75th Percentile', format_currency(get_percentile_value(percentiles.get('p75', 0)))],
                ['90th Percentile (best case)', format_currency(get_percentile_value(percentiles.get('p90', 0)))],
            ]
            
            mc_table = Table(mc_data, colWidths=[4*inch, 2*inch])
            mc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#10b981')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('BACKGROUND', (0, 2), (-1, 2), HexColor('#e5e7eb')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f9fafb')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(mc_table)
            story.append(Spacer(1, 12))
            
            # Interpretation
            if success_rate >= 90:
                interpretation = f"With a {success_rate:.1f}% success rate, your retirement plan shows strong resilience across various market scenarios based on historical data."
            elif success_rate >= 75:
                interpretation = f"With a {success_rate:.1f}% success rate, your retirement plan has a good probability of success, though some scenarios may require spending adjustments."
            else:
                interpretation = f"With a {success_rate:.1f}% success rate, you may want to consider adjusting your retirement strategy to improve outcomes across more scenarios."
            
            story.append(Paragraph(interpretation, body_style))
            story.append(Spacer(1, 12))
        
        elif monte_carlo and monte_carlo.get('successRate') is not None:
            story.append(Paragraph("Monte Carlo Simulation Analysis", subheading_style))
            
            success_rate = monte_carlo.get('successRate', 0)
            percentiles = monte_carlo.get('percentiles', {})
            
            # Percentiles might be numbers or objects, handle both
            def get_percentile_value(p_data):
                if isinstance(p_data, dict):
                    return p_data.get('finalBalance', 0)
                elif isinstance(p_data, (int, float)):
                    return p_data
                return 0
            
            mc_data = [
                ['Success Rate (portfolio lasts to age 100)', f"{success_rate:.1f}%"],
                ['', ''],
                ['Portfolio Balance at Age 100:', ''],
                ['10th Percentile (worst case)', format_currency(get_percentile_value(percentiles.get('p10', 0)))],
                ['25th Percentile', format_currency(get_percentile_value(percentiles.get('p25', 0)))],
                ['50th Percentile (median)', format_currency(get_percentile_value(percentiles.get('p50', 0)))],
                ['75th Percentile', format_currency(get_percentile_value(percentiles.get('p75', 0)))],
                ['90th Percentile (best case)', format_currency(get_percentile_value(percentiles.get('p90', 0)))],
            ]
            
            mc_table = Table(mc_data, colWidths=[4*inch, 2*inch])
            mc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('BACKGROUND', (0, 2), (-1, 2), HexColor('#e5e7eb')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f9fafb')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(mc_table)
            story.append(Spacer(1, 12))
            
            # Interpretation
            if success_rate >= 90:
                interpretation = f"With a {success_rate:.1f}% success rate, your retirement plan shows strong resilience across various market scenarios."
            elif success_rate >= 75:
                interpretation = f"With a {success_rate:.1f}% success rate, your retirement plan has a good probability of success."
            else:
                interpretation = f"With a {success_rate:.1f}% success rate, consider adjusting your retirement strategy."
            
            story.append(Paragraph(interpretation, body_style))
        
        story.append(PageBreak())
    
    # ========== PAGE 6: FORMAL TEST RESULTS (IF AVAILABLE) ==========
    
    formal_tests = data_dict.get('formalTestResults', {})
    if formal_tests:
        story.append(Paragraph("Formal Test Scenarios", heading_style))
        story.append(Spacer(1, 12))
        
        story.append(Paragraph(
            "The following scenarios test your retirement plan against specific challenging situations:",
            body_style
        ))
        story.append(Spacer(1, 12))
        
        for test_key, test_data in formal_tests.items():
            if not isinstance(test_data, dict):
                continue
                
            test_name = test_data.get('name', test_key)
            test_desc = test_data.get('desc', 'No description available')
            test_sim_data = test_data.get('simulationData', [])
            
            story.append(Paragraph(test_name, subheading_style))
            story.append(Paragraph(test_desc, body_style))
            story.append(Spacer(1, 6))
            
            # Calculate outcome for this test
            if test_sim_data:
                final_balance = test_sim_data[-1].get('totalBalance', 0)
                min_balance = min(d.get('totalBalance', 0) for d in test_sim_data)
                
                if final_balance > 0:
                    outcome = f"PASS - Portfolio survives with {format_currency(final_balance)} remaining"
                    outcome_color = HexColor('#10b981')  # Green
                else:
                    # Find depletion age
                    depletion_age = None
                    for d in test_sim_data:
                        if d.get('totalBalance', 0) <= 0:
                            depletion_age = d.get('age')
                            break
                    outcome = f"FAIL - Portfolio depletes at age {depletion_age}"
                    outcome_color = HexColor('#ef4444')  # Red
                
                lowest_point = f"Lowest balance: {format_currency(min_balance)}"
                
                outcome_data = [
                    ['Test Outcome', outcome],
                    ['', lowest_point],
                ]
                
                outcome_table = Table(outcome_data, colWidths=[1.5*inch, 4*inch])
                outcome_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (0, -1), HexColor('#f3f4f6')),
                    ('TEXTCOLOR', (1, 0), (1, 0), outcome_color),
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ]))
                story.append(outcome_table)
            
            story.append(Spacer(1, 12))
        
        story.append(PageBreak())
    
    # ========== PAGE 7: YEAR-BY-YEAR DETAILS (SAMPLE) ==========
    
    story.append(Paragraph("Year-by-Year Projection (Every 5 Years)", heading_style))
    story.append(Spacer(1, 12))
    
    if chart_data:
        # Show every 5 years - change this number to show different intervals
        year_interval = 5  # 1=every year, 5=every 5 years, 10=every 10 years
        
        sample_data = [['Age', 'Portfolio', 'Spending', 'Income', 'Main Super', 'Buffer']]
        
        for i, d in enumerate(chart_data):
            # Show at specified interval OR always show the last year
            if i % year_interval == 0 or i == len(chart_data) - 1:
                # Handle spaced property names
                sample_data.append([
                    str(d.get('age', '')),
                    format_currency(d.get('Total Balance', d.get('totalBalance', d.get('total_balance', d.get('balance', 0))))),
                    format_currency(d.get('Spending', d.get('spending', d.get('spend', 0)))),
                    format_currency(d.get('Income', d.get('income', d.get('inc', 0)))),
                    format_currency(d.get('Main Super', d.get('mainSuper', d.get('main_super', 0)))),
                    format_currency(d.get('Buffer', d.get('buffer', d.get('seqBuffer', 0)))),
                ])
        
        detail_table = Table(sample_data, colWidths=[0.6*inch, 1.3*inch, 1.3*inch, 1.3*inch, 1.3*inch, 1.3*inch])
        detail_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f9fafb')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
        ]))
        story.append(detail_table)
    else:
        story.append(Paragraph("No projection data available", body_style))
    
    story.append(Spacer(1, 24))
    
    note = Paragraph(
        "<i>Note: This table shows selected years. Complete year-by-year data is available "
        "in the CSV export.</i>",
        body_style
    )
    story.append(note)
    
    story.append(PageBreak())
    
    # ========== ONE-OFF EXPENSES (IF ANY) ==========
    
    one_off_expenses = data_dict.get('oneOffExpenses', [])
    if one_off_expenses and len(one_off_expenses) > 0:
        story.append(Paragraph("Planned One-Off Expenses", heading_style))
        story.append(Spacer(1, 12))
        
        expense_data = [['Age', 'Description', 'Amount']]
        for expense in one_off_expenses:
            expense_data.append([
                str(expense.get('age', '')),
                expense.get('description', ''),
                format_currency(expense.get('amount', 0)),
            ])
        
        # Add total
        total_expenses = sum(e.get('amount', 0) for e in one_off_expenses)
        expense_data.append(['', 'TOTAL', format_currency(total_expenses)])
        
        expense_table = Table(expense_data, colWidths=[0.8*inch, 3.5*inch, 1.5*inch])
        expense_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 1), (-1, -2), HexColor('#f9fafb')),
            ('BACKGROUND', (0, -1), (-1, -1), HexColor('#dbeafe')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(expense_table)
        
        story.append(PageBreak())
    
    # ========== FINAL PAGE: NOTES AND RECOMMENDATIONS ==========
    
    story.append(Paragraph("Important Considerations", heading_style))
    story.append(Spacer(1, 12))
    
    considerations = [
        "This projection assumes consistent market returns based on the selected scenario. "
        "Actual returns will vary year to year and may differ significantly from projections.",
        
        "Inflation is assumed to be constant at the specified rate. Actual inflation may vary.",
        
        "Age Pension eligibility and payment amounts are based on current Centrelink rules "
        "and thresholds. These may change over time.",
        
        "This analysis does not account for taxation. Consult with a tax professional regarding "
        "tax implications of superannuation withdrawals and pension income.",
        
        "Healthcare costs, aged care needs, and other unforeseen expenses may significantly "
        "impact your retirement finances.",
        
        "Regular reviews of your retirement plan are recommended, especially when circumstances change.",
    ]
    
    for i, consideration in enumerate(considerations, 1):
        story.append(Paragraph(f"{i}. {consideration}", body_style))
        story.append(Spacer(1, 8))
    
    story.append(Spacer(1, 24))
    
    # Footer
    footer = Paragraph(
        "<i>This report was generated using the Australian Retirement Planning Tool. "
        "For questions or to update this analysis, please consult with your financial adviser.</i>",
        body_style
    )
    story.append(footer)
    
    # Build PDF
    doc.build(story)
    
    if output_path:
        return None
    else:
        buffer.seek(0)
        return buffer


# Command-line usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) == 3:
        # Called from API route with input and output paths
        input_json_path = sys.argv[1]
        output_pdf_path = sys.argv[2]
        
        # Read JSON data
        with open(input_json_path, 'r') as f:
            data = json.load(f)
        
        # Generate PDF
        generate_pdf_report(data, output_pdf_path)
        print(f"PDF report generated: {output_pdf_path}")
    else:
        # Sample data for testing
        sample_data = {
            'mainSuperBalance': 1360000,
            'sequencingBuffer': 200000,
            'totalPensionIncome': 101000,
            'currentAge': 55,
            'retirementAge': 60,
            'pensionRecipientType': 'couple',
            'isHomeowner': True,
            'baseSpending': 120000,
            'spendingPattern': 'jpmorgan',
            'splurgeAmount': 0,
            'splurgeStartAge': 65,
            'splurgeDuration': 5,
            'inflationRate': 2.5,
            'selectedScenario': 4,
            'includeAgePension': True,
            'chartData': [],
            'oneOffExpenses': [
                {'age': 68, 'description': 'Vehicle Replacement', 'amount': 60000},
                {'age': 75, 'description': 'Home Maintenance', 'amount': 25000},
            ],
        }
        
        # Generate PDF
        generate_pdf_report(sample_data, 'retirement-report.pdf')
        print("PDF report generated: retirement-report.pdf")
