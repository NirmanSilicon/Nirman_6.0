"""Printable, clearly scoped financial passport PDF."""

from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus import Image
from pathlib import Path


NAVY = colors.HexColor('#092348')
BLUE = colors.HexColor('#008FC7')
PALE = colors.HexColor('#EAF6FF')
GREY = colors.HexColor('#52657B')


def render_passport(report: dict) -> bytes:
    out = BytesIO()
    doc = SimpleDocTemplate(out, pagesize=(210*mm, 297*mm), leftMargin=20*mm,
                            rightMargin=20*mm, topMargin=14*mm, bottomMargin=16*mm,
                            title='UQUAL Financial Passport', author='UQUAL')
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Brand', fontName='Helvetica-Bold', fontSize=24, leading=28, textColor=NAVY))
    styles.add(ParagraphStyle(name='Sub', fontName='Helvetica', fontSize=10, leading=15, textColor=GREY))
    styles.add(ParagraphStyle(name='Head', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=NAVY, spaceBefore=9, spaceAfter=5))
    styles.add(ParagraphStyle(name='SmallSafe', fontName='Helvetica', fontSize=8, leading=10, textColor=GREY))
    styles.add(ParagraphStyle(name='Index', fontName='Helvetica-Bold', fontSize=34, leading=39, textColor=BLUE, alignment=TA_CENTER))
    def p(value, style='SmallSafe'):
        return Paragraph(str(value).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'), styles[style])
    behaviour = report['behaviour']
    period = report['statement_period']
    logo = Path(__file__).resolve().parents[2] / 'mobile' / 'assets' / 'brand' / 'uqual-transparent.png'
    brand = Image(str(logo), width=58*mm, height=19*mm) if logo.exists() else p('UQUAL', 'Brand')
    story = [brand, p('FINANCIAL PASSPORT  |  USER-INITIATED DEMO REPORT', 'Sub'), Spacer(1, 6*mm)]
    story.append(Table([[p('Prepared for', 'Sub'), p(report['recipient_entered_by_user'])],
                        [p('Statement period', 'Sub'), p(f"{period['start']} to {period['end']}")],
                        [p('Generated', 'Sub'), p(report['generated_at'][:19].replace('T',' ') + ' UTC')]],
                       colWidths=[40*mm, 125*mm], style=TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),
                            ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),
                            ('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),5),
                            ('BOTTOMPADDING',(0,0),(-1,-1),5)])))
    story += [p('Financial Behaviour Index', 'Head'), p(f"{behaviour.get('index') if behaviour.get('index') is not None else 'Unavailable'} / 100", 'Index'),
              p(behaviour.get('meaning') or behaviour.get('reason') or 'Insufficient classified history.'),
              p(f"Data coverage: {behaviour.get('complete_months',0)} complete calendar months; source is a user-uploaded statement."),
              p('This descriptive rubric is not a bureau credit score, repayment prediction, or lending decision.')]
    if behaviour.get('factors'):
        story.append(p('Component breakdown', 'Head'))
        rows = [[p('Factor'), p('Observed'), p('Score'), p('Weight'), p('Contribution')]]
        for f in behaviour['factors']:
            rows.append([p(f['label']), p(f"{f['observed_ratio']*100:.1f}%"), p(f"{f['factor_score']:.1f}"),
                         p(f"{f['weight']*100:.0f}%"), p(f"{f['contribution']:.1f}")])
        story.append(Table(rows, colWidths=[57*mm, 29*mm, 23*mm, 22*mm, 33*mm], repeatRows=1,
                           style=TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('LINEBELOW',(0,0),(-1,0),.7,BLUE),
                            ('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#DCE8F1')),
                            ('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),4),
                            ('BOTTOMPADDING',(0,0),(-1,-1),4)])))
    if behaviour.get('monthly'):
        story.append(p('Monthly cashflow evidence', 'Head'))
        rows = [[p('Month'),p('Categorized income'),p('Spending'),p('Surplus')]]
        for item in behaviour['monthly']:
            rows.append([p(item['month']),p(f"INR {item['confirmed_income']:,.0f}"),
                         p(f"INR {item['spending']:,.0f}"),p(f"INR {item['surplus']:,.0f}")])
        story.append(Table(rows, colWidths=[28*mm,47*mm,43*mm,46*mm], repeatRows=1,
                           style=TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('LINEBELOW',(0,0),(-1,0),.7,BLUE),
                            ('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),4),
                            ('BOTTOMPADDING',(0,0),(-1,-1),4)])))
    if behaviour.get('coach'):
        story.append(p('Suggested next steps', 'Head'))
        for tip in behaviour['coach']:
            story.append(p('- '+tip['message']))
    story.append(p('Important limits', 'Head'))
    for note in behaviour.get('limits', []) + report['notices']:
        story.append(p('- '+note))
    if report.get('synthetic_demo_index') is not None:
        story.append(Spacer(1, 4*mm))
        story.append(p(f"Separate synthetic model demo index: {report['synthetic_demo_index']:.2f}/100. Its training outcomes are simulated and it is not validated for Indian lending."))
    story.append(Spacer(1, 5*mm))
    story.append(p('Report generated from user-supplied data. UQUAL has not authenticated the bank source, identity, or recipient.', 'SmallSafe'))

    def footer(canvas, document):
        canvas.setStrokeColor(colors.HexColor('#DCE8F1'))
        canvas.line(20*mm, 16*mm, 190*mm, 16*mm)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(GREY)
        canvas.drawString(20*mm, 11*mm, 'UQUAL  |  Private, user-controlled report')
        canvas.drawRightString(190*mm, 11*mm, f'Page {document.page}')
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return out.getvalue()
