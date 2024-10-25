# 🎟️ Gestor de Lotería de Navidad y El Niño

## 📝 Descripción del Proyecto

Este proyecto es un gestor de participaciones para la Lotería de Navidad y El Niño. Permite a los usuarios crear y administrar participaciones de lotería, enviar correos electrónicos a los participantes con sus detalles de participación 📧, y generar PDFs con resúmenes de las participaciones 📄.

## 🛠️ Tecnologías Utilizadas

- **Backend**: Python con Flask
- **Frontend**: HTML, CSS, JavaScript
- **Generación de PDFs**: ReportLab
- **Envío de Correos**: Flask-Mail

## 📦 Dependencias

Las principales dependencias del proyecto son:

- Flask==2.3.2
- Flask-Mail==0.9.1
- reportlab==3.6.12
- gunicorn==20.1.0
- python-dotenv==1.0.0

Para instalar todas las dependencias, ejecuta:

pip install -r requirements.txt


## ⚙️ Configuración del Entorno

El proyecto utiliza variables de entorno para la configuración. Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

- `MAIL_SERVER=tu_servidor_smtp`
- `MAIL_PORT=tu_puerto_smtp`
- `MAIL_USE_TLS=True`
- `MAIL_USERNAME=tu_usuario_de_correo`
- `MAIL_PASSWORD=tu_contraseña_de_correo`
- `MAIL_DEFAULT_SENDER=correo_remitente_por_defecto`


Asegúrate de reemplazar los valores con tu configuración real de correo electrónico.

## 🗄️ Base de Datos

Este proyecto no utiliza una base de datos persistente. Todos los datos se manejan en memoria durante la ejecución de la aplicación.

## 🚀 Cómo Ejecutar el Proyecto

1. Clona el repositorio
2. Instala las dependencias: `pip install -r requirements.txt`
3. Configura el archivo `.env` como se describió anteriormente
4. Ejecuta la aplicación: `python app.py`

La aplicación estará disponible en `http://localhost:5000`.

## 📂 Estructura del Proyecto

- `app.py`: Contiene la lógica principal del backend
- `templates/`: Directorio con las plantillas HTML
- `static/`: Directorio con archivos estáticos (CSS, JavaScript)
- `requirements.txt`: Lista de dependencias del proyecto

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si deseas contribuir al proyecto:

1. Haz un fork del repositorio
2. Crea una nueva rama para tu feature: `git checkout -b feature/AmazingFeature`
3. Haz commit de tus cambios: `git commit -m 'Add some AmazingFeature'`
4. Push a la rama: `git push origin feature/AmazingFeature`
5. Abre un Pull Request

Por favor, asegúrate de actualizar las pruebas según corresponda y de seguir el estilo de código existente.

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

## 📬 Contacto

Si tienes alguna pregunta o sugerencia, no dudes en abrir un issue en este repositorio.
