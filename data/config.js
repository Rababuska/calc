const APP_CONFIG = {
    tax: 1.36,
    vat_rate: 1.16, // НДС 16%
    profit_per_one: 2.3, 
    profit_business_card: 3, 
    margins: 4,
    bleeds: 6,
    usd_rate: 500,

    // Стоимость оттисков (кликов)
    run_color: 44,
    run_bw: 20,
    run_small: 25,

    // Припресс и ламинация
    press_matt_sra3: 29,
    press_gl_sra3: 27,
    press_touch_sra3: 37,
    lam_matt100: 235,
    lam_gl100: 125,
    lam_matt150: 325,
    lam_gl150: 190,

    // Резка и постпечать
    plotter_sra3: 150,
    plotter_perf_sra3: 300,
    selling_round_corners_price: 5,

    // Пакеты (Эксклюзив / Барвит)
    bag_makeready_sheets: 10,     // приладочные листы
    bag_exclusive_rate: 430,      // базовый тариф Эксклюзива
    bag_exclusive_markup: 1.35,   // наценка на подрядчика
    bag_exclusive_delivery: 4000, // доставка
    bag_inhouse_assembly: 100,    // сборка у нас
	
	// Сборка презентаций
    presentation_bind_metal: 500,   // Металлическая пружина
    presentation_bind_plastic: 350, // Пластиковая пружина

    // Календари (ножки, пружина, Эксклюзив)
    calendar_bind: 350,
    calendar_delivery: 5400,          // доставка Эксклюзив
    calendar_exclusive_markup: 1.35,  // наценка на подрядчика
    calendar_hard_cover_cost: 920,
    calendar_hard_cover_sell: 1250,
    calendar_print_stand_rate: 900,   // печатная переплетная (Эксклюзив)
    calendar_boomvinyl_rate: 1100,    // бумвинил (Эксклюзив)
    calendar_thermo_leather_rate: 4000, // термокожа (Эксклюзив)
    calendar_glue_double: 150         // склейка 2-х листов картона
};