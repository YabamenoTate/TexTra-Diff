const {i18n} = require('./i18n');

exports.Language = {};
exports.Language.ja = 'ja';
exports.Language.en = 'en';

exports.key_strage = {};
exports.key_strage.login_info = 'LOGIN_INFO';
exports.key_strage.languages = 'Lang_settings';
exports.key_strage.Term_check = 'Term_Check';
exports.key_strage.Path_last_used = 'path_last_used';

exports.path_home_drive = process.env.HOMEDRIVE + "\\";

exports.get_list_langage = function(){
    return [
        'ja', // 日本語
        'en', // 英語
        'zh-CN', // 中国語
        'ko', // 韓国語
        'de', // ドイツ語
        'fr', // フランス語
        'id', // インドネシア語
        'tr', // フィリピン語
        'es', // スペイン語
        'vi', // ベトナム語
        'my', // ミャンマー語
        'th', // タイ語
        'pt', // ポルトガル語
        'ar', // アラビア語
        'it', // イタリア語
        'ru' // ロシア語
    ];
};

const table_lang_name = {
    ja: i18n.mes_1000, // 日本語
    en: i18n.mes_1001, // 英語
    'zh-CN': i18n.mes_1002, // 中国語
    ko: i18n.mes_1003, // 韓国語
    de: i18n.mes_1004, // ドイツ語
    fr: i18n.mes_1005, // フランス語
    id: i18n.mes_1006, // インドネシア語
    tr: i18n.mes_1007, // フィリピン語
    es: i18n.mes_1008, // スペイン語
    vi: i18n.mes_1009, // ベトナム語
    my: i18n.mes_1010, // ミャンマー語
    th: i18n.mes_1011, // タイ語
    pt: i18n.mes_1012, // ポルトガル語
    ar: i18n.mes_1014, // アラビア語
    it: i18n.mes_1015, // イタリア語
    ru: i18n.mes_1016 // ロシア語
};

// 言語コード→言語名を表す１文字
exports.get_lang_name_1char = function (lang) {
    switch (lang) {
        case "ja": return i18n.mes_1020; // 日
        case "en": return i18n.mes_1021; // 英
        case "zh-CN": return i18n.mes_1022; // 中
        case "ko": return i18n.mes_1023; // 韓
        case 'de': return i18n.mes_1024; // 独
        case 'fr': return i18n.mes_1025; // 仏
        case 'id': return i18n.mes_1026; // 稲
        case 'tr': return i18n.mes_1027; // 比
        case 'es': return i18n.mes_1028; // 西
        case 'vi': return i18n.mes_1029; // 越
        case 'my': return i18n.mes_1030; // 緬
        case 'th': return i18n.mes_1031; // 泰
        case 'pt': return i18n.mes_1032; // 葡
        case 'pt-BR': return i18n.mes_1033; // 葡ブ
        case 'ar': return i18n.mes_1035; // 亜
        case 'it': return i18n.mes_1036; // 伊
        case 'ru': return i18n.mes_1037; // 露
        default: return "？";
    }
};

// ２つの言語の組み合わせを表す文字
exports.get_2lang_name = function (lang_org, lang_trans) {
    return exports.get_lang_name_1char(lang_org) + exports.get_lang_name_1char(lang_trans);
};

exports.get_langage_name = function(cd_lang){
    return table_lang_name[cd_lang];
};