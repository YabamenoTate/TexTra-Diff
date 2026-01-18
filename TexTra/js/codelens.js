const vscode = require('vscode');
const {i18n} = require('./i18n');

class TexTraCodeLensProvider {
    constructor() {
        this.onDidChangeT = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this.onDidChangeT.event;
        this.rangesMap = new Map(); // URI.toString() -> Array of {range, text}
    }

    setRanges(uri, ranges) {
        this.rangesMap.set(uri.toString(), ranges);
        this.onDidChangeT.fire();
    }
    
    clearRanges(uri) {
        if (this.rangesMap.has(uri.toString())) {
            this.rangesMap.delete(uri.toString());
            this.onDidChangeT.fire();
        }
    }

    removeRange(uri, targetRange) {
        const uriStr = uri.toString();
        if (!this.rangesMap.has(uriStr)) {
            return;
        }
        
        const ranges = this.rangesMap.get(uriStr);
        const filtered = ranges.filter(item => {
            // Compare ranges by position
            return !(item.range.start.line === targetRange.start.line &&
                     item.range.start.character === targetRange.start.character &&
                     item.range.end.line === targetRange.end.line &&
                     item.range.end.character === targetRange.end.character);
        });
        
        if (filtered.length === 0) {
            this.rangesMap.delete(uriStr);
        } else {
            this.rangesMap.set(uriStr, filtered);
        }
        this.onDidChangeT.fire();
    }

    provideCodeLenses(document, token) {
        const uriStr = document.uri.toString();
        if (!this.rangesMap.has(uriStr)) {
            return [];
        }

        const ranges = this.rangesMap.get(uriStr);
        const lenses = [];

        ranges.forEach(item => {
            const range = item.range;
            const text = item.text;
            
            // Create a command to apply this translation
            const cmd = {
                title: "$(arrow-left) " + i18n.mes_1039,
                tooltip: i18n.mes_1040,
                command: "nicttextramod.apply_range",
                arguments: [document.uri, range, text]
            };
            
            lenses.push(new vscode.CodeLens(range, cmd));
        });

        return lenses;
    }
}

module.exports = TexTraCodeLensProvider;
