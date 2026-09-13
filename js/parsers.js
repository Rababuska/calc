// ==========================================================================
// МОДУЛЬ ПАРСИНГА ОПИСАНИЙ И ВОССТАНОВЛЕНИЯ ДАННЫХ (js/parsers.js)
// ==========================================================================

const CalcParsers = {
    generatePositionDesc: function(selected, spec_size, spec_paper, colors, laminations, toners, papers, config) {
        let desc = '';

        // Вспомогательная функция для добавления текста о спецтонерах и доп. прогонах
        const getTonerText = function(t1, extraRun, t2) {
            let txt = '';
            if (t1 && t1 !== 'none' && toners && toners[t1]) {
                txt += 'Спецтонер 1: ' + toners[t1].name + '<br>';
            }
            if (extraRun) {
                txt += 'Дополнительный прогон печати<br>';
                if (t2 && t2 !== 'none' && toners && toners[t2]) {
                    txt += 'Спецтонер 2: ' + toners[t2].name + '<br>';
                }
            }
            return txt;
        };

        if (selected.good === 'calendar') {
            desc += 'Размер: ' + spec_size + '<br>';
            desc += 'Блок: ' + (colors[selected.color] ? colors[selected.color].name : '') + ', ' + (selected.calendar_block_paper === 'custom' ? 'Своя бумага' : (papers[selected.calendar_block_paper] ? papers[selected.calendar_block_paper].name : '')) + ', ' + (laminations[selected.lamination] ? laminations[selected.lamination].name : '') + '<br>';
            
            let spring = 'белая';
            if (selected.calendar_spring === 'black') spring = 'черная';
            else if (selected.calendar_spring === 'gold') spring = 'золото';
            else if (selected.calendar_spring === 'silver') spring = 'серебро';
            desc += 'Пружина: металлическая (' + spring + ')<br>';
            
            let stand = '';
            if (selected.calendar_stand_type === 'hard_cover') stand = 'Белая переплетная (без печати, пружина вкл.)';
            else if (selected.calendar_stand_type === 'hard_cover_print') stand = 'Кашированная с печатью (Эксклюзив)';
            else if (selected.calendar_stand_type === 'boomvinyl') stand = 'Бумвинил (Эксклюзив)';
            else if (selected.calendar_stand_type === 'thermo_leather') stand = 'Термокожа (Эксклюзив)';
            else if (selected.calendar_stand_type === 'cardboard_single') stand = 'Картон 260 г (1 лист)';
            else if (selected.calendar_stand_type === 'cardboard_double') stand = 'Картон 260 г (2 листа со склейкой)';
            desc += 'Ножка (основа): ' + stand + '<br>';
            
            if (selected.calendar_stand_type === 'cardboard_single' || selected.calendar_stand_type === 'cardboard_double') {
                let standColor = selected.calendar_stand_color === '4_0' ? '4+0' : (selected.calendar_stand_color === '1_0' ? '1+0' : 'Без печати');
                desc += 'Печать ножки: ' + standColor + '<br>';
                if (selected.calendar_stand_lamination !== 'none' && laminations[selected.calendar_stand_lamination]) {
                    desc += 'Припресс ножки: ' + laminations[selected.calendar_stand_lamination].name + '<br>';
                }
            }
            
            if (selected.calendar_stand_type === 'boomvinyl' || selected.calendar_stand_type === 'thermo_leather') {
                if (selected.calendar_cliche_exists) desc += 'Тиснение ножки (клише заказчика)<br>';
                else desc += 'Тиснение ножки + изготовление клише (' + selected.calendar_cliche_w + 'x' + selected.calendar_cliche_h + ' мм)<br>';
            }

        } else if (selected.good === 'bag') {
            desc += 'Размер: ' + spec_size + '<br>';
            desc += 'Бумага: ' + spec_paper + '<br>';
            if (colors[selected.color]) desc += 'Цветность: ' + colors[selected.color].name + '<br>';
            if (selected.lamination !== 'none' && laminations[selected.lamination]) {
                desc += 'Ламинация: ' + laminations[selected.lamination].name + '<br>';
            }
            if (selected.bag_print_sides === 'single') desc += 'Печать только с 1 стороны (вторая половинка 0+0)<br>';
            if (selected.bag_production === 'plotter') desc += 'Сборка: плоттерная резка и ручная сборка VTO<br>';
            else desc += 'Сборка: высечка и сборка ИП Эксклюзив<br>';

        } else if (selected.good === 'brochure') {
            desc += 'Брошюра: ' + spec_size + '<br>';
            let cPaper = selected.cover_paper === 'custom' ? 'Своя бумага' : (papers[selected.cover_paper] ? papers[selected.cover_paper].name : '');
            let bPaper = selected.block_paper === 'custom' ? 'Своя бумага' : (papers[selected.block_paper] ? papers[selected.block_paper].name : '');
            
            desc += 'Обложка: ' + (colors[selected.cover_color] ? colors[selected.cover_color].name : '') + ', ' + cPaper + ', ' + (laminations[selected.cover_lamination] ? laminations[selected.cover_lamination].name : '') + '<br>';
            
            if (selected.cover_toner && selected.cover_toner !== 'none' && toners && toners[selected.cover_toner]) {
                 desc += 'Спецтонер (обложка): ' + toners[selected.cover_toner].name + '<br>';
            }

            if (selected.cover_plotter_cut === 'plotter') desc += 'Резка обложки: плоттер<br>';
            else if (selected.cover_plotter_cut === 'plotter_perf') desc += 'Резка обложки: плоттер (с перфорацией)<br>';

            if (selected.pages_count > 4) {
                desc += 'Блок (' + (selected.pages_count - 4) + ' стр.): ' + (colors[selected.block_color] ? colors[selected.block_color].name : '') + ', ' + bPaper + ', ' + (laminations[selected.block_lamination] ? laminations[selected.block_lamination].name : '') + '<br>';
                
                if (selected.block_toner && selected.block_toner !== 'none' && toners && toners[selected.block_toner]) {
                     desc += 'Спецтонер (блок): ' + toners[selected.block_toner].name + '<br>';
                }
            }

        } else if (selected.good === 'presentation' || selected.good === 'pad') {
            desc += (selected.good === 'presentation' ? 'Презентация' : 'Блокнот') + ': ' + spec_size + '<br>';
            desc += 'Сборка: пружина по ' + (selected.binding_edge === 'long' ? 'длинной' : 'короткой') + ' стороне (' + (selected.presentation_spring_type === 'plastic' ? 'пластик' : 'металл') + ')<br>';
            
            if (!selected.presentation_only_block) {
                let cPaper = selected.cover_paper === 'custom' ? 'Своя бумага' : (papers[selected.cover_paper] ? papers[selected.cover_paper].name : '');
                desc += 'Обложка: ' + (colors[selected.cover_color] ? colors[selected.cover_color].name : '') + ', ' + cPaper + ', ' + (laminations[selected.cover_lamination] ? laminations[selected.cover_lamination].name : '') + '<br>';
                if (selected.cover_toner && selected.cover_toner !== 'none' && toners && toners[selected.cover_toner]) desc += 'Спецтонер (обл): ' + toners[selected.cover_toner].name + '<br>';
                if (selected.cover_plotter_cut === 'plotter') desc += 'Резка обл: плоттер<br>';
                else if (selected.cover_plotter_cut === 'plotter_perf') desc += 'Резка обл: перфорация<br>';

                let bcPaper = selected.back_cover_paper === 'custom' ? 'Своя бумага' : (papers[selected.back_cover_paper] ? papers[selected.back_cover_paper].name : '');
                desc += 'Подложка: ' + (colors[selected.back_cover_color] ? colors[selected.back_cover_color].name : '') + ', ' + bcPaper + ', ' + (laminations[selected.back_cover_lamination] ? laminations[selected.back_cover_lamination].name : '') + '<br>';
                if (selected.back_cover_toner && selected.back_cover_toner !== 'none' && toners && toners[selected.back_cover_toner]) desc += 'Спецтонер (подл): ' + toners[selected.back_cover_toner].name + '<br>';
                if (selected.back_cover_plotter_cut === 'plotter') desc += 'Резка подл: плоттер<br>';
                else if (selected.back_cover_plotter_cut === 'plotter_perf') desc += 'Резка подл: перфорация<br>';
            } else {
                desc += 'Только блок (без отдельной обложки)<br>';
            }

            if (selected.presentation_blocks && selected.presentation_blocks.length > 0) {
                selected.presentation_blocks.forEach(function(b, i) {
                    let bPap = b.paper === 'custom' ? 'Своя бумага' : (papers[b.paper] ? papers[b.paper].name : '');
                    desc += 'Блок ' + (i+1) + ' (' + b.sheets + ' л.): ' + (colors[b.color] ? colors[b.color].name : '') + ', ' + bPap + ', ' + (laminations[b.lamination] ? laminations[b.lamination].name : '') + '<br>';
                    if (b.toner && b.toner !== 'none' && toners && toners[b.toner]) desc += 'Спецтонер: ' + toners[b.toner].name + '<br>';
                });
            }

        } else if (selected.good === 'envelope') {
            desc += 'Размер: ' + spec_size + '<br>';
            if (colors[selected.color]) desc += 'Цветность: ' + colors[selected.color].name + '<br>';
            
            // Спецтонеры для конвертов
            desc += getTonerText(selected.toner1, selected.add_extra_run, selected.toner2);

        } else {
            // Стандартные позиции: Визитки, Листовки, Стикеры
            desc += 'Размер: ' + spec_size + '<br>';
            if (colors[selected.color]) desc += 'Цветность: ' + colors[selected.color].name + '<br>';
            if (selected.lamination !== 'none' && laminations[selected.lamination]) {
                desc += 'Ламинация: ' + laminations[selected.lamination].name + '<br>';
            }
            desc += 'Бумага: ' + spec_paper + '<br>';

            // ВЫВОД ТОНЕРОВ И ПРОГОНОВ (Восстановлено)
            desc += getTonerText(selected.toner1, selected.add_extra_run, selected.toner2);

            if (selected.round_corners) desc += 'Скругление углов<br>';
            if (selected.cut_type === 'single') desc += 'Одинарный рез<br>';
            if (selected.plotter_cut === 'plotter') desc += 'Плоттерная резка<br>';
            else if (selected.plotter_cut === 'plotter_perf') desc += 'Плоттерная резка с перфорацией<br>';
        }

        return desc;
    },

    restoreSpecFromItem: function(item, currentSelected, sizes, colors, laminations, papers) {
        let s = Object.assign({}, currentSelected);
        if (!item.specData) return s;
        let d = item.specData;
        for (let k in d) {
            s[k] = d[k];
        }
        return s;
    }
};
