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

// Función para actualizar los datos del décimo y la previsualización
function updateTicketData() {
    const isManualEntry = document.querySelector('#manual-tab').classList.contains('active');

    if (isManualEntry) {
        // Actualizar los datos del décimo con los valores ingresados manualmente
        ticketData = {
            number: document.getElementById('ticketNumber').value.padStart(5, '0'),
            amount: parseFloat(document.getElementById('ticketAmount').value).toFixed(2),
            fraction: document.getElementById('ticketFraction').value.padStart(2, '0'),
            series: document.getElementById('ticketSeries').value
        };
    }

    // Actualizar la previsualización del décimo en la interfaz
    document.getElementById('ticketPreview').style.display = 'block';
    document.getElementById('previewNumber').textContent = ticketData.number;
    document.getElementById('previewAmount').textContent = ticketData.amount ? `${ticketData.amount}€` : '';
    document.getElementById('previewFraction').textContent = ticketData.fraction;
    document.getElementById('previewSeries').textContent = ticketData.series;
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
function previewEmail() {
    // Obtener los datos del formulario
    const senderName = document.getElementById('senderName').value || '[Nombre del Remitente]';
    const ticketNumber = document.getElementById('ticketNumber').value || '[Número del Décimo]';
    const ticketAmount = document.getElementById('ticketAmount').value || '[Importe]';
    const ticketFraction = document.getElementById('ticketFraction').value || '[Fracción]';
    const ticketSeries = document.getElementById('ticketSeries').value || '[Serie]';
    
    const subject = document.getElementById('emailSubject').value;
    let body = document.getElementById('emailBody').value;

    // Reemplazar los marcadores de posición en el cuerpo del email
    body = body.replace(/{nombre}/g, '[Nombre del Participante]')
               .replace(/{porcentaje}/g, '[Porcentaje]')
               .replace(/{numero_decimo}/g, ticketNumber)
               .replace(/{importe}/g, ticketAmount)
               .replace(/{fraccion}/g, ticketFraction)
               .replace(/{serie}/g, ticketSeries);

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

    // Recopilar todos los datos del formulario
    const data = {
        senderName: document.getElementById('senderName').value.trim(),
        senderDNI: document.getElementById('senderDNI').value.trim(),
        senderEmail: document.getElementById('senderEmail').value.trim(),
        subject: document.getElementById('emailSubject').value.trim(),
        ticketNumber: document.getElementById('ticketNumber').value.trim(),
        ticketAmount: document.getElementById('ticketAmount').value.trim(),
        ticketFraction: document.getElementById('ticketFraction').value.trim(),
        ticketSeries: document.getElementById('ticketSeries').value.trim(),
        lotteryType: selectedLottery,
        participants: participants
    };

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
function handleLotterySelection(event) {
    selectedLottery = event.target.value;
    console.log('Lotería seleccionada:', selectedLottery);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('fileInput')) {
        document.getElementById('fileInput').addEventListener('change', handleFileSelect);
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
