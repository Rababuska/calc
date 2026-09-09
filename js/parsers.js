// ==========================================================================
// МОДУЛЬ ПАРСИНГА И ГЕНЕРАЦИИ ТЕКСТОВ КП (js/parsers.js)
// ==========================================================================

const CalcParsers = {
    // 1. Генерация описания для таблицы КП (клиентский вид без внутренних подрядчиков)
    generatePositionDesc: function(sel, specSize, specPaper, colors, laminations, toners, papers, config) {
        let desc = '';
        let getPaperName = (key) => {
            if (key === 'custom') return `Своя бумага (${sel.custom_paper_width}x${sel.custom_paper_height} мм)`;
            return papers[key] ? papers[key].name : key;
        };

        // --- ПАКЕТЫ ---
        if (sel.good === 'bag') {
            let sidesTitle = (sel.bag_print_sides === 'single') 
                ? ' (печать с 1 стороны)' 
                : ' (печать с 2 сторон)';

            desc = 'Размер: ' + specSize + '<br/>' +
                   'Цветность: ' + (colors[sel.color] ? colors[sel.color].name : sel.color) + sidesTitle + '<br/>' +
                   'Припресс: ' + (laminations[sel.lamination] ? laminations[sel.lamination].name : 'Без припресса') + '<br/>' +
                   'Бумага: ' + specPaper + '<br/>' +
                   'Сборка: Высечка, склейка, установка люверсов, веревочные ручки<br/>';
        }

        // --- КАЛЕНДАРИ ---
        else if (sel.good === 'calendar') {
            let springNames = { white: 'белая', black: 'черная', gold: 'золото', silver: 'серебро' };
            let standTitle = '';

            if (sel.calendar_stand_type === 'hard_cover') {
                standTitle = 'Твердая переплетная основа (белая)';
            } else if (sel.calendar_stand_type === 'hard_cover_print') {
                standTitle = 'Твердая переплетная основа с полноцветной печатью и ламинацией';
            } else if (sel.calendar_stand_type === 'boomvinyl') {
                standTitle = 'Твердая переплетная основа (бумвинил, тиснение)';
            } else if (sel.calendar_stand_type === 'thermo_leather') {
                standTitle = 'Твердая переплетная основа (термокожа, тиснение)';
            } else if (sel.calendar_stand_type === 'cardboard_single') {
                let lamName = laminations[sel.calendar_stand_lamination] ? laminations[sel.calendar_stand_lamination].name : 'Без припресса';
                let colName = colors[sel.calendar_stand_color] ? colors[sel.calendar_stand_color].name : '0+0';
                standTitle = `Картон 260 г + ${lamName} (${colName})`;
            } else {
                let lamName = laminations[sel.calendar_stand_lamination] ? laminations[sel.calendar_stand_lamination].name : 'Без припресса';
                let colName = colors[sel.calendar_stand_color] ? colors[sel.calendar_stand_color].name : '0+0';
                standTitle = `Картон кашированный (склейка в 2 слоя) + ${lamName} (${colName})`;
            }

            desc = 'Размер: ' + specSize + '<br/>' +
                   '<strong>Блок (' + sel.calendar_sheets + ' л.):</strong> ' + 
                   (colors[sel.color] ? colors[sel.color].name : '4+4') + ', ' + 
                   getPaperName(sel.calendar_block_paper) + ', ' + 
                   (laminations[sel.lamination] ? laminations[sel.lamination].name : 'Без припресса') + '<br/>' +
                   '<strong>Пружина:</strong> металлическая (' + springNames[sel.calendar_spring] + ')<br/>' +
                   '<strong>Основа:</strong> ' + standTitle + '<br/>';
        }

        // --- БРОШЮРЫ ---
        else if (sel.good === 'brochure') {
            desc = 'Размер: ' + specSize + '<br/>' +
                   '<strong>Обложка:</strong> ' + 
                   (colors[sel.cover_color] ? colors[sel.cover_color].name : '4+4') + ', ' + 
                   (laminations[sel.cover_lamination] ? laminations[sel.cover_lamination].name : 'Без припресса') + ', ' + 
                   getPaperName(sel.cover_paper);
            if (sel.cover_plotter_cut !== 'none') desc += ', Плоттерная резка';
            desc += '<br/>';

            if (sel.pages_count > 4) {
                desc += '<strong>Блок:</strong> ' + 
                        (colors[sel.block_color] ? colors[sel.block_color].name : '4+4') + ', ' + 
                        (laminations[sel.block_lamination] ? laminations[sel.block_lamination].name : 'Без припресса') + ', ' + 
                        getPaperName(sel.block_paper) + '<br/>';
            }
            if (sel.block_toner && sel.block_toner !== 'none') {
                desc += 'Спецтонер блока: ' + (toners[sel.block_toner] ? toners[sel.block_toner].name : sel.block_toner) + '<br/>';
            }
            if (sel.toner1 && sel.toner1 !== 'none') {
                desc += '5-й цвет (Обложка): ' + (toners[sel.toner1] ? toners[sel.toner1].name : sel.toner1) + '<br/>';
            }
            if (sel.add_extra_run) {
                desc += 'Доп. прогон (Обложка): ' + 
                    ((sel.toner2 && sel.toner2 !== 'none') ? (toners[sel.toner2] ? toners[sel.toner2].name : sel.toner2) : 'Да (CMYK)') + '<br/>';
            }
        }

        // --- БЛОКНОТЫ ---
        else if (sel.good === 'pad') {
            desc = 'Размер: ' + specSize + '<br/>' +
                   '<strong>Обложка:</strong> ' + (colors[sel.cover_color] ? colors[sel.cover_color].name : '4+0') + ', ' + 
                   (laminations[sel.cover_lamination] ? laminations[sel.cover_lamination].name : 'Без припресса') + ', ' + 
                   getPaperName(sel.cover_paper) + '<br/>' +
                   '<strong>Подложка:</strong> ' + (colors[sel.back_cover_color] ? colors[sel.back_cover_color].name : '0+0') + ', ' + 
                   (laminations[sel.back_cover_lamination] ? laminations[sel.back_cover_lamination].name : 'Без припресса') + ', ' + 
                   getPaperName(sel.back_cover_paper) + '<br/>';

            if (sel.presentation_blocks && sel.presentation_blocks.length > 0) {
                desc += '<strong>Внутренний блок:</strong><br/>';
                for (let i = 0; i < sel.presentation_blocks.length; i++) {
                    let b = sel.presentation_blocks[i];
                    desc += `&nbsp;&nbsp;&nbsp;- Блок ${i + 1} (${b.sheets} л.): ` + 
                            (colors[b.color] ? colors[b.color].name : '4+4') + ', ' + 
                            (laminations[b.lamination] ? laminations[b.lamination].name : 'Без припресса') + ', ' + 
                            getPaperName(b.paper) + '<br/>';
                }
            }
            desc += 'Сборка: Металлическая пружина (' + (sel.binding_edge === 'short' ? 'по короткой стороне' : 'по длинной стороне') + ')<br/>';
        }

        // --- ПРЕЗЕНТАЦИИ ---
        else if (sel.good === 'presentation') {
            let springTitle = (sel.presentation_spring_type === 'plastic' ? 'Пластиковая' : 'Металлическая') + ' пружина';

            if (sel.presentation_only_block) {
                desc = 'Размер: ' + specSize + ' (без отдельной обложки)<br/>';
                if (sel.presentation_blocks && sel.presentation_blocks.length > 0) {
                    let b = sel.presentation_blocks[0];
                    desc += `<strong>Блок (${b.sheets} л.):</strong> ` + 
                            (colors[b.color] ? colors[b.color].name : '4+0') + ', ' + 
                            (laminations[b.lamination] ? laminations[b.lamination].name : 'Без припресса') + ', ' + 
                            getPaperName(b.paper) + '<br/>';
                }
            } else {
                desc = 'Размер: ' + specSize + '<br/>' +
                       '<strong>Обложка:</strong> ' + (colors[sel.cover_color] ? colors[sel.cover_color].name : '4+0') + ', ' + 
                       (laminations[sel.cover_lamination] ? laminations[sel.cover_lamination].name : 'Без припресса') + ', ' + 
                       getPaperName(sel.cover_paper);
                if (sel.cover_toner !== 'none') desc += ' + ' + (toners[sel.cover_toner] ? toners[sel.cover_toner].name : sel.cover_toner);
                if (sel.cover_plotter_cut !== 'none') desc += ', Плоттерная резка';
                desc += '<br/>';

                desc += '<strong>Задняя обложка:</strong> ' + (colors[sel.back_cover_color] ? colors[sel.back_cover_color].name : '0+0') + ', ' + 
                        (laminations[sel.back_cover_lamination] ? laminations[sel.back_cover_lamination].name : 'Без припресса') + ', ' + 
                        getPaperName(sel.back_cover_paper);
                if (sel.back_cover_toner !== 'none') desc += ' + ' + (toners[sel.back_cover_toner] ? toners[sel.back_cover_toner].name : sel.back_cover_toner);
                if (sel.back_cover_plotter_cut !== 'none') desc += ', Плоттерная резка';
                desc += '<br/>';

                if (sel.presentation_blocks && sel.presentation_blocks.length > 0) {
                    desc += '<strong>Внутренний блок:</strong><br/>';
                    for (let i = 0; i < sel.presentation_blocks.length; i++) {
                        let b = sel.presentation_blocks[i];
                        desc += `&nbsp;&nbsp;&nbsp;- Блок ${i + 1} (${b.sheets} л.): ` + 
                                (colors[b.color] ? colors[b.color].name : '4+0') + ', ' + 
                                (laminations[b.lamination] ? laminations[b.lamination].name : 'Без припресса') + ', ' + 
                                getPaperName(b.paper) + '<br/>';
                    }
                }
            }
            desc += `Сборка: ${springTitle} (` + (sel.binding_edge === 'short' ? 'по короткой стороне' : 'по длинной стороне') + ')<br/>';
        }

        // --- КОНВЕРТЫ ---
        else if (sel.good === 'envelope') {
            desc = 'Цветность: ' + (colors[sel.color] ? colors[sel.color].name : sel.color) + '<br/>Конверт<br/>';
        }

        // --- ЛИСТОВКИ / ВИЗИТКИ / НАКЛЕЙКИ ---
        else {
            desc = 'Размер: ' + specSize + '<br/>' +
                   'Цветность: ' + (colors[sel.color] ? colors[sel.color].name : sel.color) + '<br/>' +
                   'Ламинация: ' + (laminations[sel.lamination] ? laminations[sel.lamination].name : 'Без припресса') + '<br/>' +
                   'Бумага: ' + specPaper + '<br/>';
            if ((sel.good === 'leaflet' || sel.good === 'sticker') && sel.plotter_cut !== 'none') {
                desc += 'Плоттерная резка<br/>';
            }
            if (sel.round_corners) {
                desc += 'Скругление углов<br/>';
            }
        }

        return desc;
    },

    // 2. Восстановление параметров позиции из сохраненной строки КП
    restoreSpecFromItem: function(item, defaultSelected, sizes, colors, laminations, papers) {
        let spec = JSON.parse(JSON.stringify(defaultSelected));
        spec.circulation = Number(item.circulation) || 100;

        let title = (item.title || '').toLowerCase();
        let desc = item.desc || '';

        // Определение типа изделия
        if (title.includes('пакет')) {
            spec.good = 'bag';
            if (desc.includes('350')) spec.bag_size = 'bag_350_225_80';
            else if (desc.includes('250')) spec.bag_size = 'bag_250_200_80';
            spec.bag_print_sides = desc.includes('1 стороны') ? 'single' : 'both';
        } else if (title.includes('календар')) {
            spec.good = 'calendar';
            if (desc.includes('14 листов') || desc.includes('14 л.')) spec.calendar_sheets = 14;
            else if (desc.includes('13 листов') || desc.includes('13 л.')) spec.calendar_sheets = 13;
            else if (desc.includes('12 листов') || desc.includes('12 л.')) spec.calendar_sheets = 12;
            else spec.calendar_sheets = 7;

            if (desc.includes('черная')) spec.calendar_spring = 'black';
            else if (desc.includes('золото')) spec.calendar_spring = 'gold';
            else if (desc.includes('серебро')) spec.calendar_spring = 'silver';
            else spec.calendar_spring = 'white';

            if (desc.includes('полноцветной печатью') || desc.includes('Печатная')) {
                spec.calendar_stand_type = 'hard_cover_print';
            } else if (desc.includes('бумвинил') || desc.includes('Бумвинил')) {
                spec.calendar_stand_type = 'boomvinyl';
            } else if (desc.includes('термокожа') || desc.includes('Термокожа')) {
                spec.calendar_stand_type = 'thermo_leather';
            } else if (desc.includes('Твердая') || desc.includes('переплетн')) {
                spec.calendar_stand_type = 'hard_cover';
            } else if (desc.includes('2 слоя') || desc.includes('склейк')) {
                spec.calendar_stand_type = 'cardboard_double';
            } else {
                spec.calendar_stand_type = 'cardboard_single';
            }
        } else if (title.includes('визитк')) {
            spec.good = 'business-card';
        } else if (title.includes('листовк')) {
            spec.good = 'leaflet';
        } else if (title.includes('брошюр')) {
            spec.good = 'brochure';
        } else if (title.includes('блокнот')) {
            spec.good = 'pad';
        } else if (title.includes('презентац')) {
            spec.good = 'presentation';
            spec.presentation_spring_type = desc.includes('Пластиковая') ? 'plastic' : 'metal';
            spec.presentation_only_block = desc.includes('без отдельной обложки');
        } else if (title.includes('конверт')) {
            spec.good = 'envelope';
        } else if (title.includes('стикер') || title.includes('наклейк')) {
            spec.good = 'sticker';
        }

        // Парсинг брошюр
        if (spec.good === 'brochure') {
            let pMatch = desc.match(/(\d+)\s*стр/i);
            if (pMatch) spec.pages_count = parseInt(pMatch[1]);

            if (desc.includes('Альбомная') || desc.includes('горизонтальная')) {
                spec.orientation = 'landscape';
            } else if (desc.includes('Книжная') || desc.includes('вертикальная')) {
                spec.orientation = 'portrait';
            }

            for (let sKey in sizes.brochure) {
                let sName = sizes.brochure[sKey].name.toLowerCase().split(' ')[0];
                if (desc.toLowerCase().includes(sName)) {
                    spec.size = sKey;
                    break;
                }
            }

            let coverMatch = desc.match(/обложка:[^<]*/i);
            if (coverMatch) {
                let cText = coverMatch[0];
                let colM = cText.match(/(\d\+\d)/);
                if (colM && colors[colM[1].replace('+', '_')]) {
                    spec.cover_color = colM[1].replace('+', '_');
                }
                for (let lKey in laminations) {
                    if (lKey !== 'none' && cText.includes(laminations[lKey].name)) {
                        spec.cover_lamination = lKey;
                        break;
                    }
                }
                for (let pKey in papers) {
                    if (cText.includes(papers[pKey].name)) {
                        spec.cover_paper = pKey;
                        break;
                    }
                }
                if (cText.includes('перфорац')) spec.cover_plotter_cut = 'plotter_perf';
                else if (cText.includes('Плоттерная резка')) spec.cover_plotter_cut = 'plotter';
            }

            let blockMatch = desc.match(/блок:[^<]*/i);
            if (blockMatch) {
                let bText = blockMatch[0];
                let colM = bText.match(/(\d\+\d)/);
                if (colM && colors[colM[1].replace('+', '_')]) {
                    spec.block_color = colM[1].replace('+', '_');
                }
                for (let lKey in laminations) {
                    if (lKey !== 'none' && bText.includes(laminations[lKey].name)) {
                        spec.block_lamination = lKey;
                        break;
                    }
                }
                for (let pKey in papers) {
                    if (bText.includes(papers[pKey].name)) {
                        spec.block_paper = pKey;
                        break;
                    }
                }
            }
            return spec;
        }

        // Парсинг стандартных форматов
        let foundStandard = false;
        if (sizes[spec.good]) {
            for (let sKey in sizes[spec.good]) {
                if (sKey === 'custom') continue;
                let sName = sizes[spec.good][sKey].name.toLowerCase();
                if (desc.toLowerCase().includes(sName.split(' ')[0])) {
                    spec.size = sKey;
                    foundStandard = true;
                    break;
                }
            }
        }

        if (!foundStandard) {
            let dimMatch = desc.match(/(\d+)\s*[xх×*]\s*(\d+)\s*мм/i);
            if (dimMatch) {
                spec.custom_width = parseInt(dimMatch[1]);
                spec.custom_height = parseInt(dimMatch[2]);
                if (spec.good === 'leaflet' || spec.good === 'sticker') {
                    spec.size = 'custom';
                }
            }
        }

        let colorMatch = desc.match(/(\d\+\d)/);
        if (colorMatch) {
            let cKey = colorMatch[1].replace('+', '_');
            if (colors[cKey]) spec.color = cKey;
        }

        for (let lKey in laminations) {
            if (lKey !== 'none' && desc.includes(laminations[lKey].name)) {
                spec.lamination = lKey;
                break;
            }
        }

        for (let pKey in papers) {
            if (desc.includes(papers[pKey].name)) {
                spec.paper = pKey;
                break;
            }
        }

        spec.round_corners = desc.includes('Скругление углов');
        if (desc.includes('перфорац')) {
            spec.plotter_cut = 'plotter_perf';
        } else if (desc.includes('Плоттерная резка')) {
            spec.plotter_cut = 'plotter';
        }

        return spec;
    },

    // 3. Таблица для Word
    generateWordTableHtml: function(savedItems, companyName, currentDateFormatted, includeVat, grandTotal, maxDeliveryTime) {
        let comp = companyName ? companyName.trim().toUpperCase() : 'БЕЗ НАЗВАНИЯ';
        let title = `КП ${currentDateFormatted} ${comp}`;
        let vatLabel = includeVat ? 'с учетом НДС' : 'без учета НДС';
        
        let rowsHtml = '';
        savedItems.forEach((it, idx) => {
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
                        <strong>${grandTotal}</strong>
                    </td>
                    <td align="center" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #000000; text-decoration: none; font-family: 'Times New Roman', Times, serif;">
                        <span>${maxDeliveryTime}</span>
                    </td>
                </tr>
            </tfoot>
        </table>`;
    },

    // 4. Текст для Excel
    generatePlainText: function(savedItems, companyName, currentDateFormatted, includeVat, grandTotal, maxDeliveryTime) {
        let comp = companyName ? companyName.trim().toUpperCase() : 'БЕЗ НАЗВАНИЯ';
        let vatLabel = includeVat ? 'с учетом НДС' : 'без учета НДС';
        let text = `КП ${currentDateFormatted} ${comp}\n`;
        text += "№\tНаименование\tДанные\tКол-во / шт\tСтоимость за единицу / теңге\tИтого / теңге\tСрок / рабочие дни\n";
        savedItems.forEach((it, i) => {
            let cleanDesc = it.desc.replace(/<br\s*[\/]?>/gi, ", ").replace(/<[^>]+>/g, "");
            text += `${i + 1}\t${it.title}\t${cleanDesc}\t${it.circulation}\t${it.one_total}\t${it.total}\t${it.delivery}\n`;
        });
        text += `ИТОГО ПО ЗАКАЗУ (${vatLabel}):\t\t\t\t\t${grandTotal}\t${maxDeliveryTime}\n`;
        return text;
    }
};