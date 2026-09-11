// ==========================================================================
// МОДУЛЬ ГЕНЕРАЦИИ ВЕКТОРНЫХ PDF (js/pdf.js)
// ==========================================================================

const PdfGenerator = {
    // Обратите внимание: мы добавили аргумент managerInfo
    download: function(savedItems, companyName, dateStr, includeVat, grandTotal, maxDeliveryTime, managerInfo) {
        if (typeof pdfMake === 'undefined') {
            alert('Библиотека pdfmake не загружена!');
            return;
        }

        let comp = companyName ? companyName.trim().toUpperCase() : 'БЕЗ НАЗВАНИЯ';
        let vatLabel = includeVat ? 'с учетом НДС' : 'без учета НДС';

        // 1. Формируем шапку таблицы
        let tableBody = [
            [
                { text: '№', style: 'tableHeader' },
                { text: 'Наименование', style: 'tableHeader' },
                { text: 'Данные', style: 'tableHeader' },
                { text: 'Кол-во', style: 'tableHeader' },
                { text: 'Цена/шт', style: 'tableHeader' },
                { text: 'Итого', style: 'tableHeader' },
                { text: 'Срок', style: 'tableHeader' }
            ]
        ];

        // 2. Заполняем строки товарами
        savedItems.forEach((it, idx) => {
            let cleanDesc = it.desc.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
            
            tableBody.push([
                { text: (idx + 1).toString(), alignment: 'center', margin: [0, 4, 0, 4] },
                { text: it.title, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: cleanDesc, alignment: 'left', margin: [0, 4, 0, 4] },
                { text: it.circulation.toString(), alignment: 'center', margin: [0, 4, 0, 4] },
                { text: it.one_total.toString(), alignment: 'center', margin: [0, 4, 0, 4] },
                { text: it.total.toString(), bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: (it.delivery || '-').toString(), alignment: 'center', margin: [0, 4, 0, 4] }
            ]);
        });

        // 3. Итоговая строка
        tableBody.push([
            { text: `ИТОГО ПО ЗАКАЗУ (${vatLabel}):`, colSpan: 5, alignment: 'right', bold: true, margin: [0, 5, 5, 5] },
            {}, {}, {}, {},
            { text: grandTotal.toString(), bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
            { text: maxDeliveryTime.toString(), alignment: 'center', margin: [0, 5, 0, 5] }
        ]);

        // 4. Главный конфиг документа
        let docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [30, 40, 30, 40], // Отступы: лево, верх, право, низ
            
            content: [
                // ==========================================
                // ШАПКА PDF (ЛОГОТИП И ЗАГОЛОВОК)
                // ==========================================
                /* 
                 * ИНСТРУКЦИЯ ПО ВСТАВКЕ ВАШЕГО ЛОГОТИПА:
                 * 1. Перейдите на сайт https://www.base64-image.de/
                 * 2. Загрузите туда картинку вашей шапки
                 * 3. Скопируйте полученный код (он начинается с "data:image/png;base64,iVBORw0K...")
                 * 4. Раскомментируйте блок ниже и вставьте код в '...'
                 * 5. Текстовый блок { text: 'VTO Creative...', ... } можно будет удалить.
                 */
                
                // {
                //     image: 'data:image/png;base64,ВСТАВЬТЕ_СКОПИРОВАННЫЙ_КОД_СЮДА',
                //     width: 500, // Подгоните ширину под лист А4
                //     alignment: 'center',
                //     margin: [0, 0, 0, 20]
                // },

                // Временная текстовая шапка (пока нет картинки)
                { text: 'V.T.O. Creative & Marketing Laboratory', fontSize: 18, bold: true, alignment: 'center', color: '#1a4e8a', margin: [0, 0, 0, 5] },
                { text: 'Коммерческое предложение', fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },

                // Заголовок документа
                { text: `КП ${dateStr} ${comp}`, style: 'header' },
                
                // Таблица
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', '17%', '*', 'auto', '11%', '13%', '10%'],
                        body: tableBody
                    },
                    layout: {
                        fillColor: function (rowIndex) { return (rowIndex === 0) ? '#f2f2f2' : null; }
                    }
                },

                // ==========================================
                // ПОДВАЛ PDF (ДАННЫЕ МЕНЕДЖЕРА)
                // ==========================================
                {
                    margin: [0, 40, 0, 0], // Отступ сверху от таблицы
                    text: [
                        '________________________________\n',
                        { text: (managerInfo.name || 'Менеджер') + '\n', bold: true, fontSize: 11, margin: [0, 5, 0, 0] },
                        'Специалист лаборатории VTO\n',
                        (managerInfo.phone || '+7 (___) ___-__-__') + '\n',
                        (managerInfo.internal || '+7 (727) 357-22-77') + '\n',
                        'Email: ' + (managerInfo.email || 'info@vto.kz') + '\n',
                        { text: 'https://vto.kz/\n', color: 'blue', decoration: 'underline', link: 'https://vto.kz/' },
                        { text: 'https://vizitki.vto.kz/', color: 'blue', decoration: 'underline', link: 'https://vizitki.vto.kz/' }
                    ],
                    fontSize: 10,
                    lineHeight: 1.3
                }
            ],
            styles: {
                header: { fontSize: 13, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },
                tableHeader: { bold: true, alignment: 'center', fillColor: '#f2f2f2', margin: [0, 5, 0, 5] }
            },
            defaultStyle: {
                fontSize: 9
            }
        };

        let fileName = `КП_${comp.replace(/[^a-zа-яё0-9]/gi, '_')}_${dateStr}.pdf`;
        pdfMake.createPdf(docDefinition).download(fileName);
    }
};