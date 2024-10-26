import logging
from flask import Flask, render_template, request, jsonify, send_file, abort
from flask_mail import Mail, Message
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
import hashlib
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Inicializar la aplicación Flask
app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Configuración de Flask-Mail usando variables de entorno
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

# Inicializar Flask-Mail
mail = Mail(app)

def generate_hash(data):
    """Genera un hash único para identificar cada participación"""
    return hashlib.sha256(data.encode()).hexdigest()[:25]

def create_pdf(participant_name, percentage, ticket_number, amount, fraction, series, sender_name, sender_dni, sender_email, lottery_type, unique_hash):
    """Crea un PDF con los detalles de la participación de lotería"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Center', alignment=1))
    
    Story = []
    
    # Añadir contenido al PDF
    Story.append(Paragraph("Participación de Lotería", styles['Heading1']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos del participante
    Story.append(Paragraph(f"Participante: {participant_name}", styles['Normal']))
    Story.append(Paragraph(f"Porcentaje de participación: {percentage}%", styles['Normal']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos de la lotería
    Story.append(Paragraph("Datos de la Lotería", styles['Heading2']))
    Story.append(Paragraph(f"Tipo de Lotería: {lottery_type}", styles['Normal']))
    Story.append(Paragraph(f"Número del décimo: {ticket_number}", styles['Normal']))
    Story.append(Paragraph(f"Importe: {amount}€", styles['Normal']))
    Story.append(Paragraph(f"Fracción: {fraction}", styles['Normal']))
    Story.append(Paragraph(f"Serie: {series}", styles['Normal']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos del remitente
    Story.append(Paragraph("Datos del Remitente", styles['Heading2']))
    Story.append(Paragraph(f"Nombre: {sender_name}", styles['Normal']))
    Story.append(Paragraph(f"DNI: {sender_dni}", styles['Normal']))
    Story.append(Paragraph(f"Correo: {sender_email}", styles['Normal']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Hash único
    Story.append(Paragraph(f"Hash único: {unique_hash}", styles['Normal']))
    
    doc.build(Story)
    buffer.seek(0)
    return buffer

def create_admin_summary_pdf(participants_data, lottery_data, sender_data):
    """Crea un PDF de resumen para el administrador"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Center', alignment=1))
    
    Story = []
    
    # Añadir contenido al PDF de resumen
    Story.append(Paragraph("Resumen de Participaciones", styles['Heading1']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos de la lotería
    Story.append(Paragraph("Datos de la Lotería", styles['Heading2']))
    Story.append(Paragraph(f"Tipo: {lottery_data['type']}", styles['Normal']))
    Story.append(Paragraph(f"Número del décimo: {lottery_data['ticket_number']}", styles['Normal']))
    Story.append(Paragraph(f"Importe total: {lottery_data['amount']}€", styles['Normal']))
    Story.append(Paragraph(f"Fracción: {lottery_data['fraction']}", styles['Normal']))
    Story.append(Paragraph(f"Serie: {lottery_data['series']}", styles['Normal']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos del remitente
    Story.append(Paragraph("Datos del Remitente", styles['Heading2']))
    Story.append(Paragraph(f"Nombre: {sender_data['name']}", styles['Normal']))
    Story.append(Paragraph(f"DNI: {sender_data['dni']}", styles['Normal']))
    Story.append(Paragraph(f"Correo: {sender_data['email']}", styles['Normal']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Tabla de participantes
    Story.append(Paragraph("Resumen de Participantes", styles['Heading2']))
    table_data = [['Nombre', 'DNI', 'Email', 'Porcentaje', 'Hash']]
    for p in participants_data:
        table_data.append([p['name'], p.get('dni', 'N/A'), p['email'], f"{p['percentage']}%", p['hash']])
    
    t = Table(table_data)
    t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    Story.append(t)
    
    doc.build(Story)
    buffer.seek(0)
    return buffer

# Variables globales para almacenar datos temporales
participant_data = {}
summary_data = None

@app.route('/')
def index():
    """Ruta principal que renderiza la página de inicio"""
    return render_template('index.html')

@app.route('/send_email', methods=['POST'])
def send_email():
    """
    Ruta para procesar el envío de emails a los participantes
    y generar el resumen para el administrador
    """
    global summary_data
    app.logger.info("Recibida petición POST en /send_email")
    try:
        data = request.get_json()
        app.logger.info(f"Datos recibidos: {data}")
        
        # Validar que hay participantes
        if 'participants' not in data or not data['participants']:
            app.logger.error("No se encontraron participantes en los datos")
            return jsonify({"error": "Se requieren participantes"}), 400

        # Extraer datos del décimo
        ticket_number = data['ticketNumber']
        ticket_amount = data['ticketAmount']
        ticket_fraction = data['ticketFraction']
        ticket_series = data['ticketSeries']
        lottery_type = data['lotteryType']

        participants_summary = []

        # Procesar cada participante
        for participant in data['participants']:
            name = participant['name']
            email = participant['email']
            percentage = participant['percentage']
            dni = participant.get('dni', '')  # DNI no obligatorio

            # Generar hash único
            unique_hash = generate_hash(f"{name}{email}{percentage}{ticket_number}")

            # Guardar datos del participante
            participant_data[unique_hash] = {
                'name': name,
                'email': email,
                'percentage': percentage,
                'ticket_number': ticket_number,
                'ticket_amount': ticket_amount,
                'lottery_type': lottery_type,
                'sender_name': data['senderName'],
                'sender_dni': data['senderDNI'],
                'sender_email': data['senderEmail']
            }

            # Crear PDF para el participante
            pdf = create_pdf(name, percentage, ticket_number, ticket_amount, 
                             ticket_fraction, ticket_series, 
                             data['senderName'], data['senderDNI'], data['senderEmail'], 
                             lottery_type, unique_hash)

            # Enviar correo al participante
            subject = data['subject'].replace('{numero_decimo}', ticket_number)
            msg = Message(subject=subject,
                          recipients=[email],
                          sender=app.config['MAIL_DEFAULT_SENDER'])
            
            lottery_name = "Lotería de Navidad 2024" if lottery_type == "navidad2024" else "Lotería del Niño 2025"
            
            msg.body = f"""Hola, {name}:
 
 Este mail es para confirmar tu participación en la {lottery_name}.
 
 Tu participación corresponde al {percentage}% del décimo número {ticket_number}, con un importe de {ticket_amount}€.
 Fracción: {ticket_fraction}
 Serie: {ticket_series}
 
 Adjunto encontrarás un PDF con todos los detalles de la participación. Recuerda que esto es solo un recordatorio de {data['senderName']} y puede que no tenga ninguna validez legal.
 
 ¡Mucha suerte!
 
 Un saludo."""

            msg.attach("participacion_loteria.pdf", "application/pdf", pdf.getvalue())
            mail.send(msg)
            app.logger.info(f"Email enviado con éxito a {email}")

            # Añadir información al resumen
            participants_summary.append({
                'name': name,
                'email': email,
                'percentage': percentage,
                'dni': dni,  # Incluir DNI en el resumen
                'hash': unique_hash
            })

        # Guardar los datos del resumen
        summary_data = {
            'participants_summary': participants_summary,
            'lottery_data': {
                'type': lottery_type,
                'ticket_number': ticket_number,
                'amount': ticket_amount,
                'fraction': ticket_fraction,
                'series': ticket_series
            },
            'sender_data': {
                'name': data['senderName'],
                'dni': data['senderDNI'],
                'email': data['senderEmail']
            }
        }

        # Crear PDF de resumen para el administrador
        admin_pdf = create_admin_summary_pdf(participants_summary, 
                                              summary_data['lottery_data'], 
                                              summary_data['sender_data'])

        # Enviar correo de confirmación al administrador
        admin_msg = Message(subject="Resumen de envío de participaciones",
                            recipients=[data['senderEmail']],
                            sender=app.config['MAIL_DEFAULT_SENDER'])
        admin_msg.body = f"Se han enviado correctamente los correos a todos los participantes del décimo {ticket_number}. Adjunto encontrará un PDF con el resumen detallado."
        admin_msg.attach("resumen_participaciones.pdf", "application/pdf", admin_pdf.getvalue())
        mail.send(admin_msg)
        app.logger.info(f"Email de resumen enviado al administrador {data['senderEmail']}")

        return jsonify({"message": "Emails sent successfully", "participantHashes": {p['email']: p['hash'] for p in participants_summary}}), 200
    except Exception as e:
        app.logger.error(f"Error al enviar email: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/download_pdf/<hash>', methods=['GET'])
def download_pdf(hash):
    """Ruta para descargar el PDF de un participante específico"""
    global participant_data
    if hash not in participant_data:
        abort(404, description="PDF not found")

    data = participant_data[hash]
    
    pdf = create_pdf(data['name'], data['percentage'], data['ticket_number'], 
                     data['ticket_amount'], data['ticket_fraction'], data['ticket_series'], 
                     data['sender_name'], data['sender_dni'], data['sender_email'], 
                     data['lottery_type'], hash)
    
    return send_file(pdf,
                     download_name=f'participacion_{hash}.pdf',
                     as_attachment=True,
                     mimetype='application/pdf')

@app.route('/download_summary_pdf', methods=['GET'])
def download_summary_pdf():
    """Ruta para descargar el PDF de resumen del administrador"""
    global summary_data
    if summary_data is None:
        app.logger.error("Intento de descarga de resumen cuando no hay datos disponibles")
        abort(404, description="No hay resumen disponible")

    try:
        pdf = create_admin_summary_pdf(
            summary_data['participants_summary'],
            summary_data['lottery_data'],
            summary_data['sender_data']
        )

        return send_file(
            BytesIO(pdf.getvalue()),
            download_name='resumen_participaciones.pdf',
            as_attachment=True,
            mimetype='application/pdf'
        )
    except Exception as e:
        app.logger.error(f"Error al generar el PDF de resumen: {str(e)}", exc_info=True)
        abort(500, description="Error al generar el PDF de resumen")

@app.route('/ayuda')
def ayuda():
    """Ruta para la página de ayuda"""
    print("Accediendo a la página de ayuda")
    return render_template('ayuda.html')

if __name__ == '__main__':
    app.run(debug=True)
