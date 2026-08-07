document.addEventListener('DOMContentLoaded', () => {
    const btnConnect = document.getElementById('btnConnect');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const companyFields = document.getElementById('companyFields');
    const directoryList = document.getElementById('directoryList');
    const individualFields = document.getElementById('individualFields');
    const employmentFields = document.getElementById('employmentFields');

    // Oauth redirect
    btnConnect.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/finch/connect-url');
            const data = await res.json();
            if (data.connect_url) {
                window.location.href = data.connect_url;
            } else {
                showError(data.message || 'Could not generate Connect URL.');
            }
        } catch (err) {
            showError('Failed to contact server for Connect URL.');
        }
    });

    loadCompanyData();
    loadDirectoryData();

    async function loadCompanyData() {
        clearError();
        try {
            const res = await fetch('/api/company');
            const data = await res.json();
            if (data.error) return handleFinchError(data);

            btnConnect.className = 'btn btn-success fw-bold';
            btnConnect.textContent = 'Connected';

            companyFields.innerHTML = `
                ${keyValue('Legal Name', data.legal_name)}
                ${keyValue('Company ID', data.id)}
                ${keyValue('EIN', data.ein)}
                ${keyValue('Primary Email', data.primary_email)}
                ${keyValue('Primary Phone', data.primary_phone_number)}
                ${keyValue('Entity Type', data.entity ? `${data.entity.type} (${data.entity.subtype || 'N/A'})` : null)}
                ${keyValue('Primary Location', data.locations && data.locations[0] ? `${data.locations[0].line1}, ${data.locations[0].line2}, ${data.locations[0].city}, ${data.locations[0].state} ${data.locations[0].postal_code}` : null)}
                ${keyValue('Departments Count', data.departments ? data.departments.length : null)}
            `;
        } catch (err) {
            showError('Failed to load company data.');
        }
    }

    async function loadDirectoryData() {
        try {
            const res = await fetch('/api/directory');
            const data = await res.json();
            if (data.error) return handleFinchError(data);

            directoryList.innerHTML = (data.individuals || []).map(item => `
                <button class="list-group-item list-group-item-action btn-individual" data-id="${item.id}">
                    <div class="fw-bold">${item.first_name || ''} ${item.last_name || ''}</div>
                </button>
            `).join('');

            document.querySelectorAll('.btn-individual').forEach(btn => {
                btn.addEventListener('click', e => {
                    document.querySelectorAll('.btn-individual').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    loadIndividualData(e.currentTarget.dataset.id);
                });
            });
        } catch (err) {
            showError('Failed to load directory data.');
        }
    }

    async function loadIndividualData(indId) {
        clearError();
        try {
            // fetch individual and employment details
            const [indRes, empRes] = await Promise.all([
                fetch('/api/individual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ individual_id: indId }) }),
                fetch('/api/employment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ individual_id: indId }) })
            ]);

            const indData = await indRes.json();
            const empData = await empRes.json();

            if (indData.error || empData.error) return handleFinchError(indData.error ? indData : empData);

            const ind = indData.responses?.[0]?.body || {};
            const emp = empData.responses?.[0]?.body || {};

            individualFields.innerHTML = `
                ${keyValue('Full Name', `${ind.first_name || ''} ${ind.middle_name || ''} ${ind.last_name || ''}`.trim())}
                ${keyValue('Preferred Name', ind.preferred_name)}
                ${keyValue('Individual ID', ind.id)}
                ${keyValue('Date of Birth', ind.dob)}
                ${keyValue('Gender', ind.gender)}
                ${keyValue('Emails', ind.emails ? ind.emails.map(e => `${e.data} (${e.type})`).join(', ') : null)}
                ${keyValue('Phone Numbers', ind.phone_numbers ? ind.phone_numbers.map(p => `${p.data} (${p.type})`).join(', ') : null)}
                ${keyValue('Residence Address', ind.residence ? `${ind.residence.line1}, ${ind.residence.city}, ${ind.residence.state} ${ind.residence.postal_code}` : null)}
            `;

            employmentFields.innerHTML = `
                ${keyValue('Job Title', emp.title)}
                ${keyValue('Employment Status', emp.employment?.status)}
                ${keyValue('Employment Type', emp.employment?.type)}
                ${keyValue('Department', emp.department?.name)}
                ${keyValue('Manager ID', emp.manager?.id)}
                ${keyValue('Employment Location', emp.location ? `${emp.location.city}, ${emp.location.state}` : null)}
                ${keyValue('Income', emp.income ? `${(emp.income.amount / 100).toFixed(2)} ${emp.income.currency} (${emp.income.unit})` : null)}
                ${keyValue('Hire Date', emp.start_date)}
            `;
        } catch (err) {
            showError('Failed to load individual details.');
        }
    }


    function keyValue(label, value) {
        const val = (value === null || value === undefined || value === '')
            ? '<i>Not Provided (null)</i>'
            : value;
        return `
        <div class="col-6 mb-2">
            <div class="small fw-bold">${label}</div>
            <div>${val}</div>
        </div>
    `;
    }

    function handleFinchError(data) {
        if (data.isUnimplemented) {
            showError(data.message || 'This provider has not implemented this endpoint.');
        } else {
            showError(data.message || 'An API error occurred.');
        }
    }

    function showError(msg) {
        errorAlert.classList.remove('d-none');
        errorMessage.textContent = msg;
    }

    function clearError() {
        errorAlert.classList.add('d-none');
    }
});