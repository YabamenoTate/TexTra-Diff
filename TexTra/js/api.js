const vscode = require('vscode');
const ENC_KEY = "TexTra_VSCode_2021";
const Utils = require('./utils.js');
const CryptoJS = require('crypto-js');
const {i18n} = require('./i18n');

const ERR_CD_NO_RESULT = 532; // データ無し

exports.encrypt = function (str) {
    if (!str) return '';
    var encrypted = CryptoJS.AES.encrypt(str, ENC_KEY);
    return encrypted.toString();
};

exports.decrypt = function (str) {
    if (!str) return '';
    try {
        var decrypted = CryptoJS.AES.decrypt(str, ENC_KEY);
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.log('Failed to decrypt');
        return '';        
    }
};

var _context;
var _req_token;
exports.set_system_info = function(context){
    _context = context;
    _req_token = null;
};

exports.check_api_settings = function(context){
    var st = context.globalState;
    var login_info = Object.assign({}, st.get('LOGIN_INFO', {}));
    if(!login_info) {Utils.msgbox(i18n.mes_0014, 1); return false; } // API設定を行ってください。
    
    if(Utils.is_empty_string(login_info.User_Name)) {
        Utils.msgbox(i18n.mes_0014 + ' > \'User Name\'', 1); return false; } // API設定を行ってください。
    if(Utils.is_empty_string(login_info.API_Key)) {
        Utils.msgbox(i18n.mes_0014 + ' > \'API Key\'', 1); return false; } // API設定を行ってください。
    if(Utils.is_empty_string(login_info.API_Secret)) {
        Utils.msgbox(i18n.mes_0014 + ' > \'API Secret\'', 1); return false; } // API設定を行ってください。
    return true;
};

// APIメソッドを呼ぶ前にこのメソッドを経由する。
// Chrome Strageに保存されている設定を取得する。
exports.call_api = function (func_api, infos, func_success, func_fail) {

    if(!_context) {console.log('Call \'exports.set_system_info\' before \'exports.call_api\''); return;}
    if (!func_success) func_success = (infos) => {console.log('debug func_success >> ' + JSON.stringify(infos));};
    if (!func_fail) func_fail = func_fail_api_default;

    if (!infos) infos = {};
    var st = _context.globalState;
    var login_info = Object.assign({}, st.get('LOGIN_INFO', {}));
    infos.LOGIN_INFO = login_info;

    var lang_settings = Utils.get_langs_setting(_context);
    var cd_lang1 = lang_settings.lang1;
    var cd_lang2 = lang_settings.lang2;

    login_info.User_Name = exports.decrypt(login_info.User_Name);
    login_info.API_Key = exports.decrypt(login_info.API_Key);
    login_info.API_Secret = exports.decrypt(login_info.API_Secret);
    if (!login_info.selected_lang_org) login_info.selected_lang_org = cd_lang1;
    if (!login_info.selected_lang_trans) login_info.selected_lang_trans = cd_lang2;

    func_api(infos, func_success, func_fail);
};

// APIメソッドを呼ぶ前にこのメソッドを経由する。
// Chrome Strageに保存されている設定を取得する。
function set_api_params(infos) {

    if(!_context) {console.log('Call \'exports.set_system_info\' before \'exports.call_api\''); return;}

    if (!infos) infos = {};
    var st = _context.globalState;
    var login_info = Object.assign({}, st.get('LOGIN_INFO', {}));
    infos.LOGIN_INFO = login_info;

    var lang_settings = Utils.get_langs_setting(_context);
    var cd_lang1 = lang_settings.lang1;
    var cd_lang2 = lang_settings.lang2;

    login_info.User_Name = exports.decrypt(login_info.User_Name);
    login_info.API_Key = exports.decrypt(login_info.API_Key);
    login_info.API_Secret = exports.decrypt(login_info.API_Secret);
    if (!login_info.selected_lang_org) login_info.selected_lang_org = cd_lang1;
    if (!login_info.selected_lang_trans) login_info.selected_lang_trans = cd_lang2;
}

// 翻訳APIのURLを取得する
function get_url_MT_API(lang_org, lang_trans) {
    var key = lang_org + "_" + lang_trans;
    var url = urls_trans_API[key];
    var wd = vscode.window;

    // 指定された言語の翻訳APIが設定されていません。\n「機械翻訳API設定」で設定を行ってください。
    if (!url) wd.showInformationMessage(i18n.mes_0501);
    return url;
}

// 翻訳
exports.trans_text = async function (infos) {

    set_api_params(infos);

    var login_info = infos.LOGIN_INFO;
    var lang1 = infos.lang_org;
    var lang2 = infos.lang_trans;
    if (!lang1) lang1 = login_info.selected_lang_org;
    if (!lang2) lang2 = login_info.selected_lang_trans;

    var infos_split = await get_split_org(infos.text, infos);
    if (infos_split.api_error) return infos_split;
    var list_split = infos_split.list_splited;
    var url_api = get_url_MT_API(lang1, lang2);
    var list_text_trans = [];

    for (var ind in list_split){
        var txt = list_split[ind];
        infos.REQ_PARAMS = {text: txt, split: "0"};

        var res_infos = await new Promise((resolve, err) => {
            var func_fail = function(infos){func_fail_api_default(infos); err(infos);};
            call_api_request('mt', url_api, resolve, func_fail, infos);
        });

        if (res_infos.api_error) return res_infos;
        list_text_trans.push(res_infos.resultset.result.text);
    }

    infos.text_trans = list_text_trans.join("");
    infos.lang_org = lang1;
    infos.lang_trans = lang2;
    return infos;
};

exports.TRANS_MAX_LEN = 1000;

// 翻訳対象の原文の分割
// 2020/12/27 1,000バイトに達する直前の改行部分で分割
// 分割順 段落＞制限バイト長判定＞文分割API
async function get_split_org(txt_org, infos) {
    var MAX_LEN = exports.TRANS_MAX_LEN;
    var STR_PARA = /(\n{2,})/mg;
    var list_para = txt_org.split(STR_PARA); // 段落分割

    var list_text = [];
    for (var ind_para in list_para) {

        var txt_para = list_para[ind_para];

        // バイト長判定
        var lenb = Utils.get_length_bytes(txt_para);
        if (lenb <= MAX_LEN) { list_text.push(txt_para); continue; }

        // 改行による分割
        var ind_return = -1;
        var ind_start = 0;
        var ary_txt_org = txt_para.split('');
        var len_str = txt_para.length;
        var sum_byte = 0;
        var ind;
        for (ind = 0; ind < len_str; ind++) {
            var chr = ary_txt_org[ind];
            var lenb_chr = Utils.get_length_bytes(chr);
            if (chr === "\n") ind_return = ind;
            if (sum_byte + lenb_chr > MAX_LEN && ind_return > ind_start) {
                list_text.push(txt_para.substr(ind_start, ind_return - ind_start + 1));
                ind_start = ind_return + 1;
                ind = ind_start - 1;
                sum_byte = 0;
                continue;
            }
            sum_byte += lenb_chr;
        }
        if (ind !== ind_start) list_text.push(txt_para.substr(ind_start, len_str - ind_start));
    }

    return await get_split_org2(list_text, infos);
}

async function get_split_org2(list_text, infos) {

    // 改行で分割できなかったテキストをAPIで分割
    var MAX_LEN = exports.TRANS_MAX_LEN;
    var list_text2 = [];

    for (var ind in list_text){

        // バイト長判定
        var txt = list_text[ind];
        var lenb = Utils.get_length_bytes(txt);
        if (lenb <= MAX_LEN) { list_text2.push(txt); continue; }

        // APIによる分割
        infos.txt = txt;
        var res_info2 = await exports.split_sentence(infos);
        if (res_info2.api_error) return res_info2;

        res_info2.list_splited.forEach(txt => { list_text2.push(txt);});
        
    }

    return {list_splited: list_text2};

}

// 対訳集 一覧取得
exports.search_taiyaku_shu = function (infos) {
    return new Promise((resolve, err) => {
        set_api_params(infos);
        var login_info = infos.LOGIN_INFO;
        infos.REQ_PARAMS = {
            lang_s: login_info.selected_lang_org,
            lang_t: login_info.selected_lang_trans
        };
        infos.ignore_error_cd = [ERR_CD_NO_RESULT];
        var func_fail = function(infos){func_fail_api_default(infos); err(infos);};
        call_api_request('bilingual_root', 'get', resolve, func_fail, infos);
    });
};

// 類似文 検索
exports.search_ruijibun = function (infos) {
    return new Promise((resolve, err) => {
        set_api_params(infos);
        infos.REQ_PARAMS = {
            text: infos.text,
            pid: infos.pid
        };
        infos.ignore_error_cd = [ERR_CD_NO_RESULT];
        var func_fail = function(infos){func_fail_api_default(infos); err(infos);};
        call_api_request('sim', null, resolve, func_fail, infos);
    });
};

exports._TABLE_DIC_FOR_LANG = {
	"ja-en": "ld.ja-en",    "en-ja": "ld.en-ja",
	"ja-zh-CN": "er.ja-zh-CN", "zh-CN-ja": "er.zh-CN-ja",
	"ja-ko": "kj.ja-ko",    "ko-ja": "kj.ko-ja"
};

// 辞書引き
exports.refer_dic = function (infos) {
    return new Promise((resolve, err) => {
        set_api_params(infos);
        if (!infos.lang_org) infos.lang_org = infos.LOGIN_INFO.selected_lang_org;
        infos.REQ_PARAMS = {
            text: infos.text_org,
            pid: infos.pid,
            lang_s: infos.lang_org
        };
        var func_fail = function(infos){func_fail_api_default(infos); err(infos);};
        call_api_request('lookup', null, resolve, func_fail, infos);
    });
};

// 文章区切り
exports.split_sentence = async function (infos) {

    var res_info = await new Promise((resolve, err) => {
        set_api_params(infos);

        var lang_org = infos.lang_org;
        if (!lang_org) lang_org = infos.LOGIN_INFO.selected_lang_org;
    
        infos.REQ_PARAMS = {
            lang: lang_org,
            text: infos.txt
        };
        if (infos.join) infos.REQ_PARAMS.join = infos.join ? '1' : '0'; // 事前結合

        var func_fail = function(infos){func_fail_api_default(infos); err(infos);};
        call_api_request('split', null, resolve, func_fail, infos);
    });
    if (res_info.api_error) return res_info;

    var list_splited = res_info.resultset.result.text;
    res_info.list_splited = list_splited;
    return res_info;

};

// 用語集 検索
exports.search_term_dic = function (infos, func_success, func_fail) {

    set_api_params(infos);
    var login_info = infos.LOGIN_INFO;
    infos.REQ_PARAMS = {
        lang_s: login_info.selected_lang_org,
        lang_t: login_info.selected_lang_trans
    };

    infos.ignore_error_cd = [ERR_CD_NO_RESULT];
    call_api_request('term_root', 'get', func_success, func_fail, infos);

};

// アライメント 依頼
exports.request_alignment = async function (infos) {

    return new Promise((resolve, err) => {
        set_api_params(infos);
        var fs = require('fs');
        var login_info = infos.LOGIN_INFO;
        infos.REQ_PARAMS = {
            lang_s: login_info.selected_lang_org,
            lang_t: login_info.selected_lang_trans,
            title: infos.title,
            file1: fs.createReadStream(infos.path_file_org),
            file2: fs.createReadStream(infos.path_file_trs)
        };
        var func_fail = function(infos){func_fail_api_default(infos); err(infos);};
        call_api_request('alignment', 'set', resolve, func_fail, infos);
    });

};

// アライメント 状況確認
exports.search_list_alignment_status = async function (infos) {
    return new Promise((resolve, err) => {
        set_api_params(infos);
        infos.REQ_PARAMS = {
            limit: infos.limit
        };
        var func_fail = function(infos){func_fail_api_default(infos); err(infos);};
        call_api_request('alignment', 'status', resolve, func_fail, infos);
    });
};

// アライメント 結果取得
exports.get_alignment_result = async function (infos) {
    return new Promise((resolve, err) => {
        set_api_params(infos);
        infos.REQ_PARAMS = {
            pid: infos.id
        };
        infos.get_body_directly = true;
        var func_fail = function(infos){func_fail_api_default(infos); err(infos);};
        call_api_request('alignment', 'get', resolve, func_fail, infos);
    });
};

exports._que_req = null;
exports._executing_req = false;
exports._executing_req_last_time = new Date().getTime();

// APIを呼び出す
function call_api_request(api_name, api_param, func_success, func_fail, infos) {

    if (!api_param) api_param = '0';
    if (!func_fail) func_fail = func_fail_api_default;
    var login_info = infos.LOGIN_INFO;

    var request = require('request');

    var user_name = login_info.User_Name;
    var api_key = login_info.API_Key;
    var api_sec = login_info.API_Secret;
    var url_domain = 'https://mt-auto-minhon-mlt.ucri.jgn-x.jp'; 
    var url_aouth = '/oauth2/token.php'; 
  
    infos.api_error = false;
    var func_call_api = function() {
        var form_params = {
            access_token: _req_token,
            key: api_key,
            api_name: api_name,
            api_param: api_param,
            name: user_name,
            type: 'json'
        };

        console.log('form params >> ' + JSON.stringify(form_params));
        console.log('req params >> ' + JSON.stringify(infos.REQ_PARAMS));
        form_params = {...form_params, ...infos.REQ_PARAMS};
        request.post(url_domain + '/api/', {
            formData: form_params
        }, function(err, res) {
            console.log("res >> " + JSON.stringify(res));
            console.log("err >> " + JSON.stringify(err));
            if(res){
                if (infos.get_body_directly){
                    console.log("get_body_directly res.body:\n" + res.body);
                    infos.result = res.body;
                    func_success(infos);
                    return;
                }
                var obj_json = JSON.parse(res.body);
                console.log("res.body:" + JSON.stringify(obj_json));
                var result_set = obj_json.resultset;
                var code_res = result_set.code;
                var list_ignore = infos.ignore_error_cd;
                var ignore_err = list_ignore && list_ignore.includes(code_res);
                if (code_res === 0 || ignore_err){
                    infos.resultset = result_set;
                    func_success(infos);
                    return;
                }
                if (code_res !== 0 && !ignore_err) err = result_set.message;
            }
            if(err) {
                Utils.msgbox(i18n.mes_1034 + '\n' + err.toString(), 2); // API処理に失敗しました。
                console.log("error:", err);
            }
            infos.api_error = true;
            func_fail(infos);
        });          
    };

    if (_req_token){
        func_call_api();
    } else {
        request.post(url_domain + url_aouth, {
        form: {
            grant_type: 'client_credentials',
            client_id: api_key,
            client_secret: api_sec,
            urlAccessToken: url_domain + url_aouth
        }
        }, function(err, res) {
            if(err){
                console.log("error:", err);
                infos.api_error = true;
                func_fail(infos);
                return;
            }
        
            var token = null;
            try{
                token = JSON.parse(res.body).access_token;
            } catch (e) { 
                console.log(e); 
                infos.api_error = true;
                func_fail(infos); 
                return; }
        
            if(!token) {
                console.log("res:", res);
                Utils.msgbox(i18n.mes_0206, 2); // ログインに失敗しました。
                infos.api_error = true;
                func_fail(infos);
                return;
            }
            _req_token = token;

            func_call_api();
    
        });
    }

}

// APIを呼び出しを連続させないための処理
exports.func_execute_request = function () {

    if (new Date().getTime() - exports._executing_req_last_time < 30 * 1000) {
        exports._executing_req = false;
    }

    if (exports._executing_req) { return; }

    var func = exports._que_req.shift();
    if (func) {
        exports._executing_req = true;
        exports._executing_req_last_time = new Date().getTime();
        func();
    }

};

function func_fail_api_default(infos) {

    var resp = infos.api_response;
    var result = resp ? resp.resultset : null;
    var cd = result ? result.code : null;

    // 500：API keyエラー
    // 501：nameエラー
    // 522：リクエストkeyエラー
    // 523：リクエストnameエラー
    if (cd === 500 || cd === 501 ||
        cd === 522 || cd === 523) {
        // ログインに失敗しました。API設定を行ってください。
        // またはサーバメンテナンス中の可能性があります。
        // みんなの自動翻訳サイトをご確認ください。
        Utils.msgbox(i18n.mes_0503, 2); 
    } else {
        // API処理に失敗しました。
        // このメッセージの画像、エラー発生時の状態を 
        // 開発者までお知らせください。
        // パラメータ：
        Utils.msgbox(i18n.mes_0504 + JSON.stringify(infos), 2);
    }
}

exports.func_fail_api = function (func_dail_default, infos, response) {
    if (response.indexOf("503 Service Unavailable") !== -1) {
        // みんなの自動翻訳サーバが停止しています。
        // メンテナンス情報をご確認ください。
        Utils.msgbox(i18n.mes_0505, 2);
    } else {
        func_dail_default(infos);
    }
};

const urls_trans_API = {
    'ja_en': 'generalNT_ja_en',
    'en_ja': 'generalNT_en_ja',
    'ja_zh-CN': 'generalNT_ja_zh-CN',
    'zh-CN_ja': 'generalNT_zh-CN_ja',
    'ja_zh-TW': 'generalNT_ja_zh-TW',
    'zh-TW_ja': 'generalNT_zh-TW_ja',
    'ja_ko': 'generalNT_ja_ko',
    'ko_ja': 'generalNT_ko_ja',
    'ja_fr': 'generalNT_ja_fr',
    'fr_ja': 'generalNT_fr_ja',
    'ja_de': 'generalNT_ja_de',
    'de_ja': 'generalNT_de_ja',
    'ja_id': 'generalNT_ja_id',
    'id_ja': 'generalNT_id_ja',
    'ja_fp': 'voicetraNT_ja_fp',
    'fp_ja': 'voicetraNT_fp_ja',
    'ja_es': 'generalNT_ja_es',
    'es_ja': 'generalNT_es_ja',
    'ja_vi': 'generalNT_ja_vi',
    'vi_ja': 'generalNT_vi_ja',
    'ja_my': 'generalNT_ja_my',
    'my_ja': 'generalNT_my_ja',
    'ja_th': 'generalNT_ja_th',
    'th_ja': 'generalNT_th_ja',
    'ja_pt-BR': 'voicetraNT_ja_pt-BR',
    'pt-BR_ja': 'voicetraNT_pt-BR_ja',

    'en_zh-CN': 'generalNT_en_zh-CN',
    'zh-CN_en': 'generalNT_zh-CN_en',
    'en_zh-TW': 'generalNT_en_zh-TW',
    'zh-TW_en': 'generalNT_zh-TW_en',
    'en_fr': 'generalNT_en_fr',
    'fr_en': 'generalNT_fr_en',
    'en_de': 'generalNT_en_de',
    'de_en': 'generalNT_de_en',
    'en_id': 'generalNT_en_id',
    'id_en': 'generalNT_id_en',
    'en_es': 'generalNT_en_es',
    'es_en': 'generalNT_es_en',
    'en_vi': 'generalNT_en_vi',
    'vi_en': 'generalNT_vi_en',
    'en_my': 'generalNT_en_my',
    'my_en': 'generalNT_my_en',
    'en_th': 'generalNT_en_th',
    'th_en': 'generalNT_th_en',
    'en_pt': 'generalNT_en_pt',
    'pt_en': 'generalNT_pt_en',
    
    'fr_my': 'voicetraNT_fr_my',
    'my_fr': 'voicetraNT_my_fr',
    'zh-CN_ko': 'voicetraNT_zh-CN_ko',
    'ko_zh-CN': 'voicetraNT_ko_zh-CN',
    'zh-TW_ko': 'voicetraNT_zh-TW_ko',
    'ko_zh-TW': 'voicetraNT_ko_zh-TW',
    'en_ar': 'generalNT_en_ar',
    'ar_en': 'generalNT_ar_en',
    'en_it': 'generalNT_en_it',
    'it_en': 'generalNT_it_en',
    'en_ru': 'generalNT_en_ru',
    'ru_en': 'generalNT_ru_en'
};
