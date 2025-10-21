import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { HeliaService } from './helia';
import { CidInputModal } from './ui/CidInputModal';
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
