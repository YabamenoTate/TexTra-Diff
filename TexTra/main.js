const vscode = require('vscode');
const Utils = require('./js/utils');
const API = require('./js/api.js');
const CONST = require('./js/constants');
const {i18n} = require('./js/i18n');

var _context = null;

// 選択文翻訳
exports.trans_selected_text = async function(context){

    var wd = vscode.window;
    _context = context;
    API.set_system_info(context);

    var lang_settings = Utils.get_langs_setting(context);
    var cd_lang1 = lang_settings.lang1;
    var cd_lang2 = lang_settings.lang2;
    var lang_pare = '[' + CONST.get_2lang_name(cd_lang1, cd_lang2) + ']';

    var item_under = i18n.mes_0601; // テキストの下
    var item_clip = i18n.mes_0602; // クリップボード
    var item_ruijibun = i18n.mes_0657; // 設定 - 類似文
    var target = await wd.showQuickPick([item_under, item_clip, item_ruijibun], {placeHolder: lang_pare});
    if (!target) return;

    switch(target){
        case item_under: translate_text_to_editor();  break;
        case item_clip: translate_text_to_clipboad(); break;
        case item_ruijibun: settings_ruijibun();
    }

};

async function translate_text_to_editor(){

    if (!API.check_api_settings(_context)) return;

    var wd = vscode.window;
    var editor = wd.activeTextEditor;
    var doc = editor.document;

    var sel_txt = Utils.get_selected_text(true);
    if (!sel_txt) return;

    Utils.msg_line(i18n.mes_0604); // 翻訳中・・・

    // 翻訳API
    var infos_trans = {text: sel_txt};
    var res_trans = await API.trans_text(infos_trans);
    if (res_trans.api_error) return;
    var txt_trs = infos_trans.text_trans;
    if (Utils.is_empty_string(txt_trs)) return;

    // 類似文API
    var list_ruiji = await search_ruijibun(sel_txt, _context);
    if (!list_ruiji) list_ruiji = [];

    var rng_sel = editor.selection;
    var line_sel_last = doc.lineAt(rng_sel.end);
    var pos_output = line_sel_last.range.end;
    var at_start = rng_sel.end.character == line_sel_last.range.start.character;
    if (at_start) {
        line_sel_last = doc.lineAt(pos_output.line - 1);
        pos_output = line_sel_last.range.end;
    }

    var list_ruiji_output = [];
    for(var ind in list_ruiji){
        var rui = list_ruiji[ind]; 
        list_ruiji_output.push(
            // 類似文、対訳集
            '[' + i18n.mes_0625 + ' ' + (parseInt(ind) + 1).toString() + '] \n'+ 
            i18n.mes_0655 + ': ' + 
            '[' + rui.bilingualRootName  + '] Score: ' + rui.score + "\n" +
            "\t" + rui.source + "\n\t" + rui.target
        );
    }
    var str_ruiji = '';
    if (!Utils.is_empty_list(list_ruiji_output)) 
        str_ruiji = "\n\n" + list_ruiji_output.join("\n");
    editor.edit((eb) => {
        eb.insert(pos_output, "\n" + txt_trs + str_ruiji + "\n");
    });
    var pos_head = new vscode.Position(line_sel_last.lineNumber + 1, 0);
    editor.selection = new vscode.Selection(pos_head, pos_head);
}

async function translate_text_to_clipboad(){

    if (!API.check_api_settings(_context)) return;

    var sel_txt = Utils.get_selected_text(true);
    if (!sel_txt) return;

    Utils.msg_line(i18n.mes_0604); // 翻訳中・・・

    // 翻訳API
    var infos_trans = {text: sel_txt};
    var res_trans = await API.trans_text(infos_trans);
    if (res_trans.api_error) return;
    var txt_trs = infos_trans.text_trans;
    if (Utils.is_empty_string(txt_trs)) return;

    vscode.env.clipboard.writeText(txt_trs);
    Utils.msgbox(i18n.mes_0603); // クリップボードに翻訳を出力しました。
}

const KEY_RUIJI_SEARCH = '翻訳時に類似文も検索';
const KEY_RUIJI_TAIYAKUSHU = '類似文検索に使用する対訳集';
const KEY_RUIJI_SCORE = '類似文 スコア';
const KEY_RUIJI_NUMBER = '類似文 表示件数';

// 設定 類似文
async function settings_ruijibun(){

    var wd = vscode.window;
    var st = _context.globalState;
    var flg_search_ruijibun = st.get(KEY_RUIJI_SEARCH, false);
    var score = st.get(KEY_RUIJI_SCORE, '80');
    var disp_num = st.get(KEY_RUIJI_NUMBER, '3');

    var item_search_when_trans = i18n.mes_0627 + ' [' + 
            (flg_search_ruijibun ? i18n.mes_0631 : i18n.mes_0632) + ']'; // 翻訳時に、類似文も検索する、はい、いいえ
    var item_select_taiyakushu = i18n.mes_0628; // 対訳集を選択
    var item_score = i18n.mes_0629 + ' [' + score + ']'; // スコア
    var item_number = i18n.mes_0630 + ' [' + disp_num + ']'; // 表示件数
    var items = [item_search_when_trans, item_select_taiyakushu, item_score, item_number];
    var target2 = await wd.showQuickPick(items);
    if (!target2) return;

    switch(target2){
        case item_search_when_trans: // 翻訳時に類似文も検索する
            var item_yes = i18n.mes_0631; // はい
            var item_no = i18n.mes_0632; // いいえ
            var target_sim_search = await wd.showQuickPick([item_yes, item_no], 
                {placeHolder: i18n.mes_0627}); // 翻訳時に、類似文も検索する。
            if (!target_sim_search) return;

            st.update(KEY_RUIJI_SEARCH, target_sim_search == item_yes);
            break;

        case item_select_taiyakushu: // 対訳集を選択
            if (!API.check_api_settings(_context)) return;

            var res_info = await API.search_taiyaku_shu({});
            if (res_info.api_error) return;
        
            var list_taiyakushu = res_info.resultset.result.list;

            var st_data = st.get(KEY_RUIJI_TAIYAKUSHU, '');

            var list_taiyakushu_selected = st_data.split(',');
            var list_item_taiyakushu = [];
            list_taiyakushu.forEach(dic_info => { 
                list_item_taiyakushu.push(
                    {id: dic_info.id, label: dic_info.name, 
                        picked: list_taiyakushu_selected.includes(dic_info.id.toString())});
            });

            var list_selected = await wd.showQuickPick(list_item_taiyakushu, {
                placeHolder: i18n.mes_0633,  // 類似文検索に使用する対訳集を選択してください。
                canPickMany:true});
            if (!list_selected) return;

            var list_id_selected = [];
            list_selected.forEach(item_selected => {
                list_id_selected.push(item_selected.id);
            });
            st.update(KEY_RUIJI_TAIYAKUSHU, list_id_selected.join(','));
            break;

        case item_score: // スコア
            var items_score = ['100', '90', '80', '70', '60', '50'];
            var target_score = await wd.showQuickPick(items_score, {placeHolder: 
                i18n.mes_0635 + "[" + score + "]"}); // 指定したスコア以上の類似文を表示する。
            if (!target_score) return;
            st.update(KEY_RUIJI_SCORE, target_score);
            break;

        case item_number: // 表示件数
            var items_num = ['1', '3', '5', '100'];
            var target_num = await wd.showQuickPick(items_num, {placeHolder: 
                i18n.mes_0636 + "[" + disp_num + "]"}); // 指定した件数の類似文を表示する。
            if (!target_num) return;
            st.update(KEY_RUIJI_NUMBER, target_num);
        break;
    }
}

const MAX_search_ruijibun = 10;

async function search_ruijibun(txt, context){

    var st = context.globalState;
    if (st.get(KEY_RUIJI_SEARCH, false) == false) return;

    var ids = st.get(KEY_RUIJI_TAIYAKUSHU, '');
    if (Utils.is_empty_string(ids)) {
        Utils.msgbox(i18n.mes_0637, 1); // 類似文検索に使用する対訳集が選択されていません。
        return null;
    }

    var disp_num = st.get(KEY_RUIJI_NUMBER, '3');
    var list_result = [];
    var max_num = MAX_search_ruijibun;
    var list_txt = txt.split("\n");
    if (list_txt.length > max_num) Utils.msg_line(i18n.get_message(658, max_num)); // 類似文検索は最初の{0}行に対して行われます。
    for (var ind in list_txt){
        var txt_e = list_txt[ind];
        if (Utils.is_empty_string(txt_e)) continue;
        if (parseInt(ind) >= max_num) break;

        var infos = {text: txt_e, pid: ids};
        var res_info = await API.search_ruijibun(infos);
        if (res_info.api_error) return null;

        list_result = list_result.concat(res_info.resultset.result.sim);
        if (list_result.length >= disp_num) break;
    }

    list_result = list_result.slice(0, disp_num);
    return list_result;
}

// API設定
// 暗号化のため 設定画面ではなく、コードで
exports.set_api_params = async function (context){

    var wd = vscode.window;

    var item_names = ['User Name', 'API Key', 'API Secret'];
    var target = await wd.showQuickPick(item_names);
    if (!target) return;

    var ind_target = item_names.indexOf(target);
    var st = context.globalState;
    var key_api_info = 'LOGIN_INFO';
    var config = st.get(key_api_info, {});
    var keys_conf = ['User_Name', 'API_Key', 'API_Secret', 'Lang1', 'Lang2'];
    var key_conf = keys_conf[ind_target];
    var cur_value = config[key_conf];

    const value = await wd.showInputBox({ prompt: 'Input [' + target + ']:', 
    placeHolder: API.decrypt(cur_value)});
    if (Utils.is_empty_string(value)) return;

    config[key_conf] = API.encrypt(value);
    st.update(key_api_info, config);

};

// 言語設定
exports.set_languages = async function (context){

    var wd = vscode.window;

    var langs = Utils.get_langs_setting(context);
    var cd_lang1 = langs.lang1, cd_lang2 = langs.lang2;
    var label_lang1 = i18n.mes_0001 + ' [' + CONST.get_langage_name(cd_lang1) + ']'; // 元言語
    var label_lang2 = i18n.mes_0002 + ' [' + CONST.get_langage_name(cd_lang2) + ']'; // 訳言語

    var list_labels = [label_lang1, label_lang2];
    var label_reverse = i18n.mes_0605; // 入れ替え
    if (cd_lang1 && cd_lang2) list_labels.unshift(label_reverse);
    var label_sel = await wd.showQuickPick(list_labels);
    if (!label_sel) return;

    switch(label_sel)
    {
        case label_reverse:
            var cd_temp = cd_lang1; cd_lang1 = cd_lang2; cd_lang2 = cd_temp;
            break;
        case label_lang1:
        case label_lang2:
            var list_item = [];
            CONST.get_list_langage().forEach((lang) =>{
              list_item.push({cd: lang, label: CONST.get_langage_name(lang)});
            });
        
            var flg_lang1 = label_sel == label_lang1;
            var ph = flg_lang1 ? label_lang1 : label_lang2;
            var selected_lang = await wd.showQuickPick(list_item, {placeHolder: ph});
            if (!selected_lang) return; 
            var cd_new = selected_lang.cd;
            if(flg_lang1) {if (cd_lang2 == cd_new) cd_lang2 = cd_lang1; cd_lang1 = cd_new; }
            if(!flg_lang1) {if (cd_lang1 == cd_new) cd_lang1 = cd_lang2; cd_lang2 = cd_new; }
            break;
    }

    var config_new = {lang1: cd_lang1, lang2: cd_lang2};
    var key_strage = CONST.key_strage.languages;
    var st = context.globalState;
    st.update(key_strage, config_new);
    Utils.msgbox(i18n.mes_0612 + ': ' + 
        CONST.get_langage_name(cd_lang1) + ' > ' + 
        CONST.get_langage_name(cd_lang2)); // 現在の言語設定

};

var _item_tab = i18n.mes_0606; // 新しいタブ
var _item_tsv = i18n.mes_0607; // TSV形式



/** Translate rst (reStrucruredText) */
exports.trans_rst_file = async function(context){

    if (!API.check_api_settings(context)) return;

    var wd = vscode.window; 
    var editor = wd.activeTextEditor;
    if(!editor) return;

    var langs = Utils.get_langs_setting(context);
    var lang_pare = ' [' + CONST.get_2lang_name(langs.lang1, langs.lang2) + ']';
    var target = await wd.showQuickPick([_item_tab, _item_tsv], 
        {placeHolder: i18n.mes_0608 + lang_pare}); // 翻訳出力

    var doc = editor.document;
    var text = doc.getText();
    var text_html = require('rst2html')(text);
    translate_text_tab(text_html, target, context);
};

// rst、mdを翻訳
async function output_trans_for_rst_md(target, list_texts, text_rst, wd, doc){
    var opt_undo = {undoStopAfter: false, undoStopBefore: false};

    Utils.msg_line(i18n.mes_0604); // 翻訳中・・・
    var func_output;
    switch(target){
        case _item_tab:
            wd.showTextDocument(doc).then((ed)=>{
                ed.edit((eb) => {eb.insert(new vscode.Position(0, 0) , text_rst);}, opt_undo);
            });
    
            func_output = function(txt_org, txt_trs){
                wd.showTextDocument(doc).then((ed)=>{
                    var doc = ed.document;
                    text_rst = text_rst.replace(txt_org, txt_trs);
                    ed.edit((eb) => {
                        eb.delete(new vscode.Range(new vscode.Position(0,0),
                                doc.lineAt(doc.lineCount - 1).range.end));
                        eb.insert(new vscode.Position(0, 0) , text_rst);
                    }, opt_undo);
                });
            };
            break;
        case _item_tsv:
            func_output = function(txt_org, txt_trs){
                wd.showTextDocument(doc).then((ed)=>{
                    var doc = ed.document;
                    ed.edit((eb) => {
                        eb.insert(doc.lineAt(doc.lineCount - 1).range.end,
                        txt_org + "\t" + txt_trs + "\n");
                    }, opt_undo);
                });
            };
            break;
    }   

    for (var ind in list_texts){

        // 翻訳API
        var txt_org = list_texts[ind];
        var infos_req = {text: txt_org};
        var res_info = await API.trans_text(infos_req);
        if (res_info.api_error) return;
        
        var txt_trs = res_info.text_trans;
        if (Utils.is_empty_string(txt_trs)) continue;
        func_output(txt_org, txt_trs);
    }

}

function get_texts_from_html(text_html){
    const jsdom = require('jsdom');
    const {JSDOM} = jsdom;
    var dom = new JSDOM(text_html);
    var elm_root = dom.window.document.body;
    var list_text = [];
    var func_get_text = function(elm_p){
      if(elm_p.nodeName === '#text'){
        var txt_elm = Utils.trim(elm_p.textContent);
        if (!Utils.is_empty_string(txt_elm)) list_text.push(txt_elm);
        return;
      }
  
      for (var elm of elm_p.childNodes){
        func_get_text(elm);
      }
    };
  
    func_get_text(elm_root);
    return list_text;
}

// Translate md(Markdown)
exports.trans_md_file = async function(context){

    if (!API.check_api_settings(context)) return;
    var wd = vscode.window;
    var editor = wd.activeTextEditor;
    if(!editor) return;

    var langs = Utils.get_langs_setting(context);
    var lang_pare = ' [' + CONST.get_2lang_name(langs.lang1, langs.lang2) + ']';
    var target = await wd.showQuickPick([_item_tab, _item_tsv], 
        {placeHolder: i18n.mes_0608 + lang_pare}); // 翻訳出力
    if (!target) return;

    var doc = editor.document;
    var text_md = doc.getText();
    var text_html = require("marked")(text_md);
    translate_text_tab(text_html, target, context);
};

/**
 * 対象のタブの翻訳
 * @param {string} text_html 翻訳元をhtml化した文字列
 * @param {string} target 出力先
 * @param {vscode.ExtensionContext} context
 */
async function translate_text_tab(text_html, target, context){
    var wd = vscode.window; var ws = vscode.workspace;
    var editor = wd.activeTextEditor;

    var list_texts = get_texts_from_html(text_html);
    if (list_texts.length === 0) Utils.msgbox(i18n.mes_0611, 1); // テキストがありません。
    var doc = editor.document;
    
    if(!doc) return;
    var text_rst = doc.getText();
    API.set_system_info(context);
    ws.openTextDocument().then((doc_new) => {
        wd.showTextDocument(doc_new).then(() => {
            output_trans_for_rst_md(target, list_texts, text_rst, wd, doc_new);
        });
    });
}

// 用語 使用チェック
exports.check_term_using = async function (context){

    if (!API.check_api_settings(context)) return;
    _context = context;
    var wd = vscode.window;
    
    var list_item = [];
    var lang_settings = Utils.get_langs_setting(context);
    var cd_lang1 = lang_settings.lang1;
    var cd_lang2 = lang_settings.lang2;
    var item_check_select = i18n.mes_0614  + // チェック 選択範囲
        ' [' + CONST.get_2lang_name(cd_lang1, cd_lang2) + ']';  
    list_item.push(item_check_select); 
    var item_glossary = i18n.mes_0616; list_item.push(item_glossary); // 選択 用語集

    API.set_system_info(_context);
    switch(await wd.showQuickPick(list_item)){
        case item_check_select: check_用語使用_selected(); break;
        case item_glossary: TC_select_glossary(); break;
    }
    
};

// 用語使用チェック 選択範囲
async function check_用語使用_selected() {

    var wd = vscode.window;

    var editor = wd.activeTextEditor;
    if(!editor) return;
    var doc = editor.document;

    // 表示中のチェック情報を削除
    var rng_sel = editor.selection;
    var row_st = rng_sel.start.line;
    var row_ed = rng_sel.end.line;
    var list_taiyaku = [];
    for (var row = row_st; row <= row_ed; row++){
        var line = doc.lineAt(row).text;
        var txts = get_対訳_from_line(line);
        if (!txts) continue;
        var txt_org = txts[0];
        var txt_trs = txts[1];
        list_taiyaku.push({row: row, txt_org: txt_org, txt_trs: txt_trs});
    }

    // チェック対象なし。
    if (Utils.is_empty_list(list_taiyaku)){
        // 用語使用チェックは、下記のTSV形式のデータ行に対して、実行されます。
        //   [原文]\t(タブ文字)[訳文]
        // ファイルの作成にはアライメント機能をご利用ください。
        Utils.msgbox(i18n.mes_0638, 1);
        return;
    }

    if(await check_用語使用(list_taiyaku)) Utils.msgbox(i18n.mes_0624); // [終了] 用語使用チェック
}

async function check_用語使用(list_taiyaku) {

    var wd = vscode.window;
    var ws = vscode.workspace;

    var editor = wd.activeTextEditor;
    if(!editor) return false;

    var doc_new = await ws.openTextDocument();
    await wd.showTextDocument(doc_new);
    editor = wd.activeTextEditor;
    var [pid, table_dic] = get_settings_対訳集();

    await editor.edit((eb) => { eb.insert(new vscode.Position(0, 0), i18n.mes_0656 + "\n"); });

    // チェック開始
    var diag_col = vscode.languages.createDiagnosticCollection('diag_check_term');
    var list_diag = [];
    Utils.msg_line(i18n.mes_0623); // [開始] 用語使用チェック
    for (var ind in list_taiyaku){
        var info = list_taiyaku[ind];
        var row2 = info.row;
        var txt_org2 = info.txt_org.replace("\n");
        var txt_trs2 = info.txt_trs.replace("\n");

        // 出力 チェック対象
        var pos_first = doc_new.positionAt(Number.MAX_SAFE_INTEGER);
        var pos_org; var pos_trs;
        /* jshint -W083 */
        await editor.edit((eb) => {
            pos_org = new vscode.Position(pos_first.line + 2, 0);
            pos_trs = new vscode.Position(pos_first.line + 5, 0);
            eb.insert(pos_first, (row2 + 1).toString() + " : =========================================\n" + 
                        "[" + i18n.mes_0022 + "]\n" + txt_org2 + "\n\n" + // 原文 
                        "[" + i18n.mes_0023 + "]\n" + txt_trs2 + "\n\n"); // 訳文
        });

        // チェック
        var infos = {text_org: txt_org2, pid: pid};
        var res_infos = await API.refer_dic(infos);
        if (res_infos.api_error) return false;
        if(doc_new.isClosed) return false;
        var list_lookup = res_infos.resultset.result.lookup;

        // 出力 チェック結果
        /* jshint -W083 */
        var table_org = {}; var table_trs = {};
        for (var ind_l in list_lookup) {
            var info_lookup = list_lookup[ind_l];
            var term_org = info_lookup.hit;
            for (var ind_t in info_lookup.term){
                var info_term = info_lookup.term[ind_t];
                info_term.info_lookup = info_lookup;
                var flg_use = txt_trs2.indexOf(info_term.target) >= 0; // 使用されている
                var str_check = flg_use ? '> ' : '';

                var term_trs = info_term.target;
                if (!table_org[term_org]) table_org[term_org] = [];
                table_org[term_org].push(info_term);

                if (flg_use){
                    if (!table_trs[term_trs]) table_trs[term_trs] = [];
                    table_trs[term_trs].push(info_term);
                }

                /* jshint -W083 */
                await editor.edit((eb) => {
                    var pos = doc_new.positionAt(Number.MAX_SAFE_INTEGER);
                    eb.insert(pos, term_org + ' > ' + info_term.target + 
                                    str_check + ' [' + table_dic[info_term.pid] + ']\n');
                });
                
            }

        }

        /* jshint -W083 */
        await editor.edit((eb) => {
            var pos = doc_new.positionAt(Number.MAX_SAFE_INTEGER);
            eb.insert(pos, "\n\n");
        });

        // 注釈
        for (var key_org in table_org){
            var list_term2 = table_org[key_org];
            var info_lookup2 = null;
            var list_found_info2 = [];
            for (var key_t2 in list_term2){
                var info_term2 = list_term2[key_t2];
                info_lookup2 = info_term2.info_lookup;
                list_found_info2.push('[' + table_dic[info_term2.pid] + '] ' + info_term2.target);
            }

            var pos_lookup = parseInt(info_lookup2.position);
            list_diag.push(new vscode.Diagnostic(new vscode.Range(
                pos_org.line, pos_lookup, 
                pos_org.line, pos_lookup + info_lookup2.length), 
                list_found_info2.join(", ")));
    
        }
        for (var key_trs in table_trs){
            var list_term3 = table_trs[key_trs];
            var list_found_info3 = [];
            for (var key_t3 in list_term3){
                var info_term3 = list_term3[key_t3];
                list_found_info3.push('[' + table_dic[info_term3.pid] + '] ' + info_term3.source);
            }

            var pos_found = txt_trs2.indexOf(key_trs);
            list_diag.push(new vscode.Diagnostic(new vscode.Range(
                pos_trs.line, pos_found, 
                pos_trs.line, pos_found + key_trs.length), 
                list_found_info3.join(", ")));
        }

        // 注釈出力
        diag_col.set(doc_new.uri, list_diag);
    }

    return true;
}

/**
 * 用語チェック用対訳集設定の読み出し
 * @returns pid
 */
function get_settings_対訳集(){

    var st = _context.globalState;
    var key_strage = CONST.key_strage.Term_check;
    var st_data = st.get(key_strage, {});
    var data_glos_cd = st_data.use_glos;
    if (!data_glos_cd) data_glos_cd = '';
    var list_glos_st = data_glos_cd.split('\n');
    var list_glos_cd_st = [];
    var table_dic = {};
    list_glos_st.forEach((data) => {
        var [cd_dic, dic_name] = data.split("\t");
        list_glos_cd_st.push(cd_dic); 
        table_dic[cd_dic] = dic_name;
    });
    var pid = list_glos_cd_st.join(',');
    return [pid, table_dic];
}

/**
 * 行から対訳情報を抜き出す。
 * @param {string}} line
 * @returns 原文、訳文
 */
function get_対訳_from_line(line){
    if (Utils.is_empty_string(line)) return null;
    var splited = line.split("\t");
    if (splited.length == 3) splited.shift();
    if (splited.length == 2) return splited;
    return null;
}

// 用語使用チェック 選択範囲
function TC_select_glossary() {

    var infos = {};

    Utils.msg_line(i18n.mes_0621); // 用語集を検索しています。

    var func_success = async (infos) => {
        var list_glos = infos.resultset.result.list;

        var st = _context.globalState;
        var key_strage = CONST.key_strage.Term_check;
        var st_data = st.get(key_strage, {});
        var data_glos_cd = st_data.use_glos;
        if (!data_glos_cd) data_glos_cd = '';
        var list_glos_st = data_glos_cd.split('\n');
        var list_glos_cd_st = [];
        list_glos_st.forEach((data) => {list_glos_cd_st.push(data.split("\t")[0]); });
        var list_item = [];
        list_glos.forEach((info_glos) =>{
            list_item.push({cd: info_glos.id, label: info_glos.name, 
                picked: list_glos_cd_st.includes(info_glos.id.toString())});
        });
    
        var wd = vscode.window;
        var list_selected = await wd.showQuickPick(list_item, {
            placeHolder: i18n.mes_0622, // 用語チェックに使用する用語集を選択してください。
            canPickMany:true});
        if (!list_selected) return;

        var list_glos_cd = [];
        list_selected.forEach((item) =>{ list_glos_cd.push(item.cd + '\t' + item.label); });
        st_data.use_glos = list_glos_cd.join('\n');
        st.update(key_strage, st_data);
        
    };

    API.call_api(API.search_term_dic, infos, func_success, null);

}

// アライメント
exports.alignment = async function (context){

    if (!API.check_api_settings(context)) return;
    _context = context;
    var wd = vscode.window;
    API.set_system_info(context);

    var langs = Utils.get_langs_setting(_context);
    var item_align = i18n.mes_0639 + ' [' + CONST.get_2lang_name(langs.lang1, langs.lang2) + ']';
    var item_result_score = i18n.mes_0640; // 結果取得(スコア有り)
    var item_result = i18n.mes_0641; // 結果取得(スコア無し)
    var item_lang = i18n.mes_0654; // 言語設定
    var list_item = [item_align, item_result_score, item_result, item_lang];

    switch(await wd.showQuickPick(list_item)){
        case item_align: AL_request(); break;
        case item_result_score: AL_download(true); break;
        case item_result: AL_download(false); break;
        case item_lang: exports.set_languages(_context); break;
    }
    
};

// アライメント依頼
async function AL_request() {

    var wd = vscode.window;

    var langs = Utils.get_langs_setting(_context);

    // 原文ファイル 選択
    var path_last1 = Utils.get_path_last_used(_context);
    var list_path1 = await wd.showOpenDialog(
        {title: i18n.mes_0642 + ' [' + CONST.get_langage_name(langs.lang1) + ']', 
            defaultUri: vscode.Uri.file(path_last1)}); // 原文ファイル
    if (Utils.is_empty_list(list_path1)) return;
    var path1 = list_path1[0].fsPath;
    Utils.save_path_last_used(path1, _context);

    // 訳文ファイル 選択
    var path_last2 = Utils.get_path_last_used(_context);
    var list_path2 = await wd.showOpenDialog(
        {title: i18n.mes_0643 + ' [' + CONST.get_langage_name(langs.lang2) + ']',  
            defaultUri: vscode.Uri.file(path_last2)}); // 訳文ファイル
    if (Utils.is_empty_list(list_path2)) return;
    var path2 = list_path2[0].fsPath;
    Utils.save_path_last_used(path2, _context);

    // アライメント依頼
    var infos = {};
    var format = require('dateformat');
    infos = {
      title: 'TT_VSC_' + format(new Date(), 'yymmdd_HHMMss'),
      path_file_org: path1,
      path_file_trs: path2
    };

    var res_infos = await API.request_alignment(infos);
    // アライメントを依頼しました。
    // しばらく待って、結果を取得してください。
    // 原文:{0}\n訳文:{1}
    if (!res_infos.api_error) 
        Utils.msgbox(i18n.get_message(644, path1, path2));
    else
        Utils.msgbox(i18n.mes_0645, 2); // アライメント依頼に失敗しました。

}

// アライメントダウンロード
async function AL_download(score) {

    var wd = vscode.window;

    // 取得する結果を選択
    Utils.msg_line(i18n.mes_0646); // アライメント結果一覧を取得しています・・・

    var infos = {limit:10};
    var res_infos = await API.search_list_alignment_status(infos);
    if (res_infos.api_error) return;
    var list_state = res_infos.resultset.result.list;

    var list_item = [];
    for(var ind in list_state){
        var state_info = list_state[ind];
        var str_state;
        switch(state_info.state){
            case 0: str_state = i18n.mes_0647; break; // 待機中
            case 1: str_state = i18n.mes_0648; break; // 処理中
            case 2: str_state = i18n.mes_0649; break; // 完了
            default: str_state = i18n.mes_0650; // 失敗
        }
        var langs = CONST.get_2lang_name(state_info.lang_s, state_info.lang_t);
        list_item.push(
            {id:state_info, label:('0' + (Number(ind) + 1)).slice(-2) + ': ' + 
            '[' + str_state + '][' + langs + ']: ' + state_info.register }
        );
    }

    var sel_info = await wd.showQuickPick(list_item);
    if(!sel_info) return;

    // 保存先選択
    var filters = {}; filters[i18n.mes_0652] = ['txt']; // テキストファイル
    var path_last = Utils.get_path_last_used(_context);
    var path_save = await wd.showSaveDialog({title: i18n.mes_0651, // アライメント結果
                            filters: filters,
                            defaultUri: vscode.Uri.file(path_last)});
    if(!path_save) return;                            
    Utils.save_path_last_used(path_save.fsPath, _context);

    // 結果取得
    var infos_get = {id: sel_info.id.id};
    var res_get = await API.get_alignment_result(infos_get);
    if (res_get.api_error) return;

    var str_result = res_get.result;
    var lines = str_result.split("\n");
    var list_result = [];
    for (var ind_line in lines){
        var line = lines[ind_line];
        var datas = line.split("\t");
        if (!score) datas.shift();
        list_result.push(datas.join("\t"));
    }

    // 保存
    var fs = require('fs');
    fs.writeFileSync(path_save.fsPath, list_result.join("\n"));

    Utils.msgbox(i18n.mes_0653 + "\n\n" + path_save.fsPath); // アライメント結果を保存しました。

}

// テキスト整形
exports.format_texts = async function (context){
    var wd = vscode.window;
    _context = context;
    API.set_system_info(context);

    var lang_settings = Utils.get_langs_setting(context);
    var cd_lang = lang_settings.lang1;
    var lang_name = '[' + CONST.get_langage_name(cd_lang) + ']';

    var item_auto_split = {label: i18n.mes_0659, description: i18n.mes_0660}; // 自動文分割、選択したテキストを自動で分割します。
    var item_set_langs = i18n.mes_0654; // 言語設定
    var target = await wd.showQuickPick([item_auto_split, item_set_langs], {placeHolder: lang_name});
    if (!target) return;

    switch(target){
        case item_auto_split: format_selected_text();  break;
        case item_set_langs: exports.set_languages(context); break;
    }
};

// テキスト整形
async function format_selected_text() {

    if (!API.check_api_settings(_context)) return;

    var sel_txt = Utils.get_selected_text(true);
    if (!sel_txt) return;
    
    Utils.msg_line(i18n.mes_0661); // 自動分割 開始

    var langs = Utils.get_langs_setting(_context);
    var infos = {txt: sel_txt, lang_org: langs.lang1, join: true};
    var res_info = await API.split_sentence(infos);
    if (res_info.api_error) return null;
    var list_text = res_info.resultset.result.text;

    var wd = vscode.window; 
    var editor = wd.activeTextEditor;
 
    editor.edit((eb) => {
        eb.delete(editor.selection);
        eb.insert(editor.selection.start, list_text.join("\n"));
    });

    Utils.msg_line(i18n.mes_0662); // 自動分割 完了

}
// Direct translation for specific language pair (Multiselection supported)
// Direct translation for specific language pair (Multiselection supported) with Refactoring Preview
exports.trans_direct_preview = async function(cd_lang1, cd_lang2, context){
    _context = context;
    if (!API.check_api_settings(context)) return;
    API.set_system_info(context);
    
    var wd = vscode.window;
    var ws = vscode.workspace;
    var editor = wd.activeTextEditor;
    if (!editor) return;

    // Capture selections immediately to handle cursor movement during API call
    var selections = editor.selections;
    if (!selections || selections.length === 0) return;

    // Filter empty selections to act on word under cursor if possible, but user asked for "selected content".
    // If empty selection, usually VSCode translates the word under cursor, but let's stick to explicit selections for now or expand if empty?
    // Standard VSCode behavior for "refactor" usually requires selection or cursor position.
    // If selection is empty, we can expand to word range? 
    // Existing logic in utils.get_selected_text(true) did some logic.
    // Let's iterate selections and if empty expand to word range.
    
    var target_ranges = [];
    selections.forEach(sel => {
        if (!sel.isEmpty) {
            target_ranges.push(sel);
        } else {
            var range = editor.document.getWordRangeAtPosition(sel.start);
            if (range) target_ranges.push(range);
        }
    });

    if (target_ranges.length === 0) return;

    // Mapping for specific API quirks
    if (cd_lang1 == 'ja' && cd_lang2 == 'pt') cd_lang2 = 'pt-BR';
    if (cd_lang1 == 'pt' && cd_lang2 == 'ja') cd_lang1 = 'pt-BR';
    if (cd_lang1 == 'tr') cd_lang1 = 'fp';
    if (cd_lang2 == 'tr') cd_lang2 = 'fp';

    var status_disp = Utils.msg_line(i18n.mes_0604); // Translating...

    try {
        var results = [];
        // Process sequentially as requested to avoid all-at-once failure/wait, though we batch the edit for a single Preview.
        // User asked to "not batch" execution, so we await each.
        for (const range of target_ranges) {
            var text = editor.document.getText(range);
            if (!text) continue;
            
            var infos = {
                text: text,
                lang_org: cd_lang1,
                lang_trans: cd_lang2
            };
            
            var res = await API.trans_text(infos);
            if (!res.api_error) {
                results.push({range: range, text: res.text_trans});
            }
        }
        
        if (results.length === 0) return;

        // Create WorkspaceEdit for Refactoring Preview
        var edit = new vscode.WorkspaceEdit();
        results.forEach(res => {
            edit.replace(editor.document.uri, res.range, res.text);
        });

        // Apply with refactoring metadata to trigger preview
        // Note: VSCode might apply simple edits automatically depending on user settings ("editor.codeActionsOnSave").
        // "isRefactoring" usually prompts.
        var success = await ws.applyEdit(edit, { isRefactoring: true });
        if (!success) {
            vscode.window.showErrorMessage("Failed to apply translation edit.");
        }
    } finally {
        Utils.clear_status(status_disp);
    }
};

var _lensProvider = null;
exports.set_lens_provider = function(p) { _lensProvider = p; };

var _provider = null;
exports.set_provider = function(p) { _provider = p; };

exports.apply_range = async function(uri, range, text) {
    var editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());
    if (!editor) {
        // Try to open the document if not visible
        const doc = await vscode.workspace.openTextDocument(uri);
        editor = await vscode.window.showTextDocument(doc);
    }
    
    if (editor) {
        // Convert range to vscode.Range if it's a plain object
        let vscodeRange = range;
        if (!(range instanceof vscode.Range)) {
            vscodeRange = new vscode.Range(
                new vscode.Position(range.start.line, range.start.character),
                new vscode.Position(range.end.line, range.end.character)
            );
        }
        
        await editor.edit(editBuilder => {
            editBuilder.replace(vscodeRange, text);
        });
        
        // Remove only this specific CodeLens after applying
        if (_lensProvider) {
            _lensProvider.removeRange(uri, range);
        }
    }
};

// Virtual Document Diff Preview
exports.trans_diff_preview = async function(cd_lang1, cd_lang2, context){
    _context = context;
    if (!API.check_api_settings(context)) return;
    API.set_system_info(context);
    
    var wd = vscode.window;
    var editor = wd.activeTextEditor;
    if (!editor) return;

    var selections = editor.selections;
    if (!selections || selections.length === 0) return;

    // Filter/Expand selections
    var target_ranges = [];
    selections.forEach(sel => {
        if (!sel.isEmpty) {
            target_ranges.push(sel);
        } else {
            var range = editor.document.getWordRangeAtPosition(sel.start);
            if (range) target_ranges.push(range);
        }
    });

    if (target_ranges.length === 0) {
        Utils.msg_line("No text selected.");
        return;
    }

    // Mapping for specific API quirks
    if (cd_lang1 == 'ja' && cd_lang2 == 'pt') cd_lang2 = 'pt-BR';
    if (cd_lang1 == 'pt' && cd_lang2 == 'ja') cd_lang1 = 'pt-BR';
    if (cd_lang1 == 'tr') cd_lang1 = 'fp';
    if (cd_lang2 == 'tr') cd_lang2 = 'fp';

    var status_disp = Utils.msg_line(i18n.mes_0604); // Translating...

    try {
        // Generate unique ID and URI for this preview
        var id = new Date().getTime().toString();
        var Path = require('path');
        var uriOriginal = editor.document.uri;
        var uriVirtual = vscode.Uri.parse(`textra-translation:${Path.basename(uriOriginal.fsPath)}?id=${id}`);
        
        // Initialize virtual doc with original content
        var docText = editor.document.getText();
        if (_provider) {
            _provider.update(uriVirtual, docText);
        }

        // Clear existing lenses
        if (_lensProvider) {
            _lensProvider.clearRanges(uriOriginal);
        }
        var activeLenses = [];
        var firstResult = true;

        var completedReplacements = new Map(); // Range -> Text

        const updateVirtualDoc = () => {
            var newText = docText;
            // Sort ranges descending
            var sortedRanges = [...target_ranges].sort((a, b) => b.start.compareTo(a.start));
            
            sortedRanges.forEach(range => {
                if (completedReplacements.has(range)) {
                    var transText = completedReplacements.get(range);
                    const startOffset = editor.document.offsetAt(range.start);
                    const endOffset = editor.document.offsetAt(range.end);
                    newText = newText.substring(0, startOffset) + transText + newText.substring(endOffset);
                }
            });
            
            if (_provider) {
                _provider.update(uriVirtual, newText);
            }
        };

        // Helper to process a single range
        const processRange = async (range) => {
            var text = editor.document.getText(range);
            if (!text) return;

            var lines = text.split(/\r\n|\r|\n/);
            if (lines.length === 0) return;

            // Determine Start Line for Detection
            var checkStartIndex = (range.start.character === 0) ? 0 : 1;
            var candidateLines = lines.slice(checkStartIndex);
            var prefix = "";

            if (candidateLines.length > 0) {
                // Calculate Common Prefix
                prefix = candidateLines[0];
                for (var i = 1; i < candidateLines.length; i++) {
                    var line = candidateLines[i];
                    var j = 0;
                    while (j < prefix.length && j < line.length && prefix[j] === line[j]) {
                        j++;
                    }
                    prefix = prefix.substring(0, j);
                    if (!prefix) break;
                }
                
                // Validate Prefix Content
                if (candidateLines.length === 1) {
                    var match = prefix.match(/^[\t ]*/);
                    prefix = match ? match[0] : "";
                } else {
                    var match = prefix.match(/^[\t \d\W]*/);
                    prefix = match ? match[0] : "";
                }
            }

            var cleanedLines = lines.map((line, index) => {
                if (index >= checkStartIndex && prefix && line.startsWith(prefix)) {
                    return line.substring(prefix.length);
                }
                return line;
            });
            var cleanText = cleanedLines.join('\n');

            var infos = {text: cleanText, lang_org: cd_lang1, lang_trans: cd_lang2};
            var res = await API.trans_text(infos);

            if (!res.api_error && res.text_trans) {
                var transText = res.text_trans;
                var transLines = transText.split(/\r\n|\r|\n/);
                
                var finalLines = transLines.map((line, index) => {
                    if (index >= checkStartIndex && prefix) {
                        return prefix + line;
                    }
                    return line;
                });
                
                var finalText = finalLines.join('\n');
                
                completedReplacements.set(range, finalText);
                updateVirtualDoc();

                // Open Diff if first result
                if (firstResult) {
                    firstResult = false;
                    var title = `TexTra: ${Path.basename(uriOriginal.fsPath)} (Original ↔ Translation)`;
                    await vscode.commands.executeCommand('vscode.diff', 
                        uriOriginal, 
                        uriVirtual, 
                        title,
                        { preview: true }
                    );
                }

                // Update CodeLenses
                if (_lensProvider) {
                    activeLenses.push({range: range, text: finalText});
                    _lensProvider.setRanges(uriOriginal, activeLenses);
                }
            }
        };

        // Execute parallel requests
        var tasks = target_ranges.map(r => processRange(r));
        await Promise.all(tasks);

        // Monitor for diff closure and cleanup
        const cleanupDisposable = vscode.workspace.onDidCloseTextDocument(doc => {
            // Check if the closed document is our virtual document
            if (doc.uri.toString() === uriVirtual.toString()) {
                // Diff has been closed, cleanup
                if (_lensProvider) {
                    _lensProvider.clearRanges(uriOriginal);
                }
                if (_provider) {
                    _provider.update(uriVirtual, ''); // Clear content
                }
                // Dispose of this listener
                cleanupDisposable.dispose();
            }
        });

    } finally {
        Utils.clear_status(status_disp);
    }
};
