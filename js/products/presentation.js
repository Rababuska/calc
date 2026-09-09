// ==========================================================================
// МОДУЛЬ ПРОДУКТА: ПРЕЗЕНТАЦИИ (js/products/presentation.js)
// ==========================================================================

window.ProductModules = window.ProductModules || {};

window.ProductModules['presentation'] = {
    calcLayout: function(sel, config, papers, sizes, laminations) {
        let isLandscape = sel.orientation === 'landscape';
        let pageW = sizes.leaflet[sel.size].w;
        let pageH = sizes.leaflet[sel.size].h;
        let w = isLandscape ? pageH : pageW;
        let h = isLandscape ? pageW : pageH;

        let outer = config.bleeds / 2;
        let gapY = config.bleeds / 2;
        let gapX = 5;

        let coverYield = 1;
        let backCoverYield = 1;

        if (!sel.presentation_only_block) {
            let cPaper = CalcEngine.getPaperDef(sel.cover_paper, sel, papers);
            if (CalcEngine.isLaminated(sel.cover_lamination, laminations)) { cPaper.w = 420; cPaper.h = 297; }
            coverYield = CalcEngine.calcYield(w, h, cPaper.w, cPaper.h, gapX, gapY, outer, config.margins);

            let bcPaper = CalcEngine.getPaperDef(sel.back_cover_paper, sel, papers);
            if (CalcEngine.isLaminated(sel.back_cover_lamination, laminations)) { bcPaper.w = 420; bcPaper.h = 297; }
            backCoverYield = CalcEngine.calcYield(w, h, bcPaper.w, bcPaper.h, gapX, gapY, outer, config.margins);
        }

        let blocksYield = [];
        for (let b of sel.presentation_blocks) {
            let bPaper = CalcEngine.getPaperDef(b.paper, sel, papers);
            if (CalcEngine.isLaminated(b.lamination, laminations)) { bPaper.w = 420; bPaper.h = 297; }
            blocksYield.push(CalcEngine.calcYield(w, h, bPaper.w, bPaper.h, gapX, gapY, outer, config.margins));
        }

        return {
            base: { yield: 1 },
            cover: { yield: 1 },
            block: { yield: 1 },
            presentation: {
                cover_yield: coverYield,
                back_cover_yield: backCoverYield,
                blocks_yield: blocksYield
            },
            svg: { paperW: 450, paperH: 320, items: [] }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors, laminations) {
        let profitMult = config.profit_per_one;
        let lay = this.calcLayout(sel, config, papers, sizes, laminations);

        let doesNotFit = false;
        if (!sel.presentation_only_block) {
            if (lay.presentation.cover_yield === 0 || lay.presentation.back_cover_yield === 0) doesNotFit = true;
        }
        if (lay.presentation.blocks_yield.some(y => y === 0)) doesNotFit = true;

        let totalCoverCost = 0;
        let totalBackCost = 0;
        let coverSheets = 0;
        let backSheets = 0;
        let totalPresSheetsPerItem = 0;

        // Если обложки включены
        if (!sel.presentation_only_block) {
            let yCover = lay.presentation.cover_yield || 1;
            let yBack = lay.presentation.back_cover_yield || 1;

            coverSheets = Math.ceil(sel.circulation / yCover);
            backSheets = Math.ceil(sel.circulation / yBack);
            totalPresSheetsPerItem += 2;

            // Обложка
            let cPaperDef = CalcEngine.getPaperDef(sel.cover_paper, sel, papers);
            let cPaperPrice = sel.cover_paper === 'custom' ? sel.custom_paper_price : papers[sel.cover_paper].price;
            let cColorPrice = CalcEngine.getColorPrice(sel.cover_color, cPaperDef, false, sel, config);
            let cLamPrice = CalcEngine.getLamPrice(sel.cover_lamination, cPaperDef, false, laminations);
            let cRunCost = CalcEngine.getBaseRunCost(cPaperDef, false, sel, config);
            let cTonerRuns = sel.cover_toner !== 'none' ? cRunCost * 2 : 0;
            let cTonerLump = sel.cover_toner !== 'none' ? (Number(sel.cover_toner_usd) || 0) * config.usd_rate : 0;
            let cPlotter = (sel.cover_plotter_cut === 'plotter') ? config.plotter_sra3 * CalcEngine.getLenFactor(cPaperDef) : ((sel.cover_plotter_cut === 'plotter_perf') ? config.plotter_perf_sra3 * CalcEngine.getLenFactor(cPaperDef) : 0);

            let coverCostPerSheet = cPaperPrice + cColorPrice + cLamPrice + cTonerRuns + cPlotter;
            totalCoverCost = (coverSheets * coverCostPerSheet) + cTonerLump;

            // Подложка
            let bcPaperDef = CalcEngine.getPaperDef(sel.back_cover_paper, sel, papers);
            let bcPaperPrice = sel.back_cover_paper === 'custom' ? sel.custom_paper_price : papers[sel.back_cover_paper].price;
            let bcColorPrice = CalcEngine.getColorPrice(sel.back_cover_color, bcPaperDef, false, sel, config);
            let bcLamPrice = CalcEngine.getLamPrice(sel.back_cover_lamination, bcPaperDef, false, laminations);
            let bcRunCost = CalcEngine.getBaseRunCost(bcPaperDef, false, sel, config);
            let bcTonerRuns = sel.back_cover_toner !== 'none' ? bcRunCost * 2 : 0;
            let bcTonerLump = sel.back_cover_toner !== 'none' ? (Number(sel.back_cover_toner_usd) || 0) * config.usd_rate : 0;
            let bcPlotter = (sel.back_cover_plotter_cut === 'plotter') ? config.plotter_sra3 * CalcEngine.getLenFactor(bcPaperDef) : ((sel.back_cover_plotter_cut === 'plotter_perf') ? config.plotter_perf_sra3 * CalcEngine.getLenFactor(bcPaperDef) : 0);

            let backCostPerSheet = bcPaperPrice + bcColorPrice + bcLamPrice + bcTonerRuns + bcPlotter;
            totalBackCost = (backSheets * backCostPerSheet) + bcTonerLump;
        }

        // Внутренние блоки
        let totalBlocksCost = 0;
        let blockSheetsCount = 0;

        for (let i = 0; i < sel.presentation_blocks.length; i++) {
            let b = sel.presentation_blocks[i];
            let yBlock = lay.presentation.blocks_yield[i] || 1;
            let bSra3Sheets = Math.ceil((sel.circulation * b.sheets) / yBlock);
            blockSheetsCount += bSra3Sheets;
            totalPresSheetsPerItem += Number(b.sheets);

            let bPaperDef = CalcEngine.getPaperDef(b.paper, sel, papers);
            let bPaperPrice = b.paper === 'custom' ? sel.custom_paper_price : papers[b.paper].price;
            let bColorPrice = CalcEngine.getColorPrice(b.color, bPaperDef, false, sel, config);
            let bLamPrice = CalcEngine.getLamPrice(b.lamination, bPaperDef, false, laminations);
            let bRunC = CalcEngine.getBaseRunCost(bPaperDef, false, sel, config);
            let bTonerRuns = b.toner !== 'none' ? bRunC * 2 : 0;
            let bTonerLump = b.toner !== 'none' ? (Number(b.toner_usd) || 0) * config.usd_rate : 0;

            let bCostPerSheet = bPaperPrice + bColorPrice + bLamPrice + bTonerRuns;
            totalBlocksCost += (bSra3Sheets * bCostPerSheet) + bTonerLump;
        }

        // Выбор базового тарифа пружины (металл / пластик)
        let isPlastic = sel.presentation_spring_type === 'plastic';
        let baseBindRate = isPlastic 
            ? (config.presentation_bind_plastic || 350) 
            : (config.presentation_bind_metal || 500);

        let bindPerItem = baseBindRate + Math.max(0, totalPresSheetsPerItem - 20) * 1;
        let totalBindCost = bindPerItem * sel.circulation;

        let productionCost = totalCoverCost + totalBackCost + totalBlocksCost + totalBindCost;
        let costPerPiece = productionCost / sel.circulation;
        let unitPrice = Math.ceil((costPerPiece * config.tax) * profitMult);
        let totalPrice = unitPrice * sel.circulation;

        return {
            doesNotFit: doesNotFit,
            one_total: doesNotFit ? 0 : Math.round(unitPrice),
            total: doesNotFit ? 'НЕ ПОМЕЩАЕТСЯ' : Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCost * config.tax),
            totalPapersCount: coverSheets + backSheets + blockSheetsCount,
            paperPrice: 0,
            colorPrice: 0,
            laminationPrice: 0,
            totalCostPerSheet: Math.round(productionCost / sel.circulation),
            plotterCost: 0
        };
    },

    calcDelivery: function(sel) {
        let circ = Number(sel.circulation) || 0;
        let add = Math.floor(circ / 100);
        return (4 + add) + '-' + (6 + add);
    }
};