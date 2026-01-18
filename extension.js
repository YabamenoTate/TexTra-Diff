const vscode = require('vscode');
const TexTra = require('./TexTra/main.js');

function activate(context) {
	register_command('nicttextramod.set_api_params', TexTra.set_api_params , context);
	register_command('nicttextramod.translate_rst', TexTra.trans_rst_file , context);
	register_command('nicttextramod.translate_md', TexTra.trans_md_file , context);
	register_command('nicttextramod.check_term_using', TexTra.check_term_using , context);
	register_command('nicttextramod.alignment', TexTra.alignment , context);
	register_command('nicttextramod.formatting_texts', TexTra.format_texts , context);

    // CodeLens Provider Registration
    const TexTraCodeLensProvider = require('./TexTra/js/codelens');
    const lensProvider = new TexTraCodeLensProvider();
    const lensRegistration = vscode.languages.registerCodeLensProvider('*', lensProvider);
    context.subscriptions.push(lensRegistration);
    TexTra.set_lens_provider(lensProvider);
    
    // Register apply_range command (receives arguments from CodeLens)
    const applyRangeDisposable = vscode.commands.registerCommand('nicttextramod.apply_range', 
        (uri, range, text) => TexTra.apply_range(uri, range, text)
    );
    context.subscriptions.push(applyRangeDisposable);

    // TextDocumentContentProvider Registration
    const TexTraTranslationProvider = require('./TexTra/js/provider');
    const provider = new TexTraTranslationProvider();
    const registration = vscode.workspace.registerTextDocumentContentProvider('textra-translation', provider);
    context.subscriptions.push(registration);
    
    // Share provider instance with main.js logic
    TexTra.set_provider(provider);

	// Dynamic command registration
	const CONST = require('./TexTra/js/constants');
	const list_lang = CONST.get_list_langage();
	list_lang.forEach(l1 => {
		list_lang.forEach(l2 => {
			if (l1 === l2) return;
			const cmd = `nicttextramod.translate.${l1}2${l2}`;
			const disposable = vscode.commands.registerCommand(cmd, function() {
				TexTra.trans_diff_preview(l1, l2, context);
			});
			context.subscriptions.push(disposable);
		});
	});

	// TODO テストコード
	var test_js = require('./TexTra/test.js');
	// register_command('nicttextramod.test', test_js.test1, context);
}
exports.activate = activate;

function register_command(name, func, context){
	var disposable = vscode.commands.registerCommand(name, function() {func(context);});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
};