import { findSourceMap } from 'module';
import { App, MarkdownEditView, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, View } from 'obsidian';

interface ThoughtStreamSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ThoughtStreamSettings = {
	mySetting: 'default'
}

/**
 * Checks if a note is tagged with a specific tag
 */
function isTagged(app: App, tag: string) {
	let active = app.workspace.getActiveFile()
	let pageCache = app.metadataCache.getFileCache(active)
	if (!tag.startsWith("#")) {
		tag = "#" + tag
	}
	return Boolean(pageCache.tags?.find(t => t.tag === tag))
}

interface Thought {
	timestamp: Date
	content: string
}

function parseThought(line: string) {
	const dateRe = /^([0-9]{4}-[1-9]-[1-9] [0-2][0-9]:[0-5][0-9]:[0-5][0-9])\t(.*)/

	const match = dateRe.exec(line)
	if (match) {
		const [timestampString, content] = match
		const timestamp = Date.parse(timestampString)
		return {
			timestamp, content
		}

	} else {
		return
	}

}

function isMarkdownView(view: View): view is MarkdownView {
	return view.getViewType() === "markdown"
}

export default class ThoughtStream extends Plugin {
	settings: ThoughtStreamSettings;

	cm: CodeMirror.Editor

	async lockLines(doc: CodeMirror.Doc) {

		doc.markText(
			{ line: 0, ch: 0 },
			{ line: doc.lineCount() - 1, ch: 0 },
			{
				readOnly: true
			}
		)
/* 		doc.eachLine(line => {
			if (parseThought(line.text)) {
				const n = doc.getLineNumber(line)
				doc.markText({line: n, ch: 0}, {line: n+1, ch: 0})
			}
		}) */
	}

	async onload() {
		console.log('loading plugin');

		await this.loadSettings();
// asdf asdf
/* 		this.addRibbonIcon('dice', 'Sample Plugin', () => {
			new Notice('This is a notice!');
		});

		this.addStatusBarItem().setText('Status Bar Text');

		this.addCommand({
			id: 'open-sample-modal',
			name: 'Open Sample Modal',
			// callback: () => {
			// 	console.log('Simple Callback');
			// },
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new SampleModal(this.app).open();
					}
					return true;
				}
				return false;
			}
		});
 */
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm)
			this.cm = cm
		});

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		this.registerEvent(this.app.workspace.on("file-open", this.initialize.bind(this)));

		this.lockLines(this.cm.getDoc())

		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	async initialize() {
		if (isTagged(this.app, "#stream")) {
			let active = this.app.workspace.getActiveFile()
			let pageCache = this.app.metadataCache.getFileCache(active)

			const leaf = this.app.workspace.activeLeaf
			window.__leaf = leaf
			const view = this.app.workspace.activeLeaf.view

			if (isMarkdownView(view)) {
				this.lockLines(this.cm.getDoc())
			}
		}
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ThoughtStream;

	constructor(app: App, plugin: ThoughtStream) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue('')
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
