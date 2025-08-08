import { product_data } from './data.js';

let supplementaryInsuredCount = 0;
let currentMainProductState = { product: null, age: null };

const MAX_ENTRY_AGE = {
    PUL_TRON_DOI: 70, PUL_15_NAM: 70, PUL_5_NAM: 70, KHOE_BINH_AN: 70, VUNG_TUONG_LAI: 70,
    TRON_TAM_AN: 60, AN_BINH_UU_VIET: 65,
    health_scl: 65, bhn: 70, accident: 64, hospital_support: 55
};

const MAX_RENEWAL_AGE = {
    health_scl: 74, bhn: 85, accident: 65, hospital_support: 59
};

const MAX_STBH = {
    bhn: 5_000_000_000,
    accident: 8_000_000_000
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
        const checkboxSelectors = [
            '.health-scl-checkbox',
            '.bhn-checkbox',
            '.accident-checkbox',
            '.hospital-support-checkbox',
            '.waiver-checkbox'
        ];
        if (checkboxSelectors.some(selector => e.target.matches(selector))) {
            const section = e.target.closest('.product-section');
            const options = section.querySelector('.product-options');
            if (e.target.checked && !e.target.disabled) {
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
            const isChecked = mainCheckbox.checked && !mainCheckbox.disabled;
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

    ['bhn', 'accident', 'hospital-support', 'waiver'].forEach(product => {
        const section = suppProductsContainer.querySelector(`.${product}-section`);
        if (section) {
            const checkbox = section.querySelector(`.${product}-checkbox`);
            const handleCheckboxChange = () => {
                const isChecked = checkbox.checked && !checkbox.disabled;
                const options = section.querySelector('.product-options');
                options.classList.toggle('hidden', !isChecked);
                calculateAll();
            };
            checkbox.addEventListener('change', handleCheckboxChange);
        }
    });
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

    // Xử lý input target-age-input
    const targetAgeInput = document.getElementById('target-age-input');
    const mainPersonContainer = document.getElementById('main-person-container');
    const mainPersonInfo = getCustomerInfo(mainPersonContainer, true);
    const mainProduct = mainPersonInfo.mainProduct;

    if (mainProduct === 'TRON_TAM_AN') {
        targetAgeInput.value = mainPersonInfo.age + 10 - 1;
        targetAgeInput.disabled = true;
    } else if (mainProduct === 'AN_BINH_UU_VIET') {
        const termSelect = document.getElementById('abuv-term');
        const term = parseInt(termSelect?.value || '15', 10); // Mặc định 15 năm
        targetAgeInput.value = mainPersonInfo.age + term - 1;
        targetAgeInput.disabled = true;
    } else {
        const paymentTermInput = document.getElementById('payment-term');
        const paymentTerm = paymentTermInput ? parseInt(paymentTermInput.value, 10) || 0 : 0;
        targetAgeInput.disabled = false;
        targetAgeInput.min = mainPersonInfo.age + paymentTerm - 1;
        if (!targetAgeInput.value || parseInt(targetAgeInput.value, 10) < mainPersonInfo.age + paymentTerm - 1) {
            targetAgeInput.value = mainPersonInfo.age + paymentTerm - 1;
        }
    }

    // Thêm sự kiện để cập nhật target-age-input và bảng minh họa
    const abuvTermSelect = document.getElementById('abuv-term');
    document.getElementById('main-product').addEventListener('change', () => {
        updateTargetAge();
        if (document.getElementById('summary-modal').classList.contains('hidden')) {
            calculateAll();
        } else {
            generateSummaryTable();
        }
    });
    document.getElementById('dob-main').addEventListener('input', () => {
        updateTargetAge();
        if (document.getElementById('summary-modal').classList.contains('hidden')) {
            calculateAll();
        } else {
            generateSummaryTable();
        }
    });
    if (abuvTermSelect) {
        abuvTermSelect.addEventListener('change', () => {
            updateTargetAge();
            if (document.getElementById('summary-modal').classList.contains('hidden')) {
                calculateAll();
            } else {
                generateSummaryTable();
            }
        });
    }
    document.getElementById('payment-term')?.addEventListener('change', () => {
        updateTargetAge();
        if (document.getElementById('summary-modal').classList.contains('hidden')) {
            calculateAll();
        } else {
            generateSummaryTable();
        }
    });
}

function updateTargetAge() {
    const mainPersonContainer = document.getElementById('main-person-container');
    const mainPersonInfo = getCustomerInfo(mainPersonContainer, true);
    const mainProduct = mainPersonInfo.mainProduct;
    const targetAgeInput = document.getElementById('target-age-input');

    if (mainProduct === 'TRON_TAM_AN') {
        targetAgeInput.value = mainPersonInfo.age + 10 - 1;
        targetAgeInput.disabled = true;
    } else if (mainProduct === 'AN_BINH_UU_VIET') {
        const termSelect = document.getElementById('abuv-term');
        const term = termSelect ? parseInt(termSelect.value || '15', 10) : 15;
        targetAgeInput.value = mainPersonInfo.age + term - 1;
        targetAgeInput.disabled = true;
    } else if (mainProduct === 'PUL_TRON_DOI') {
        targetAgeInput.value = mainPersonInfo.age + 10 - 1; // Mặc định 10 năm
        targetAgeInput.disabled = true;
    } else {
        const paymentTermInput = document.getElementById('payment-term');
        const paymentTerm = paymentTermInput ? parseInt(paymentTermInput.value, 10) || 0 : 0;
        targetAgeInput.disabled = false;
        targetAgeInput.min = mainPersonInfo.age + paymentTerm - 1;
        if (!targetAgeInput.value || parseInt(targetAgeInput.value, 10) < mainPersonInfo.age + paymentTerm - 1) {
            targetAgeInput.value = mainPersonInfo.age + paymentTerm - 1;
        }
    }
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
    const nameInput = container.querySelector('.name-input');
    
    let age = 0;
    const dobStr = dobInput ? dobInput.value : '';
    if (dobStr && new RegExp('^\\d{2}/\\d{2}/\\d{4}$').test(dobStr)) {
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
        name: nameInput ? nameInput.value : 'NĐBH Chính'
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
        const extraPremium = calculateExtraPremium(mainPersonInfo, mainPremium);
        
        updateSupplementaryProductVisibility(mainPersonInfo, mainPremium, document.querySelector('#main-supp-container .supplementary-products-container'));

        let totalSupplementaryPremium = 0;
        let totalHospitalSupportStbh = 0;

        document.querySelectorAll('.person-container').forEach(container => {
            const isMain = container.id === 'main-person-container';
            const personInfo = getCustomerInfo(container, isMain);
            const suppProductsContainer = isMain ? document.querySelector('#main-supp-container .supplementary-products-container') : container.querySelector('.supplementary-products-container');
            
            if (!suppProductsContainer) return;

            updateSupplementaryProductVisibility(personInfo, mainPremium, suppProductsContainer);

            totalSupplementaryPremium += calculateHealthSclPremium(personInfo, suppProductsContainer);
            totalSupplementaryPremium += calculateBhnPremium(personInfo, suppProductsContainer);
            totalSupplementaryPremium += calculateAccidentPremium(personInfo, suppProductsContainer);
            totalSupplementaryPremium += calculateHospitalSupportPremium(personInfo, mainPremium, suppProductsContainer, totalHospitalSupportStbh);
            totalSupplementaryPremium += calculateWaiverPremium(personInfo, suppProductsContainer, totalSupplementaryPremium);
            const hospitalSupportStbh = parseFormattedNumber(suppProductsContainer.querySelector('.hospital-support-stbh')?.value || '0');
            if (suppProductsContainer.querySelector('.hospital-support-checkbox')?.checked && hospitalSupportStbh > 0) {
                totalHospitalSupportStbh += hospitalSupportStbh;
            }
        });

        const totalPremium = mainPremium + extraPremium + totalSupplementaryPremium;
        updateSummaryUI({ mainPremium, extraPremium, totalSupplementaryPremium, totalPremium });

    } catch (error) {
        showError(error.message);
        updateSummaryUI({ mainPremium: 0, extraPremium: 0, totalSupplementaryPremium: 0, totalPremium: 0 });
    }
}

function updateMainProductVisibility(customer) {
    const { age, gender, riskGroup } = customer;
    const mainProductSelect = document.getElementById('main-product');
    
    document.querySelectorAll('#main-product option').forEach(option => {
        let isEligible = true;
        const productKey = option.value;
        if (!productKey) return;
        
        const maxEntryAge = MAX_ENTRY_AGE[productKey];
        isEligible = age >= 0 && age <= maxEntryAge;

        if (productKey === "TRON_TAM_AN" || productKey === "AN_BINH_UU_VIET") {
            isEligible = isEligible && ((gender === 'Nam' && age >= 12) || (gender === 'Nữ' && age >= 28));
        }
        if (productKey === "TRON_TAM_AN" && riskGroup === 4) {
            isEligible = false;
        }
        
        option.disabled = !isEligible;
        option.classList.toggle('hidden', !isEligible);
    });

    if (mainProductSelect.options[mainProductSelect.selectedIndex]?.disabled) {
        mainProductSelect.value = "";
    }
    
    const newProduct = mainProductSelect.value;
    
    if (newProduct === 'TRON_TAM_AN') {
        document.getElementById('supplementary-insured-container').classList.add('hidden');
        document.getElementById('add-supp-insured-btn').classList.add('hidden');
        supplementaryInsuredCount = 0;
        document.getElementById('supplementary-insured-container').innerHTML = '';
    } else {
        document.getElementById('supplementary-insured-container').classList.remove('hidden');
        document.getElementById('add-supp-insured-btn').classList.remove('hidden');
    }

    if (currentMainProductState.product !== newProduct || currentMainProductState.age !== age) {
        renderMainProductOptions(customer);
        currentMainProductState.product = newProduct;
        currentMainProductState.age = age;
    }
}

function updateSupplementaryProductVisibility(customer, mainPremium, container) {
    const { age, riskGroup } = customer;
    const mainProduct = document.getElementById('main-product').value;

    const showOrHide = (sectionId, productKey, condition) => {
        const section = container.querySelector(`.${sectionId}-section`);
        if (!section) return;
        const checkbox = section.querySelector('input[type="checkbox"]');
        const options = section.querySelector('.product-options');
        const finalCondition = condition && age >= 0 && age <= MAX_ENTRY_AGE[productKey] && (sectionId !== 'health-scl' || riskGroup !== 4);

        if (finalCondition) {
            section.classList.remove('hidden');
            checkbox.disabled = false;
            options.classList.toggle('hidden', !checkbox.checked || checkbox.disabled);
            if (sectionId === 'health-scl' && mainProduct === 'TRON_TAM_AN') {
                checkbox.checked = true;
                checkbox.disabled = true;
                options.classList.remove('hidden');
                const programSelect = section.querySelector('.health-scl-program');
                const scopeSelect = section.querySelector('.health-scl-scope');
                if (programSelect) programSelect.disabled = false;
                if (scopeSelect) scopeSelect.disabled = false;
            }
        } else {
            section.classList.add('hidden');
            checkbox.checked = false;
            checkbox.disabled = true;
            options.classList.add('hidden');
        }

        if (sectionId === 'health-scl' && finalCondition && checkbox.checked) {
            const programSelect = section.querySelector('.health-scl-program');
            if (!programSelect) return;
            programSelect.disabled = false;
            programSelect.querySelectorAll('option').forEach(opt => {
                if (opt.value === '') return;
                if (mainProduct === 'TRON_TAM_AN') {
                    opt.disabled = false;
                } else if (mainPremium >= 15000000) {
                    opt.disabled = false;
                } else if (mainPremium >= 10000000) {
                    opt.disabled = !['co_ban', 'nang_cao', 'toan_dien'].includes(opt.value);
                } else if (mainPremium >= 5000000) {
                    opt.disabled = !['co_ban', 'nang_cao'].includes(opt.value);
                } else {
                    opt.disabled = true;
                }
            });
            if (programSelect.options[programSelect.selectedIndex]?.disabled) {
                programSelect.value = (mainProduct === 'TRON_TAM_AN' || mainPremium >= 5000000) ? 'nang_cao' : '';
            }
        }
    };

    const baseCondition = ['PUL_TRON_DOI', 'PUL_15_NAM', 'PUL_5_NAM', 'KHOE_BINH_AN', 'VUNG_TUONG_LAI', 'AN_BINH_UU_VIET', 'TRON_TAM_AN'].includes(mainProduct);

    showOrHide('health-scl', 'health_scl', baseCondition);
    showOrHide('bhn', 'bhn', baseCondition);
    showOrHide('accident', 'accident', baseCondition);
    showOrHide('hospital-support', 'hospital_support', baseCondition);
    showOrHide('waiver', 'waiver', baseCondition);

    if (mainProduct === 'TRON_TAM_AN') {
        ['bhn', 'accident', 'hospital-support'].forEach(id => {
            const section = container.querySelector(`.${id}-section`);
            if (section) {
                section.classList.add('hidden');
                section.querySelector('input[type="checkbox"]').checked = false;
                section.querySelector('.product-options').classList.add('hidden');
            }
        });
    }
}

function renderMainProductOptions(customer) {
    const container = document.getElementById('main-product-options');
    const { mainProduct, age } = customer;
    
    let currentStbh = container.querySelector('#main-stbh')?.value || '';
    let currentPremium = container.querySelector('#main-premium-input')?.value || '';
    let currentPaymentTerm = container.querySelector('#payment-term')?.value || '';
    let currentExtraPremium = container.querySelector('#extra-premium-input')?.value || '';
    
    container.innerHTML = '';
    if (!mainProduct) return;

    let optionsHtml = '';
    
    if (mainProduct === 'TRON_TAM_AN') {
        optionsHtml = `<div><label for="main-stbh" class="font-medium text-gray-700 block mb-1">Số tiền bảo hiểm (STBH)</label><input type="text" id="main-stbh" class="form-input bg-gray-100" value="100.000.000" disabled></div><div><p class="text-sm text-gray-600 mt-1">Thời hạn đóng phí: 10 năm. Thời gian bảo vệ: 10 năm.</p><p class="text-sm text-gray-600 mt-1 font-semibold">Bắt buộc tham gia kèm Sức Khỏe Bùng Gia Lực.</p></div>`;
    } else if (mainProduct === 'AN_BINH_UU_VIET') {
        optionsHtml = `<div><label for="main-stbh" class="font-medium text-gray-700 block mb-1">Số tiền bảo hiểm (STBH)</label><input type="text" id="main-stbh" class="form-input" value="${currentStbh}" placeholder="VD: 1.000.000.000"></div>`;
        let termOptions = '';
        if (age <= 55) termOptions += '<option value="15">15 năm</option>';
        if (age <= 60) termOptions += '<option value="10">10 năm</option>';
        if (age <= 65) termOptions += '<option value="5">5 năm</option>';
        if (!termOptions) termOptions = '<option value="" disabled>Không có kỳ hạn phù hợp (tuổi vượt quá 65)</option>';
        optionsHtml += `<div><label for="abuv-term" class="font-medium text-gray-700 block mb-1">Thời hạn đóng phí</label><select id="abuv-term" class="form-select">${termOptions}</select><p class="text-sm text-gray-500 mt-1">Thời gian bảo vệ bằng thời hạn đóng phí.</p></div>`;
    } else if (['KHOE_BINH_AN', 'VUNG_TUONG_LAI', 'PUL_TRON_DOI', 'PUL_15_NAM', 'PUL_5_NAM'].includes(mainProduct)) {
        optionsHtml = `<div><label for="main-stbh" class="font-medium text-gray-700 block mb-1">Số tiền bảo hiểm (STBH)</label><input type="text" id="main-stbh" class="form-input" value="${currentStbh}" placeholder="VD: 1.000.000.000"></div>`;
        if (['KHOE_BINH_AN', 'VUNG_TUONG_LAI'].includes(mainProduct)) {
            optionsHtml += `<div><label for="main-premium-input" class="font-medium text-gray-700 block mb-1">Phí sản phẩm chính</label><input type="text" id="main-premium-input" class="form-input" value="${currentPremium}" placeholder="Nhập phí"><div id="mul-fee-range" class="text-sm text-gray-500 mt-1"></div></div>`;
        }
        optionsHtml += `<div><label for="payment-term" class="font-medium text-gray-700 block mb-1">Thời gian đóng phí (năm)</label><input type="number" id="payment-term" class="form-input" value="${currentPaymentTerm}" placeholder="VD: 20" min="${mainProduct === 'PUL_5_NAM' ? 5 : mainProduct === 'PUL_15_NAM' ? 15 : mainProduct === 'PUL_TRON_DOI' ? 10 : 1}"></div>`;
        if (mainProduct !== 'TRON_TAM_AN' && mainProduct !== 'AN_BINH_UU_VIET') {
            optionsHtml += `<div><label for="extra-premium-input" class="font-medium text-gray-700 block mb-1">Phí đóng thêm</label><input type="text" id="extra-premium-input" class="form-input" value="${currentExtraPremium}" placeholder="VD: 5.000.000"><span id="extra-premium-error" class="text-red-600 text-sm"></span></div>`;
        }
    }
    
    container.innerHTML = optionsHtml;
}

function calculateMainPremium(customer, ageOverride = null) {
    const ageToUse = ageOverride ?? customer.age;
    const { gender, mainProduct } = customer;
    let premium = 0;

    if (mainProduct.startsWith('PUL') || mainProduct === 'AN_BINH_UU_VIET' || mainProduct === 'TRON_TAM_AN') {
        let stbh = 0;
        let rate = 0;
        const stbhEl = document.getElementById('main-stbh');
        if (stbhEl) stbh = parseFormattedNumber(stbhEl.value);

        if (stbh === 0 && mainProduct !== 'TRON_TAM_AN') {
            if (!ageOverride) {
                document.getElementById('main-product-fee-display').textContent = '';
                document.querySelector('#main-stbh + .error-message')?.textContent = 'Vui lòng nhập số tiền bảo hiểm hợp lệ.';
            }
            return 0;
        }

        const genderKey = gender === 'Nữ' ? 'nu' : 'nam';

        if (mainProduct.startsWith('PUL')) {
            const paymentTermInput = document.getElementById('payment-term');
            const paymentTerm = paymentTermInput ? parseInt(paymentTermInput.value, 10) || 0 : 0;
            if (mainProduct === 'PUL_5_NAM' && paymentTerm < 5) throw new Error('Thời hạn đóng phí cho PUL 5 Năm phải lớn hơn hoặc bằng 5 năm.');
            if (mainProduct === 'PUL_15_NAM' && paymentTerm < 15) throw new Error('Thời hạn đóng phí cho PUL 15 Năm phải lớn hơn hoặc bằng 15 năm.');
            if (mainProduct === 'PUL_TRON_DOI' && paymentTerm < 10) throw new Error('Thời hạn đóng phí cho PUL Trọn Đời phải lớn hơn hoặc bằng 10 năm.');
            
            const pulRate = product_data.pul_rates[mainProduct]?.find(r => r.age === customer.age)?.[genderKey] || 0;
            if (pulRate === 0 && !ageOverride) throw new Error(`Không có biểu phí PUL cho tuổi ${customer.age}.`);
            rate = pulRate;
        } else if (mainProduct === 'AN_BINH_UU_VIET') {
            const term = document.getElementById('abuv-term')?.value;
            if (!term) return 0;
            const abuvRate = product_data.an_binh_uu_viet_rates[term]?.find(r => r.age === customer.age)?.[genderKey] || 0;
            if (abuvRate === 0 && !ageOverride) throw new Error(`Không có biểu phí An Bình Ưu Việt cho tuổi ${customer.age}, kỳ hạn ${term} năm.`);
            rate = abuvRate;
        } else if (mainProduct === 'TRON_TAM_AN') {
            stbh = 100000000;
            const term = '10';
            const ttaRate = product_data.an_binh_uu_viet_rates[term]?.find(r => r.age === customer.age)?.[genderKey] || 0;
            if (ttaRate === 0 && !ageOverride) throw new Error(`Không có biểu phí Trọn Tâm An cho tuổi ${customer.age}.`);
            rate = ttaRate;
        }
        premium = (stbh / 1000) * rate;
    } else if (['KHOE_BINH_AN', 'VUNG_TUONG_LAI'].includes(mainProduct)) {
        const paymentTermInput = document.getElementById('payment-term');
        const paymentTerm = paymentTermInput ? parseInt(paymentTermInput.value, 10) || 0 : 0;
        if (mainProduct === 'PUL_5_NAM' && paymentTerm < 5) throw new Error('Thời hạn đóng phí cho PUL 5 Năm phải lớn hơn hoặc bằng 5 năm.');
        if (mainProduct === 'PUL_15_NAM' && paymentTerm < 15) throw new Error('Thời hạn đóng phí cho PUL 15 Năm phải lớn hơn hoặc bằng 15 năm.');
        if (mainProduct === 'PUL_TRON_DOI' && paymentTerm < 10) throw new Error('Thời hạn đóng phí cho PUL Trọn Đời phải lớn hơn hoặc bằng 10 năm.');
        
        if (ageOverride) {
            premium = parseFormattedNumber(document.getElementById('main-premium-input')?.value || '0');
        } else {
            const stbh = parseFormattedNumber(document.getElementById('main-stbh')?.value || '0');
            const factorRow = product_data.mul_factors.find(f => ageToUse >= f.ageMin && ageToUse <= f.ageMax);
            if (!factorRow) throw new Error(`Không có hệ số MUL cho tuổi ${ageToUse}.`);
            
            const minFee = stbh / factorRow.maxFactor;
            const maxFee = stbh / factorRow.minFactor;
            document.getElementById('mul-fee-range').textContent = `Phí hợp lệ từ ${formatCurrency(minFee, '')} đến ${formatCurrency(maxFee, '')}.`;
            
            const enteredPremium = parseFormattedNumber(document.getElementById('main-premium-input')?.value || '0');
            if (stbh > 0 && enteredPremium > 0 && (enteredPremium < minFee || enteredPremium > maxFee)) {
                document.querySelector('#main-premium-input + .error-message')?.textContent = 'Phí SP chính nhập vào không hợp lệ.';
                throw new Error('Phí SP chính nhập vào không hợp lệ.');
            }
            if (stbh > 0 && enteredPremium > 0 && enteredPremium < 5000000) {
                document.querySelector('#main-premium-input + .error-message')?.textContent = 'Phí SP chính tối thiểu là 5,000,000 VNĐ.';
                throw new Error('Phí SP chính tối thiểu là 5,000,000 VNĐ.');
            }
            premium = enteredPremium;
        }
    }
    
    if (!ageOverride) {
        if (premium > 0 && premium < 5000000 && mainProduct !== 'AN_BINH_UU_VIET' && mainProduct !== 'TRON_TAM_AN') {
            document.querySelector('#main-product-fee-display + .error-message')?.textContent = 'Phí SP chính tối thiểu là 5,000,000 VNĐ.';
            throw new Error('Phí SP chính tối thiểu là 5,000,000 VNĐ.');
        }
        document.getElementById('main-product-fee-display').textContent = premium > 0 ? `Phí năm đầu: ${formatCurrency(premium)}` : '';
    }
    return premium;
}

function calculateExtraPremium(customer, mainPremium) {
    if (customer.mainProduct === 'TRON_TAM_AN' || customer.mainProduct === 'AN_BINH_UU_VIET') return 0;
    const extraPremiumInput = document.getElementById('extra-premium-input');
    if (!extraPremiumInput) return 0;
    const extraPremium = parseFormattedNumber(extraPremiumInput.value) || 0;
    const maxExtraPremium = mainPremium * 5;
    if (extraPremium > maxExtraPremium) {
        document.querySelector('#extra-premium-input + .error-message')?.textContent = `Phí đóng thêm vượt quá giới hạn (tối đa ${formatCurrency(maxExtraPremium)}).`;
        throw new Error(`Phí đóng thêm vượt quá giới hạn (tối đa ${formatCurrency(maxExtraPremium)}).`);
    }
    return extraPremium;
}

function calculateHealthSclPremium(customer, container, ageOverride = null) {
    const section = container.querySelector('.health-scl-section');
    if (!section || !section.querySelector('.health-scl-checkbox')?.checked) {
        if (section && !ageOverride) section.querySelector('.fee-display').textContent = '';
        return 0;
    }
    const ageToUse = ageOverride ?? customer.age;
    if (ageToUse > MAX_RENEWAL_AGE.health_scl) return 0;
    
    const program = section.querySelector('.health-scl-program').value;
    const scope = section.querySelector('.health-scl-scope').value;
    const hasOutpatient = section.querySelector('.health-scl-outpatient').checked;
    const hasDental = section.querySelector('.health-scl-dental').checked;
    
    const ageBandIndex = product_data.health_scl_rates.age_bands.findIndex(b => ageToUse >= b.min && ageToUse <= b.max);
    if (ageBandIndex === -1) return 0;

    let totalPremium = 0;
    totalPremium += product_data.health_scl_rates[scope]?.[ageBandIndex]?.[program] || 0;
    if (hasOutpatient) totalPremium += product_data.health_scl_rates.outpatient?.[ageBandIndex]?.[program] || 0;
    if (hasDental) totalPremium += product_data.health_scl_rates.dental?.[ageBandIndex]?.[program] || 0;

    if (!ageOverride) section.querySelector('.fee-display').textContent = totalPremium > 0 ? `Phí: ${formatCurrency(totalPremium)}` : '';
    return totalPremium;
}

function calculateBhnPremium(customer, container, ageOverride = null) {
    const section = container.querySelector('.bhn-section');
    if (!section || !section.querySelector('.bhn-checkbox')?.checked) {
        if (section && !ageOverride) section.querySelector('.fee-display').textContent = '';
        return 0;
    }
    const ageToUse = ageOverride ?? customer.age;
    if (ageToUse > MAX_RENEWAL_AGE.bhn) return 0;

    const { gender } = customer;
    const stbh = parseFormattedNumber(section.querySelector('.bhn-stbh')?.value || '0');
    if (stbh === 0) {
        if (!ageOverride) section.querySelector('.fee-display').textContent = '';
        return 0;
    }
    if (stbh > MAX_STBH.bhn) {
        document.querySelector('.bhn-stbh + .error-message')?.textContent = `Số tiền bảo hiểm Bệnh Hiểm Nghèo 2.0 không được vượt quá ${formatCurrency(MAX_STBH.bhn, '')}.`;
        throw new Error(`Số tiền bảo hiểm Bệnh Hiểm Nghèo 2.0 không được vượt quá ${formatCurrency(MAX_STBH.bhn, '')}.`);
    }

    const rate = product_data.bhn_rates.find(r => ageToUse >= r.ageMin && ageToUse <= r.ageMax)?.[gender === 'Nữ' ? 'nu' : 'nam'] || 0;
    const premium = (stbh / 1000) * rate;
    if (!ageOverride) section.querySelector('.fee-display').textContent = `Phí: ${formatCurrency(premium)}`;
    return premium;
}

function calculateAccidentPremium(customer, container, ageOverride = null) {
    const section = container.querySelector('.accident-section');
    if (!section || !section.querySelector('.accident-checkbox')?.checked) {
        if (section && !ageOverride) section.querySelector('.fee-display').textContent = '';
        return 0;
    }
    const ageToUse = ageOverride ?? customer.age;
    if (ageToUse > MAX_RENEWAL_AGE.accident) return 0;
    
    const { riskGroup } = customer;
    if (riskGroup === 0) return 0;
    const stbh = parseFormattedNumber(section.querySelector('.accident-stbh')?.value || '0');
    if (stbh === 0) {
        if (!ageOverride) section.querySelector('.fee-display').textContent = '';
        return 0;
    }
    if (stbh > MAX_STBH.accident) {
        document.querySelector('.accident-stbh + .error-message')?.textContent = `Số tiền bảo hiểm Tai nạn không được vượt quá ${formatCurrency(MAX_STBH.accident, '')}.`;
        throw new Error(`Số tiền bảo hiểm Tai nạn không được vượt quá ${formatCurrency(MAX_STBH.accident, '')}.`);
    }

    const rate = product_data.accident_rates[riskGroup] || 0;
    const premium = (stbh / 1000) * rate;
    if (!ageOverride) section.querySelector('.fee-display').textContent = `Phí: ${formatCurrency(premium)}`;
    return premium;
}

function calculateHospitalSupportPremium(customer, mainPremium, container, totalHospitalSupportStbh = 0, ageOverride = null) {
    const section = container.querySelector('.hospital-support-section');
    if (!section || !section.querySelector('.hospital-support-checkbox')?.checked) {
        if (section && !ageOverride) section.querySelector('.fee-display').textContent = '';
        return 0;
    }
    const ageToUse = ageOverride ?? customer.age;
    if (ageToUse > MAX_RENEWAL_AGE.hospital_support) return 0;
    
    const totalMaxSupport = Math.floor(mainPremium / 4000000) * 100000;
    const maxSupportByAge = ageToUse >= 18 ? 1_000_000 : 300_000;
    const remainingSupport = totalMaxSupport - totalHospitalSupportStbh;
    
    if (!ageOverride) {
        section.querySelector('.hospital-support-validation').textContent = 
            `Tối đa: ${formatCurrency(Math.min(maxSupportByAge, remainingSupport), 'đ/ngày')}. Phải là bội số của 100.000.`;
    }

    const stbh = parseFormattedNumber(section.querySelector('.hospital-support-stbh')?.value || '0');
    if (stbh === 0) {
        if (!ageOverride) section.querySelector('.fee-display').textContent = '';
        return 0;
    }
    if (stbh > maxSupportByAge) {
        document.querySelector('.hospital-support-stbh + .error-message')?.textContent = `Số tiền Hỗ trợ viện phí vượt quá giới hạn theo tuổi: ${formatCurrency(maxSupportByAge, 'đ/ngày')}.`;
        throw new Error(`Số tiền Hỗ trợ viện phí vượt quá giới hạn theo tuổi: ${formatCurrency(maxSupportByAge, 'đ/ngày')}.`);
    }
    if (stbh > remainingSupport || stbh % 100000 !== 0) {
        document.querySelector('.hospital-support-stbh + .error-message')?.textContent = `Số tiền Hỗ trợ viện phí không hợp lệ. Tối đa còn lại: ${formatCurrency(remainingSupport, 'đ/ngày')}. Phải là bội số của 100.000.`;
        throw new Error(`Số tiền Hỗ trợ viện phí không hợp lệ. Tối đa còn lại: ${formatCurrency(remainingSupport, 'đ/ngày')}. Phải là bội số của 100.000.`);
    }
    
    const rate = product_data.hospital_fee_support_rates.find(r => ageToUse >= r.ageMin && ageToUse <= r.ageMax)?.rate || 0;
    const premium = (stbh / 100) * rate;
    if (!ageOverride) section.querySelector('.fee-display').textContent = `Phí: ${formatCurrency(premium)}`;
    return premium;
}

function calculateWaiverPremium(customer, container, totalSupplementaryPremium) {
    const section = container.querySelector('.waiver-section');
    if (!section || !section.querySelector('.waiver-checkbox')?.checked) {
        if (section) section.querySelector('.fee-display').textContent = '';
        return 0;
    }
    const ageToUse = customer.age;
    if (ageToUse < 18 || ageToUse > 60) {
        section.querySelector('.waiver-age + .error-message')?.textContent = 'Tuổi phải từ 18 đến 60.';
        throw new Error('Tuổi phải từ 18 đến 60.');
    }

    const waiverSelect = section.querySelector('.waiver-insured-select');
    const waiverOtherPerson = section.querySelector('.waiver-other-person');
    const waiverAgeInput = section.querySelector('.waiver-age');
    const waiverPremiumInput = section.querySelector('.waiver-premium');

    let waiverPremium = 0;
    if (waiverOtherPerson.checked) {
        const age = parseInt(waiverAgeInput.value) || 0;
        if (age < 18 || age > 60) {
            waiverAgeInput.nextElementSibling.textContent = 'Tuổi phải từ 18 đến 60.';
            throw new Error('Tuổi phải từ 18 đến 60.');
        }
        waiverPremium = parseFormattedNumber(waiverPremiumInput.value) || 0;
    } else if (waiverSelect.value) {
        const selectedPerson = document.querySelector(`#person-container-${waiverSelect.value}`).querySelector('.dob-input').value;
        const parts = selectedPerson.split('/');
        const birthDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        waiverPremium = totalSupplementaryPremium; // Phí miễn đóng cộng vào phí bổ sung của người được chọn
    }

    // Placeholder cho bảng phí (chờ bạn cung cấp)
    const rate = product_data.waiver_rates.find(r => ageToUse >= r.ageMin && ageToUse <= r.ageMax)?.rate || 0.01; // Giá trị tạm
    const totalWaiverPremium = waiverPremium * rate;
    if (totalWaiverPremium > 0) section.querySelector('.fee-display').textContent = `Phí: ${formatCurrency(totalWaiverPremium)} (Đóng đến 65 tuổi)`;
    return totalWaiverPremium;
}

function updateSummaryUI(premiums) {
    document.getElementById('main-premium-result').textContent = formatCurrency(premiums.mainPremium);
    document.getElementById('extra-premium-result').textContent = formatCurrency(premiums.extraPremium);
    
    const suppContainer = document.getElementById('supplementary-premiums-results');
    suppContainer.innerHTML = '';
    if (premiums.totalSupplementaryPremium > 0) {
        suppContainer.innerHTML = `<div class="flex justify-between items-center py-2 border-b"><span class="text-gray-600">Tổng phí SP bổ sung:</span><span class="font-bold text-gray-900">${formatCurrency(premiums.totalSupplementaryPremium)}</span></div>`;
    }

    const totalPremium = premiums.mainPremium + premiums.extraPremium + premiums.totalSupplementaryPremium;
    document.getElementById('total-premium-result').textContent = formatCurrency(totalPremium);

    // Thêm lựa chọn kỳ đóng phí
    const paymentPeriodSelect = document.createElement('select');
    paymentPeriodSelect.id = 'payment-period';
    paymentPeriodSelect.className = 'form-select mt-2';
    paymentPeriodSelect.innerHTML = `
        <option value="yearly">Hàng năm</option>
        <option value="half-yearly">Nửa năm</option>
        <option value="quarterly">Hàng quý</option>
    `;
    paymentPeriodSelect.value = 'yearly';
    paymentPeriodSelect.addEventListener('change', calculateAll);

    const paymentInfo = document.createElement('div');
    paymentInfo.id = 'payment-info';
    paymentInfo.className = 'mt-2 text-sm text-gray-700';
    paymentInfo.innerHTML = `Tổng phí năm: ${formatCurrency(totalPremium)}`;

    document.getElementById('summary-container').appendChild(paymentPeriodSelect);
    document.getElementById('summary-container').appendChild(paymentInfo);

    const period = paymentPeriodSelect.value;
    let adjustedTotal = totalPremium;
    let halfYearlyTotal = 0, quarterlyTotal = 0;
    if (period === 'half-yearly') {
        adjustedTotal = Math.round((totalPremium / 1000 * 1.02) / 2) * 1000;
        halfYearlyTotal = adjustedTotal * 2;
        paymentInfo.innerHTML = `Tổng phí nửa năm: ${formatCurrency(adjustedTotal)}<br>Tổng phí năm: ${formatCurrency(halfYearlyTotal)}<br>Chênh lệch: ${formatCurrency(halfYearlyTotal - totalPremium)}`;
    } else if (period === 'quarterly') {
        adjustedTotal = Math.round((totalPremium / 1000 * 1.04) / 4) * 1000;
        quarterlyTotal = adjustedTotal * 4;
        paymentInfo.innerHTML = `Tổng phí quý: ${formatCurrency(adjustedTotal)}<br>Tổng phí năm: ${formatCurrency(quarterlyTotal)}<br>Chênh lệch: ${formatCurrency(quarterlyTotal - totalPremium)}`;
    }
}

function generateSummaryTable() {
    const modal = document.getElementById('summary-modal');
    const container = document.getElementById('summary-content-container');
    container.innerHTML = '';

    try {
        const targetAgeInput = document.getElementById('target-age-input');
        const targetAge = parseInt(targetAgeInput.value, 10);
        const mainPersonContainer = document.getElementById('main-person-container');
        const mainPersonInfo = getCustomerInfo(mainPersonContainer, true);
        const mainProduct = mainPersonInfo.mainProduct;

        if (isNaN(targetAge) || targetAge <= mainPersonInfo.age) {
            throw new Error("Vui lòng nhập một độ tuổi mục tiêu hợp lệ, lớn hơn tuổi hiện tại của NĐBH chính.");
        }

        if (mainProduct === 'TRON_TAM_AN') {
            const mainSuppContainer = document.querySelector('#main-supp-container .supplementary-products-container');
            const healthSclSection = mainSuppContainer?.querySelector('.health-scl-section');
            const healthSclCheckbox = healthSclSection?.querySelector('.health-scl-checkbox');
            const healthSclPremium = calculateHealthSclPremium(mainPersonInfo, mainSuppContainer);
            if (!healthSclCheckbox?.checked || healthSclPremium === 0) {
                throw new Error('Sản phẩm Trọn Tâm An bắt buộc phải tham gia kèm Sức Khỏe Bùng Gia Lực với phí hợp lệ.');
            }
        }

        let paymentTerm = 999;
        const paymentTermInput = document.getElementById('payment-term');
        if (paymentTermInput) {
            paymentTerm = parseInt(paymentTermInput.value, 10) || 999;
        } else if (mainPersonInfo.mainProduct === 'AN_BINH_UU_VIET') {
            paymentTerm = parseInt(document.getElementById('abuv-term')?.value, 10);
        } else if (mainPersonInfo.mainProduct === 'TRON_TAM_AN') {
            paymentTerm = 10;
        } else if (mainPersonInfo.mainProduct === 'PUL_TRON_DOI') {
            paymentTerm = 10; // Mặc định 10 năm
        }

        if (['PUL_TRON_DOI', 'PUL_5_NAM', 'PUL_15_NAM', 'KHOE_BINH_AN', 'VUNG_TUONG_LAI'].includes(mainPersonInfo.mainProduct) && targetAge < mainPersonInfo.age + paymentTerm - 1) {
            throw new Error(`Độ tuổi mục tiêu phải lớn hơn hoặc bằng ${mainPersonInfo.age + paymentTerm - 1} đối với ${mainPersonInfo.mainProduct}.`);
        }

        const suppPersons = [];
        document.querySelectorAll('.person-container').forEach(pContainer => {
            if (pContainer.id !=='main-person-container') {
                const personInfo = getCustomerInfo(pContainer, false);
                suppPersons.push(personInfo);
            }
        });

        // Tóm tắt sản phẩm
        let summaryHtml = `<div class="mb-4"><strong>Tóm tắt sản phẩm:</strong><br>NĐBH Chính (${sanitizeHtml(mainPersonInfo.name)}): ${mainProduct}<br>`;
        const mainSuppContainer = document.querySelector('#main-supp-container .supplementary-products-container');
        const mainSuppProducts = [];
        ['health-scl', 'bhn', 'accident', 'hospital-support', 'waiver'].forEach(product => {
            const section = mainSuppContainer?.querySelector(`.${product}-section`);
            if (section && section.querySelector(`.${product}-checkbox`)?.checked) {
                mainSuppProducts.push(product.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
            }
        });
        if (mainSuppProducts.length) summaryHtml += `Sản phẩm bổ sung (Chính): ${mainSuppProducts.join(', ')}<br>`;
        suppPersons.forEach((person, index) => {
            const suppContainer = person.container.querySelector('.supplementary-products-container');
            const suppProducts = [];
            ['health-scl', 'bhn', 'accident', 'hospital-support', 'waiver'].forEach(product => {
                const section = suppContainer?.querySelector(`.${product}-section`);
                if (section && section.querySelector(`.${product}-checkbox`)?.checked) {
                    suppProducts.push(product.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
                }
            });
            if (suppProducts.length) summaryHtml += `NĐBH Bổ sung ${index + 1} (${sanitizeHtml(person.name)}): ${suppProducts.join(', ')}<br>`;
        });
        summaryHtml += '</div>';

        // Tạo tiêu đề bảng
        let tableHtml = `<table class="w-full text-left border-collapse"><thead class="bg-gray-100"><tr>`;
        tableHtml += `<th class="p-2 border">Năm HĐ</th>`;
        tableHtml += `<th class="p-2 border">Tuổi NĐBH Chính<br>(${sanitizeHtml(mainPersonInfo.name)})</th>`;
        tableHtml += `<th class="p-2 border">Phí SP Chính<br>(${sanitizeHtml(mainPersonInfo.name)})</th>`;
        tableHtml += `<th class="p-2 border">Phí Đóng Thêm<br>(${sanitizeHtml(mainPersonInfo.name)})</th>`;
        tableHtml += `<th class="p-2 border">Phí SP Bổ Sung<br>(${sanitizeHtml(mainPersonInfo.name)})</th>`;
        suppPersons.forEach(person => {
            tableHtml += `<th class="p-2 border">Phí SP Bổ Sung<br>(${sanitizeHtml(person.name)})</th>`;
        });
        tableHtml += `<th class="p-2 border">Tổng Phí Năm</th>`;
        tableHtml += `</tr></thead><tbody>`;

        let totalMainAcc = 0;
        let totalExtraAcc = 0;
        let totalSuppAccMain = 0;
        let totalSuppAccAll = 0;
        const initialMainPremium = calculateMainPremium(mainPersonInfo);
        const initialExtraPremium = calculateExtraPremium(mainPersonInfo, initialMainPremium);
        const totalMaxSupport = Math.floor(initialMainPremium / 4000000) * 100000;

        for (let i = 0; (mainPersonInfo.age + i) <= targetAge; i++) {
            const currentAgeMain = mainPersonInfo.age + i;
            const contractYear = i + 1;
            
            const mainPremiumForYear = (contractYear <= paymentTerm) ? initialMainPremium : 0;
            const extraPremiumForYear = (contractYear <= paymentTerm) ? initialExtraPremium : 0;
            totalMainAcc += mainPremiumForYear;
            totalExtraAcc += extraPremiumForYear;

            let suppPremiumMain = 0;
            let totalHospitalSupportStbh = 0;
            const mainSuppContainer = document.querySelector('#main-supp-container .supplementary-products-container');
            if (mainSuppContainer) {
                suppPremiumMain += calculateHealthSclPremium({ ...mainPersonInfo, age: currentAgeMain }, mainSuppContainer, currentAgeMain);
                suppPremiumMain += calculateBhnPremium({ ...mainPersonInfo, age: currentAgeMain }, mainSuppContainer, currentAgeMain);
                suppPremiumMain += calculateAccidentPremium({ ...mainPersonInfo, age: currentAgeMain }, mainSuppContainer, currentAgeMain);
                suppPremiumMain += calculateHospitalSupportPremium({ ...mainPersonInfo, age: currentAgeMain }, initialMainPremium, mainSuppContainer, totalHospitalSupportStbh, currentAgeMain);
                suppPremiumMain += calculateWaiverPremium({ ...mainPersonInfo, age: currentAgeMain }, mainSuppContainer, suppPremiumMain);
                const hospitalSupportStbh = parseFormattedNumber(mainSuppContainer.querySelector('.hospital-support-stbh')?.value || '0');
                if (mainSuppContainer.querySelector('.hospital-support-checkbox')?.checked && hospitalSupportStbh > 0) {
                    totalHospitalSupportStbh += hospitalSupportStbh;
                }
            }
            totalSuppAccMain += suppPremiumMain;

            const suppPremiums = suppPersons.map(person => {
                const currentPersonAge = person.age + i;
                const suppProductsContainer = person.container.querySelector('.supplementary-products-container');
                let suppPremium = 0;
                if (suppProductsContainer) {
                    suppPremium += calculateHealthSclPremium({ ...person, age: currentPersonAge }, suppProductsContainer, currentPersonAge);
                    suppPremium += calculateBhnPremium({ ...person, age: currentPersonAge }, suppProductsContainer, currentPersonAge);
                    suppPremium += calculateAccidentPremium({ ...person, age: currentPersonAge }, suppProductsContainer, currentPersonAge);
                    suppPremium += calculateHospitalSupportPremium({ ...person, age: currentPersonAge }, initialMainPremium, suppProductsContainer, totalHospitalSupportStbh, currentPersonAge);
                    suppPremium += calculateWaiverPremium({ ...person, age: currentPersonAge }, suppProductsContainer, suppPremium);
                    const hospitalSupportStbh = parseFormattedNumber(suppProductsContainer.querySelector('.hospital-support-stbh')?.value || '0');
                    if (suppProductsContainer.querySelector('.hospital-support-checkbox')?.checked && hospitalSupportStbh > 0) {
                        totalHospitalSupportStbh += hospitalSupportStbh;
                    }
                }
                totalSuppAccAll += suppPremium;
                return suppPremium;
            });

            if (totalHospitalSupportStbh > totalMaxSupport) {
                throw new Error(`Tổng số tiền Hỗ trợ viện phí vượt quá hạn mức chung: ${formatCurrency(totalMaxSupport, 'đ/ngày')}.`);
            }

            tableHtml += `<tr>
                <td class="p-2 border text-center">${contractYear}</td>
                <td class="p-2 border text-center">${currentAgeMain}</td>
                <td class="p-2 border text-right">${formatCurrency(mainPremiumForYear)}</td>
                <td class="p-2 border text-right">${formatCurrency(extraPremiumForYear)}</td>
                <td class="p-2 border text-right">${formatCurrency(suppPremiumMain)}</td>`;
            suppPremiums.forEach(suppPremium => {
                tableHtml += `<td class="p-2 border text-right">${formatCurrency(suppPremium)}</td>`;
            });
            tableHtml += `<td class="p-2 border text-right font-semibold">${formatCurrency(mainPremiumForYear + extraPremiumForYear + suppPremiumMain + suppPremiums.reduce((sum, p) => sum + p, 0))}</td>`;
            tableHtml += `</tr>`;
        }
        
        tableHtml += `<tr class="bg-gray-200 font-bold"><td class="p-2 border" colspan="2">Tổng cộng</td>`;
        tableHtml += `<td class="p-2 border text-right">${formatCurrency(totalMainAcc)}</td>`;
        tableHtml += `<td class="p-2 border text-right">${formatCurrency(totalExtraAcc)}</td>`;
        tableHtml += `<td class="p-2 border text-right">${formatCurrency(totalSuppAccMain)}</td>`;
        suppPersons.forEach((_, index) => {
            const totalSupp = suppPersons[index].container.querySelector('.supplementary-products-container') ? 
                Array.from({ length: targetAge - mainPersonInfo.age + 1 }).reduce((sum, _, i) => {
                    const currentPersonAge = suppPersons[index].age + i;
                    let suppPremium = 0;
                    let totalHospitalSupportStbh = 0;
                    const suppContainer = suppPersons[index].container.querySelector('.supplementary-products-container');
                    if (suppContainer) {
                        suppPremium += calculateHealthSclPremium({ ...suppPersons[index], age: currentPersonAge }, suppContainer, currentPersonAge);
                        suppPremium += calculateBhnPremium({ ...suppPersons[index], age: currentPersonAge }, suppContainer, currentPersonAge);
                        suppPremium += calculateAccidentPremium({ ...suppPersons[index], age: currentPersonAge }, suppContainer, currentPersonAge);
                        suppPremium += calculateHospitalSupportPremium({ ...suppPersons[index], age: currentPersonAge }, initialMainPremium, suppContainer, totalHospitalSupportStbh, currentPersonAge);
                        suppPremium += calculateWaiverPremium({ ...suppPersons[index], age: currentPersonAge }, suppContainer, suppPremium);
                        const hospitalSupportStbh = parseFormattedNumber(suppContainer.querySelector('.hospital-support-stbh')?.value || '0');
                        if (suppContainer.querySelector('.hospital-support-checkbox')?.checked && hospitalSupportStbh > 0) {
                            totalHospitalSupportStbh += hospitalSupportStbh;
                        }
                    }
                    return sum + suppPremium;
                }, 0) : 0;
            tableHtml += `<td class="p-2 border text-right">${formatCurrency(totalSupp)}</td>`;
        });
        tableHtml += `<td class="p-2 border text-right">${formatCurrency(totalMainAcc + totalExtraAcc + totalSuppAccMain + totalSuppAccAll)}</td>`;
        tableHtml += `</tr></tbody></table>`;
        tableHtml += `<div class="mt-4 text-center"><button id="export-html-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Xuất HTML</button></div>`;
        container.innerHTML = summaryHtml + tableHtml;

        // Miễn trừ trách nhiệm
        container.innerHTML += `<p class="mt-4 text-sm text-gray-600 font-semibold">**Miễn trừ trách nhiệm: Dữ liệu minh họa chỉ mang tính chất tham khảo, không phải cam kết bảo hiểm. Vui lòng liên hệ đại lý để biết chi tiết.**</p>`;

        document.getElementById('export-html-btn').addEventListener('click', () => exportToHTML(mainPersonInfo, suppPersons, targetAge, initialMainPremium, paymentTerm));

    } catch (e) {
        container.innerHTML = `<p class="text-red-600 font-semibold text-center">${e.message}</p>`;
    } finally {
        modal.classList.remove('hidden');
    }
}

function sanitizeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function exportToHTML(mainPersonInfo, suppPersons, targetAge, initialMainPremium, paymentTerm) {
    let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">Năm HĐ</th>
                    <th style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">Tuổi NĐBH Chính<br>(${sanitizeHtml(mainPersonInfo.name)})</th>
                    <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Phí SP Chính<br>(${sanitizeHtml(mainPersonInfo.name)})</th>
                    <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Phí Đóng Thêm<br>(${sanitizeHtml(mainPersonInfo.name)})</th>
                    <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Phí SP Bổ Sung<br>(${sanitizeHtml(mainPersonInfo.name)})</th>
                    ${suppPersons.map(person => `<th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Phí SP Bổ Sung<br>(${sanitizeHtml(person.name)})</th>`).join('')}
                    <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Tổng Phí Năm</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalMainAcc = 0;
    let totalExtraAcc = 0;
    let totalSuppAccMain = 0;
    let totalSuppAccAll = 0;
    const initialExtraPremium = calculateExtraPremium(mainPersonInfo, initialMainPremium);
    const totalMaxSupport = Math.floor(initialMainPremium / 4000000) * 100000;

    for (let i = 0; (mainPersonInfo.age + i) <= targetAge; i++) {
        const currentAgeMain = mainPersonInfo.age + i;
        const contractYear = i + 1;
        
        const mainPremiumForYear = (contractYear <= paymentTerm) ? initialMainPremium : 0;
        const extraPremiumForYear = (contractYear <= paymentTerm) ? initialExtraPremium : 0;
        totalMainAcc += mainPremiumForYear;
        totalExtraAcc += extraPremiumForYear;

        let suppPremiumMain = 0;
        let totalHospitalSupportStbh = 0;
        const mainSuppContainer = document.querySelector('#main-supp-container .supplementary-products-container');
        if (mainSuppContainer) {
            suppPremiumMain += calculateHealthSclPremium({ ...mainPersonInfo, age: currentAgeMain }, mainSuppContainer, currentAgeMain);
            suppPremiumMain += calculateBhnPremium({ ...mainPersonInfo, age: currentAgeMain }, mainSuppContainer, currentAgeMain);
            suppPremiumMain += calculateAccidentPremium({ ...mainPersonInfo, age: currentAgeMain }, mainSuppContainer, currentAgeMain);
            suppPremiumMain += calculateHospitalSupportPremium({ ...mainPersonInfo, age: currentAgeMain }, initialMainPremium, mainSuppContainer, totalHospitalSupportStbh, currentAgeMain);
            suppPremiumMain += calculateWaiverPremium({ ...mainPersonInfo, age: currentAgeMain }, mainSuppContainer, suppPremiumMain);
            const hospitalSupportStbh = parseFormattedNumber(mainSuppContainer.querySelector('.hospital-support-stbh')?.value || '0');
            if (mainSuppContainer.querySelector('.hospital-support-checkbox')?.checked && hospitalSupportStbh > 0) {
                totalHospitalSupportStbh += hospitalSupportStbh;
            }
        }
        totalSuppAccMain += suppPremiumMain;

        const suppPremiums = suppPersons.map(person => {
            const currentPersonAge = person.age + i;
            const suppProductsContainer = person.container.querySelector('.supplementary-products-container');
            let suppPremium = 0;
            if (suppProductsContainer) {
                suppPremium += calculateHealthSclPremium({ ...person, age: currentPersonAge }, suppProductsContainer, currentPersonAge);
                suppPremium += calculateBhnPremium({ ...person, age: currentPersonAge }, suppProductsContainer, currentPersonAge);
                suppPremium += calculateAccidentPremium({ ...person, age: currentPersonAge }, suppProductsContainer, currentPersonAge);
                suppPremium += calculateHospitalSupportPremium({ ...person, age: currentPersonAge }, initialMainPremium, suppProductsContainer, totalHospitalSupportStbh, currentPersonAge);
                suppPremium += calculateWaiverPremium({ ...person, age: currentPersonAge }, suppProductsContainer, suppPremium);
                const hospitalSupportStbh = parseFormattedNumber(suppProductsContainer.querySelector('.hospital-support-stbh')?.value || '0');
                if (suppProductsContainer.querySelector('.hospital-support-checkbox')?.checked && hospitalSupportStbh > 0) {
                    totalHospitalSupportStbh += hospitalSupportStbh;
                }
            }
            totalSuppAccAll += suppPremium;
            return suppPremium;
        });

        if (totalHospitalSupportStbh > totalMaxSupport) {
            throw new Error(`Tổng số tiền Hỗ trợ viện phí vượt quá hạn mức chung: ${formatCurrency(totalMaxSupport, 'đ/ngày')}.`);
        }

        tableHtml += `
            <tr>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${contractYear}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${currentAgeMain}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(mainPremiumForYear)}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(extraPremiumForYear)}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(suppPremiumMain)}</td>
                ${suppPremiums.map(suppPremium => `<td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(suppPremium)}</td>`).join('')}
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; font-weight: 600;">${formatCurrency(mainPremiumForYear + extraPremiumForYear + suppPremiumMain + suppPremiums.reduce((sum, p) => sum + p, 0))}</td>
            </tr>
        `;
    }

    tableHtml += `
        <tr style="background-color: #e5e7eb; font-weight: bold;">
            <td style="padding: 8px; border: 1px solid #d1d5db;" colspan="2">Tổng cộng</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(totalMainAcc)}</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(totalExtraAcc)}</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(totalSuppAccMain)}</td>
            ${suppPersons.map((_, index) => {
                const totalSupp = suppPersons[index].container.querySelector('.supplementary-products-container') ? 
                    Array.from({ length: targetAge - mainPersonInfo.age + 1 }).reduce((sum, _, i) => {
                        const currentPersonAge = suppPersons[index].age + i;
                        let suppPremium = 0;
                        let totalHospitalSupportStbh = 0;
                        const suppContainer = suppPersons[index].container.querySelector('.supplementary-products-container');
                        if (suppContainer) {
                            suppPremium += calculateHealthSclPremium({ ...suppPersons[index], age: currentPersonAge }, suppContainer, currentPersonAge);
                            suppPremium += calculateBhnPremium({ ...suppPersons[index], age: currentPersonAge }, suppContainer, currentPersonAge);
                            suppPremium += calculateAccidentPremium({ ...suppPersons[index], age: currentPersonAge }, suppContainer, currentPersonAge);
                            suppPremium += calculateHospitalSupportPremium({ ...suppPersons[index], age: currentPersonAge }, initialMainPremium, suppContainer, totalHospitalSupportStbh, currentPersonAge);
                            suppPremium += calculateWaiverPremium({ ...suppPersons[index], age: currentPersonAge }, suppContainer, suppPremium);
                            const hospitalSupportStbh = parseFormattedNumber(suppContainer.querySelector('.hospital-support-stbh')?.value || '0');
                            if (suppContainer.querySelector('.hospital-support-checkbox')?.checked && hospitalSupportStbh > 0) {
                                totalHospitalSupportStbh += hospitalSupportStbh;
                            }
                        }
                        return sum + suppPremium;
                    }, 0) : 0;
                return `<td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(totalSupp)}</td>`;
            }).join('')}
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(totalMainAcc + totalExtraAcc + totalSuppAccMain + totalSuppAccAll)}</td>
        </tr>
    </tbody></table>`;

    // Tóm tắt sản phẩm cho HTML
    let summaryHtmlExport = `<div style="margin: 20px 0;"><strong>Tóm tắt sản phẩm:</strong><br>NĐBH Chính (${sanitizeHtml(mainPersonInfo.name)}): ${mainProduct}<br>`;
    const mainSuppProducts = [];
    ['health-scl', 'bhn', 'accident', 'hospital-support', 'waiver'].forEach(product => {
        const section = mainSuppContainer?.querySelector(`.${product}-section`);
        if (section && section.querySelector(`.${product}-checkbox`)?.checked) {
            mainSuppProducts.push(product.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
    });
    if (mainSuppProducts.length) summaryHtmlExport += `Sản phẩm bổ sung (Chính): ${mainSuppProducts.join(', ')}<br>`;
    suppPersons.forEach((person, index) => {
        const suppContainer = person.container.querySelector('.supplementary-products-container');
        const suppProducts = [];
        ['health-scl', 'bhn', 'accident', 'hospital-support', 'waiver'].forEach(product => {
            const section = suppContainer?.querySelector(`.${product}-section`);
            if (section && section.querySelector(`.${product}-checkbox`)?.checked) {
                suppProducts.push(product.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
            }
        });
        if (suppProducts.length) summaryHtmlExport += `NĐBH Bổ sung ${index + 1} (${sanitizeHtml(person.name)}): ${suppProducts.join(', ')}<br>`;
    });
    summaryHtmlExport += '</div>';

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bảng Minh Họa Phí Bảo Hiểm</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { text-align: center; color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; border: 1px solid #d1d5db; }
        th { background-color: #f3f4f6; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <h1>Bảng Minh Họa Phí Bảo Hiểm</h1>
    ${summaryHtmlExport}
    ${tableHtml}
    <div style="margin-top: 20px; text-align: center;" class="no-print">
        <button onclick="window.print()" style="background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer;">In thành PDF</button>
    </div>
    <p style="margin-top: 20px; text-align: center; font-size: 12px; font-weight: bold; color: #666;">**Miễn trừ trách nhiệm: Dữ liệu minh họa chỉ mang tính chất tham khảo, không phải cam kết bảo hiểm. Vui lòng liên hệ đại lý để biết chi tiết.**</p>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bang_minh_hoa_phi_bao_hiem.html';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function formatCurrency(value, suffix = ' VNĐ') {
    if (isNaN(value)) return '0' + suffix;
    return Math.round(value).toLocaleString('vi-VN') + suffix;
}

function formatNumberInput(input) {
    if (!input || !input.value) return;
    let value = input.value.replace(/[.,]/g, '');
    if (!isNaN(value) && value.length > 0) {
        input.value = parseInt(value, 10).toLocaleString('vi-VN');
    } else if (input.value !== '') {
        input.value = '';
    }
}

function parseFormattedNumber(formattedString) {
    return parseInt(String(formattedString).replace(/[.,]/g, ''), 10) || 0;
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
}

function clearError() {
    document.getElementById('error-message').textContent = '';
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

function generateSupplementaryPersonHtml(personId, count) {
    return `
        <button class="w-full text-right text-sm text-red-600 font-semibold" onclick="this.closest('.person-container').remove(); calculateAll();">Xóa NĐBH này</button>
        <h3 class="text-lg font-bold text-gray-700 mb-2 border-t pt-4">NĐBH Bổ Sung ${count}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="name-${personId}" class="font-medium text-gray-700 block mb-1">Họ và Tên</label>
                <input type="text" id="name-${personId}" class="form-input name-input" placeholder="Trần Thị B">
            </div>
            <div>
                <label for="dob-${personId}" class="font-medium text-gray-700 block mb-1">Ngày sinh</label>
                <input type="text" id="dob-${personId}" class="form-input dob-input" placeholder="DD/MM/YYYY">
            </div>
            <div>
                <label for="gender-${personId}" class="font-medium text-gray-700 block mb-1">Giới tính</label>
                <select id="gender-${personId}" class="form-select gender-select">
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                </select>
            </div>
            <div class="flex items-end space-x-4">
                <p class="text-lg">Tuổi: <span id="age-${personId}" class="font-bold text-aia-red age-span">0</span></p>
            </div>
            <div class="relative">
                <label for="occupation-input-${personId}" class="font-medium text-gray-700 block mb-1">Nghề nghiệp</label>
                <input type="text" id="occupation-input-${personId}" class="form-input occupation-input" placeholder="Gõ để tìm nghề nghiệp...">
                <div class="occupation-autocomplete absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 hidden max-h-60 overflow-y-auto"></div>
            </div>
            <div class="flex items-end space-x-4">
                <p class="text-lg">Nhóm nghề: <span id="risk-group-${personId}" class="font-bold text-aia-red risk-group-span">...</span></p>
            </div>
        </div>
        <div class="mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Sản phẩm bổ sung cho người này</h4>
            <div class="supplementary-products-container space-y-6"></div>
        </div>
    `;
}

function generateSupplementaryProductsHtml(personId) {
    return `
        <div class="product-section health-scl-section hidden">
            <label class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" class="form-checkbox health-scl-checkbox">
                <span class="text-lg font-medium text-gray-800">Sức khỏe Bùng Gia Lực</span>
            </label>
            <div class="product-options hidden mt-3 pl-8 space-y-4 border-l-2 border-gray-200">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="font-medium text-gray-700 block mb-1">Quyền lợi chính (Bắt buộc)</label>
                        <select class="form-select health-scl-program" disabled>
                            <option value="">-- Chọn chương trình --</option>
                            <option value="co_ban">Cơ bản</option> <option value="nang_cao" selected>Nâng cao</option> <option value="toan_dien">Toàn diện</option> <option value="hoan_hao">Hoàn hảo</option>
                        </select>
                    </div>
                    <div>
                        <label class="font-medium text-gray-700 block mb-1">Phạm vi địa lý</label>
                        <select class="form-select health-scl-scope" disabled>
                            <option value="main_vn">Việt Nam</option> <option value="main_global">Toàn cầu (trừ Hoa Kỳ)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <span class="font-medium text-gray-700 block mb-2">Quyền lợi tùy chọn:</span>
                    <div class="space-y-2">
                        <label class="flex items-center space-x-3 cursor-pointer"><input type="checkbox" class="form-checkbox health-scl-outpatient" disabled> <span>Điều trị ngoại trú</span></label>
                        <label class="flex items-center space-x-3 cursor-pointer"><input type="checkbox" class="form-checkbox health-scl-dental" disabled> <span>Chăm sóc nha khoa</span></label>
                    </div>
                </div>
                <div class="text-right font-semibold text-aia-red fee-display min-h-[1.5rem]"></div>
            </div>
        </div>
        <div class="product-section bhn-section hidden">
            <label class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" class="form-checkbox bhn-checkbox"> <span class="text-lg font-medium text-gray-800">Bảo hiểm Bệnh Hiểm Nghèo 2.0</span>
            </label>
            <div class="product-options hidden mt-3 pl-8 space-y-3 border-l-2 border-gray-200">
                <div><label class="font-medium text-gray-700 block mb-1">Số tiền bảo hiểm (STBH)</label><input type="text" class="form-input bhn-stbh" placeholder="VD: 500.000.000"><span class="error-message text-red-600 text-sm"></span></div>
                <div class="text-right font-semibold text-aia-red fee-display min-h-[1.5rem]"></div>
            </div>
        </div>
        <div class="product-section accident-section hidden">
            <label class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" class="form-checkbox accident-checkbox"> <span class="text-lg font-medium text-gray-800">Bảo hiểm Tai nạn</span>
            </label>
            <div class="product-options hidden mt-3 pl-8 space-y-3 border-l-2 border-gray-200">
                <div><label class="font-medium text-gray-700 block mb-1">Số tiền bảo hiểm (STBH)</label><input type="text" class="form-input accident-stbh" placeholder="VD: 200.000.000"><span class="error-message text-red-600 text-sm"></span></div>
                <div class="text-right font-semibold text-aia-red fee-display min-h-[1.5rem]"></div>
            </div>
        </div>
        <div class="product-section hospital-support-section hidden">
            <label class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" class="form-checkbox hospital-support-checkbox"> <span class="text-lg font-medium text-gray-800">Hỗ trợ chi phí nằm viện</span>
            </label>
            <div class="product-options hidden mt-3 pl-8 space-y-3 border-l-2 border-gray-200">
                <div>
                    <label class="font-medium text-gray-700 block mb-1">Số tiền hỗ trợ/ngày</label><input type="text" class="form-input hospital-support-stbh" placeholder="VD: 300.000"><span class="error-message text-red-600 text-sm"></span>
                    <p class="hospital-support-validation text-sm text-gray-500 mt-1"></p>
                </div>
                <div class="text-right font-semibold text-aia-red fee-display min-h-[1.5rem]"></div>
            </div>
        </div>
        <div class="product-section waiver-section hidden">
            <label class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" class="form-checkbox waiver-checkbox"> <span class="text-lg font-medium text-gray-800">Miễn Đóng Phí</span>
            </label>
            <div class="product-options hidden mt-3 pl-8 space-y-3 border-l-2 border-gray-200">
                <div>
                    <label class="font-medium text-gray-700 block mb-1">Chọn người được miễn phí</label>
                    <select class="form-select waiver-insured-select" disabled>
                        <option value="">-- Chọn NĐBH --</option>
                        ${document.querySelectorAll('.person-container').length > 1 ? Array.from(document.querySelectorAll('.person-container')).filter(c => c.id !== `person-container-${personId}`).map(c => {
                            const name = c.querySelector('.name-input').value || `NĐBH ${c.id.replace('person-container-', '')}`;
                            return `<option value="${c.id.replace('person-container-', '')}">${name}</option>`;
                        }).join('') : ''}
                    </select>
                </div>
                <div>
                    <label class="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" class="form-checkbox waiver-other-person" disabled> <span>Người khác</span>
                    </label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 hidden waiver-other-details">
                        <div>
                            <label for="name-${personId}-waiver" class="font-medium text-gray-700 block mb-1">Họ và Tên</label>
                            <input type="text" id="name-${personId}-waiver" class="form-input" placeholder="Nguyễn Văn A">
                        </div>
                        <div>
                            <label for="dob-${personId}-waiver" class="font-medium text-gray-700 block mb-1">Ngày sinh</label>
                            <input type="text" id="dob-${personId}-waiver" class="form-input dob-input" placeholder="DD/MM/YYYY">
                        </div>
                        <div>
                            <label for="gender-${personId}-waiver" class="font-medium text-gray-700 block mb-1">Giới tính</label>
                            <select id="gender-${personId}-waiver" class="form-select">
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                            </select>
                        </div>
                        <div class="flex items-end space-x-4">
                            <p class="text-lg">Tuổi: <span id="age-${personId}-waiver" class="font-bold text-aia-red">0</span></p>
                        </div>
                        <div class="relative">
                            <label for="occupation-input-${personId}-waiver" class="font-medium text-gray-700 block mb-1">Nghề nghiệp</label>
                            <input type="text" id="occupation-input-${personId}-waiver" class="form-input occupation-input" placeholder="Gõ để tìm nghề nghiệp...">
                            <div class="occupation-autocomplete absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 hidden max-h-60 overflow-y-auto"></div>
                        </div>
                        <div class="flex items-end space-x-4">
                            <p class="text-lg">Nhóm nghề: <span id="risk-group-${personId}-waiver" class="font-bold text-aia-red">...</span></p>
                        </div>
                        <div>
                            <label for="waiver-premium-${personId}" class="font-medium text-gray-700 block mb-1">Phí miễn đóng</label>
                            <input type="text" id="waiver-premium-${personId}" class="form-input" placeholder="VD: 5.000.000"><span class="error-message text-red-600 text-sm"></span>
                        </div>
                        <div class="waiver-age-container">
                            <label for="waiver-age-${personId}" class="font-medium text-gray-700 block mb-1">Tuổi tính phí</label>
                            <input type="number" id="waiver-age-${personId}" class="form-input waiver-age" placeholder="VD: 30"><span class="error-message text-red-600 text-sm"></span>
                        </div>
                    </div>
                </div>
                <div class="text-right font-semibold text-aia-red fee-display min-h-[1.5rem]"></div>
            </div>
        </div>
    `;
}

</xaiArtifact>

### Lưu ý
- Mình đã tiếp tục từ đoạn bị dừng và hoàn thành toàn bộ `logic.js`.
- Các thay đổi đã được tích hợp theo yêu cầu, bao gồm Sức Khỏe Bùng Gia Lực mặc định "Nâng cao", sản phẩm Miễn Đóng Phí, phí đóng thêm, thông báo lỗi, PUL Trọn Đời mặc định 10 năm, tóm tắt phí với kỳ đóng phí, tóm tắt sản phẩm, miễn trừ trách nhiệm, và placeholder cho logo (sẽ thêm vào `index.html` khi bạn cung cấp).
- Về bảng phí Miễn Đóng Phí, mình đã dùng rate tạm 0.01 trong `calculateWaiverPremium` (chờ bạn cung cấp dữ liệu thực tế).
- Vui lòng kiểm tra và gửi thêm `data.js` hoặc logo nếu có. Nếu cần điều chỉnh, cứ báo nhé!
