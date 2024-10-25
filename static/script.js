// Variables globales
let totalPercentage = 0;
const participants = [];
let ticketData = {
    number: '',
    amount: '',
    fraction: '',
    series: ''
};
let selectedLottery = '';

// Función para actualizar los datos del décimo
function updateTicketData() {
    const isManualEntry = document.querySelector('#manual-tab').classList.contains('active');

    if (isManualEntry) {
        ticketData = {
            number: document.getElementById('ticketNumber').value.padStart(5, '0'),
            amount: parseFloat(document.getElementById('ticketAmount').value).toFixed(2),
            fraction: document.getElementById('ticketFraction').value.padStart(2, '0'),
            series: document.getElementById('ticketSeries').value // Sin padStart aquí
        };
    }

    // Actualizar preview
    document.getElementById('ticketPreview').style.display = 'block';
    document.getElementById('previewNumber').textContent = ticketData.number;
    document.getElementById('previewAmount').textContent = ticketData.amount ? `${ticketData.amount}€` : '';
    document.getElementById('previewFraction').textContent = ticketData.fraction;
    document.getElementById('previewSeries').textContent = ticketData.series;
}

// Función para añadir un participante
function addParticipant(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const dni = document.getElementById('dni').value.trim();
    const email = document.getElementById('email').value.trim();
    const percentage = parseFloat(document.getElementById('percentage').value.trim());
    
    if (!name || !email || isNaN(percentage) || percentage <= 0) {
        showAlert('Por favor, completa todos los campos correctamente.', 'warning');
        return;
    }
    
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
    
    // Limpiar el formulario
    document.getElementById('participantForm').reset();
    
    updateProgressBar();
}

// Función para actualizar la lista de participantes
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

// Función para actualizar el porcentaje total
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

// Función para eliminar un participante
function removeParticipant(button) {
    button.closest('tr').remove();
    updateProgressBar();
}

// Función para previsualizar el email
function previewEmail() {
    const senderName = document.getElementById('senderName').value || '[Nombre del Remitente]';
    const ticketNumber = document.getElementById('ticketNumber').value || '[Número del Décimo]';
    const ticketAmount = document.getElementById('ticketAmount').value || '[Importe]';
    
    const subject = document.getElementById('emailSubject').value;
    let body = document.getElementById('emailBody').value;

    body = body.replace(/{nombre}/g, '[Nombre del Participante]')
               .replace(/{porcentaje}/g, '[Porcentaje]')
               .replace(/{numero_decimo}/g, ticketNumber)
               .replace(/{importe}/g, ticketAmount);

    const previewContent = `
        <strong>De:</strong> ${senderName}<br>
        <strong>Asunto:</strong> ${subject}<br>
        <strong>Cuerpo:</strong><br>
        ${body.replace(/\n/g, '<br>')}
    `;

    document.getElementById('previewContent').innerHTML = previewContent;

    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    previewModal.show();
}

function validateAndSubmit() {
    console.log("Función validateAndSubmit() iniciada");

    const participants = Array.from(document.querySelectorAll('#participantsList tr')).map(row => {
        return {
            name: row.querySelector('td:nth-child(1)').textContent,
            dni: row.querySelector('td:nth-child(2)').textContent,
            email: row.querySelector('td:nth-child(3)').textContent,
            percentage: parseFloat(row.querySelector('td:nth-child(4)').textContent)
        };
    });

    console.log("Participantes:", participants);

    if (participants.length === 0) {
        showAlert('No hay participantes añadidos. Por favor, añade al menos un participante.', 'warning');
        return;
    }

    const data = {
        senderName: document.getElementById('senderName').value.trim(),
        senderDNI: document.getElementById('senderDNI').value.trim(),
        senderEmail: document.getElementById('senderEmail').value.trim(),
        subject: document.getElementById('emailSubject').value.trim(),
        ticketNumber: document.getElementById('ticketNumber').value.trim(),
        ticketAmount: document.getElementById('ticketAmount').value.trim(),
        lotteryType: selectedLottery,
        participants: participants
    };

    console.log("Datos a enviar:", JSON.stringify(data, null, 2));

    // Mostrar indicador de carga y deshabilitar botón
    document.getElementById('loadingIndicator').style.display = 'block';
    const sendButton = document.getElementById('sendEmailButton');
    sendButton.disabled = true;

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

        document.getElementById('downloadSummaryButton').style.display = 'inline-block';
    })
    .catch((error) => {
        console.error('Error:', error);
        showAlert('Error al enviar los correos o generar el resumen. Por favor, intenta de nuevo.', 'danger');
    })
    .finally(() => {
        // Ocultar indicador de carga y habilitar botón
        document.getElementById('loadingIndicator').style.display = 'none';
        sendButton.disabled = false;
    });
}

function downloadPDF(hash) {
    window.open(`/download_pdf/${hash}`, '_blank');
}

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

    ['ticketNumber', 'ticketAmount', 'ticketFraction', 'ticketSeries'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateTicketData);
        }
    });

    document.querySelectorAll('input[name="lotteryType"]').forEach(radio => {
        radio.addEventListener('change', handleLotterySelection);
    });

    updateProgressBar();

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

// Añadir estas funciones para manejar la validación y el formateo
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

// Asegúrate de que el botón de envío tenga el ID correcto en tu HTML
document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('sendEmailButton');
    if (sendButton) {
        sendButton.addEventListener('click', validateAndSubmit);
    }
});
