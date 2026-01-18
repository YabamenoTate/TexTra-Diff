const vscode = require('vscode');
const fs = require("fs");
const Utils = require('./utils');
var i18n = null;

function get_UI_language() {
   var config = vscode.workspace.getConfiguration('nicttextramod');
   var label_lang = config.get('UI_Language');
   switch (label_lang){
       case 'English' : return 'en';
       default : return 'ja';
   }
}

function init_i18n(){
   var lang = get_UI_language();
   var txt = fs.readFileSync(__dirname + '/../../locales/'+ lang +'.json');
   i18n = JSON.parse(txt);
   i18n.get_message = get_message;
}
init_i18n();

module.exports = {
   i18n: i18n
};

function get_message(id, ...args){
   var id_mes = 'mes_' + ('0000' + id.toString()).slice(-4);
   var mes = i18n[id_mes];
   for(var ind in args){
      var target = '{' + ind.toString() + '}';
      var arg = args[ind];
      if (Utils.is_empty_string(arg)) arg = '';
      mes = mes.replace(target, arg.toString());
   }
   return mes;
}