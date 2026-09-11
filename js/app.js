// ==========================================================================
// ОСНОВНОЕ VUE-ПРИЛОЖЕНИЕ КАЛЬКУЛЯТОРА (js/app.js)
// ==========================================================================

document.addEventListener('keydown', function(e) {
    if (e.keyCode === 123) { e.preventDefault(); return false; }
    if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 117)) { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) { e.preventDefault(); return false; }
});

var app = new Vue({
    el: '#app',
    data: {
        googleScriptUrl: 'https://script.google.com/macros/s/AKfycbzsBY3ZFVSjD24mpL02CQbuJohjVW97iUxP6GuZDeIOmzLoJ_zb__9wzMbBVH0KPDLx/exec',
        isSyncing: false,
        includeVat: true,

        managers: typeof APP_MANAGERS !== 'undefined' ? APP_MANAGERS : [],
        config: typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : {},
        goods: typeof APP_GOODS !== 'undefined' ? APP_GOODS : {},
        colors: typeof APP_COLORS !== 'undefined' ? APP_COLORS : {},
        toners: typeof APP_TONERS !== 'undefined' ? APP_TONERS : {},
        papers: typeof APP_PAPERS !== 'undefined' ? APP_PAPERS : {},
        sizes: typeof APP_SIZES !== 'undefined' ? APP_SIZES : {},

        selectedManagerId: 'm_igor',
        enteredPassword: '',
        rememberMe: false,
        isAuthenticated: false,
        authError: false,
        currentManager: {},

        companyName: '',
        userHistory: [],
        historySearch: '',
        currentLoadedHistoryId: null,
        showAdvancedOptions: false,
        editingIndex: null,

        toastMessage: '',
        showToast: false,

        blockIdCounter: 2,
        savedItems: [],
        savedItemCounter: 1,

        selected: {
            good: 'leaflet',
            size: 'a4',
            circulation: 100,
            color: '4_4',
            lamination: 'none',
            paper: 'p8',
            envelope_size: 'small',
            envelope_price: 25,
            bag_size: 'bag_350_225_80',
            bag_print_sides: 'both',
            bag_production: 'plotter',
            calendar_sheets: 7,
            calendar_spring: 'white',
            calendar_stand_type: 'hard_cover',
            calendar_stand_color: '0_0',
            calendar_stand_lamination: 'none',
            calendar_block_paper: 'p6',
            calendar_cliche_exists: false,
            calendar_cliche_w: 80,
            calendar_cliche_h: 40,
            presentation_spring_type: 'metal',
            presentation_only_block: false,
            orientation: 'portrait',
            pages_count: 8,
            cover_paper: 'p6',
            cover_color: '4_4',
            cover_lamination: 'none',
            cover_toner: 'none',
            cover_toner_usd: 0,
            cover_plotter_cut: 'none',
            block_paper: 'p3',
            block_color: '4_4',
            block_lamination: 'none',
            block_toner: 'none',
            block_toners_usd: 0,
            back_cover_paper: 'p6',
            back_cover_color: '0_0',
            back_cover_lamination: 'none',
            back_cover_toner: 'none',
            back_cover_toner_usd: 0,
            back_cover_plotter_cut: 'none',
            binding_edge: 'short',
            presentation_blocks: [
                { id: 1, sheets: 20, paper: 'p16', color: '4_4', lamination: 'none', toner: 'none', toner_usd: 0 }
            ],
            cut_type: 'double',
            plotter_cut: 'none',
            round_corners: false,
            custom_paper_price: 100,
            custom_paper_width: 450,
            custom_paper_height: 320,
            custom_width: 90,
            custom_height: 50,
            toner1: 'none',
            toner1_usd: 0,
            add_extra_run: false,
            toner2: 'none',
            toner2_usd: 0
        }
    },
    watch: {
        includeVat: function(newVal) {
            let rate = this.config.vat_rate || 1.16;
            this.savedItems.forEach(item => {
                if (!item.base_total) {
                    item.base_total = item.total;
                    item.base_one_total = item.one_total;
                }
                if (newVal) {
                    item.total = item.base_total;
                    item.one_total = item.base_one_total;
                } else {
                    item.total = Math.round(item.base_total / rate);
                    item.one_total = Math.round(item.total / item.circulation);
                }
            });
            this.showNotification(newVal ? 'КП переведено с учетом НДС' : 'КП переведено без учета НДС');
        }
    },
    created: function() {
        let savedUser = localStorage.getItem('poly_calc_manager');
        if (savedUser) {
            let found = this.managers.find(m => m.id === savedUser);
            if (found) {
                this.currentManager = found;
                this.isAuthenticated = true;
                this.loadUserHistory();
                this.syncWithGoogleSheets();
            }
        }
    },
    computed: {
        currentDateFormatted: function() {
            let d = new Date();
            let day = String(d.getDate()).padStart(2, '0');
            let month = String(d.getMonth() + 1).padStart(2, '0');
            return `${day}.${month}.${d.getFullYear()}`;
        },
        filteredHistory: function() {
            let q = this.historySearch.trim().toLowerCase();
            if (!q) return this.userHistory;
            return this.userHistory.filter(h => {
                let comp = (h.company || '').trim().toLowerCase();
                let date = (h.date || '').toLowerCase();
                let summary = (h.summary || '').toLowerCase();
                return comp.includes(q) || date.includes(q) || summary.includes(q);
            });
        },
        grandTotal: function() {
            return this.savedItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
        },
        nonManualItems: function() {
            return this.savedItems.filter(it => !it.isManual && it.specData);
        },
        nonManualItemsCount: function() {
            return this.nonManualItems.length;
        },
        grandProductionCost: function() {
            let total = 0;
            for (let it of this.nonManualItems) {
                if (it.productionCost && it.productionCost > 0) {
                    total += Number(it.productionCost);
                } else if (it.specData) {
                    let p = this.calcPriceForSpec(it.specData);
                    total += p.productionCost;
                }
            }
            return Math.round(total);
        },
        grandProductionCostWithTax: function() {
            let total = 0;
            for (let it of this.nonManualItems) {
                if (it.productionCostWithTax && it.productionCostWithTax > 0) {
                    total += Number(it.productionCostWithTax);
                } else if (it.specData) {
                    let p = this.calcPriceForSpec(it.specData);
                    total += p.productionCostWithTax;
                }
            }
            return Math.round(total);
        },
        maxDeliveryTime: function() {
            if (this.savedItems.length === 0) return '-';
            let maxUpper = -1, maxLower = -1, bestRange = '', hasClarify = false;
            for (let it of this.savedItems) {
                let d = (it.delivery || '').trim();
                if (!d || d === '-') continue;
                if (d.toLowerCase().includes('уточнить')) { hasClarify = true; continue; }
                let match = d.match(/(\d+)\s*[-–—]\s*(\d+)/);
                if (match) {
                    let low = parseInt(match[1]), high = parseInt(match[2]);
                    if (high > maxUpper || (high === maxUpper && low > maxLower)) {
                        maxUpper = high; maxLower = low; bestRange = `${low}-${high}`;
                    }
                } else {
                    let single = parseInt(d);
                    if (!isNaN(single) && single > maxUpper) {
                        maxUpper = single; maxLower = single; bestRange = String(single);
                    }
                }
            }
            if (hasClarify && maxUpper === -1) return 'Уточнить у менеджера';
            if (hasClarify) return bestRange ? `${bestRange} (уточнить)` : 'Уточнить у менеджера';
            return bestRange || '-';
        },
        available_colors: function() {
            if (this.selected.good === 'bag') {
                return { '4_0': { name: '4+0 (Полноцветная)' }, '1_0': { name: '1+0 (Черно-белая)' } };
            }
            return this.colors;
        },
        laminations: function() {
            let c = this.config;
            if (!c || Object.keys(c).length === 0) return {};
            return {
                'none': { name: 'Без припресса / ламинации', price: 0 },
                'press_matt_1_0': { name: 'Матовый припресс 1+0', price: c.press_matt_sra3 },
                'press_matt_1_1': { name: 'Матовый припресс 1+1', price: c.press_matt_sra3 * 2 },
                'press_gl_1_0': { name: 'Глянцевый припресс 1+0', price: c.press_gl_sra3 },
                'press_gl_1_1': { name: 'Глянцевый припресс 1+1', price: c.press_gl_sra3 * 2 },
                'press_touch_1_0': { name: 'Тач припресс 1+0', price: c.press_touch_sra3 },
                'press_touch_1_1': { name: 'Тач припресс 1+1', price: c.press_touch_sra3 * 2 },
                'lam_matt100': { name: 'Матовая ламинация 100 мкр', price: c.lam_matt100 },
                'lam_gl100': { name: 'Глянцевая ламинация 100 мкр', price: c.lam_gl100 },
                'lam_matt150': { name: 'Матовая ламинация 150 мкр', price: c.lam_matt150 },
                'lam_gl150': { name: 'Глянцевая ламинация 150 мкр', price: c.lam_gl150 }
            };
        },
        available_laminations: function() {
            let res = {};
            if (this.selected.good === 'bag') {
                return {
                    'none': { name: 'Без припресса', price: 0 },
                    'press_matt_1_0': { name: 'Матовый припресс 1+0', price: this.config.press_matt_sra3 },
                    'press_gl_1_0': { name: 'Глянцевый припресс 1+0', price: this.config.press_gl_sra3 },
                    'press_touch_1_0': { name: 'Тач припресс 1+0', price: this.config.press_touch_sra3 }
                };
            }
            for (let key in this.laminations) {
                if (this.selected.good === 'sticker') {
                    if (key === 'none' || key.endsWith('_1_0')) res[key] = this.laminations[key];
                } else {
                    res[key] = this.laminations[key];
                }
            }
            return res;
        },
        brochure_laminations: function() {
            let res = {};
            for (let key in this.laminations) {
                if (key === 'none' || key.startsWith('press_')) res[key] = this.laminations[key];
            }
            return res;
        },
        hasCustomBlockPaper: function() {
            return this.selected.presentation_blocks.some(b => b.paper === 'custom');
        },
        layout: function() {
            if (typeof CalcEngine === 'undefined') return null;
            return CalcEngine.calcLayoutForSpec(this.selected, this.config, this.papers, this.sizes, this.laminations);
        },
        result_price: function() {
            if (typeof CalcEngine === 'undefined') return { doesNotFit: false, one_total: 0, total: 0, productionCost: 0, productionCostWithTax: 0 };
            return CalcEngine.calcPriceForSpec(this.selected, this.config, this.papers, this.sizes, this.colors, this.laminations);
        },
        delivery_time: function() {
            if (typeof CalcEngine === 'undefined') return '';
            return CalcEngine.calcDeliveryTimeForSpec(this.selected);
        },
        calendarClicheArea: function() {
            if (this.selected.calendar_cliche_exists) return 0;
            let w = Number(this.selected.calendar_cliche_w) || 0;
            let h = Number(this.selected.calendar_cliche_h) || 0;
            if (w <= 0 || h <= 0) return 0;
            return (((w + 10) * (h + 10)) / 100).toFixed(1);
        },
        calendarClicheCost: function() {
            let mod = window.ProductModules ? window.ProductModules['calendar'] : null;
            return mod ? mod.calcClicheCost(this.selected) : (typeof CalcEngine !== 'undefined' && typeof CalcEngine.calcClicheCost === 'function' ? CalcEngine.calcClicheCost(this.selected) : 0);
        },
        spec_size: function() {
            if (!this.sizes || Object.keys(this.sizes).length === 0) return '';
            if (this.selected.good === 'bag') {
                return this.sizes.bag[this.selected.bag_size].name;
            } else if (this.selected.good === 'calendar') {
                return this.sizes.calendar[this.selected.size].name + ' (' + this.selected.calendar_sheets + ' листов)';
            } else if (this.selected.envelope_size === 'small' && this.selected.good === 'envelope') {
                return 'Конверт (До С4 включительно)';
            } else if (this.selected.good === 'envelope') {
                return 'Конверт (Больше С4)';
            } else if (this.selected.good === 'business-card' || ((this.selected.good === 'leaflet' || this.selected.good === 'sticker') && this.selected.size === 'custom')) {
                return this.selected.custom_width + 'x' + this.selected.custom_height + ' мм';
            } else if (this.selected.good === 'brochure') {
                return this.sizes.brochure[this.selected.size].name + ' (' + 
                    (this.selected.orientation === 'portrait' ? 'Книжная' : 'Альбомная') + '), ' + 
                    this.selected.pages_count + ' стр. (включая обложку)';
            } else if (this.selected.good === 'presentation') {
                let sCount = this.selected.presentation_only_block ? 0 : 2;
                for (let b of this.selected.presentation_blocks) sCount += Number(b.sheets);
                return this.sizes.leaflet[this.selected.size].name + ' (' + 
                    (this.selected.orientation === 'portrait' ? 'Книжная' : 'Альбомная') + '), ' + 
                    sCount + ' листов';
            } else if (this.selected.good === 'pad') {
                let sCount = 2;
                for (let b of this.selected.presentation_blocks) sCount += Number(b.sheets);
                return this.sizes.leaflet[this.selected.size].name + ' (' + 
                    (this.selected.orientation === 'portrait' ? 'Книжная' : 'Альбомная') + '), ' + 
                    sCount + ' листов';
            } else {
                return this.sizes[this.selected.good][this.selected.size].name;
            }
        },
        spec_paper: function() {
            if (this.selected.paper === 'custom') {
                return `Своя бумага (${this.selected.custom_paper_width}x${this.selected.custom_paper_height} мм)`;
            }
            return this.papers && this.papers[this.selected.paper] ? this.papers[this.selected.paper].name : '';
        }
    },
    methods: {
        checkPassword: function() {
            let manager = this.managers.find(m => m.id === this.selectedManagerId);
            if (!manager) return;
            let entered = parseInt(this.enteredPassword.trim());
            if ((entered * 73 + 19) === manager.token) {
                this.currentManager = manager;
                this.isAuthenticated = true;
                this.authError = false;
                this.enteredPassword = '';
                if (this.rememberMe) localStorage.setItem('poly_calc_manager', manager.id);
                this.loadUserHistory();
                this.syncWithGoogleSheets();
            } else {
                this.authError = true;
            }
        },
        logout: function() {
            localStorage.removeItem('poly_calc_manager');
            this.isAuthenticated = false;
            this.currentManager = {};
            this.enteredPassword = '';
            this.rememberMe = false;
            this.currentLoadedHistoryId = null;
        },
        loadUserHistory: function() {
            if (!this.currentManager.id) return;
            let data = localStorage.getItem('poly_history_' + this.currentManager.id);
            this.userHistory = data ? JSON.parse(data) : [];
        },
        saveUserHistory: function() {
            if (!this.currentManager.id) return;
            localStorage.setItem('poly_history_' + this.currentManager.id, JSON.stringify(this.userHistory));
        },
        syncWithGoogleSheets: function() {
            if (!this.googleScriptUrl || !this.currentManager.id) return;
            this.isSyncing = true;
            fetch(this.googleScriptUrl + '?managerId=' + encodeURIComponent(this.currentManager.id))
                .then(res => res.json())
                .then(res => {
                    if (res.status === 'ok' && res.data) {
                        this.userHistory = res.data;
                        this.saveUserHistory();
                    }
                })
                .catch(err => console.error('Ошибка загрузки из Google:', err))
                .finally(() => { this.isSyncing = false; });
        },
        calcPriceForSpec: function(sel) {
            return CalcEngine.calcPriceForSpec(sel, this.config, this.papers, this.sizes, this.colors, this.laminations);
        },
        generatePositionDesc: function() {
            return CalcParsers.generatePositionDesc(
                this.selected, this.spec_size, this.spec_paper,
                this.colors, this.laminations, this.toners, this.papers, this.config
            );
        },
        addItemToTable: function() {
            if (this.result_price.doesNotFit) {
                alert('Невозможно добавить позицию: изделие не помещается на лист!');
                return;
            }
            let title = this.goods[this.selected.good] ? this.goods[this.selected.good].name : 'Позиция';
            if (this.selected.good === 'pad') {
                title = 'Блокнот';
            } else if (this.selected.good === 'presentation') {
                title = 'Презентация';
            } else if (this.selected.good === 'bag') {
                title = 'Пакет бумажный';
            } else if (this.selected.good === 'calendar') {
                title = 'Календарь настольный А5';
            }

            let desc = this.generatePositionDesc();
            let baseUnitPrice = this.result_price.one_total;
            let baseTotalPrice = this.result_price.total;
            let rate = this.config.vat_rate || 1.16;

            let displayTotal = this.includeVat ? baseTotalPrice : Math.round(baseTotalPrice / rate);
            let displayOne = this.includeVat ? baseUnitPrice : Math.round(displayTotal / this.selected.circulation);

            this.savedItems.push({
                id: this.savedItemCounter++,
                title: title,
                desc: desc,
                circulation: this.selected.circulation,
                one_total: displayOne,
                total: displayTotal,
                base_one_total: baseUnitPrice,
                base_total: baseTotalPrice,
                productionCost: this.result_price.productionCost,
                productionCostWithTax: this.result_price.productionCostWithTax,
                isManual: false,
                delivery: this.delivery_time,
                specData: JSON.parse(JSON.stringify(this.selected))
            });
            this.showNotification('Позиция добавлена в таблицу КП!');
        },
        editItem: function(idx) {
            let item = this.savedItems[idx];
            if (item.specData) {
                this.selected = JSON.parse(JSON.stringify(item.specData));
            } else {
                let restored = CalcParsers.restoreSpecFromItem(
                    item, this.selected, this.sizes, this.colors, this.laminations, this.papers
                );
                this.selected = restored;
                item.specData = JSON.parse(JSON.stringify(restored));
            }

            if (this.selected.toner1 !== 'none' || this.selected.add_extra_run || this.selected.round_corners || this.selected.cut_type === 'single' || this.selected.plotter_cut !== 'none') {
                this.showAdvancedOptions = true;
            }
            this.editingIndex = idx;
            this.showNotification(`Параметры позиции #${idx + 1} загружены!`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        updateItemInTable: function() {
            if (this.editingIndex === null) return;
            if (this.result_price.doesNotFit) {
                alert('Невозможно сохранить: изделие не помещается на лист!');
                return;
            }

            let title = this.goods[this.selected.good] ? this.goods[this.selected.good].name : 'Позиция';
            if (this.selected.good === 'pad') {
                title = 'Блокнот';
            } else if (this.selected.good === 'presentation') {
                title = 'Презентация';
            } else if (this.selected.good === 'bag') {
                title = 'Пакет бумажный';
            } else if (this.selected.good === 'calendar') {
                title = 'Календарь настольный А5';
            }

            let desc = this.generatePositionDesc();
            let baseUnitPrice = this.result_price.one_total;
            let baseTotalPrice = this.result_price.total;
            let rate = this.config.vat_rate || 1.16;

            let displayTotal = this.includeVat ? baseTotalPrice : Math.round(baseTotalPrice / rate);
            let displayOne = this.includeVat ? baseUnitPrice : Math.round(displayTotal / this.selected.circulation);

            let it = this.savedItems[this.editingIndex];
            it.title = title;
            it.desc = desc;
            it.circulation = this.selected.circulation;
            it.base_one_total = baseUnitPrice;
            it.base_total = baseTotalPrice;
            it.one_total = displayOne;
            it.total = displayTotal;
            it.productionCost = this.result_price.productionCost;
            it.productionCostWithTax = this.result_price.productionCostWithTax;
            it.isManual = false;
            it.delivery = this.delivery_time;
            it.specData = JSON.parse(JSON.stringify(this.selected));

            let savedNum = this.editingIndex + 1;
            this.editingIndex = null;
            this.showNotification(`Позиция #${savedNum} успешно обновлена!`);
            if (this.$refs.tableSection) {
                this.$refs.tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        cancelEdit: function() {
            this.editingIndex = null;
            this.showNotification('Редактирование отменено');
        },
        addManualItem: function() {
            let baseTotal = 1000, baseOne = 1000;
            let rate = this.config.vat_rate || 1.16;
            let displayTotal = this.includeVat ? baseTotal : Math.round(baseTotal / rate);
            let displayOne = this.includeVat ? baseOne : Math.round(displayTotal / 1);

            this.savedItems.push({
                id: this.savedItemCounter++,
                title: 'Индивидуальная позиция / Услуга',
                desc: 'Описание параметров (кликните для изменения)',
                circulation: 1,
                one_total: displayOne,
                total: displayTotal,
                base_one_total: baseOne,
                base_total: baseTotal,
                productionCost: 0,
                productionCostWithTax: 0,
                isManual: true,
                delivery: '',
                specData: null
            });
            this.showNotification('Добавлена строка. Введите параметры и срок вручную!');
        },
        onCellBlur: function(evt, idx, field) {
            let val = evt.target.innerText.trim();
            let it = this.savedItems[idx];
            let rate = this.config.vat_rate || 1.16;

            if (field === 'circulation' || field === 'one_total') {
                let num = parseFloat(val.replace(/\s+/g, '').replace(',', '.')) || 0;
                it[field] = num;
                it.total = Math.round(it.circulation * it.one_total);
                it.base_total = this.includeVat ? it.total : Math.round(it.total * rate);
                it.base_one_total = this.includeVat ? it.one_total : Math.round(it.base_total / it.circulation);
            } else if (field === 'total') {
                it.total = parseFloat(val.replace(/\s+/g, '').replace(',', '.')) || 0;
                it.base_total = this.includeVat ? it.total : Math.round(it.total * rate);
                it.one_total = Math.round(it.total / (it.circulation || 1));
                it.base_one_total = Math.round(it.base_total / (it.circulation || 1));
            } else {
                it[field] = val;
            }
        },
        onDescBlur: function(evt, idx) {
            this.savedItems[idx].desc = evt.target.innerHTML;
        },
        removeItem: function(idx) {
            if (this.editingIndex === idx) this.editingIndex = null;
            this.savedItems.splice(idx, 1);
            this.showNotification('Позиция удалена');
        },
        clearTable: function() {
            if (confirm('Очистить текущую таблицу КП?')) {
                this.savedItems = [];
                this.editingIndex = null;
                this.currentLoadedHistoryId = null;
                this.showNotification('Таблица очищена');
            }
        },

        // --- ГЕНЕРАЦИЯ HTML ДЛЯ PDF И WORD ---
        generateWordTableHtml: function() {
            let comp = this.companyName ? this.companyName.trim().toUpperCase() : 'БЕЗ НАЗВАНИЯ';
            let title = `КП ${this.currentDateFormatted} ${comp}`;
            let vatLabel = this.includeVat ? 'с учетом НДС' : 'без учета НДС';
            
            let rowsHtml = '';
            this.savedItems.forEach((it, idx) => {
                rowsHtml += `
                <tr>
                    <td align="center" valign="middle" style="border: 1px solid #000000; padding: 6px; text-align: center; vertical-align: middle; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
                        <span>${idx + 1}</span>
                    </td>
                    <td align="center" valign="middle" style="border: 1px solid #000000; padding: 6px; text-align: center; vertical-align: middle; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
                        <strong>${it.title}</strong>
                    </td>
                    <td align="left" valign="top" style="border: 1px solid #000000; padding: 6px; text-align: left; vertical-align: top; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
                        <span>${it.desc}</span>
                    </td>
                    <td align="center" valign="middle" style="border: 1px solid #000000; padding: 6px; text-align: center; vertical-align: middle; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
                        <span>${it.circulation}</span>
                    </td>
                    <td align="center" valign="middle" style="border: 1px solid #000000; padding: 6px; text-align: center; vertical-align: middle; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
                        <span>${it.one_total}</span>
                    </td>
                    <td align="center" valign="middle" style="border: 1px solid #000000; padding: 6px; text-align: center; vertical-align: middle; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
                        <strong>${it.total}</strong>
                    </td>
                    <td align="center" valign="middle" style="border: 1px solid #000000; padding: 6px; text-align: center; vertical-align: middle; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
                        <span>${it.delivery || '-'}</span>
                    </td>
                </tr>`;
            });

            return `
            <table width="100%" border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #000000; text-decoration: none;">
                <colgroup>
                    <col width="5%">
                    <col width="16%">
                    <col width="34%">
                    <col width="10%">
                    <col width="12%">
                    <col width="12%">
                    <col width="11%">
                </colgroup>
                <thead>
                    <tr>
                        <th colspan="7" align="center" style="border: 1px solid #000000; padding: 8px; text-align: center; background-color: #f2f2f2; font-size: 15px; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">
                            <strong>${title}</strong>
                        </th>
                    </tr>
                    <tr style="background-color: #f9f9f9;">
                        <th align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">№</th>
                        <th align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">Наименование</th>
                        <th align="left" style="border: 1px solid #000000; padding: 6px; text-align: left; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">Данные</th>
                        <th align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">Кол-во / шт</th>
                        <th align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">Стоимость за единицу / теңге</th>
                        <th align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">Итого / теңге</th>
                        <th align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">Срок / рабочие дни</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f9f9f9; font-weight: bold;">
                        <td colspan="5" align="right" style="border: 1px solid #000000; padding: 6px; text-align: right; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">
                            <strong>ИТОГО ПО ЗАКАЗУ (${vatLabel}):</strong>
                        </td>
                        <td align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">
                            <strong>${this.grandTotal}</strong>
                        </td>
                        <td align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">
                            <span>${this.maxDeliveryTime}</span>
                        </td>
                    </tr>
                </tfoot>
            </table>`;
        },

        // --- ГЕНЕРАЦИЯ ОБЫЧНОГО ТЕКСТА ---
        generatePlainText: function() {
            let comp = this.companyName ? this.companyName.trim().toUpperCase() : 'БЕЗ НАЗВАНИЯ';
            let text = `КП ${this.currentDateFormatted} ${comp}\n\n`;
            this.savedItems.forEach((it, idx) => {
                text += `${idx + 1}. ${it.title}\n`;
                text += `${it.desc.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '')}\n`;
                text += `Кол-во: ${it.circulation} шт. | Цена: ${it.one_total} тг | Итого: ${it.total} тг | Срок: ${it.delivery || '-'}\n\n`;
            });
            text += `ИТОГО ПО ЗАКАЗУ: ${this.grandTotal} тг\nСрок: ${this.maxDeliveryTime}`;
            return text;
        },

        // --- ЦЕНТРАЛИЗОВАННОЕ СОХРАНЕНИЕ В ИСТОРИЮ ---
        saveCurrentToHistory: function() {
            let summaryTitles = this.savedItems.map(i => `${i.title} (${i.circulation} шт)`).join(', ');
            let targetId = this.currentLoadedHistoryId || Date.now();
            let isUpdate = !!this.currentLoadedHistoryId;

            let record = {
                id: targetId,
                managerId: this.currentManager.id,
                managerName: this.currentManager.name,
                date: this.currentDateFormatted,
                company: this.companyName ? this.companyName.trim() : '',
                includeVat: this.includeVat,
                items: JSON.parse(JSON.stringify(this.savedItems)),
                total: this.grandTotal,
                summary: summaryTitles
            };

            if (isUpdate) {
                let idx = this.userHistory.findIndex(h => h.id === targetId);
                if (idx !== -1) this.$set(this.userHistory, idx, record);
            } else {
                this.userHistory.unshift(record);
                this.currentLoadedHistoryId = targetId;
            }
            this.saveUserHistory();

            if (this.googleScriptUrl && this.googleScriptUrl.startsWith('http')) {
                this.isSyncing = true;
                fetch(this.googleScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'save', record: record })
                })
                .then(r => r.json())
                .catch(err => console.error('Ошибка сохранения в Google:', err))
                .finally(() => { this.isSyncing = false; });
            }
        },

        // --- ЭКСПОРТ В PDF (вызов внешнего модуля pdf.js) ---
        exportToPDF: function() {
            if (this.savedItems.length === 0) {
                this.showNotification('Таблица пуста!');
                return;
            }

            this.showNotification('Файл скачивается...');
            
            if (typeof PdfGenerator === 'undefined') {
                alert('Генератор PDF не загружен. Проверьте подключение pdf.js!');
                return;
            }

            // Передаем данные + текущего менеджера в генератор
            PdfGenerator.download(
                this.savedItems, 
                this.companyName, 
                this.currentDateFormatted, 
                this.includeVat, 
                this.grandTotal, 
                this.maxDeliveryTime,
                this.currentManager
            );

            this.saveCurrentToHistory();
        },

        // --- КОПИРОВАНИЕ В БУФЕР ОБМЕНА ---
        fallbackCopy: function(html, plain) {
            let handler = function(e) {
                e.clipboardData.setData('text/html', html);
                e.clipboardData.setData('text/plain', plain);
                e.preventDefault();
            };
            document.addEventListener('copy', handler);
            document.execCommand('copy');
            document.removeEventListener('copy', handler);
        },
        copyTable: function() {
            if (this.savedItems.length === 0) return;
            
            let html = this.generateWordTableHtml();
            let plain = this.generatePlainText();

            if (navigator.clipboard && window.ClipboardItem) {
                let htmlBlob = new Blob([html], { type: 'text/html' });
                let textBlob = new Blob([plain], { type: 'text/plain' });
                navigator.clipboard.write([
                    new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
                ]).catch(() => { this.fallbackCopy(html, plain); });
            } else {
                this.fallbackCopy(html, plain);
            }

            this.showNotification('КП скопировано в буфер обмена!');
            this.saveCurrentToHistory();
        },

        loadFromHistory: function(record) {
            if (this.savedItems.length > 0) {
                if (!confirm('Текущая таблица будет заменена. Продолжить?')) return;
            }
            this.companyName = record.company || '';
            let items = JSON.parse(JSON.stringify(record.items || []));
            items.forEach(it => {
                if (it.specData && (!it.productionCost || it.productionCost === 0)) {
                    let p = this.calcPriceForSpec(it.specData);
                    it.productionCost = p.productionCost;
                    it.productionCostWithTax = p.productionCostWithTax;
                }
            });
            this.savedItems = items;
            this.editingIndex = null;
            this.currentLoadedHistoryId = record.id;
            this.includeVat = (record.includeVat !== undefined) ? record.includeVat : true;
            this.showNotification(`КП для «${record.company || 'Без названия'}» загружено!`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        deleteHistoryRecord: function(id) {
            if (confirm('Удалить этот расчет из истории?')) {
                if (this.currentLoadedHistoryId === id) this.currentLoadedHistoryId = null;
                this.userHistory = this.userHistory.filter(h => h.id !== id);
                this.saveUserHistory();
                if (this.googleScriptUrl) {
                    this.isSyncing = true;
                    fetch(this.googleScriptUrl, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'delete', id: id })
                    }).finally(() => { this.isSyncing = false; });
                }
                this.showNotification('Запись удалена');
            }
        },
        clearHistory: function() {
            if (confirm('Удалить ВСЮ историю расчетов?')) {
                this.userHistory = [];
                this.currentLoadedHistoryId = null;
                this.saveUserHistory();
                this.showNotification('История очищена');
            }
        },
        addBlock: function() {
            this.selected.presentation_blocks.push({
                id: this.blockIdCounter++,
                sheets: 20, paper: 'p16', color: '4_4', lamination: 'none', toner: 'none', toner_usd: 0
            });
        },
        removeBlock: function(idx) {
            this.selected.presentation_blocks.splice(idx, 1);
        },
        validatePages: function() {
            let p = parseInt(this.selected.pages_count);
            if (!p || p < 4) {
                this.selected.pages_count = 4;
            } else if (p % 4 !== 0) {
                this.selected.pages_count = Math.max(4, Math.round(p / 4) * 4);
            }
        },
        showNotification: function(msg) {
            this.toastMessage = msg;
            this.showToast = true;
            setTimeout(() => { this.showToast = false; }, 2500);
        },
        setDefaultSize: function() {
            if (this.sizes && this.sizes[this.selected.good]) {
                this.selected.size = Object.keys(this.sizes[this.selected.good])[0];
            }
            this.selected.lamination = 'none';
            this.selected.cover_lamination = 'none';
            this.selected.block_lamination = 'none';
            this.selected.round_corners = false;
            this.selected.cover_plotter_cut = 'none';
            this.selected.back_cover_plotter_cut = 'none';
            this.selected.envelope_size = 'small';
            this.selected.envelope_price = 25;
            this.selected.block_toner = 'none';
            this.selected.block_toners_usd = 0;

            if (this.selected.good === 'envelope' || this.selected.good === 'sticker') {
                this.selected.color = '4_0';
            }
            if (this.selected.good === 'bag') {
                this.selected.bag_size = 'bag_350_225_80';
                this.selected.paper = 'p51';
                this.selected.color = '4_0';
                this.selected.lamination = 'press_matt_1_0';
                this.selected.bag_production = 'plotter';
            }
            if (this.selected.good === 'calendar') {
                this.selected.size = 'a5_desk';
                this.selected.calendar_sheets = 7;
                this.selected.calendar_spring = 'white';
                this.selected.calendar_stand_type = 'hard_cover';
                this.selected.calendar_stand_color = '0_0';
                this.selected.calendar_stand_lamination = 'none';
                this.selected.calendar_block_paper = 'p6';
                this.selected.color = '4_4';
                this.selected.lamination = 'none';
            }
            if (this.selected.good === 'sticker') {
                this.selected.paper = 'p36';
                this.selected.plotter_cut = 'plotter';
            } else if (this.selected.good !== 'bag') {
                this.selected.plotter_cut = 'none';
                if (this.selected.paper === 'p36' || this.selected.paper === 'p37') {
                    this.selected.paper = 'p8';
                }
            }
            if (this.selected.good === 'presentation') {
                this.selected.size = 'a4';
                this.selected.orientation = 'landscape';
                this.selected.cover_paper = 'p8';
                this.selected.cover_color = '4_0';
                this.selected.cover_lamination = 'none';
                this.selected.cover_toner = 'none';
                this.selected.cover_toner_usd = 0;
                this.selected.back_cover_paper = 'p8';
                this.selected.back_cover_color = '0_0';
                this.selected.back_cover_lamination = 'none';
                this.selected.back_cover_toner = 'none';
                this.selected.back_cover_toner_usd = 0;
                this.selected.presentation_type = 'presentation';
                this.selected.binding_edge = 'short';
                this.selected.presentation_blocks = [
                    { id: 1, sheets: 20, paper: 'p16', color: '4_4', lamination: 'none', toner: 'none', toner_usd: 0 }
                ];
            }

            this.selected.toner1 = 'none';
            this.selected.toner1_usd = 0;
            this.selected.add_extra_run = false;
            this.selected.toner2 = 'none';
            this.selected.toner2_usd = 0;
        },
        isNumber: function(evt) {
            evt = evt || window.event;
            var charCode = evt.which ? evt.which : evt.keyCode;
            if ((charCode > 31 && (charCode < 48 || charCode > 57)) && charCode !== 46) evt.preventDefault();
            else return true;
        }
    }
});
