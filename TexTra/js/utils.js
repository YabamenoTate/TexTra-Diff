const vscode = require('vscode');
const CONST = require("./constants.js");
const {i18n} = require('./i18n');
const Path = require("path");

exports.get_UI_language = function() {
    var config = vscode.workspace.getConfiguration('nicttextramod');
    console.log('config >> ' + JSON.stringify(config));
    var label_lang = config.UI_Language;
    switch (label_lang){
        case 'Japanese' : return CONST.Language.ja;
        case 'English' : return CONST.Language.en;
    }
};

exports.is_empty_string = function (txt) {
    return exports.trim(txt) === "";
};

exports.is_empty_list = function (list) {
    return !list || list.length === 0;
};

exports.trim = function (str) {
    if (!str) return '';
    str = str.toString();
    return str.replace(/^\s+|\s+$/g, '');
};

exports.get_length_bytes = function (str) {
    return encodeURIComponent(str).replace(/%../g, "x").length;
};

exports.get_selected_text = function(show_message) {
    if (!show_message) show_message = true;
    var editor = vscode.window.activeTextEditor;
    var doc = editor.document;
    var txt = null;
    if (!editor.selection.isEmpty) txt = doc.getText(editor.selection);
    if (show_message && !txt) exports.msgbox(i18n.mes_1038); // テキストが選択されていません。
    return txt;
};

exports.get_langs_setting = function(context){
    var st = context.globalState;
    var langs = st.get(CONST.key_strage.languages, {lang1: 'ja', lang2: 'en'});
    if (!langs.lang1) langs.lang1 = 'ja';
    if (!langs.lang2) langs.lang2 = 'en';
    return langs;
};

exports.msgbox = function(msg, type){
    switch(type){
        case 1:
            vscode.window.showWarningMessage("[TexTra] \n" + msg, {modal: true});
            break;
        case 2:
            vscode.window.showErrorMessage("[TexTra] \n" + msg, {modal: true});
            break;
        default:
            vscode.window.showInformationMessage("[TexTra] \n" + msg, {modal: true});
            break;
        }
};

exports.msg_line = function(msg, type){
    switch(type){
        case 1:
            vscode.window.showWarningMessage("[TexTra] " + msg);
            break;
        case 2:
            vscode.window.showErrorMessage("[TexTra] " + msg);
            break;
        default:
            // Use status bar message for progress to avoid blocking/persistent notifications
            // Return disposable so caller can clear it, or set timeout
            return vscode.window.setStatusBarMessage("$(sync~spin) [TexTra] " + msg);
            break;
        }
};

exports.clear_status = function(disposable) {
    if (disposable && disposable.dispose) {
        disposable.dispose();
    }
};

exports.get_path_last_used = function(context){
    var st = context.globalState;
    return st.get(CONST.key_strage.Path_last_used, '');
};

exports.save_path_last_used = function(path_used, context){
    var path_dir = Path.dirname(path_used) + '\\';
    console.log(path_dir);
    var st = context.globalState;
    st.update(CONST.key_strage.Path_last_used, path_dir);
};
