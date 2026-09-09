window.ProductModules = window.ProductModules || {};

window.ProductModules['envelope'] = {
    calcLayout: function(sel) {
        return {
            base: { yield: 1 }, cover: { yield: 1 }, block: { yield: 1 },
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] },
            svg: { paperW: 450, paperH: 320, items: [] }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors) {
        let profitMult = config.profit_per_one;
        let sheets = Number(sel.circulation) || 1;
        let paperPrice = Number(sel.envelope_price) || 0;
        let colorPrice = CalcEngine.getColorPrice(sel.color, null, true, sel, config);

        let runCost = CalcEngine.getBaseRunCost(null, true, sel, config);
        let toner1Cost = (sel.toner1 !== 'none') ? runCost * 2 : 0;
        let toner1Lump = (sel.toner1 !== 'none') ? (Number(sel.toner1_usd) || 0) * config.usd_rate : 0;
        let toner2Cost = (sel.add_extra_run && sel.toner2 !== 'none') ? runCost * 2 : (sel.add_extra_run ? runCost : 0);
        let toner2Lump = (sel.add_extra_run && sel.toner2 !== 'none') ? (Number(sel.toner2_usd) || 0) * config.usd_rate : 0;

        let costPerItem = paperPrice + colorPrice + toner1Cost + toner2Cost;
        let productionCost = (sheets * costPerItem) + toner1Lump + toner2Lump;

        let costPerPiece = productionCost / sel.circulation;
        let unitPrice = Math.ceil((costPerPiece * config.tax) * profitMult);
        let totalPrice = unitPrice * sel.circulation;

        return {
            doesNotFit: false,
            one_total: Math.round(unitPrice),
            total: Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCost * config.tax),
            totalPapersCount: sheets,
            paperPrice: Math.round(paperPrice),
            colorPrice: Math.round(colorPrice),
            laminationPrice: 0,
            totalCostPerSheet: Math.round(costPerItem),
            plotterCost: 0
        };
    },

    calcDelivery: function(sel) {
        let circ = Number(sel.circulation) || 0;
        let add = Math.floor(circ / 500);
        return (3 + add) + '-' + (5 + add);
    },

    generateDesc: function(sel, specSize, specPaper, colors) {
        return 'Цветность: ' + (colors[sel.color] ? colors[sel.color].name : sel.color) + '<br/>' +
               'Конверт (' + (sel.envelope_size === 'small' ? 'До С4 включительно' : 'Больше С4') + ')<br/>';
    }
};