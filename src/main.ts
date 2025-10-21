import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { HeliaService } from './helia';

interface HeliaPluginSettings {
	gatewayUrl: string;
}

const DEFAULT_SETTINGS: HeliaPluginSettings = {
	gatewayUrl: 'https://delegated-ipfs.dev'
}

export default class HeliaPlugin extends Plugin {
	settings: HeliaPluginSettings;
	heliaService: HeliaService;

	async onload() {
		await this.loadSettings();
		this.heliaService = await HeliaService.create(this.settings.gatewayUrl);
		new Notice('Helia node started!');

		this.addCommand({
			id: 'fetch-from-ipfs',
			name: 'Fetch from IPFS',
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				new CidInputModal(this.app, async (cid) => {
					try {
						const content = await this.heliaService.fetchCid(cid);
						const textDecoder = new TextDecoder();
						editor.replaceSelection(textDecoder.decode(content));
					} catch (error) {
						console.error(error);
						new Notice(`Error fetching CID: ${error.message}`);
					}
				}).open();
			}
		});

		this.addSettingTab(new HeliaSettingTab(this.app, this));
	}

	async onunload() {
		if (this.heliaService) {
			await this.heliaService.stop();
		}
		new Notice('Helia node stopped.');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CidInputModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "Enter IPFS CID" });

		new Setting(contentEl)
			.setName("CID")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Fetch")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					}));
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}


class HeliaSettingTab extends PluginSettingTab {
	plugin: HeliaPlugin;

	constructor(app: App, plugin: HeliaPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Gateway URL')
			.setDesc('The IPFS gateway to use for routing.')
			.addText(text => text
				.setPlaceholder('Enter gateway URL')
				.setValue(this.plugin.settings.gatewayUrl)
				.onChange(async (value) => {
					this.plugin.settings.gatewayUrl = value;
					await this.plugin.saveSettings();
				}));
	}
}
