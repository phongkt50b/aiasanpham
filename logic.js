// Update and enhance initDateFormatter to ensure correct slash input and fix edge cases for DD/MM/YYYY
function initDateFormatter(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^
\d]/g, '');
        if (value.length >= 3 && value.length <= 4) {
            value = value.slice(0,2) + '/' + value.slice(2);
        } else if (value.length >= 5) {
            value = value.slice(0,2) + '/' + value.slice(2,4) + '/' + value.slice(4,8);
        }
        e.target.value = value.slice(0, 10);
    });
}

// Update and robustify initOccupationAutocomplete for better UX
function initOccupationAutocomplete(input, container) {
    if (!input) return;
    const autocompleteContainer = container.querySelector('.occupation-autocomplete');
    const riskGroupSpan = container.querySelector('.risk-group-span');
    input.addEventListener('input', () => {
        const value = input.value.trim().toLowerCase();
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
                item.addEventListener('mousedown', (evt) => {
                    evt.preventDefault();
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

// These functions should replace the existing ones in logic.js. All other code remains unchanged.