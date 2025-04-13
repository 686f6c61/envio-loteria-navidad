// Variables globales para almacenar el estado de la aplicación
let totalPercentage = 0;
const participants = [];
let ticketData = {
    number: '',
    amount: '',
    fraction: '',
    series: ''
};
let selectedLottery = '';
let lotteryDisplayName = '';

// Función para actualizar los datos del décimo y la previsualización
function updateTicketData() {
    // Obtener el tipo de lotería seleccionado
    const selectedValue = document.getElementById('lotteryTypeSelect').value;
    
    // Actualizar los datos del ticket según el tipo de formulario visible
    if (['primitiva', 'bonoloto', 'euromillones', 'gordo'].includes(selectedValue)) {
        // Formulario de Primitiva, Bonoloto, Euromillones, El Gordo
        ticketData = {
            numbers: document.getElementById('ticketNumbers').value,
            stars: selectedValue === 'euromillones' ? document.getElementById('ticketStars').value : '',
            amount: parseFloat(document.getElementById('ticketAmountPrimitiva').value || 0).toFixed(2),
            type: 'primitiva'
        };
    } else if (['cuponazo', 'extraordinario', 'diario', 'findesemana', 'eurojackpot'].includes(selectedValue)) {
        // Formulario de ONCE
        ticketData = {
            number: document.getElementById('ticketNumberOnce').value,
            series: document.getElementById('ticketSeriesOnce').value,
            amount: parseFloat(document.getElementById('ticketAmountOnce').value || 0).toFixed(2),
            type: 'once'
        };
    } else if (selectedValue === 'otro') {
        // Formulario para otro tipo de juego
        ticketData = {
            number: document.getElementById('ticketNumberOtro').value,
            amount: parseFloat(document.getElementById('ticketAmountOtro').value || 0).toFixed(2),
            details: document.getElementById('ticketDetails').value,
            type: 'otro'
        };
    } else {
        // Formulario de Lotería Nacional, Navidad, Niño
        ticketData = {
            number: document.getElementById('ticketNumber').value.padStart(5, '0'),
            amount: parseFloat(document.getElementById('ticketAmount').value || 0).toFixed(2),
            fraction: document.getElementById('ticketFraction').value.padStart(2, '0'),
            series: document.getElementById('ticketSeries').value,
            type: 'nacional'
        };
    }

    // Actualizar la previsualización del ticket en la interfaz
    const ticketPreview = document.getElementById('ticketPreview');
    const previewNumber = document.getElementById('previewNumber');
    const previewAmount = document.getElementById('previewAmount');
    const previewFraction = document.getElementById('previewFraction');
    const previewSeries = document.getElementById('previewSeries');
    
    ticketPreview.style.display = 'block';
    
    // Actualizar la previsualización según el tipo de ticket
    if (ticketData.type === 'primitiva') {
        previewNumber.textContent = ticketData.numbers;
        previewAmount.textContent = ticketData.amount ? `${ticketData.amount}€` : '';
        previewFraction.textContent = ticketData.stars ? `Estrellas: ${ticketData.stars}` : '';
        previewSeries.textContent = '';
    } else if (ticketData.type === 'once') {
        previewNumber.textContent = ticketData.number;
        previewAmount.textContent = ticketData.amount ? `${ticketData.amount}€` : '';
        previewFraction.textContent = '';
        previewSeries.textContent = ticketData.series ? `Serie: ${ticketData.series}` : '';
    } else if (ticketData.type === 'otro') {
        previewNumber.textContent = ticketData.number;
        previewAmount.textContent = ticketData.amount ? `${ticketData.amount}€` : '';
        previewFraction.textContent = '';
        previewSeries.textContent = ticketData.details ? `Detalles: ${ticketData.details}` : '';
    } else {
        // Nacional
        previewNumber.textContent = ticketData.number;
        previewAmount.textContent = ticketData.amount ? `${ticketData.amount}€` : '';
        previewFraction.textContent = ticketData.fraction;
        previewSeries.textContent = ticketData.series;
    }
}

// Función para añadir un nuevo participante a la lista
function addParticipant(event) {
    event.preventDefault();
    
    // Obtener los datos del formulario
    const name = document.getElementById('name').value.trim();
    const dni = document.getElementById('dni').value.trim();
    const email = document.getElementById('email').value.trim();
    const percentage = parseFloat(document.getElementById('percentage').value.trim());
    
    // Validar los datos ingresados
    if (!name || !email || isNaN(percentage) || percentage <= 0) {
        showAlert('Por favor, completa todos los campos correctamente.', 'warning');
        return;
    }
    
    // Crear una nueva fila en la tabla de participantes
    const newRow = `
        <tr>
            <td>${name}</td>
            <td>${dni}</td>
            <td>${email}</td>
            <td>${percentage}%</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="removeParticipant(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
            <td></td>
        </tr>
    `;
    
    document.getElementById('participantsList').insertAdjacentHTML('beforeend', newRow);
    
    // Limpiar el formulario después de añadir el participante
    document.getElementById('participantForm').reset();
    
    // Actualizar la barra de progreso
    updateProgressBar();
}

// Función para actualizar la lista de participantes en la interfaz
function updateParticipantsList() {
    const list = document.getElementById('participantsList');
    list.innerHTML = '';
    participants.forEach((participant, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${participant.name}</td>
            <td>${participant.dni}</td>
            <td>${participant.email}</td>
            <td>${participant.percentage}%</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="removeParticipant(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
    });
}

// Función para actualizar la barra de progreso del porcentaje total
function updateProgressBar() {
    const totalPercentage = Array.from(document.querySelectorAll('#participantsList tr'))
        .reduce((sum, row) => {
            const percentageText = row.querySelector('td:nth-child(4)').textContent;
            const percentage = parseFloat(percentageText);
            return sum + (isNaN(percentage) ? 0 : percentage);
        }, 0);
    
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${totalPercentage}%`;
        progressBar.textContent = `${totalPercentage.toFixed(2)}%`;
        progressBar.setAttribute('aria-valuenow', totalPercentage);
    }
}

// Función para eliminar un participante de la lista
function removeParticipant(button) {
    button.closest('tr').remove();
    updateProgressBar();
}

// Función para previsualizar el email antes de enviarlo
function updateEmailPreview() {
    // Actualizar la variable {loteria} en el mensaje de correo con el nombre del juego seleccionado
    const emailBody = document.getElementById('emailBody');
    if (emailBody && lotteryDisplayName) {
        // Reemplazar {loteria} con el nombre del juego seleccionado
        let content = emailBody.value;
        content = content.replace(/{loteria}/g, lotteryDisplayName);
        emailBody.value = content;
    }
}

function previewEmail() {
    // Obtener los datos del formulario
    const senderName = document.getElementById('senderName').value || '[Nombre del Remitente]';
    const selectElement = document.getElementById('lotteryTypeSelect');
    const selectedValue = selectElement.value;
    
    // Obtener el porcentaje del primer participante (si existe)
    let participantPercentage = '20';
    let participantName = 'Juan Pérez';
    const participantsList = document.getElementById('participantsList');
    if (participantsList && participantsList.rows.length > 0) {
        const firstRow = participantsList.rows[0];
        if (firstRow.cells.length >= 4) {
            const percentageText = firstRow.cells[3].textContent;
            participantPercentage = percentageText.replace('%', '').trim();
            participantName = firstRow.cells[0].textContent.trim();
        }
    }
    
    let ticketNumber, ticketAmount, ticketFraction, ticketSeries, ticketStars, ticketDetails;
    
    // Obtener los datos según el tipo de juego
    if (['primitiva', 'bonoloto', 'euromillones', 'gordo'].includes(selectedValue)) {
        ticketNumber = document.getElementById('ticketNumbers').value || '1, 5, 12, 23, 34, 45';
        ticketAmount = document.getElementById('ticketAmountPrimitiva').value || '20';
        ticketStars = selectedValue === 'euromillones' ? (document.getElementById('ticketStars').value || '2, 5') : '';
    } else if (['cuponazo', 'extraordinario', 'diario', 'findesemana', 'eurojackpot'].includes(selectedValue)) {
        ticketNumber = document.getElementById('ticketNumberOnce').value || '12345';
        ticketAmount = document.getElementById('ticketAmountOnce').value || '20';
        ticketSeries = document.getElementById('ticketSeriesOnce').value || '123';
    } else if (selectedValue === 'otro') {
        ticketNumber = document.getElementById('ticketNumberOtro').value || 'ABC-12345';
        ticketAmount = document.getElementById('ticketAmountOtro').value || '20';
        ticketDetails = document.getElementById('ticketDetails').value || 'Sorteo especial';
    } else {
        // Lotería Nacional, Navidad, Niño
        ticketNumber = document.getElementById('ticketNumber').value || '12345';
        ticketAmount = document.getElementById('ticketAmount').value || '20';
        ticketFraction = document.getElementById('ticketFraction').value || '10';
        ticketSeries = document.getElementById('ticketSeries').value || '123';
    }
    
    const subject = document.getElementById('emailSubject').value
        .replace('{remitente}', senderName)
        .replace('{loteria}', lotteryDisplayName || 'Lotería');
    let body = document.getElementById('emailBody').value;

    // Reemplazar los marcadores de posición en el cuerpo del email
    body = body.replace(/{nombre}/g, participantName)
               .replace(/{porcentaje}/g, participantPercentage)
               .replace(/{numero_decimo}/g, ticketNumber)
               .replace(/{importe}/g, ticketAmount)
               .replace(/{fraccion}/g, ticketFraction || '')
               .replace(/{serie}/g, ticketSeries || '')
               .replace(/{estrellas}/g, ticketStars || '')
               .replace(/{detalles}/g, ticketDetails || '')
               .replace(/{remitente}/g, senderName)
               .replace(/{loteria}/g, lotteryDisplayName || 'Lotería');

    // Crear el contenido de la previsualización
    const previewContent = `
        <strong>De:</strong> ${senderName}<br>
        <strong>Asunto:</strong> ${subject}<br>
        <strong>Cuerpo:</strong><br>
        ${body.replace(/\n/g, '<br>')}
    `;

    // Mostrar la previsualización en el modal
    document.getElementById('previewContent').innerHTML = previewContent;

    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    previewModal.show();
}

// Función principal para validar y enviar los datos al servidor
function validateAndSubmit() {
    console.log("Función validateAndSubmit() iniciada");

    // Recopilar los datos de los participantes
    const participants = Array.from(document.querySelectorAll('#participantsList tr')).map(row => {
        return {
            name: row.querySelector('td:nth-child(1)').textContent,
            dni: row.querySelector('td:nth-child(2)').textContent,
            email: row.querySelector('td:nth-child(3)').textContent,
            percentage: parseFloat(row.querySelector('td:nth-child(4)').textContent)
        };
    });

    console.log("Participantes:", participants);

    // Validar que haya al menos un participante
    if (participants.length === 0) {
        showAlert('No hay participantes añadidos. Por favor, añade al menos un participante.', 'warning');
        return;
    }

    // Si es un juego personalizado, actualizar el tipo de lotería
    if (document.getElementById('lotteryTypeSelect').value === 'otro') {
        updateCustomLotteryType();
    }
    
    // Validar que se haya seleccionado un tipo de lotería
    if (!selectedLottery) {
        showAlert('Por favor, selecciona un tipo de juego.', 'warning');
        return;
    }
    
    // Actualizar los datos del ticket
    updateTicketData();
    
    // Recopilar todos los datos del formulario
    const data = {
        senderName: document.getElementById('senderName').value.trim(),
        senderDNI: document.getElementById('senderDNI').value.trim(),
        senderEmail: document.getElementById('senderEmail').value.trim(),
        subject: document.getElementById('emailSubject').value.trim(),
        lotteryType: selectedLottery,
        lotteryDisplayName: lotteryDisplayName,
        ticketData: ticketData,
        participants: participants
    };
    
    // Añadir campos específicos según el tipo de lotería
    const selectedValue = document.getElementById('lotteryTypeSelect').value;
    
    if (['primitiva', 'bonoloto', 'euromillones', 'gordo'].includes(selectedValue)) {
        data.ticketNumbers = document.getElementById('ticketNumbers').value.trim();
        data.ticketAmount = document.getElementById('ticketAmountPrimitiva').value.trim();
        if (selectedValue === 'euromillones') {
            data.ticketStars = document.getElementById('ticketStars').value.trim();
        }
    } else if (['cuponazo', 'extraordinario', 'diario', 'findesemana', 'eurojackpot'].includes(selectedValue)) {
        data.ticketNumber = document.getElementById('ticketNumberOnce').value.trim();
        data.ticketSeries = document.getElementById('ticketSeriesOnce').value.trim();
        data.ticketAmount = document.getElementById('ticketAmountOnce').value.trim();
    } else if (selectedValue === 'otro') {
        data.ticketNumber = document.getElementById('ticketNumberOtro').value.trim();
        data.ticketAmount = document.getElementById('ticketAmountOtro').value.trim();
        data.ticketDetails = document.getElementById('ticketDetails').value.trim();
    } else {
        data.ticketNumber = document.getElementById('ticketNumber').value.trim();
        data.ticketAmount = document.getElementById('ticketAmount').value.trim();
        data.ticketFraction = document.getElementById('ticketFraction').value.trim();
        data.ticketSeries = document.getElementById('ticketSeries').value.trim();
    }

    console.log("Datos a enviar:", JSON.stringify(data, null, 2));

    // Mostrar indicador de carga y deshabilitar botón de envío
    document.getElementById('loadingIndicator').style.display = 'block';
    const sendButton = document.getElementById('sendEmailButton');
    sendButton.disabled = true;

    // Enviar los datos al servidor
    fetch('/send_email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log("Respuesta recibida, status:", response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        console.log('Respuesta del servidor:', result);
        showAlert('Correos enviados con éxito a todos los participantes y al administrador', 'success');
        
        // Actualizar la interfaz con los hashes recibidos y añadir botones de descarga
        document.querySelectorAll('#participantsList tr').forEach(row => {
            const email = row.querySelector('td:nth-child(3)').textContent;
            const hash = result.participantHashes[email];
            if (hash) {
                const hashCell = row.querySelector('td:nth-child(6)');
                hashCell.textContent = hash;

                const actionsCell = row.querySelector('td:nth-child(5)');
                const downloadButton = document.createElement('button');
                downloadButton.className = 'btn btn-sm btn-primary ms-1';
                downloadButton.innerHTML = '<i class="fas fa-file-pdf"></i>';
                downloadButton.onclick = () => downloadPDF(hash);
                actionsCell.appendChild(downloadButton);
            }
        });

        // Mostrar el botón para descargar el resumen
        document.getElementById('downloadSummaryButton').style.display = 'inline-block';
    })
    .catch((error) => {
        console.error('Error:', error);
        showAlert('Error al enviar los correos o generar el resumen. Por favor, intenta de nuevo.', 'danger');
    })
    .finally(() => {
        // Ocultar indicador de carga y habilitar botón de envío
        document.getElementById('loadingIndicator').style.display = 'none';
        sendButton.disabled = false;
    });
}

// Función para descargar el PDF de un participante específico
function downloadPDF(hash) {
    window.open(`/download_pdf/${hash}`, '_blank');
}

// Función para descargar el PDF de resumen
function downloadSummaryPDF() {
    fetch('/download_summary_pdf')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'resumen_participaciones.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error al descargar el resumen:', error);
            alert('Error al descargar el resumen. Por favor, intenta de nuevo.');
        });
}

// Función para manejar la selección del tipo de lotería
function handleLotteryTypeChange() {
    const selectElement = document.getElementById('lotteryTypeSelect');
    const selectedValue = selectElement.value;
    const otherLotteryContainer = document.getElementById('otherLotteryContainer');
    const lotteryTypeInput = document.getElementById('lotteryType');
    const participationTitle = document.getElementById('participationTitle');
    
    // Ocultar todos los formularios
    document.querySelectorAll('.lottery-form').forEach(form => {
        form.style.display = 'none';
    });
    
    // Ocultar todos los mensajes de tipo de lotería
    document.querySelectorAll('.mensaje-tipo-loteria').forEach(mensaje => {
        mensaje.style.display = 'none';
    });
    
    // Mostrar u ocultar el campo para especificar otro juego
    if (selectedValue === 'otro') {
        otherLotteryContainer.style.display = 'block';
        document.getElementById('otherLotteryType').focus();
        lotteryDisplayName = '';
        // Mostrar el formulario para otro tipo de juego
        document.getElementById('ticketFormOtro').style.display = 'block';
        // Mostrar el mensaje para otro tipo de juego
        document.getElementById('mensaje-otro').style.display = 'block';
    } else {
        otherLotteryContainer.style.display = 'none';
        // Guardar el nombre visible del juego seleccionado
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        lotteryDisplayName = selectedOption.textContent;
        // Establecer el valor del tipo de lotería
        lotteryTypeInput.value = selectedValue;
        selectedLottery = selectedValue;
        
        // Mostrar el formulario adecuado según el tipo de lotería
        if (['primitiva', 'bonoloto', 'euromillones', 'gordo'].includes(selectedValue)) {
            document.getElementById('ticketFormPrimitiva').style.display = 'block';
            
            // Configurar el formulario para Euromillones
            if (selectedValue === 'euromillones') {
                document.getElementById('starsLabel').style.display = 'block';
                document.getElementById('ticketStars').style.display = 'block';
                document.querySelector('#ticketStars + small').style.display = 'block';
                // Mostrar el mensaje para Euromillones
                document.getElementById('mensaje-euromillones').style.display = 'block';
            } else {
                document.getElementById('starsLabel').style.display = 'none';
                document.getElementById('ticketStars').style.display = 'none';
                document.querySelector('#ticketStars + small').style.display = 'none';
                // Mostrar el mensaje para Primitiva/Bonoloto/Gordo
                document.getElementById('mensaje-primitiva').style.display = 'block';
            }
        } else if (['cuponazo', 'extraordinario', 'diario', 'findesemana', 'eurojackpot'].includes(selectedValue)) {
            document.getElementById('ticketFormOnce').style.display = 'block';
            // Mostrar el mensaje para ONCE
            document.getElementById('mensaje-once').style.display = 'block';
        } else {
            // Lotería Nacional, Navidad, Niño
            document.getElementById('ticketFormNacional').style.display = 'block';
            // Mostrar el mensaje para Lotería Nacional
            document.getElementById('mensaje-loteria-nacional').style.display = 'block';
        }
    }
    
    // Actualizar el título de la sección
    if (lotteryDisplayName) {
        participationTitle.innerHTML = `<i class="fas fa-ticket-alt me-2"></i>Datos de participación - ${lotteryDisplayName}`;
    } else {
        participationTitle.innerHTML = `<i class="fas fa-ticket-alt me-2"></i>Datos de participación`;
    }
    
    // Actualizar la variable {loteria} en el mensaje de correo
    updateEmailPreview();
    
    console.log("Tipo de lotería seleccionado:", selectedValue);
}

function updateCustomLotteryType() {
    const otherLotteryInput = document.getElementById('otherLotteryType');
    const lotteryTypeInput = document.getElementById('lotteryType');
    
    if (otherLotteryInput.value.trim() !== '') {
        lotteryTypeInput.value = 'otro_' + otherLotteryInput.value.trim();
        selectedLottery = 'otro_' + otherLotteryInput.value.trim();
        lotteryDisplayName = otherLotteryInput.value.trim();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('fileInput')) {
        document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    }
    
    // Evento para el campo de otro tipo de lotería
    const otherLotteryInput = document.getElementById('otherLotteryType');
    if (otherLotteryInput) {
        otherLotteryInput.addEventListener('input', updateCustomLotteryType);
    }
    if (document.getElementById('participantForm')) {
        document.getElementById('participantForm').addEventListener('submit', addParticipant);
    }

    const triggerTabList = [].slice.call(document.querySelectorAll('#ticketEntryTabs button'));
    triggerTabList.forEach(function(triggerEl) {
        const tabTrigger = new bootstrap.Tab(triggerEl);
        triggerEl.addEventListener('click', function(event) {
            event.preventDefault();
            tabTrigger.show();
        });
    });

    // Configurar listeners para los campos del décimo
    ['ticketNumber', 'ticketAmount', 'ticketFraction', 'ticketSeries'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateTicketData);
        }
    });

    // Configurar listeners para la selección del tipo de lotería
    document.querySelectorAll('input[name="lotteryType"]').forEach(radio => {
        radio.addEventListener('change', handleLotterySelection);
    });

    updateProgressBar();

    // Configurar listeners para el formateo de los campos del décimo
    const ticketNumber = document.getElementById('ticketNumber');
    const ticketAmount = document.getElementById('ticketAmount');
    const ticketFraction = document.getElementById('ticketFraction');
    const ticketSeries = document.getElementById('ticketSeries');

    if (ticketNumber) {
        ticketNumber.addEventListener('input', function() {
            formatTicketNumber(this);
            updateTicketData();
        });
    }

    if (ticketAmount) {
        ticketAmount.addEventListener('input', updateTicketData);
    }

    if (ticketFraction) {
        ticketFraction.addEventListener('input', function() {
            formatTicketFraction(this);
            updateTicketData();
        });
    }

    if (ticketSeries) {
        ticketSeries.addEventListener('input', function() {
            formatTicketSeries(this);
            updateTicketData();
        });
    }
});

// Funciones para manejar la validación y el formateo de los campos del décimo
function formatTicketNumber(input) {
    let value = input.value.replace(/\D/g, '').substr(0, 5);
    input.value = value;
}

function formatTicketFraction(input) {
    let value = input.value.replace(/\D/g, '');
    value = Math.min(Math.max(parseInt(value) || 0, 1), 99).toString();
    input.value = value;
}

function formatTicketSeries(input) {
    let value = input.value.replace(/\D/g, '').substr(0, 3);
    value = Math.min(parseInt(value) || 0, 999).toString();
    input.value = value;
}

// Función para mostrar alertas en la interfaz
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.style.display = 'block';
    }
}

// Asegurarse de que el botón de envío tenga el event listener correcto
document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('sendEmailButton');
    if (sendButton) {
        sendButton.addEventListener('click', validateAndSubmit);
    }
});
