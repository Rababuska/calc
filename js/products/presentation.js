window.ProductModules = window.ProductModules || {};

window.ProductModules['presentation'] = {
    calcLayout: function(selected, config, papers, sizes, laminations) {
        let isLandscape = selected.orientation === 'landscape';
        let leafSizes = (sizes && sizes.leaflet) ? sizes.leaflet : {};
        let sizeObj = leafSizes[selected.size] || leafSizes['a4'] || { w: 210, h: 297 };
        let pageW = sizeObj.w;
        let pageH = sizeObj.h;
        let w = isLandscape ? pageH : pageW;
        let h = isLandscape ? pageW : pageH;

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

        let cP = getPaper(selected.cover_paper);
        if (isLam(selected.cover_lamination)) { cP.w = 420; cP.h = 297; }
        let cover_yield = calcYield(w, h, cP.w, cP.h);

        let bcP = getPaper(selected.back_cover_paper);
        if (isLam(selected.back_cover_lamination)) { bcP.w = 420; bcP.h = 297; }
        let back_cover_yield = calcYield(w, h, bcP.w, bcP.h);

        let blocks_yield = [];
        if (selected.presentation_blocks) {
            for (let b of selected.presentation_blocks) {
                let bP = getPaper(b.paper);
                if (isLam(b.lamination)) { bP.w = 420; bP.h = 297; }
                blocks_yield.push(calcYield(w, h, bP.w, bP.h));
            }
        }

        return {
            cover_yield: cover_yield,
            back_cover_yield: back_cover_yield,
            blocks_yield: blocks_yield,
            presentation: {
                cover_yield: cover_yield,
                back_cover_yield: back_cover_yield,
                blocks_yield: blocks_yield
            }
        };
    },

    calcPrice: function(selected, config, papers, sizes, colors, laminations, toners) {
        let layout = this.calcLayout(selected, config, papers, sizes, laminations);
        let doesNotFit = false;

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
        let getPaper = function(key) {
            if (key === 'custom') return { w: selected.custom_paper_width || 450, h: selected.custom_paper_height || 320 };
            return papers[key] ? { w: papers[key].w || 450, h: papers[key].h || 320 } : { w: 450, h: 320 };
        };

        let yCover = layout.cover_yield || 1;
        let yBack = layout.back_cover_yield || 1;
        if (!selected.presentation_only_block && (layout.cover_yield === 0 || layout.back_cover_yield === 0)) doesNotFit = true;

        let coverSheets = selected.presentation_only_block ? 0 : Math.ceil(selected.circulation / yCover);
        let backSheets = selected.presentation_only_block ? 0 : Math.ceil(selected.circulation / yBack);

        // Обложка
        let cPaperDef = getPaper(selected.cover_paper);
        let cPaperPrice = selected.cover_paper === 'custom' ? Number(selected.custom_paper_price || 0) : (papers[selected.cover_paper] ? papers[selected.cover_paper].price : 0);
        let cColorPrice = getColorPrice(selected.cover_color, cPaperDef);
        let cLamPrice = getLamPrice(selected.cover_lamination, cPaperDef);
        let cRunCost = getBaseRunCost(cPaperDef);
        let cTonerRunsCost = selected.cover_toner !== 'none' ? cRunCost * 2 : 0;
        let cTonerUsdLump = selected.cover_toner !== 'none' ? (Number(selected.cover_toner_usd) || 0) * (config.usd_rate || 500) : 0;
        let cPlotterCost = 0;
        if (selected.cover_plotter_cut === 'plotter') cPlotterCost = (config.plotter_sra3 || 150) * getLenFactor(cPaperDef);
        if (selected.cover_plotter_cut === 'plotter_perf') cPlotterCost = (config.plotter_perf_sra3 || 300) * getLenFactor(cPaperDef);

        let coverCostPerSheet = cPaperPrice + cColorPrice + cLamPrice + cTonerRunsCost + cPlotterCost;
        let totalCoverCost = selected.presentation_only_block ? 0 : (coverSheets * coverCostPerSheet) + cTonerUsdLump;

        // Задняя обложка
        let bcPaperDef = getPaper(selected.back_cover_paper);
        let bcPaperPrice = selected.back_cover_paper === 'custom' ? Number(selected.custom_paper_price || 0) : (papers[selected.back_cover_paper] ? papers[selected.back_cover_paper].price : 0);
        let bcColorPrice = getColorPrice(selected.back_cover_color, bcPaperDef);
        let bcLamPrice = getLamPrice(selected.back_cover_lamination, bcPaperDef);
        let bcRunCost = getBaseRunCost(bcPaperDef);
        let bcTonerRunsCost = selected.back_cover_toner !== 'none' ? bcRunCost * 2 : 0;
        let bcTonerUsdLump = selected.back_cover_toner !== 'none' ? (Number(selected.back_cover_toner_usd) || 0) * (config.usd_rate || 500) : 0;
        let bcPlotterCost = 0;
        if (selected.back_cover_plotter_cut === 'plotter') bcPlotterCost = (config.plotter_sra3 || 150) * getLenFactor(bcPaperDef);
        if (selected.back_cover_plotter_cut === 'plotter_perf') bcPlotterCost = (config.plotter_perf_sra3 || 300) * getLenFactor(bcPaperDef);

        let backCostPerSheet = bcPaperPrice + bcColorPrice + bcLamPrice + bcTonerRunsCost + bcPlotterCost;
        let totalBackCost = selected.presentation_only_block ? 0 : (backSheets * backCostPerSheet) + bcTonerUsdLump;

        // Внутренние блоки
        let totalBlocksCost = 0;
        let totalPresSheetsPerItem = selected.presentation_only_block ? 0 : 2;
        let blockSheetsCount = 0;

        if (selected.presentation_blocks) {
            for (let i = 0; i < selected.presentation_blocks.length; i++) {
                let b = selected.presentation_blocks[i];
                let yBlock = layout.blocks_yield[i] || 1;
                if (yBlock === 0) doesNotFit = true;

                let itemsNeeded = selected.circulation * Number(b.sheets || 0);
                let bSra3Sheets = Math.ceil(itemsNeeded / yBlock);
                blockSheetsCount += bSra3Sheets;
                totalPresSheetsPerItem += Number(b.sheets || 0);

                let bPaperDef = getPaper(b.paper);
                let bPaperPrice = b.paper === 'custom' ? Number(selected.custom_paper_price || 0) : (papers[b.paper] ? papers[b.paper].price : 0);
                let bColorPrice = getColorPrice(b.color, bPaperDef);
                let bLamPrice = getLamPrice(b.lamination, bPaperDef);
                let bRunC = getBaseRunCost(bPaperDef);
                let bTonerRunsC = b.toner !== 'none' ? bRunC * 2 : 0;
                let bTonerUsdLump = b.toner !== 'none' ? (Number(b.toner_usd) || 0) * (config.usd_rate || 500) : 0;

                let bCostPerSheet = bPaperPrice + bColorPrice + bLamPrice + bTonerRunsC;
                totalBlocksCost += (bSra3Sheets * bCostPerSheet) + bTonerUsdLump;
            }
        }

        // Сборка на пружину
        let bindCostPerItem = (config.presentation_base_bind || 500) + Math.max(0, totalPresSheetsPerItem - 20) * 1;
        let totalBindCost = bindCostPerItem * selected.circulation;

        let productionCost = totalCoverCost + totalBackCost + totalBlocksCost + totalBindCost;
        let totalPapersCount = coverSheets + backSheets + blockSheetsCount;

        let presDetails = {
            coverSheets: coverSheets,
            coverCostPerSheet: Math.round(coverCostPerSheet),
            cTonerUsdLump: Math.round(cTonerUsdLump),
            coverPlotterCost: Math.round(cPlotterCost),
            backSheets: backSheets,
            backCostPerSheet: Math.round(backCostPerSheet),
            bcTonerUsdLump: Math.round(bcTonerUsdLump),
            backPlotterCost: Math.round(bcPlotterCost),
            totalBlocksCost: Math.round(totalBlocksCost),
            blockSra3Sheets: blockSheetsCount,
            bindCostPerItem: Math.round(bindCostPerItem),
            totalBindCost: Math.round(totalBindCost)
        };

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
            pres: presDetails
        };
    }
};
