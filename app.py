import logging
from flask import Flask, render_template, request, jsonify, send_file, abort
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
import hashlib
import os
import base64
from dotenv import load_dotenv
import resend

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Inicializar la aplicación Flask
app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Configuración de Resend para envío de correos
resend.api_key = os.getenv('RESEND_API_KEY')
EMAIL_DOMAIN = os.getenv('EMAIL_DOMAIN')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')
EMPRESAS_FROM_EMAIL = os.getenv('EMPRESAS_FROM_EMAIL', 'empresas@uboost.es')
CONTACTO_FROM_EMAIL = os.getenv('CONTACTO_FROM_EMAIL', 'contacto@uboost.es')

def generate_hash(data):
    """Genera un hash único para identificar cada participación"""
    return hashlib.sha256(data.encode()).hexdigest()[:25]

def create_pdf(participant_name, percentage, ticket_data, sender_name, sender_dni, sender_email, lottery_type, lottery_display_name, unique_hash, company_logo=None, company_name=None):
    """Crea un PDF con los detalles de la participación de lotería"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Center', alignment=1))
    
    Story = []
    
    # Añadir contenido al PDF
    if company_logo:
        try:
            # Decodificar la imagen base64
            import base64
            import PIL.Image
            from reportlab.lib.utils import ImageReader
            
            # Decodificar la imagen
            logo_data = base64.b64decode(company_logo.split(',')[1])
            logo_io = BytesIO(logo_data)
            logo_image = PIL.Image.open(logo_io)
            
            # Calcular dimensiones manteniendo la proporción
            max_width = 2 * inch
            max_height = 1 * inch
            width, height = logo_image.size
            
            # Mantener la proporción
            if width > max_width:
                ratio = max_width / width
                width = max_width
                height = height * ratio
            
            if height > max_height:
                ratio = max_height / height
                height = height * ratio
                width = width * ratio
            
            # Crear un objeto Image para ReportLab
            logo_io.seek(0)
            
            # Añadir la imagen al PDF centrada
            from reportlab.platypus import Image
            Story.append(Image(logo_io, width=width, height=height))
            Story.append(Spacer(1, 0.25*inch))
        except Exception as e:
            # Si hay algún error, simplemente continuar sin la imagen
            app.logger.error(f"Error al procesar el logo: {str(e)}")
    
    # Título del documento
    if company_name:
        Story.append(Paragraph(f"{company_name}", styles['Heading2']))
        Story.append(Spacer(1, 0.1*inch))
    
    Story.append(Paragraph(f"Participación de {lottery_display_name}", styles['Heading1']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos del participante
    Story.append(Paragraph(f"Participante: {participant_name}", styles['Normal']))
    Story.append(Paragraph(f"Porcentaje de participación: {percentage}%", styles['Normal']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos de la participación
    Story.append(Paragraph(f"Datos de la participación - {lottery_display_name}", styles['Heading2']))
    
    # Mostrar diferentes datos según el tipo de lotería
    if lottery_type.startswith('primitiva') or lottery_type in ['bonoloto', 'euromillones', 'gordo']:
        # Datos para juegos de tipo Primitiva, Bonoloto, Euromillones, El Gordo
        Story.append(Paragraph(f"Números seleccionados: {ticket_data.get('numbers', '')}", styles['Normal']))
        if lottery_type == 'euromillones' and ticket_data.get('stars'):
            Story.append(Paragraph(f"Estrellas: {ticket_data.get('stars', '')}", styles['Normal']))
        Story.append(Paragraph(f"Importe: {ticket_data.get('amount', '0')}€", styles['Normal']))
    elif lottery_type in ['cuponazo', 'extraordinario', 'diario', 'findesemana', 'eurojackpot'] or lottery_type.startswith('once'):
        # Datos para juegos de la ONCE
        Story.append(Paragraph(f"Número: {ticket_data.get('number', '')}", styles['Normal']))
        if ticket_data.get('series'):
            Story.append(Paragraph(f"Serie: {ticket_data.get('series', '')}", styles['Normal']))
        Story.append(Paragraph(f"Importe: {ticket_data.get('amount', '0')}€", styles['Normal']))
    elif lottery_type.startswith('otro'):
        # Datos para otros juegos
        Story.append(Paragraph(f"Identificador/Número: {ticket_data.get('number', '')}", styles['Normal']))
        Story.append(Paragraph(f"Importe: {ticket_data.get('amount', '0')}€", styles['Normal']))
        if ticket_data.get('details'):
            Story.append(Paragraph(f"Detalles adicionales: {ticket_data.get('details', '')}", styles['Normal']))
    else:
        # Datos para Lotería Nacional, Navidad, Niño
        Story.append(Paragraph(f"Número del décimo: {ticket_data.get('number', '')}", styles['Normal']))
        Story.append(Paragraph(f"Importe: {ticket_data.get('amount', '0')}€", styles['Normal']))
        if ticket_data.get('fraction'):
            Story.append(Paragraph(f"Fracción: {ticket_data.get('fraction', '')}", styles['Normal']))
        if ticket_data.get('series'):
            Story.append(Paragraph(f"Serie: {ticket_data.get('series', '')}", styles['Normal']))
    
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos del remitente o empresa
    if company_name:
        Story.append(Paragraph("Datos de la Empresa", styles['Heading2']))
        Story.append(Paragraph(f"Empresa: {company_name}", styles['Normal']))
        Story.append(Paragraph(f"CIF: {sender_dni}", styles['Normal']))
        Story.append(Paragraph(f"Responsable: {sender_name}", styles['Normal']))
        Story.append(Paragraph(f"Correo: {sender_email}", styles['Normal']))
    else:
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

def create_admin_summary_pdf(participants_data, lottery_data, sender_data, company_logo=None, company_name=None):
    """Crea un PDF de resumen para el administrador"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Center', alignment=1))
    
    Story = []
    
    # Añadir contenido al PDF de resumen
    if company_logo:
        try:
            # Decodificar la imagen base64
            import base64
            import PIL.Image
            from reportlab.lib.utils import ImageReader
            
            # Decodificar la imagen
            logo_data = base64.b64decode(company_logo.split(',')[1])
            logo_io = BytesIO(logo_data)
            logo_image = PIL.Image.open(logo_io)
            
            # Calcular dimensiones manteniendo la proporción
            max_width = 2 * inch
            max_height = 1 * inch
            width, height = logo_image.size
            
            # Mantener la proporción
            if width > max_width:
                ratio = max_width / width
                width = max_width
                height = height * ratio
            
            if height > max_height:
                ratio = max_height / height
                height = height * ratio
                width = width * ratio
            
            # Crear un objeto Image para ReportLab
            logo_io.seek(0)
            
            # Añadir la imagen al PDF centrada
            from reportlab.platypus import Image
            Story.append(Image(logo_io, width=width, height=height))
            Story.append(Spacer(1, 0.25*inch))
        except Exception as e:
            # Si hay algún error, simplemente continuar sin la imagen
            app.logger.error(f"Error al procesar el logo: {str(e)}")
    
    # Título del documento
    if company_name:
        Story.append(Paragraph(f"{company_name}", styles['Heading2']))
        Story.append(Spacer(1, 0.1*inch))
    
    Story.append(Paragraph("Resumen de participaciones", styles['Heading1']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos de la lotería
    Story.append(Paragraph("Datos de la Lotería", styles['Heading2']))
    Story.append(Paragraph(f"Tipo: {lottery_data.get('lottery_type', lottery_data.get('type', 'Otro'))}", styles['Normal']))
    Story.append(Paragraph(f"Número: {lottery_data.get('number', lottery_data.get('ticket_number', 'N/A'))}", styles['Normal']))
    Story.append(Paragraph(f"Importe total: {lottery_data.get('amount', '0')}€", styles['Normal']))
    Story.append(Paragraph(f"Fracción: {lottery_data.get('fraction', 'N/A')}", styles['Normal']))
    Story.append(Paragraph(f"Serie: {lottery_data.get('series', 'N/A')}", styles['Normal']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Datos del remitente o empresa
    if company_name:
        Story.append(Paragraph("Datos de la Empresa", styles['Heading2']))
        Story.append(Paragraph(f"Empresa: {company_name}", styles['Normal']))
        Story.append(Paragraph(f"CIF: {sender_data.get('dni', 'N/A')}", styles['Normal']))
        Story.append(Paragraph(f"Responsable: {sender_data['name']}", styles['Normal']))
        Story.append(Paragraph(f"Correo: {sender_data['email']}", styles['Normal']))
    else:
        Story.append(Paragraph("Datos del Remitente", styles['Heading2']))
        Story.append(Paragraph(f"Nombre: {sender_data['name']}", styles['Normal']))
        Story.append(Paragraph(f"DNI: {sender_data['dni']}", styles['Normal']))
        Story.append(Paragraph(f"Correo: {sender_data['email']}", styles['Normal']))
    Story.append(Spacer(1, 0.25*inch))
    
    # Tabla de participantes
    Story.append(Paragraph("Resumen de participantes", styles['Heading2']))
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

            # Obtener los datos del ticket
            ticket_data = data.get('ticketData', {})
            if not ticket_data:
                # Si no se proporcionan datos del ticket en el formato nuevo, usar el formato antiguo
                ticket_data = {
                    'number': data.get('ticketNumber', ''),
                    'amount': data.get('ticketAmount', ''),
                    'fraction': data.get('ticketFraction', ''),
                    'series': data.get('ticketSeries', '')
                }
                
                # Añadir datos específicos según el tipo de lotería
                if lottery_type in ['primitiva', 'bonoloto', 'euromillones', 'gordo']:
                    ticket_data['numbers'] = data.get('ticketNumbers', '')
                    if lottery_type == 'euromillones':
                        ticket_data['stars'] = data.get('ticketStars', '')
                elif lottery_type == 'otro':
                    ticket_data['details'] = data.get('ticketDetails', '')
            
            # Guardar datos del participante
            participant_data[unique_hash] = {
                'name': name,
                'email': email,
                'percentage': percentage,
                'ticket_data': ticket_data,
                'lottery_type': lottery_type,
                'lottery_display_name': data.get('lotteryDisplayName', ''),
                'sender_name': data['senderName'],
                'sender_dni': data['senderDNI'],
                'sender_email': data['senderEmail']
            }

            # Crear PDF para el participante
            pdf = create_pdf(name, percentage, ticket_data, 
                             data['senderName'], data['senderDNI'], data['senderEmail'], 
                             lottery_type, data.get('lotteryDisplayName', ''), unique_hash)

            # Enviar correo al participante
            subject = data['subject'].replace('{numero_decimo}', ticket_number)
            
            # Obtener el nombre del juego para mostrar
            lottery_name = data.get('lotteryDisplayName', '')
            if not lottery_name:
                # Si no se proporciona un nombre para mostrar, usar el tipo de lotería
                if lottery_type.startswith('otro_'):
                    lottery_name = lottery_type[5:]  # Eliminar el prefijo 'otro_'
                elif lottery_type == 'navidad':
                    lottery_name = "Lotería de Navidad"
                elif lottery_type == 'nino':
                    lottery_name = "Lotería del Niño"
                elif lottery_type == 'nacional':
                    lottery_name = "Lotería Nacional"
                elif lottery_type == 'primitiva':
                    lottery_name = "La Primitiva"
                elif lottery_type == 'bonoloto':
                    lottery_name = "Bonoloto"
                elif lottery_type == 'euromillones':
                    lottery_name = "Euromillones"
                elif lottery_type == 'gordo':
                    lottery_name = "El Gordo de la Primitiva"
                elif lottery_type == 'cuponazo':
                    lottery_name = "Cuponazo de la ONCE"
                elif lottery_type == 'extraordinario':
                    lottery_name = "Sorteo Extraordinario de la ONCE"
                elif lottery_type == 'diario':
                    lottery_name = "Cupón Diario de la ONCE"
                elif lottery_type == 'findesemana':
                    lottery_name = "Sueldazo Fin de Semana de la ONCE"
                elif lottery_type == 'eurojackpot':
                    lottery_name = "Eurojackpot de la ONCE"
                else:
                    lottery_name = "Lotería"
                    
            # Guardar el nombre del juego para usarlo en el PDF
            data['lotteryDisplayName'] = lottery_name
            
            # Obtener los datos del ticket para el correo
            ticket_data = data.get('ticketData', {})
            if not ticket_data:
                ticket_data = {}
            
            # Construir el cuerpo del correo según el tipo de lotería
            if lottery_type in ['primitiva', 'bonoloto', 'euromillones', 'gordo']:
                ticket_info = f"""Tu participación corresponde al {percentage}% con los números {data.get('ticketNumbers', '')}, con un importe de {data.get('ticketAmount', '0')}€."""
                if lottery_type == 'euromillones' and data.get('ticketStars'):
                    ticket_info += f"\nEstrellas: {data.get('ticketStars', '')}"
            elif lottery_type in ['cuponazo', 'extraordinario', 'diario', 'findesemana', 'eurojackpot']:
                ticket_info = f"""Tu participación corresponde al {percentage}% del cupón número {data.get('ticketNumber', '')}, con un importe de {data.get('ticketAmount', '0')}€."""
                if data.get('ticketSeries'):
                    ticket_info += f"\nSerie: {data.get('ticketSeries', '')}"
            elif lottery_type.startswith('otro'):
                ticket_info = f"""Tu participación corresponde al {percentage}% del número/identificador {data.get('ticketNumber', '')}, con un importe de {data.get('ticketAmount', '0')}€."""
                if data.get('ticketDetails'):
                    ticket_info += f"\nDetalles adicionales: {data.get('ticketDetails', '')}"
            else:
                # Lotería Nacional, Navidad, Niño
                ticket_info = f"""Tu participación corresponde al {percentage}% del décimo número {data.get('ticketNumber', '')}, con un importe de {data.get('ticketAmount', '0')}€."""
                if data.get('ticketFraction'):
                    ticket_info += f"\nFracción: {data.get('ticketFraction', '')}"
                if data.get('ticketSeries'):
                    ticket_info += f"\nSerie: {data.get('ticketSeries', '')}"
            
            email_body = f"""Hola, {name}:
 
 Este mail es para confirmar tu participación en la {lottery_name}.
 
 {ticket_info}
 
 Adjunto encontrarás un PDF con todos los detalles de la participación. Recuerda que esto es solo un recordatorio de {data['senderName']} y puede que no tenga ninguna validez legal.
 
 ¡Mucha suerte!
 
 Un saludo."""

            # Enviar correo usando Resend
            params = {
                'from': DEFAULT_FROM_EMAIL,
                'to': [email],
                'subject': subject,
                'text': email_body,
                'attachments': [{
                    'filename': 'participacion_loteria.pdf',
                    'content': base64.b64encode(pdf.getvalue()).decode('utf-8')
                }]
            }
            
            response = resend.Emails.send(params)
            app.logger.info(f"Resend response: {response}")
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
        admin_subject = "Resumen de envío de participaciones"
        admin_body = f"Se han enviado correctamente los correos a todos los participantes del décimo {ticket_number}. Adjunto encontrará un PDF con el resumen detallado."
        
        # Enviar correo usando Resend
        admin_params = {
            'from': DEFAULT_FROM_EMAIL,
            'to': [data['senderEmail']],
            'subject': admin_subject,
            'text': admin_body,
            'attachments': [{
                'filename': 'resumen_participaciones.pdf',
                'content': admin_pdf.getvalue().decode('latin1')
            }]
        }
        
        admin_response = resend.Emails.send(admin_params)
        app.logger.info(f"Resend admin response: {admin_response}")
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

@app.route('/empresas')
def empresas():
    """Ruta para la página de empresas"""
    print("Accediendo a la página de empresas")
    return render_template('empresas.html')

@app.route('/contacto')
def contacto():
    """Ruta para la página de contacto"""
    print("Accediendo a la página de contacto")
    return render_template('contacto.html')

@app.route('/send_contact', methods=['POST'])
def send_contact():
    """Ruta para procesar el formulario de contacto"""
    app.logger.info("Recibida petición POST en /send_contact")
    try:
        data = request.get_json()
        app.logger.info(f"Datos recibidos: {data}")
        
        # Validar que hay datos necesarios
        required_fields = ['name', 'email', 'subject', 'message', 'captcha']
        for field in required_fields:
            if field not in data or not data[field]:
                app.logger.error(f"Falta el campo {field}")
                return jsonify({"success": False, "error": f"Falta el campo {field}"}), 400
        
        # Validar el captcha (en un entorno real, se verificaría con Google)
        # Para esta prueba de concepto, aceptamos cualquier valor no vacío
        if not data['captcha']:
            app.logger.error("Captcha inválido")
            return jsonify({"success": False, "error": "Por favor, completa el captcha"}), 400
        
        # Preparar el email
        name = data['name']
        email = data['email']
        subject = data['subject']
        message = data['message']
        
        # Construir el cuerpo del email
        html_content = f"""
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> {name}</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Asunto:</strong> {subject}</p>
        <p><strong>Mensaje:</strong></p>
        <p>{message}</p>
        """
        
        # Enviar el email con Resend
        try:
            params = {
                'from': f"Formulario de Contacto <{CONTACTO_FROM_EMAIL}>",
                'to': [DEFAULT_FROM_EMAIL],  # Enviar al email principal
                'subject': f"Nuevo mensaje de contacto: {subject}",
                'html': html_content
            }
            
            response = resend.Emails.send(params)
            app.logger.info(f"Email de contacto enviado: {response}")
            
            # Enviar confirmación al usuario
            confirmation_params = {
                'from': f"Gestor de Participaciones de Azar <{CONTACTO_FROM_EMAIL}>",
                'to': [email],
                'subject': "Hemos recibido tu mensaje",
                'html': f"""
                <h2>Gracias por contactar con nosotros</h2>
                <p>Hola {name},</p>
                <p>Hemos recibido tu mensaje con el asunto "{subject}" y nos pondremos en contacto contigo lo antes posible.</p>
                <p>Este es un email automático, por favor no respondas a este mensaje.</p>
                <p>Saludos,<br>Equipo de Gestor de Participaciones de Azar</p>
                """
            }
            
            resend.Emails.send(confirmation_params)
            app.logger.info(f"Email de confirmación enviado a {email}")
            
            return jsonify({"success": True, "message": "Mensaje enviado correctamente"})
        except Exception as e:
            app.logger.error(f"Error al enviar email de contacto: {str(e)}")
            return jsonify({"success": False, "error": f"Error al enviar email: {str(e)}"}), 500
    
    except Exception as e:
        app.logger.error(f"Error general en contacto: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": f"Error en el servidor: {str(e)}"}), 500

@app.route('/send_email_empresas', methods=['POST'])
def send_email_empresas():
    """
    Ruta para procesar el envío de emails a los participantes desde la sección de empresas
    """
    global summary_data
    app.logger.info("Recibida petición POST en /send_email_empresas")
    try:
        data = request.get_json()
        app.logger.info(f"Datos recibidos: {data}")
        
        # Validar que hay participantes
        if 'participants' not in data or not data['participants']:
            app.logger.error("No se encontraron participantes en los datos")
            return jsonify({"error": "Se requieren participantes"}), 400
            
        # Validar que hay datos de la empresa
        if 'company' not in data or not data['company']:
            app.logger.error("No se encontraron datos de la empresa")
            return jsonify({"error": "Se requieren datos de la empresa"}), 400
        
        # Extraer datos de la petición
        participants = data['participants']
        lottery_data = data['lottery_data']
        sender_data = data['sender_data']
        company_data = data['company']
        
        # Asegurar que lottery_data tiene las claves necesarias
        if 'lottery_type' not in lottery_data:
            lottery_data['lottery_type'] = lottery_data.get('type', 'otro')
        
        app.logger.info(f"Datos de la lotería: {lottery_data}")
        
        # Usar el email específico para empresas
        sender_email = EMPRESAS_FROM_EMAIL
        
        # Procesar cada participante
        participants_summary = []
        for participant in participants:
            # Generar un hash único para esta participación
            unique_hash = generate_hash(f"{participant['name']}_{participant['email']}_{lottery_data['number']}_{lottery_data.get('type', lottery_data['lottery_type'])}")
            
            # Crear el PDF para este participante
            pdf = create_pdf(
                participant['name'],
                participant['percentage'],
                lottery_data,
                sender_data['name'],
                company_data.get('cif', ''),  # Usar CIF en lugar de DNI para empresas
                sender_data['email'],  # Usar el email proporcionado por el usuario, no el de empresas
                lottery_data.get('type', lottery_data['lottery_type']),
                lottery_data['lottery_display_name'],
                unique_hash,
                company_logo=company_data.get('logo', None),
                company_name=company_data['name']
            )
            
            # Guardar temporalmente los datos del participante para acceso posterior
            participant_data[unique_hash] = pdf
            
            # Añadir a la lista de resumen
            participants_summary.append({
                'name': participant['name'],
                'email': participant['email'],
                'percentage': participant['percentage'],
                'hash': unique_hash
            })
            
            # Preparar el email
            email_subject = data['email_subject']
            # Reemplazar variables en el asunto del email
            email_subject = email_subject.replace('{remitente}', sender_data['name'])
            email_subject = email_subject.replace('{loteria}', lottery_data['lottery_display_name'])
            email_subject = email_subject.replace('{empresa}', company_data['name'])
            email_body = data['email_body']
            
            # Reemplazar variables en el cuerpo del email
            email_body = email_body.replace('{nombre}', participant['name'])
            email_body = email_body.replace('{porcentaje}', str(participant['percentage']))
            email_body = email_body.replace('{numero_decimo}', lottery_data['number'])
            email_body = email_body.replace('{importe}', str(lottery_data['amount']))
            email_body = email_body.replace('{fraccion}', lottery_data.get('fraction', ''))
            email_body = email_body.replace('{serie}', lottery_data.get('series', ''))
            email_body = email_body.replace('{estrellas}', lottery_data.get('stars', ''))
            email_body = email_body.replace('{detalles}', lottery_data.get('details', ''))
            email_body = email_body.replace('{remitente}', sender_data['name'])
            email_body = email_body.replace('{email_remitente}', sender_data['email'])
            email_body = email_body.replace('{empresa}', company_data['name'])
            email_body = email_body.replace('{empresa_cif}', company_data.get('cif', 'N/A'))
            email_body = email_body.replace('{loteria}', lottery_data['lottery_display_name'])
            
            # Limpiar el HTML para mostrar solo la sección relevante según el tipo de lotería
            lottery_type = lottery_data.get('type', lottery_data['lottery_type'])
            
            # Extraer solo el mensaje correspondiente al tipo de lotería
            import re
            
            # Primero eliminamos todas las etiquetas div con sus contenidos
            cleaned_body = re.sub(r'<div[^>]*>.*?</div>', '', email_body, flags=re.DOTALL)
            
            # Ahora añadimos solo el contenido del div correspondiente al tipo de lotería
            if lottery_type in ['navidad', 'nino', 'nacional']:
                # Lotería Nacional, Navidad, Niño
                match = re.search(r'<div id="mensaje-loteria-nacional"[^>]*>(.*?)</div>', email_body, re.DOTALL)
                if match:
                    mensaje_especifico = match.group(1).strip()
                    cleaned_body = cleaned_body.replace('\n\n', '\n') + mensaje_especifico
            elif lottery_type in ['primitiva', 'bonoloto', 'gordo']:
                # Primitiva, Bonoloto, El Gordo
                match = re.search(r'<div id="mensaje-primitiva"[^>]*>(.*?)</div>', email_body, re.DOTALL)
                if match:
                    mensaje_especifico = match.group(1).strip()
                    cleaned_body = cleaned_body.replace('\n\n', '\n') + mensaje_especifico
            elif lottery_type == 'euromillones':
                # Euromillones
                match = re.search(r'<div id="mensaje-euromillones"[^>]*>(.*?)</div>', email_body, re.DOTALL)
                if match:
                    mensaje_especifico = match.group(1).strip()
                    cleaned_body = cleaned_body.replace('\n\n', '\n') + mensaje_especifico
            elif lottery_type in ['cuponazo', 'extraordinario', 'diario', 'findesemana', 'eurojackpot']:
                # ONCE
                match = re.search(r'<div id="mensaje-once"[^>]*>(.*?)</div>', email_body, re.DOTALL)
                if match:
                    mensaje_especifico = match.group(1).strip()
                    cleaned_body = cleaned_body.replace('\n\n', '\n') + mensaje_especifico
            else:
                # Otro tipo de juego
                match = re.search(r'<div id="mensaje-otro"[^>]*>(.*?)</div>', email_body, re.DOTALL)
                if match:
                    mensaje_especifico = match.group(1).strip()
                    cleaned_body = cleaned_body.replace('\n\n', '\n') + mensaje_especifico
            
            # Aseguramos que el formato HTML sea correcto
            email_body = cleaned_body.replace('\n', '<br>')
            
            # Enviar el email con Resend
            try:
                params = {
                    'from': f"{sender_data['name']} <{sender_email}>",
                    'to': [participant['email']],
                    'subject': email_subject,
                    'html': email_body,
                    'attachments': [{
                        'filename': f"participacion_{unique_hash}.pdf",
                        'content': base64.b64encode(pdf.getvalue()).decode('utf-8')
                    }]
                }
                
                response = resend.Emails.send(params)
                app.logger.info(f"Email enviado a {participant['email']}: {response}")
            except Exception as e:
                app.logger.error(f"Error al enviar email a {participant['email']}: {str(e)}")
                return jsonify({"error": f"Error al enviar email: {str(e)}"}), 500
        
        # Guardar datos para el resumen del administrador
        summary_data = {
            'participants_summary': participants_summary,
            'lottery_data': lottery_data,
            'sender_data': sender_data
        }
        
        # Crear PDF de resumen para el administrador
        # Actualizar sender_data para incluir el CIF de la empresa
        sender_data_with_cif = sender_data.copy()
        sender_data_with_cif['dni'] = company_data.get('cif', '')
        
        admin_pdf = create_admin_summary_pdf(
            participants_summary, 
            lottery_data, 
            sender_data_with_cif,
            company_logo=company_data.get('logo', None),
            company_name=company_data['name']
        )
        
        # Enviar email de resumen al administrador
        try:
            params = {
                'from': f"Sistema <{EMPRESAS_FROM_EMAIL}>",
                'to': [sender_data['email']],
                'subject': f"Resumen de participaciones - {lottery_data['lottery_display_name']}",
                'html': f"<p>Adjunto encontrarás un resumen de las participaciones enviadas para {lottery_data['lottery_display_name']}.</p>",
                'attachments': [{
                    'filename': "resumen_participaciones.pdf",
                    'content': base64.b64encode(admin_pdf.getvalue()).decode('utf-8')
                }]
            }
            
            response = resend.Emails.send(params)
            app.logger.info(f"Email de resumen enviado a {sender_data['email']}: {response}")
        except Exception as e:
            app.logger.error(f"Error al enviar email de resumen: {str(e)}")
            # No devolvemos error aquí porque los emails a los participantes ya se enviaron
        
        return jsonify({
            "success": True,
            "message": f"Se han enviado {len(participants)} emails correctamente",
            "summary_hash": "admin_summary"
        })
    
    except Exception as e:
        app.logger.error(f"Error general: {str(e)}", exc_info=True)
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
