import * as CodeMirror from 'codemirror'
import { App, Editor, MarkdownView, Plugin, PluginSettingTab, View } from 'obsidian'

// TODO: store timestamps as unixtime and add a presentation layer for timerendering
import { format, parse } from 'date-fns'

const TIMESTAMP_FORMAT = "yyyy-MM-dd HH:mm:ss"
const SEPARATOR = "   "

interface ThoughtStreamSettings {
}

const DEFAULT_SETTINGS: ThoughtStreamSettings = {
	mySetting: 'default'
}

/**
 * Checks if a note is tagged with a specific tag
 */
function isTagged(app: App, tag: string) {
	let active = app.workspace.getActiveFile()
	if (!active) {
		return false
	}

	let pageCache = app.metadataCache.getFileCache(active)
	if (!tag.startsWith("#")) {
		tag = "#" + tag
	}
	return Boolean(pageCache.tags?.find(t => t.tag === tag))
}

function mkTimestamp(date?: Date): string {
	date = date ?? new Date()

	return format(date, TIMESTAMP_FORMAT)
}

interface Thought {
	timestampString: string
	timestamp: Date
	content: string
}

function parseThought(line: string) {
	// const dateRe = /^([0-9]{4}-[1-9]-[1-9] [0-2][0-9]:[0-5][0-9]:[0-5][0-9])\t(.*)/
	const timstampRe = new RegExp(`^(.+?)${SEPARATOR}(.*)`)   // TODO: use a actual timestamp regex like above?

	const match = timstampRe.exec(line)
	if (match) {
		const [timestampString, content] = match.slice(1)  // Note: first entry is the full match

		const timestamp = parse(timestampString, TIMESTAMP_FORMAT, new Date())
		return {
			timestampString,
			timestamp,
			content
		}

	} else {
		return
	}
}

function endOfLinePos(cm: CodeMirror.Editor, line: number): CodeMirror.Position {
	return {
		line: line,
		ch: cm.getLine(line).length
	}
}

function isMarkdownView(view: View): view is MarkdownView {
	return view.getViewType() === "markdown"
}

const timestampMarkOptions: CodeMirror.TextMarkerOptions = {
	readOnly: true,
	className: "stream-timestamp",
	inclusiveRight: false,
}

export default class ThoughtStream extends Plugin {
	settings: ThoughtStreamSettings

	cm: CodeMirror.Editor

	async initializeStreamHistory(doc: CodeMirror.Doc) {
		doc.eachLine(line => {
			const t = parseThought(line.text)
			if (t) {
				const n = doc.getLineNumber(line)
				doc.markText({ line: n, ch: 0 }, { line: n, ch: t.timestampString.length + SEPARATOR.length }, timestampMarkOptions)
			}
		})
	}

	lockLine(line: number) {
		const cm = this.cm
		const eol = endOfLinePos(cm, line)
		cm.getDoc().markText({ line, ch: 0 }, eol, { readOnly: true })
	}

	updateTimestamp(line: number, timestamp?: Date) {
		const cm = this.cm

		const timestampStr = mkTimestamp(timestamp)
		const doc = cm.getDoc()
		const marks = doc.findMarksAt({line: line, ch: 0})

		if (marks.length !== 1) {
			console.warn("Found unexpected marks on timestamp string. Clearing all marks!", marks)
		}

		for (const mark of marks) {
			mark.clear()
		}

		cm.replaceRange(timestampStr, { line: line, ch: 0 }, { line: line, ch: timestampStr.length })
		doc.markText({ line: line, ch: 0 }, { line: line, ch: timestampStr.length + SEPARATOR.length }, timestampMarkOptions)
		doc.markText({ line: line, ch: 0 }, { line: line, ch: timestampStr.length + SEPARATOR.length }, timestampMarkOptions)
	}



	async submitThought(editor_: Editor, view: MarkdownView) {
		const cm = this.cm

		const thoughtLine = cm.lastLine()

		this.updateTimestamp(thoughtLine)

		this.lockLine(thoughtLine)

		this.newPrompt(thoughtLine)
	}

	private newPrompt(line: number) {
		const cm = this.cm

		cm.replaceRange(
			"\n" + mkTimestamp() + SEPARATOR,
			endOfLinePos(cm, line)
		)

		const promptLine = cm.lastLine()
		const eol = endOfLinePos(cm, promptLine)

		cm.getDoc().markText(
			{ line: promptLine, ch: 0 },
			eol,
			timestampMarkOptions
		)

		cm.setCursor(eol)
	}

	async onload() {
		console.log('loading plugin')

		this.addSettingTab(new SettingsTab(this.app, this))

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm)
			this.cm = cm
		})

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt)
		})

		this.registerEvent(this.app.workspace.on("file-open", this.initialize.bind(this)))

		const c = this.addCommand({
			id: "submit-thought",
			name: "submit-thought",
			// editorCheckCallback: this.isStreamNote.bind(this),
			editorCallback: this.submitThought.bind(this),
			hotkeys: [{ key: "Enter", modifiers: ["Alt"] }]
		})


		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000))
	}

	/** Checks if the active leaf is a stream note */
	isStreamNote() {
		return isTagged(this.app, "#stream")
	}

	async initialize() {
		if (this.isStreamNote()) {
			const leaf = this.app.workspace.activeLeaf
			const view = leaf.view

			if (isMarkdownView(view)) {
				this.initializeStreamHistory(this.cm.getDoc())
			}
		}
	}

	onunload() {
		console.log('unloading plugin')
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}

class SettingsTab extends PluginSettingTab {
	plugin: ThoughtStream

	constructor(app: App, plugin: ThoughtStream) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		let {containerEl} = this

		containerEl.empty()

		containerEl.createEl('h2', {text: 'Notthing to see here'})
	}
}
