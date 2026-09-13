window.ProductModules = window.ProductModules || {};

window.ProductModules['brochure'] = {
    calcLayout: function(selected, config, papers, sizes, laminations) {
        let isLandscape = selected.orientation === 'landscape';
        let pageW = sizes.brochure[selected.size].w;
        let pageH = sizes.brochure[selected.size].h;
        
        let spreadW = isLandscape ? pageH * 2 : pageW * 2;
        let spreadH = isLandscape ? pageW : pageH;

        let gapX = 5;
        let gapY = (config.bleeds || 6) / 2;
        let outer = (config.bleeds || 6) / 2;

        let calcN = function(paperUsable, itemNet, currentGap) {
            if (paperUsable < itemNet + 2 * outer) return 0;
            return Math.floor((paperUsable + currentGap - 2 * outer) / (itemNet + currentGap));
        };
        let calcYield = function(netW, netH, paperW, paperH) {
            let uW = paperW - (config.margins || 4);
            let uH = paperH - (config.margins || 4);
            let opt1 = calcN(uW, netW, gapX) * calcN(uH, netH, gapY);
            let opt2 = calcN(uW, netH, gapX) * calcN(uH, netW, gapY);
            return Math.max(opt1, opt2);
        };

        let getPaper = function(key) {
            if (key === 'custom') return { w: selected.custom_paper_width || 450, h: selected.custom_paper_height || 320 };
            return papers[key] ? { w: papers[key].w || 450, h: papers[key].h || 320 } : { w: 450, h: 320 };
        };
        let isLam = function(key) {
            return laminations[key] && laminations[key].name.toLowerCase().includes('ламинация');
        };

        let res = { cover: { yield: 1 }, block: { yield: 1 } };

        let coverPaper = getPaper(selected.cover_paper);
        if (isLam(selected.cover_lamination)) { coverPaper.w = 420; coverPaper.h = 297; }
        res.cover.yield = calcYield(spreadW, spreadH, coverPaper.w, coverPaper.h);

        let blockPaper = getPaper(selected.block_paper);
        if (isLam(selected.block_lamination)) { blockPaper.w = 420; blockPaper.h = 297; }
        res.block.yield = calcYield(spreadW, spreadH, blockPaper.w, blockPaper.h);

        return res;
    },

    calcPrice: function(selected, config, papers, sizes, colors, laminations, toners) {
        let layout = this.calcLayout(selected, config, papers, sizes, laminations);
        let doesNotFit = false;

        if (layout.cover.yield === 0) doesNotFit = true;
        if (selected.pages_count > 4 && layout.block.yield === 0) doesNotFit = true;

        let yCover = layout.cover.yield || 1;
        let yBlock = layout.block.yield || 1;

        let coverSheets = Math.ceil(selected.circulation / yCover);
        let blockSheets = Math.ceil((selected.circulation * ((selected.pages_count - 4) / 4)) / yBlock);
        let totalPapersCount = coverSheets + blockSheets;

        let getPaper = function(key) {
            if (key === 'custom') return { w: selected.custom_paper_width || 450, h: selected.custom_paper_height || 320 };
            return papers[key] ? { w: papers[key].w || 450, h: papers[key].h || 320 } : { w: 450, h: 320 };
        };
        let getLenFactor = function(pDef) {
            if (!pDef) return 1;
            let m = Math.max(pDef.w, pDef.h);
            return Math.max(1, m / 450);
        };
        let getBaseRunCost = function(pDef) {
            if (!pDef) return config.run_color || 44;
            let maxL = Math.max(pDef.w, pDef.h), minL = Math.min(pDef.w, pDef.h);
            if (maxL <= 330 && minL <= 225) return config.run_small || 25;
            if (maxL <= 490) return config.run_color || 44;
            return (config.run_small || 25) * Math.ceil(maxL / 220);
        };
        let getColorPrice = function(cKey, pDef) {
            let r = getBaseRunCost(pDef);
            if (cKey === '4_0') return r;
            if (cKey === '4_4') return r * 2;
            if (cKey === '4_1') return r + (config.run_bw || 20);
            if (cKey === '1_0') return config.run_bw || 20;
            if (cKey === '1_1') return (config.run_bw || 20) * 2;
            return 0;
        };
        let getLamPrice = function(lKey, pDef) {
            if (!laminations[lKey] || laminations[lKey].price === 0) return 0;
            return laminations[lKey].price * getLenFactor(pDef);
        };

        let coverPaperDef = getPaper(selected.cover_paper);
        let blockPaperDef = getPaper(selected.block_paper);

        let coverPaperPrice = selected.cover_paper === 'custom' ? Number(selected.custom_paper_price || 0) : (papers[selected.cover_paper] ? papers[selected.cover_paper].price : 0);
        let blockPaperPrice = selected.block_paper === 'custom' ? Number(selected.custom_paper_price || 0) : (papers[selected.block_paper] ? papers[selected.block_paper].price : 0);

        let coverColorPrice = getColorPrice(selected.cover_color, coverPaperDef);
        let blockColorPrice = getColorPrice(selected.block_color, blockPaperDef);

        let coverLaminationPrice = getLamPrice(selected.cover_lamination, coverPaperDef);
        let blockLaminationPrice = getLamPrice(selected.block_lamination, blockPaperDef);

        let coverPlotterCost = 0;
        if (selected.cover_plotter_cut === 'plotter') coverPlotterCost = (config.plotter_sra3 || 150) * getLenFactor(coverPaperDef);
        if (selected.cover_plotter_cut === 'plotter_perf') coverPlotterCost = (config.plotter_perf_sra3 || 300) * getLenFactor(coverPaperDef);

        // Тонеры обложки
        let runCostForCoverToner = getBaseRunCost(coverPaperDef);
        let toner1_runs_cost = 0;
        let toner1_usd_lump = 0;
        if (selected.toner1 && selected.toner1 !== 'none') {
            toner1_runs_cost = runCostForCoverToner * 2;
            toner1_usd_lump = (Number(selected.toner1_usd) || 0) * (config.usd_rate || 500);
        }

        let extra_run_cost = 0;
        let toner2_runs_cost = 0;
        let toner2_usd_lump = 0;
        if (selected.add_extra_run) {
            if (selected.toner2 && selected.toner2 !== 'none') {
                toner2_runs_cost = runCostForCoverToner * 2;
                toner2_usd_lump = (Number(selected.toner2_usd) || 0) * (config.usd_rate || 500);
            } else {
                extra_run_cost = runCostForCoverToner;
            }
        }

        let coverCostPerSheet = coverPaperPrice + coverColorPrice + coverLaminationPrice + toner1_runs_cost + extra_run_cost + toner2_runs_cost + coverPlotterCost;
        let blockCostPerSheet = blockPaperPrice + blockColorPrice + blockLaminationPrice;

        // Спецтонер для блока
        let block_toners_lump = 0;
        let block_toners_usd_converted = 0;
        let block_toners_runs_cost = 0;
        if (selected.block_toner && selected.block_toner !== 'none') {
            let blockRunCost = getBaseRunCost(blockPaperDef);
            block_toners_usd_converted = (Number(selected.block_toners_usd) || 0) * (config.usd_rate || 500);
            block_toners_runs_cost = blockSheets * blockRunCost * 2;
            block_toners_lump = block_toners_usd_converted + block_toners_runs_cost;
        }

        let productionCost = (coverSheets * coverCostPerSheet) + toner1_usd_lump + toner2_usd_lump + (blockSheets * blockCostPerSheet) + block_toners_lump;

        let profitMultiplier = config.profit_per_one || 2.3;
        let tax = config.tax || 1.36;
        let productionCostWithTax = productionCost * tax;
        let costPerPiece = productionCost / (selected.circulation || 1);
        let unitPrice = Math.ceil((costPerPiece * tax) * profitMultiplier);
        let totalPrice = unitPrice * selected.circulation;

        return {
            doesNotFit: doesNotFit,
            one_total: doesNotFit ? 0 : Math.round(unitPrice),
            total: doesNotFit ? 'НЕ ПОМЕЩАЕТСЯ' : Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCostWithTax),
            totalPapersCount: totalPapersCount,

            coverSheets: coverSheets,
            blockSheets: blockSheets,
            coverCostPerSheet: Math.round(coverCostPerSheet),
            blockCostPerSheet: Math.round(blockCostPerSheet),

            coverPaperPrice: Math.round(coverPaperPrice),
            coverColorPrice: Math.round(coverColorPrice),
            coverLaminationPrice: Math.round(coverLaminationPrice),
            coverPlotterCost: Math.round(coverPlotterCost),

            blockPaperPrice: Math.round(blockPaperPrice),
            blockColorPrice: Math.round(blockColorPrice),
            blockLaminationPrice: Math.round(blockLaminationPrice),

            toner1_runs_cost: Math.round(toner1_runs_cost),
            toner1_usd_lump: Math.round(toner1_usd_lump),
            extra_run_cost: Math.round(extra_run_cost),
            toner2_runs_cost: Math.round(toner2_runs_cost),
            toner2_usd_lump: Math.round(toner2_usd_lump),

            block_toners_cost: Math.round(block_toners_lump),
            block_toners_runs_cost: Math.round(block_toners_runs_cost),
            block_toners_usd_converted: Math.round(block_toners_usd_converted)
        };
    }
};
