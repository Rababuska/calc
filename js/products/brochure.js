window.ProductModules = window.ProductModules || {};

window.ProductModules['brochure'] = {
    calcLayout: function(sel, config, papers, sizes, laminations) {
        let isLandscape = sel.orientation === 'landscape';
        let pageW = sizes.brochure[sel.size].w;
        let pageH = sizes.brochure[sel.size].h;
        let spreadW = isLandscape ? pageH * 2 : pageW * 2;
        let spreadH = isLandscape ? pageW : pageH;

        let outer = config.bleeds / 2;
        let gapY = config.bleeds / 2;
        let gapX = 5;

        let coverPaper = CalcEngine.getPaperDef(sel.cover_paper, sel, papers);
        if (CalcEngine.isLaminated(sel.cover_lamination, laminations)) { coverPaper.w = 420; coverPaper.h = 297; }
        let coverYield = CalcEngine.calcYield(spreadW, spreadH, coverPaper.w, coverPaper.h, gapX, gapY, outer, config.margins);

        let blockPaper = CalcEngine.getPaperDef(sel.block_paper, sel, papers);
        if (CalcEngine.isLaminated(sel.block_lamination, laminations)) { blockPaper.w = 420; blockPaper.h = 297; }
        let blockYield = CalcEngine.calcYield(spreadW, spreadH, blockPaper.w, blockPaper.h, gapX, gapY, outer, config.margins);

        return {
            base: { yield: 1 },
            cover: { yield: coverYield },
            block: { yield: blockYield },
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] },
            svg: { paperW: coverPaper.w, paperH: coverPaper.h, items: [] }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors, laminations) {
        let profitMult = config.profit_per_one;
        let lay = this.calcLayout(sel, config, papers, sizes, laminations);

        let doesNotFit = lay.cover.yield === 0 || (sel.pages_count > 4 && lay.block.yield === 0);
        let yCover = lay.cover.yield || 1;
        let yBlock = lay.block.yield || 1;

        let coverSheets = Math.ceil(sel.circulation / yCover);
        let blockSheets = sel.pages_count > 4 ? Math.ceil((sel.circulation * ((sel.pages_count - 4) / 4)) / yBlock) : 0;
        let totalPapersCount = coverSheets + blockSheets;

        let coverPaperDef = CalcEngine.getPaperDef(sel.cover_paper, sel, papers);
        let blockPaperDef = CalcEngine.getPaperDef(sel.block_paper, sel, papers);

        let coverPaperPrice = sel.cover_paper === 'custom' ? sel.custom_paper_price : papers[sel.cover_paper].price;
        let blockPaperPrice = sel.block_paper === 'custom' ? sel.custom_paper_price : papers[sel.block_paper].price;

        let coverColorPrice = CalcEngine.getColorPrice(sel.cover_color, coverPaperDef, false, sel, config);
        let blockColorPrice = CalcEngine.getColorPrice(sel.block_color, blockPaperDef, false, sel, config);

        let coverLaminationPrice = CalcEngine.getLamPrice(sel.cover_lamination, coverPaperDef, false, laminations);
        let blockLaminationPrice = CalcEngine.getLamPrice(sel.block_lamination, blockPaperDef, false, laminations);

        let coverPlotterCost = 0;
        if (sel.cover_plotter_cut === 'plotter') coverPlotterCost = config.plotter_sra3 * CalcEngine.getLenFactor(coverPaperDef);
        if (sel.cover_plotter_cut === 'plotter_perf') coverPlotterCost = config.plotter_perf_sra3 * CalcEngine.getLenFactor(coverPaperDef);

        let cRunCost = CalcEngine.getBaseRunCost(coverPaperDef, false, sel, config);
        let toner1Runs = (sel.toner1 !== 'none') ? cRunCost * 2 : 0;
        let toner1Lump = (sel.toner1 !== 'none') ? (Number(sel.toner1_usd) || 0) * config.usd_rate : 0;
        let toner2Runs = (sel.add_extra_run && sel.toner2 !== 'none') ? cRunCost * 2 : (sel.add_extra_run ? cRunCost : 0);
        let toner2Lump = (sel.add_extra_run && sel.toner2 !== 'none') ? (Number(sel.toner2_usd) || 0) * config.usd_rate : 0;

        let coverCostPerSheet = coverPaperPrice + coverColorPrice + coverLaminationPrice + toner1Runs + toner2Runs + coverPlotterCost;
        let blockCostPerSheet = blockPaperPrice + blockColorPrice + blockLaminationPrice;

        let blockTonerLump = 0;
        if (sel.block_toner !== 'none') {
            let bRunC = CalcEngine.getBaseRunCost(blockPaperDef, false, sel, config);
            let bTonUsd = (Number(sel.block_toners_usd) || 0) * config.usd_rate;
            let bTonRuns = blockSheets * bRunC * 2;
            blockTonerLump = bTonUsd + bTonRuns;
        }

        let productionCost = (coverSheets * coverCostPerSheet) + toner1Lump + toner2Lump + (blockSheets * blockCostPerSheet) + blockTonerLump;
        let costPerPiece = productionCost / sel.circulation;
        let unitPrice = Math.ceil((costPerPiece * config.tax) * profitMult);
        let totalPrice = unitPrice * sel.circulation;

        return {
            doesNotFit: doesNotFit,
            one_total: doesNotFit ? 0 : Math.round(unitPrice),
            total: doesNotFit ? 'НЕ ПОМЕЩАЕТСЯ' : Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCost * config.tax),
            totalPapersCount: totalPapersCount,
            paperPrice: 0,
            colorPrice: 0,
            laminationPrice: 0,
            totalCostPerSheet: Math.round(productionCost / sel.circulation),
            plotterCost: 0,
            coverSheets: coverSheets,
            blockSheets: blockSheets,
            coverCostPerSheet: Math.round(coverCostPerSheet),
            blockCostPerSheet: Math.round(blockCostPerSheet)
        };
    },

    calcDelivery: function(sel) {
        let circ = Number(sel.circulation) || 0;
        let add = Math.floor(circ / 100);
        return (4 + add) + '-' + (6 + add);
    }
};