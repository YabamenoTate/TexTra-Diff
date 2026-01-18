const vscode = require('vscode');

class TexTraTranslationProvider {
    constructor() {
        this.onDidChangeEmitter = new vscode.EventEmitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.contents = new Map();
    }

    provideTextDocumentContent(uri) {
        // Parse query to find the content ID? Or use the path?
        // uri format: textra-translation:[original_basename]?id=[random_id]
        const query = this.parseQuery(uri.query);
        const id = query['id'];
        if (id && this.contents.has(id)) {
            return this.contents.get(id);
        }
        return "Translation content not found.";
    }

    update(uri, content) {
        const query = this.parseQuery(uri.query);
        const id = query['id'];
        if (id) {
            this.contents.set(id, content);
            this.onDidChangeEmitter.fire(uri);
        }
    }

    parseQuery(queryString) {
        const query = {};
        const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i].split('=');
            query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
        return query;
    }
}

module.exports = TexTraTranslationProvider;
