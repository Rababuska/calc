window.ProductModules = window.ProductModules || {};

window.ProductModules['business-card'] = {
    calcLayout: function(sel, config, papers, sizes, laminations) {
        let isSingle = sel.cut_type === 'single';
        let outer = isSingle ? 0 : config.bleeds / 2;
        let gapY = isSingle ? 0 : config.bleeds / 2;
        let gapX = isSingle ? 0 : config.bleeds / 2;

        let paper = CalcEngine.getPaperDef(sel.paper, sel, papers);
        if (CalcEngine.isLaminated(sel.lamination, laminations)) { paper.w = 420; paper.h = 297; }

        let itemW = sel.custom_width || 90;
        let itemH = sel.custom_height || 50;

        let calcRes = CalcEngine.calcYieldDetailed(itemW, itemH, paper.w, paper.h, gapX, gapY, outer, config.margins);
        return {
            base: { yield: calcRes.yield },
            cover: { yield: 1 }, block: { yield: 1 },
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] },
            svg: { paperW: paper.w, paperH: paper.h, items: calcRes.items }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors, laminations) {
        let profitMult = config.profit_business_card; // Наценка 3.0 на визитки
        let lay = this.calcLayout(sel, config, papers, sizes, laminations);
        let y = lay.base.yield || 1;
        let doesNotFit = lay.base.yield === 0;

        let sheets = Math.ceil(sel.circulation / y);
        let paperDef = CalcEngine.getPaperDef(sel.paper, sel, papers);
        let paperPrice = sel.paper === 'custom' ? sel.custom_paper_price : papers[sel.paper].price;
        let colorPrice = CalcEngine.getColorPrice(sel.color, paperDef, false, sel, config);
        let laminationPrice = CalcEngine.getLamPrice(sel.lamination, paperDef, false, laminations);

        let runCost = CalcEngine.getBaseRunCost(paperDef, false, sel, config);
        let toner1Cost = (sel.toner1 !== 'none') ? runCost * 2 : 0;
        let toner1Lump = (sel.toner1 !== 'none') ? (Number(sel.toner1_usd) || 0) * config.usd_rate : 0;
        let toner2Cost = (sel.add_extra_run && sel.toner2 !== 'none') ? runCost * 2 : (sel.add_extra_run ? runCost : 0);
        let toner2Lump = (sel.add_extra_run && sel.toner2 !== 'none') ? (Number(sel.toner2_usd) || 0) * config.usd_rate : 0;

        let roundCornersPrice = sel.round_corners ? (config.selling_round_corners_price / (config.tax * profitMult)) : 0;
        let costPerSheet = paperPrice + colorPrice + laminationPrice + toner1Cost + toner2Cost;
        let productionCost = (sheets * costPerSheet) + toner1Lump + toner2Lump + (sel.circulation * roundCornersPrice);

        let costPerPiece = productionCost / sel.circulation;
        let unitPrice = Math.ceil((costPerPiece * config.tax) * profitMult);
        let totalPrice = unitPrice * sel.circulation;

        return {
            doesNotFit: doesNotFit,
            one_total: doesNotFit ? 0 : Math.round(unitPrice),
            total: doesNotFit ? 'НЕ ПОМЕЩАЕТСЯ' : Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCost * config.tax),
            totalPapersCount: sheets,
            paperPrice: Math.round(paperPrice),
            colorPrice: Math.round(colorPrice),
            laminationPrice: Math.round(laminationPrice),
            totalCostPerSheet: Math.round(costPerSheet),
            plotterCost: 0
        };
    },

    calcDelivery: function(sel) { return '1-3'; },

    generateDesc: function(sel, specSize, specPaper, colors, laminations) {
        let desc = 'Размер: ' + specSize + '<br/>' +
                   'Цветность: ' + (colors[sel.color] ? colors[sel.color].name : sel.color) + '<br/>' +
                   'Ламинация: ' + (laminations[sel.lamination] ? laminations[sel.lamination].name : 'Без припресса') + '<br/>' +
                   'Бумага: ' + specPaper + '<br/>';
        if (sel.round_corners) desc += 'Скругление углов<br/>';
        return desc;
    }
};