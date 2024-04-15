import {
	App,
	Modal,
	Notice,
	Plugin,
	TAbstractFile,
	TFile,
	TFolder,
} from "obsidian";

interface TemplateSettings {
	[directoryPath: string]: string; // Map directory paths to template file paths
}

export default class TemplatePlugin extends Plugin {
	settings: TemplateSettings = {};

	async onload() {
		await this.loadSettings();
		this.app.workspace.onLayoutReady(() => this.registerCreateListeners());
	}

	registerCreateListeners() {
		// Register the context menu item for directories
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, source) => {
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item.setTitle("Configure Template")
							.setIcon("notepad-text-dashed")
							.onClick(() => this.configureTemplate(file));
					});
				}
			})
		);

		// Apply the configured template when creating a new note
		this.registerEvent(
			this.app.vault.on("create", async (file) => {
				if (!file.parent) {
					return;
				}
				const parentFolderPath = file.parent.path;
				const templatePath = this.settings[parentFolderPath];
				console.info("templatePath", templatePath);
				if (templatePath) {
					const finalizedTemplatePath = templatePath.endsWith(".md")
						? templatePath
						: `${templatePath}.md`;

					const templateFile = this.app.vault.getAbstractFileByPath(
						finalizedTemplatePath
					);
					if (templateFile instanceof TFile) {
						const content = await this.app.vault.read(templateFile);
						console.info("content", content);
						await this.app.vault.modify(file as TFile, content);
					} else {
						new Notice(
							`Template file ${finalizedTemplatePath} does not exist.`
						);
					}
				}
			})
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, (await this.loadData()) || {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async configureTemplate(folder?: TAbstractFile) {
		const selectedFolder = folder;

		if (selectedFolder) {
			const folderPath = (selectedFolder as TFolder).path;
			const modal = new TemplateModal(
				this.app,
				folderPath,
				this.settings[folderPath] || "",
				this
			);
			modal.open();
		} else {
			new Notice("No folder selected.");
		}
	}
}

class TemplateModal extends Modal {
	folderPath: string;
	initialTemplatePath: string;
	plugin: TemplatePlugin;

	constructor(
		app: App,
		folderPath: string,
		initialTemplatePath: string,
		plugin: TemplatePlugin
	) {
		super(app);
		this.folderPath = folderPath;
		this.initialTemplatePath = initialTemplatePath;
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", {
			text: `Configure Template for ${this.folderPath}`,
		});

		const templateInput = contentEl.createEl("input", {
			type: "text",
			value: this.initialTemplatePath,
			placeholder: "Enter template file path",
		});

		const confirmButton = contentEl.createEl("button", { text: "Confirm" });
		confirmButton.addEventListener("click", async () => {
			const newTemplatePath = templateInput.value.trim();
			if (newTemplatePath) {
				this.plugin.settings[this.folderPath] = newTemplatePath;
				await this.plugin.saveSettings();
				new Notice(`Template configured for ${this.folderPath}`);
			}
			this.close();
		});
	}

	onClose: () => void = () => {};
}
