// --- START PATCHED FILE ---
import { product_data } from './data.js';

let supplementaryInsuredCount = 0;
let currentMainProductState = { product: null, age: null };

const MAX_ENTRY_AGE = {
    PUL_TRON_DOI: 70, PUL_15_NAM: 70, PUL_5_NAM: 70, KHOE_BINH_AN: 70, VUNG_TUONG_LAI: 70,
    TRON_TAM_AN: 60, AN_BINH_UU_VIET: 65,
    health_scl: 65, bhn: 70, accident: 64, hospital_support: 55
};

const MAX_RENEWAL_AGE = {
    health_scl: 74, bhn: 85, accident: 64, hospital_support: 59
};

document.addEventListener('DOMContentLoaded', () => {
    initPerson(document.getElementById('main-person-container'), 'main');
    initMainProductLogic();
    initSupplementaryButton();
    initSummaryModal();
    attachGlobalListeners();
    calculateAll();
});

function attachGlobalListeners() {
    const allInputs = 'input, select';
    document.body.addEventListener('change', (e) => {
        if (e.target.matches('.health-scl-checkbox')) {
            const section = e.target.closest('.product-section');
            const options = section.querySelector('.product-options');
            if (e.target.checked) {
                options.classList.remove('hidden');
            } else {
                options.classList.add('hidden');
            }
            calculateAll();
        } else if (e.target.matches(allInputs)) {
            calculateAll();
        }
    });
    document.body.addEventListener('input', (e) => {
        if (e.target.matches('input[type="text"]') && !e.target.classList.contains('dob-input') && !e.target.classList.contains('occupation-input') && !e.target.classList.contains('name-input')) {
            formatNumberInput(e.target);
            calculateAll();
        } else if (e.target.matches('input[type="number"]')) {
            calculateAll();
        }
    });
}
function initPerson(container, personId, isSupp = false) {
    if (!container) return;
    container.dataset.personId = personId;
    initDateFormatter(container.querySelector('.dob-input'));
    initOccupationAutocomplete(container.querySelector('.occupation-input'), container);
    const suppProductsContainer = isSupp ? container.querySelector('.supplementary-products-container') : document.querySelector('#main-supp-container .supplementary-products-container');
    suppProductsContainer.innerHTML = generateSupplementaryProductsHtml(personId);
    const sclSection = suppProductsContainer.querySelector('.health-scl-section');
    if (sclSection) {
        const mainCheckbox = sclSection.querySelector('.health-scl-checkbox');
        const programSelect = sclSection.querySelector('.health-scl-program');
        const scopeSelect = sclSection.querySelector('.health-scl-scope');
        const outpatientCheckbox = sclSection.querySelector('.health-scl-outpatient');
        const dentalCheckbox = sclSection.querySelector('.health-scl-dental');
        const handleProgramChange = () => {
            const programChosen = programSelect.value !== '';
            outpatientCheckbox.disabled = !programChosen;
            dentalCheckbox.disabled = !programChosen;
            if (!programChosen) {
                outpatientCheckbox.checked = false;
                dentalCheckbox.checked = false;
            }
            calculateAll();
        };
        const handleMainCheckboxChange = () => {
            const isChecked = mainCheckbox.checked;
            programSelect.disabled = !isChecked;
            scopeSelect.disabled = !isChecked;
            const options = sclSection.querySelector('.product-options');
            options.classList.toggle('hidden', !isChecked);
            if (!isChecked) {
                programSelect.value = '';
                outpatientCheckbox.checked = false;
                dentalCheckbox.checked = false;
            }
            handleProgramChange();
            calculateAll();
        };
        programSelect.addEventListener('change', handleProgramChange);
        mainCheckbox.addEventListener('change', handleMainCheckboxChange);
    }
}
function initMainProductLogic() {
    document.getElementById('main-product').addEventListener('change', calculateAll);
}

function initSupplementaryButton() {
    document.getElementById('add-supp-insured-btn').addEventListener('click', () => {
        supplementaryInsuredCount++;
        const personId = `supp${supplementaryInsuredCount}`;
        const container = document.getElementById('supplementary-insured-container');
        const newPersonDiv = document.createElement('div');
        newPersonDiv.className = 'person-container space-y-6 bg-gray-100 p-4 rounded-lg mt-4';
        newPersonDiv.id = `person-container-${personId}`;
        newPersonDiv.innerHTML = generateSupplementaryPersonHtml(personId, supplementaryInsuredCount);
        container.appendChild(newPersonDiv);
        initPerson(newPersonDiv, personId, true);
        calculateAll();
    });
}
function initSummaryModal() {
    const modal = document.getElementById('summary-modal');
    document.getElementById('view-summary-btn').addEventListener('click', generateSummaryTable);
    document.getElementById('close-summary-modal-btn').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}
function initDateFormatter(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
        if (value.length > 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
        e.target.value = value.slice(0, 10);
    });
}
function initOccupationAutocomplete(input, container) {
    if (!input) return;
    const autocompleteContainer = container.querySelector('.occupation-autocomplete');
    const riskGroupSpan = container.querySelector('.risk-group-span');
    input.addEventListener('input', () => {
        const value = input.value.toLowerCase();
        autocompleteContainer.innerHTML = '';
        if (value.length < 2) {
            autocompleteContainer.classList.add('hidden');
            return;
        }
        const filtered = product_data.occupations
            .filter(o => o.group > 0 && o.name.toLowerCase().includes(value));
        if (filtered.length > 0) {
            filtered.forEach(occ => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = occ.name;
                item.addEventListener('click', () => {
                    input.value = occ.name;
                    input.dataset.group = occ.group;
                    riskGroupSpan.textContent = occ.group;
                    autocompleteContainer.classList.add('hidden');
                    calculateAll();
                });
                autocompleteContainer.appendChild(item);
            });
            autocompleteContainer.classList.remove('hidden');
        } else {
            autocompleteContainer.classList.add('hidden');
        }
    });
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            autocompleteContainer.classList.add('hidden');
        }
    });
}
function getCustomerInfo(container, isMain = false) {
    const dobInput = container.querySelector('.dob-input');
    const genderSelect = container.querySelector('.gender-select');
    const occupationInput = container.querySelector('.occupation-input');
    const ageSpan = container.querySelector('.age-span');
    const riskGroupSpan = container.querySelector('.risk-group-span');
    let age = 0;
    const dobStr = dobInput ? dobInput.value : '';
    if (dobStr && new RegExp('^\d{2}/\d{2}/\d{4}$').test(dobStr)) {
        const parts = dobStr.split('/');
        const birthDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        if (!isNaN(birthDate)) {
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }
    }
    if (ageSpan) ageSpan.textContent = age;
    const riskGroup = occupationInput ? parseInt(occupationInput.dataset.group, 10) || 0 : 0;
    if (riskGroupSpan) riskGroupSpan.textContent = riskGroup > 0 ? riskGroup : '...';
    const info = {
        age,
        gender: genderSelect ? genderSelect.value : 'Nam',
        riskGroup,
        container,
    };
    if (isMain) {
        info.mainProduct = document.getElementById('main-product').value;
    }
    return info;
}
function calculateAll() {
    try {
        clearError();
        const mainPersonContainer = document.getElementById('main-person-container');
        const mainPersonInfo = getCustomerInfo(mainPersonContainer, true);
        updateMainProductVisibility(mainPersonInfo);
        const mainPremium = calculateMainPremium(mainPersonInfo);
        updateSupplementaryProductVisibility(mainPersonInfo, mainPremium, document.querySelector('#main-supp-container .supplementary-products-container'));
        let totalSupplementaryPremium = 0;
        document.querySelectorAll('.person-container').forEach(container => {
            const isMain = container.id === 'main-person-container';
            const personInfo = getCustomerInfo(container, isMain);
            const suppProductsContainer = isMain ? document.querySelector('#main-supp-container .supplementary-products-container') : container.querySelector('.supplementary-products-container');
            if (!suppProductsContainer) return;
            updateSupplementaryProductVisibility(personInfo, mainPremium, suppProductsContainer);
            totalSupplementaryPremium += calculateHealthSclPremium(personInfo, suppProductsContainer);
            totalSupplementaryPremium += calculateBhnPremium(personInfo, suppProductsContainer);
            totalSupplementaryPremium += calculateAccidentPremium(personInfo, suppProductsContainer);
            totalSupplementaryPremium += calculateHospitalSupportPremium(personInfo, mainPremium, suppProductsContainer);
        });
        const totalPremium = mainPremium + totalSupplementaryPremium;
        updateSummaryUI({ mainPremium, totalSupplementaryPremium, totalPremium });
    } catch (error) {
        showError(error.message);
        updateSummaryUI({ mainPremium: 0, totalSupplementaryPremium: 0, totalPremium: 0 });
    }
}
// --- END PATCHED FILE ---
